import "server-only";
import { authDb } from "./db";

/**
 * Reads the upstream API token belonging to a session.
 *
 * This exists because `returned: false` in auth.ts is thorough: it hides `accessToken`
 * from every response body, which includes the object `auth.api.getSession()` hands back. So
 * the token cannot be read off the session, and an app that wants it has to ask for it on
 * purpose, from the server, with a session token it has already validated.
 *
 * That is the whole improvement over the Auth.js version. There the token rode along on the
 * session object, which meant the Server Action and the public session endpoint were served
 * by one shaping callback and a field added for the former was published by the latter. Here
 * there is no code path in which the token is part of a session payload.
 *
 * Pass the `session.token` from a successful `auth.api.getSession()` call: that is what proves
 * the caller holds a live, unrevoked session, since this query does not re-check expiry.
 */
export function readAccessToken(sessionToken: string): string | null {
  const row = authDb
    .prepare("SELECT accessToken FROM session WHERE token = ?")
    .get(sessionToken);
  const token = row?.accessToken;
  return typeof token === "string" && token.length > 0 ? token : null;
}
