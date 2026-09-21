import { NextRequest } from "next/dist/api/server";
import { NextResponse } from "next/server";

const WINDOW_MS = 60_000, LIMIT = 2
const hits = new Map<string, number[]>()

function tooMany(ip: string) {
    const now = Date.now()
    const recent = (hits.get(ip) ?? []).filter(t => now - t < WINDOW_MS)
    if (recent.length >= LIMIT) {
        return Math.ceil(
            (
                recent[0] + WINDOW_MS - now
            ) / 1000
        )
    }
    recent.push(now)
    hits.set(ip, recent)
    return null
}

export function POST(request: NextRequest) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const retryAfter = tooMany(ip)
    if (retryAfter !== null) return NextResponse.json({
        error: "Too many requests"
    }, {
        status: 429,
        headers: { "Retry-After": String(retryAfter) }
    })
    return NextResponse.json({ ok: true }, { status: 201 })
}
