import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

// Same .env resolution as Next.js, so the tests target the endpoint the app talks to.
loadEnvConfig(process.cwd());

/** Override with E2E_PORT when something else (a dev server) holds 3000. */
const PORT = Number(process.env.E2E_PORT ?? 3000);

/** Shared with e2e/revalidate-route.spec.ts; the server only accepts the secret it was started with. */
export const REVALIDATE_SECRET = "e2e-only-secret";

/** Signs the session cookie of the server under test; `next start` does not load .env.development. */
const BETTER_AUTH_SECRET = "e2e-only-auth-secret-at-least-32-chars";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    // Always build and start our own server: an existing one may lack these secrets.
    reuseExistingServer: false,
    timeout: 180_000,
    // BETTER_AUTH_URL pins the origin to the port under test, so Better Auth needs no host allowlist.
    env: {
      REVALIDATE_SECRET,
      BETTER_AUTH_SECRET,
      BETTER_AUTH_URL: `http://localhost:${PORT}`,
      AUTH_DB_PATH: ".auth.e2e.sqlite",
    },
  },
});
