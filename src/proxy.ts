import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { proxyRedirect } from "@/lib/auth/paths";
import { buildNonceCsp } from "./lib/buildCsp";

/**
 * Runs before the matched routes render. `getSessionCookie` only looks for the session cookie;
 * it does not verify the signature and it does not touch the database. That is deliberate on
 * two counts. It is the optimistic check from both the Next.js and the Better Auth auth
 * guides, so it costs no I/O and keeps strangers off /account before anything renders. And the
 * proxy may be deployed to a CDN, which is why the Next.js docs tell you not to rely on shared
 * modules here: a `node:sqlite` handle has no business in this file.
 *
 * So this is not the last line of defense, and it is not meant to be. The page and the Server
 * Action call getSession() again, which does verify and does hit the database. The matcher
 * keeps the proxy off every other route, so the static and cached demos are untouched.
 *
 * It guards /account and nothing else. Sending a signed-in visitor away from /login belongs to
 * the login page, which can verify; deciding that here, on the presence of a cookie, would
 * trap anyone holding one whose session is gone. See proxyRedirect in lib/auth/paths.ts.
 *
 * CSP is the one header that has to live here rather than in next.config.ts, because the nonce
 * must be regenerated per response. Every other security header stays in next.config.ts, and
 * the static CSP there excludes /account so the two policies never land on the same response.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = Boolean(getSessionCookie(request));
  const target = proxyRedirect({ pathname, search, signedIn });

  if (target) {
    // A redirect has no body, renders no HTML, and runs no scripts. There is nothing to
    // nonce and no downstream render to forward request headers to.
    return NextResponse.redirect(new URL(target, request.nextUrl.origin));
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildNonceCsp(nonce);

  // Inbound leg: only the Next.js renderer reads these, they never reach the client.
  // The CSP header is how Next discovers the nonce so it can stamp the <script> tags it
  // injects itself (bootstrap, hydration, flight). `x-nonce` is for our own components,
  // read with (await headers()).get("x-nonce").
  const requestHeaders = new Headers(request.headers);
  // requestHeaders.set("x-nonce", nonce);
  // requestHeaders.set("Content-Security-Policy", csp);

  // Outbound leg: this is the copy the browser receives and the only one it enforces.
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  // response.headers.set("Content-Security-Policy", csp);

  return response;
}

export const config = { matcher: ["/account/:path*"] };
