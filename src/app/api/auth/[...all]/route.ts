import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth/auth";

/**
 * Better Auth owns everything under /api/auth: sign-in, sign-out, the session endpoint, CSRF.
 * The Server Actions in src/lib/actions/auth.ts call the same endpoints in-process through
 * `auth.api`, so the browser never posts here directly in this app.
 *
 * The handler is mounted unwrapped on purpose. Under Auth.js this file needed a filter,
 * because GET /api/auth/session served whatever the session callback had put on the session,
 * and that included the API token the Server Action needed. Here `returned: false` in
 * auth.ts keeps the token out of the response at the source, so there is nothing left to
 * strip. e2e/auth.spec.ts asserts that against the running endpoint.
 */
export const { GET, POST } = toNextJsHandler(auth);
