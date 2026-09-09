import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";

/**
 * Runs before the matched routes render. Auth.js decodes the session cookie and hands the
 * result to the `authorized` callback in auth.config.ts, which redirects or lets the request
 * through; nothing else happens here. This is the optimistic check from the Next.js auth
 * guide: it costs no I/O and it keeps strangers off /account before anything renders, but it
 * is not the last line of defense. The page and the Server Action call auth() again.
 *
 * The proxy imports auth.config.ts, not auth.ts: the credentials provider pulls in
 * node:crypto and the user table, which a redirect decision does not need. The matcher keeps
 * the proxy off every other route, so the static and cached demos are untouched.
 */
export default NextAuth(authConfig).auth;

export const config = { matcher: ["/account/:path*", "/login"] };
