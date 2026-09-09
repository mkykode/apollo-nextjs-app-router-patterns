import { handlers } from "@/lib/auth/auth";

/**
 * Auth.js owns everything under /api/auth: the credentials callback, the session endpoint,
 * sign-out, CSRF. The Server Actions in src/lib/actions/auth.ts call into the same handlers
 * in-process, so the browser never posts here directly in this app.
 */
export const { GET, POST } = handlers;
