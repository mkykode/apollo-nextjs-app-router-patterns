import type { DefaultSession } from "next-auth";

/** Module augmentation: the fields auth.config.ts adds to the session and the JWT. */
declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"];
    /** Opaque token for the upstream API, issued at sign-in. */
    accessToken: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
  }
}
