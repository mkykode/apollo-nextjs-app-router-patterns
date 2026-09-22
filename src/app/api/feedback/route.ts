
import { ipAddress } from '@vercel/functions'
import { NextRequest, NextResponse } from 'next/server';
import { FeedBackBody } from './schema';

const WINDOW_MS = 60_000, LIMIT = 10

// LOCAL DEV ONLY. One process, one region, wiped on restart. See below for why.
const hits = new Map<string, number[]>()   // ip -> timestamps inside the window

function clientIp(request: NextRequest): string | null {
  const platform = ipAddress(request)                 // the platform's own answer, not a header you parsed
  if (platform) return platform
  const xff = request.headers.get('x-forwarded-for')
  if (!xff) return null
  return xff.split(',').at(-1)?.trim() || null        // rightmost: the entry your trusted proxy appended
}

function tooMany(ip: string): number | null {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter(t => now - t < WINDOW_MS)
  hits.set(ip, recent)                                // prune on every path, blocked included
  if (recent.length >= LIMIT) return Math.ceil((recent[0] + WINDOW_MS - now) / 1000)   // seconds to wait
  recent.push(now)
  if (hits.size > 10_000) {                           // nothing else ever deletes a key
    for (const [key, times] of hits) if (times.every(t => now - t >= WINDOW_MS)) hits.delete(key)
  }
  return null
}

export async function POST(request: NextRequest) {
  // get email and message from our body
  const parsed = FeedBackBody.safeParse(request.body)
  if (!parsed.success) return NextResponse.json({ error: 'Bad input arguments' }, { status: 400 })


  const ip = clientIp(request)
  if (!ip) return NextResponse.json({ error: 'Bad request' }, { status: 400 })   // fail closed
  const retryAfter = tooMany(ip)
  if (retryAfter !== null)
    return NextResponse.json({ error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } })
  /* validate, then act */
  return NextResponse.json({ ok: true, body: parsed }, { status: 201 })
}
