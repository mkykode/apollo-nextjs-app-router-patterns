"use server";

import type { Route } from "next";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth/auth";
import { ACCOUNT_PATH } from "@/lib/auth/paths";
import { type LoginFieldErrors, parseLogin } from "@/lib/schemas/login";

/** Returned to useActionState; must be serializable. */
export type LoginState =
  | { status: "idle" }
  | { status: "invalid"; fieldErrors: LoginFieldErrors }
  | { status: "failed"; message: string };

/**
 * Form action behind useActionState. Auth.js's signIn runs the credentials provider and sets
 * the session cookie on this response. Wrong credentials surface as a CredentialsSignin
 * error, which becomes state the form can show; any other error is rethrown to error.tsx.
 *
 * redirect() is called here rather than left to signIn (redirect: false) so the flow is
 * visible: sign in, then navigate to where the user was going. redirect() throws, so nothing
 * runs after it.
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
    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        status: "failed",
        message:
          error.type === "CredentialsSignin" ? "Wrong email or password" : "Could not sign you in",
      };
    }
    throw error;
  }

  redirect((data.redirectTo ?? ACCOUNT_PATH) as Route);
}

/** Clears the session cookie and returns to the home page. Bound to a plain <form action>. */
export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
