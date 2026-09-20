import "server-only";
import { headers } from "next/headers";
import { auth } from "./auth";

/**
 * Reads the current session from the request's cookie.
 *
 * `auth.api.getSession` is the whole call, but it needs the request headers, so every Server
 * Component and Server Action that wants a session would otherwise repeat the same
 * `await headers()` dance. This is the single entry point the Auth.js `auth()` export used to
 * be, kept in its own module so `next/headers` stays out of auth.ts, which instrumentation.ts
 * imports through migrate.ts at server start, outside any request.
 *
 * Calling this makes the surrounding route dynamic, which is the point: a session read is a
 * cookie read. Put it inside a Suspense boundary, next to the data it guards, rather than in a
 * layout that would pull the whole tree out of the static shell.
 *
 * The returned session carries no `accessToken`; `returned: false` in auth.ts hides it. Ask
 * for it on purpose with readAccessToken() in access-token.ts.
 */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}
