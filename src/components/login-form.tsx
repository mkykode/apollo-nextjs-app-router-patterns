"use client";

import { type FormEvent, useActionState, useState } from "react";
import { type LoginState, authenticate } from "@/lib/actions/auth";
import { type LoginFieldErrors, parseLogin } from "@/lib/schemas/login";
import { Button } from "./button";
import styles from "./login-form.module.css";

const IDLE: LoginState = { status: "idle" };

interface LoginFormProps {
  /** Where to go after signing in; already checked to be a relative path. */
  redirectTo: string;
}

/**
 * Same shape as the register-view form: useActionState around a Server Action, the Zod
 * schema run in onSubmit so a typo never costs a round trip, and the server's verdict shown
 * from the returned state. The action ends in a redirect, so a successful submit never
 * produces a new state here; the router simply navigates.
 */
export function LoginForm({ redirectTo }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(authenticate, IDLE);
  const [clientErrors, setClientErrors] = useState<LoginFieldErrors>({});

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const { fieldErrors } = parseLogin(new FormData(event.currentTarget));
    setClientErrors(fieldErrors ?? {});
    if (fieldErrors) {
      event.preventDefault();
    }
  };

  const fieldErrors = state.status === "invalid" ? state.fieldErrors : clientErrors;

  return (
    <form action={formAction} onSubmit={handleSubmit} noValidate className={styles.form}>
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <label className={styles.field}>
        Email
        <input
          name="email"
          type="email"
          autoComplete="username"
          aria-invalid={fieldErrors.email ? true : undefined}
          aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
        />
      </label>
      {fieldErrors.email ? (
        <p id="login-email-error" role="alert" className={styles.error}>
          {fieldErrors.email}
        </p>
      ) : null}
      <label className={styles.field}>
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={fieldErrors.password ? true : undefined}
          aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
        />
      </label>
      {fieldErrors.password ? (
        <p id="login-password-error" role="alert" className={styles.error}>
          {fieldErrors.password}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </Button>
      {state.status === "failed" ? (
        <p role="alert" className={styles.error}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
