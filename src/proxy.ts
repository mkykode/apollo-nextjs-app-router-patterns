import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { proxyRedirect } from "@/lib/auth/paths";

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
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = Boolean(getSessionCookie(request));
  const target = proxyRedirect({ pathname, search, signedIn });
  const permissionPolicyHeaders = [
    "camera=()",
    "microphone=()",
    "geolocation=()"
  ]
  // You would normally NOT do this in proxy in Next.js, you do it in next.config.ts, headers prop
  const newHeaders = new Headers(request.headers)
  newHeaders.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload;")
  newHeaders.set("X-Content-Type-Options", "nosniff")
  newHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin")
  newHeaders.set("X-Frame-Options", "DENY")
  newHeaders.set("Permission-Policy", permissionPolicyHeaders.join(', '))

  // we want to set our headers
  return target
    ? NextResponse.redirect(new URL(target, request.nextUrl.origin), {
      headers: newHeaders
    })
    : NextResponse.next({
      headers: newHeaders
    });
}

export const config = { matcher: ["/account/:path*"] };
