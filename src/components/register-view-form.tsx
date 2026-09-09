"use client";

import { type FormEvent, useActionState, useOptimistic, useState } from "react";
import { type RegisterViewState, registerView } from "@/lib/actions/register-view";
import { type RegisterViewFieldErrors, parseRegisterView } from "@/lib/schemas/register-view";
import { Button } from "./button";
import { ContentSection } from "./content-section";
import styles from "./register-view-form.module.css";

const IDLE: RegisterViewState = { status: "idle" };

interface RegisterViewFormProps {
  trackId: string;
  /** The server-rendered count; the base value for the optimistic one. */
  numberOfViews: number;
}

/**
 * The Server Action form. The component is a Client Component because it holds state
 * (useActionState), but the mutation runs on the server: the form action posts to Next.js,
 * which calls registerView. It still works with JavaScript disabled; the browser then
 * submits the form natively and only the server-side validation runs.
 *
 * Client-side validation happens in onSubmit with the same Zod schema. When it fails,
 * preventDefault stops the action from being dispatched, so no round trip is made.
 *
 * useOptimistic is React's counterpart to Apollo's optimisticResponse for Server Actions:
 * addViews shows the expected count while the action is pending, and React discards the
 * optimistic value when the action settles, replacing it with whatever the re-rendered page
 * passes in as numberOfViews (the new count on success, the old one on failure).
 */
export function RegisterViewForm({ trackId, numberOfViews }: RegisterViewFormProps) {
  const [state, formAction, pending] = useActionState(registerView, IDLE);
  const [optimisticViews, addViews] = useOptimistic(
    numberOfViews,
    (current, added: number) => current + added,
  );
  const [clientErrors, setClientErrors] = useState<RegisterViewFieldErrors>({});

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const { fieldErrors } = parseRegisterView(new FormData(event.currentTarget));
    setClientErrors(fieldErrors ?? {});
    if (fieldErrors) {
      event.preventDefault();
    }
  };

  // The form action runs inside a transition, which is where useOptimistic updates must happen.
  const submit = (formData: FormData) => {
    const { data } = parseRegisterView(formData);
    if (data) {
      addViews(data.views);
    }
    formAction(formData);
  };

  const fieldErrors = state.status === "invalid" ? state.fieldErrors : clientErrors;

  return (
    <ContentSection>
      <form action={submit} onSubmit={handleSubmit} noValidate className={styles.form}>
        <input type="hidden" name="trackId" value={trackId} />
        <p className={styles.label}>
          Server Action form: validated in the browser, validated again and run on the server,
          then Next.js re-renders this page with the new count. The count below is optimistic
          while the action runs.
        </p>
        <p className={styles.count} data-testid="optimistic-views">
          Server count: {`${optimisticViews} view(s)`}
          {pending ? " (pending)" : ""}
        </p>
        <label className={styles.field}>
          Views to register
          <input
            name="views"
            type="number"
            min={1}
            max={5}
            defaultValue={1}
            aria-invalid={fieldErrors.views ? true : undefined}
            aria-describedby={fieldErrors.views ? "server-form-views-error" : undefined}
          />
        </label>
        {fieldErrors.views ? (
          <p id="server-form-views-error" role="alert" className={styles.error}>
            {fieldErrors.views}
          </p>
        ) : null}
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Registering..." : "Register views"}
        </Button>
        {state.status === "registered" ? (
          <p className={styles.count}>
            Registered {state.views} view(s). The server now counts {state.numberOfViews}.
          </p>
        ) : null}
        {state.status === "failed" ? (
          <p role="alert" className={styles.error}>
            {state.message}
          </p>
        ) : null}
      </form>
    </ContentSection>
  );
}
