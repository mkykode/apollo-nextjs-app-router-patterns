import "server-only";
import { getMigrations } from "better-auth/db/migration";
import { auth } from "./auth";
import { authDb } from "./db";
import { DEMO_ACCOUNT } from "./demo-account";

/**
 * Creates the four tables Better Auth needs (user, session, account, verification) and the
 * `accessToken` column auth.ts adds to the session table.
 *
 * `getMigrations` is the programmatic form of `npx auth migrate`, and it works because the
 * demo uses the built-in Kysely adapter; with Prisma or Drizzle you would run their migrations
 * instead. It is idempotent, and it diffs rather than guesses: missing tables get created,
 * missing columns get added, so changing auth.ts is picked up by the next start.
 */
async function migrate() {
  const { runMigrations } = await getMigrations(auth.options);
  await runMigrations();
}

/**
 * Puts the one account the demo knows into the fresh database. Better Auth owns password
 * hashing now (scrypt, same as the hand-rolled version this replaced), so the only way to
 * create a user with a valid credential is to go through the sign-up endpoint.
 *
 * Idempotent by checking first: signUpEmail would fail on the second run, and an error thrown
 * from `register` would stop the server from coming up.
 */
async function ensureDemoAccount() {
  const existing = authDb.prepare("SELECT id FROM user WHERE email = ?").get(DEMO_ACCOUNT.email);
  if (existing) return;

  await auth.api.signUpEmail({
    body: {
      email: DEMO_ACCOUNT.email,
      password: DEMO_ACCOUNT.password,
      name: DEMO_ACCOUNT.name,
    },
  });
}

/** Called once from instrumentation.ts, before the server takes its first request. */
export async function prepareAuthDatabase() {
  await migrate();
  await ensureDemoAccount();
}
