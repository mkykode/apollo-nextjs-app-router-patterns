import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { authDb } from "./db";

/** How long a signed-in session stays valid, and how often using it pushes that out. */
const SESSION_EXPIRES_IN = 60 * 60 * 24 * 7;
const SESSION_UPDATE_AGE = 60 * 60 * 24;

/**
 * The auth instance, and the whole configuration.
 *
 * The Auth.js version this replaced split its config in two so the proxy could run part of it
 * without pulling in the credentials provider. That reason is gone: proxy.ts now decides with
 * `getSessionCookie` and a pure function and imports none of this, so one file is the honest
 * shape.
 *
 * `auth.api` is the whole surface. Every HTTP endpoint Better Auth serves is also callable as
 * a function, so a Server Action signs in with `auth.api.signInEmail` in-process rather than
 * posting to itself, and a Server Component reads the session with
 * `auth.api.getSession({ headers: await headers() })`.
 */
export const auth = betterAuth({
  database: authDb,
  advanced: {
    database: {
      /**
       * Off because this app migrates in-band. The check runs when an instance is created and
       * compares the schema against the database, which is useful when you apply migrations
       * out of band and want to be told you forgot. Here `prepareAuthDatabase()` in
       * instrumentation.ts is that reminder, and it runs on every server start, so the check
       * can only fire when it is wrong: during `next build`, which imports the routes without
       * ever starting a server, and in the moment before the migration it is asking for has
       * finished. A drifted column is added by the next boot either way.
       */
      validateSchema: false,
    },
  },
  /**
   * The allowlist is Better Auth's replacement for Auth.js's `trustHost: true`. Hosts on it
   * may be used to build the request's base URL, and they become trusted origins for the
   * endpoints' CSRF check; anything else takes the fallback rather than throwing, which keeps
   * `next dev -p 4000` working. A deployment sets BETTER_AUTH_URL and skips the list.
   *
   * No `protocol` here on purpose. It looks like the way to say "this is local development",
   * but it is read by the cookie builder too, and `"http"` turns off `Secure` and the
   * `__Secure-` prefix on the session cookie for good: not just in dev, but in a production
   * deploy that forgot to set BETTER_AUTH_URL, where the object below is what applies. Better
   * Auth already derives `http://` for loopback hosts, so leaving it out costs nothing in dev
   * and stops the fallback from being worse than having no fallback at all.
   */
  baseURL: process.env.BETTER_AUTH_URL ?? {
    allowedHosts: ["localhost:3000", "localhost:3001"],
    fallback: "http://localhost:3000",
  },
  emailAndPassword: { enabled: true },
  /**
   * Enabling email and password also mounts POST /api/auth/sign-up/email, and the catch-all
   * route hands it straight to the browser. The Auth.js credentials provider had no such
   * endpoint, so this is new public surface: anyone could create rows in the demo's SQLite
   * file. This closes the HTTP route with a 404.
   *
   * The check runs in the router's `onRequest`, which only sees requests that arrive over
   * HTTP, so migrate.ts can still seed the demo user by calling `auth.api.signUpEmail`
   * in-process. That split is the reason to disable the path rather than the feature:
   * `emailAndPassword.disableSignUp` would turn off the seed too.
   */
  disabledPaths: ["/sign-up/email"],
  session: {
    expiresIn: SESSION_EXPIRES_IN,
    updateAge: SESSION_UPDATE_AGE,
    additionalFields: {
      /**
       * The opaque token the GraphQL API would verify, stored next to the session that owns it.
       *
       * Both flags are the point of this field. `returned: false` keeps it out of every
       * response body, so GET /api/auth/get-session cannot hand it to a script on the page;
       * `input: false` keeps it out of every request body, so nobody can set their own. That
       * makes it genuinely server-owned, which is the thing the Auth.js session callback had
       * no way to express: there, one field added for a Server Action was published to the
       * browser at the same time.
       *
       * Because `returned: false` also hides it from `auth.api.getSession()`, the Server
       * Action reads it through readAccessToken() in access-token.ts rather than off the
       * session object. The token never appears in a session payload in any code path.
       */
      accessToken: {
        type: "string",
        required: false,
        input: false,
        returned: false,
      },
    },
  },
  databaseHooks: {
    session: {
      create: {
        /**
         * Runs once per sign-in, before the session row is written. This is where the Auth.js
         * `jwt` callback used to mint the token. A credentials-style login has no identity
         * provider handing out API tokens, so the demo invents one; it stands in for the
         * token a real upstream would issue and verify.
         */
        before: async (session) => ({
          data: { ...session, accessToken: crypto.randomUUID() },
        }),
      },
    },
  },
  /**
   * Must be last in the array. A Server Action cannot set a cookie by returning a Set-Cookie
   * header, so this plugin forwards whatever Better Auth wanted to set through Next.js's own
   * cookies() helper.
   */
  plugins: [nextCookies()],
});
