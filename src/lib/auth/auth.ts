import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { credentialsSchema } from "@/lib/schemas/login";
import { authConfig } from "./auth.config";
import { findUserByEmail, toUser, verifyPassword } from "./users";

/**
 * The full Auth.js instance, for the Node side: Route Handler, Server Components, Server
 * Actions. `auth()` reads the session cookie for the current request; `signIn` and `signOut`
 * are the server-side calls the actions wrap.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      /**
       * Called with the posted fields when the credentials provider runs. Returning null makes
       * Auth.js throw CredentialsSignin; returning a user makes it issue the session. The
       * schema runs again here because this endpoint is reachable without the form.
       */
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const user = findUserByEmail(parsed.data.email);
        if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) return null;
        return toUser(user);
      },
    }),
  ],
});
