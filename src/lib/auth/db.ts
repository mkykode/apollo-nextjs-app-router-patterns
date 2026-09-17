import { DatabaseSync } from "node:sqlite";

/**
 * The demo's SQLite file. Better Auth needs a real database because its sessions are rows,
 * not a cookie payload: that is what makes them revocable. `node:sqlite` ships with Node
 * (22.5+), so this costs no dependency and no native build.
 *
 * The file is gitignored, and src/instrumentation.ts creates the schema and seeds the demo
 * user in it before the server takes its first request. A deployment would point AUTH_DB_PATH
 * at a volume, or swap this one module for Postgres; nothing else in the app knows which
 * database it is.
 *
 * The handle is opened here, at import, because that is what Better Auth's `database` option
 * takes: passing a factory makes it treat the result as a custom adapter and migrations stop
 * working. So `next build` leaves an empty file behind when it imports the routes, which the
 * first server start then migrates.
 */
const AUTH_DB_PATH = process.env.AUTH_DB_PATH ?? ".auth.sqlite";

export const authDb = new DatabaseSync(AUTH_DB_PATH);
