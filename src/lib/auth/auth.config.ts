import type { NextAuthConfig } from "next-auth";
import { ACCOUNT_PATH, SIGN_IN_PATH, isProtectedPath, signInHref } from "./paths";

/**
 * The part of the Auth.js configuration the proxy can run: no provider that needs Node (the
 * credentials check imports node:crypto), no database. auth.ts spreads this and adds the
 * provider; proxy.ts uses it as is.
 */
export const authConfig = {
  pages: { signIn: SIGN_IN_PATH },
  // A JWT in an HttpOnly cookie: no session store, and the proxy can decode it without I/O.
  session: { strategy: "jwt" },
  // The demo runs on whatever host starts it; a deployment sets AUTH_URL instead.
  trustHost: true,
  providers: [],
  callbacks: {
    /**
     * Runs in the proxy for every matched request with nothing but the decoded cookie: an
     * optimistic check. It keeps strangers off /account and signed-in users off /login. The
     * data itself is protected where it is read (auth() in the page and in the Server Action).
     */
    authorized({ auth, request: { nextUrl } }) {
      const signedIn = Boolean(auth?.user);
      if (isProtectedPath(nextUrl.pathname)) {
        if (signedIn) return true;
        // Auth.js would redirect on `false` too, but with an absolute callbackUrl; a path is enough.
        return Response.redirect(new URL(signInHref(nextUrl.pathname + nextUrl.search), nextUrl.origin));
      }
      if (nextUrl.pathname === SIGN_IN_PATH && signedIn) {
        return Response.redirect(new URL(ACCOUNT_PATH, nextUrl.origin));
      }
      return true;
    },
    /**
     * Runs when the JWT is created and whenever it is read; `user` is only set at sign-in.
     * A credentials provider has no identity provider handing out API tokens, so the demo mints
     * an opaque one here. It stands in for the token a real upstream would verify.
     */
    jwt({ token, user }) {
      if (user) {
        token.accessToken = crypto.randomUUID();
      }
      return token;
    },
    /** Shapes what auth() returns. Only copy what the app needs; the JWT itself stays server-side. */
    session({ session, token }) {
      return { ...session, accessToken: token.accessToken ?? "" };
    },
  },
} satisfies NextAuthConfig;
