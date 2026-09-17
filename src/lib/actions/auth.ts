"use server";

import { APIError } from "better-auth/api";
import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { ACCOUNT_PATH } from "@/lib/auth/paths";
import { type LoginFieldErrors, parseLogin } from "@/lib/schemas/login";

/** Returned to useActionState; must be serializable. */
export type LoginState =
  | { status: "idle" }
  | { status: "invalid"; fieldErrors: LoginFieldErrors }
  | { status: "failed"; message: string };

/**
 * Form action behind useActionState. `auth.api.signInEmail` runs the same code the HTTP
 * endpoint runs, in-process: it verifies the password, writes a session row, and asks for a
 * Set-Cookie. A Server Action cannot set a cookie by returning a header, so the nextCookies()
 * plugin in auth.ts is what actually lands it.
 *
 * Wrong credentials come back as an APIError with a 401, which becomes state the form can
 * show. Anything else is rethrown to error.tsx.
 *
 * redirect() is called here rather than passed to signInEmail so the flow is visible: sign in,
 * then navigate to where the user was going. redirect() throws, so nothing runs after it.
 */
export async function authenticate(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const { data, fieldErrors } = parseLogin(formData);
  if (fieldErrors) {
    return { status: "invalid", fieldErrors };
  }

  try {
    await auth.api.signInEmail({
      body: { email: data.email, password: data.password },
    });
  } catch (error) {
    if (error instanceof APIError) {
      return {
        status: "failed",
        message: error.status === "UNAUTHORIZED" ? "Wrong email or password" : "Could not sign you in",
      };
    }
    throw error;
  }

  redirect((data.redirectTo ?? ACCOUNT_PATH) as Route);
}

/**
 * Deletes the session row and clears the cookie, then returns to the home page. Bound to a
 * plain <form action>. Unlike the Auth.js version this is a real revocation: the row is gone,
 * so the session cannot be used again even if someone kept a copy of the cookie.
 */
export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}
