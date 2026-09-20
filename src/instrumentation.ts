/**
 * Runs once per server instance, before the first request is served.
 *
 * Better Auth stores sessions as rows, so the schema has to exist before anything calls
 * getSession. Doing it here rather than in a package.json script keeps the demo to one command
 * (`pnpm dev`) and lets Next.js resolve the imports.
 *
 * The import is inside the guard because Next.js calls `register` in every runtime, and the
 * auth database is `node:sqlite`. Importing it at the top of this file would drag SQLite into
 * the edge bundle.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { prepareAuthDatabase } = await import("@/lib/auth/migrate");
  await prepareAuthDatabase();
}
