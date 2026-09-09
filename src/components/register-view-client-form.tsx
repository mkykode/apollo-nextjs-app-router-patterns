"use client";

import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { useFragment, useMutation } from "@apollo/client/react";
import { type FormEvent, useState } from "react";
import {
  IncrementTrackViewsDocument,
  RegisterViewClientForm_TrackFragmentDoc,
} from "@/__generated__/graphql";
import { type RegisterViewFieldErrors, parseRegisterView } from "@/lib/schemas/register-view";
import { Button } from "./button";
import { ContentSection } from "./content-section";
import styles from "./register-view-form.module.css";

/**
 * A form that is entirely a Client Component, wired to Apollo:
 * - the same Zod schema validates in the browser; the GraphQL server validates again and
 *   its errors come back typed (CombinedGraphQLErrors for resolver errors, ServerError
 *   for HTTP failures), all satisfying ErrorLike.
 * - useFragment subscribes to the Track entity in the normalized cache, so the count shown
 *   here is the same object TrackDetail renders and updates the instant the cache changes.
 * - useMutation runs the mutation from the browser. optimisticResponse writes the expected
 *   result into the cache before the server answers; the real response then replaces it,
 *   or a failure rolls it back.
 */
export function RegisterViewClientForm({ trackId }: { trackId: string }) {
  const { data: track, complete } = useFragment({
    fragment: RegisterViewClientForm_TrackFragmentDoc,
    from: { __typename: "Track", id: trackId },
  });
  const [registerView, { loading, error, reset }] = useMutation(IncrementTrackViewsDocument);
  const [fieldErrors, setFieldErrors] = useState<RegisterViewFieldErrors>({});
  const numberOfViews = complete ? (track.numberOfViews ?? 0) : 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { data, fieldErrors: errors } = parseRegisterView(new FormData(event.currentTarget));
    setFieldErrors(errors ?? {});
    if (!data) return;

    // One mutation per view, in parallel. Each optimistic write bumps the count by one more;
    // the server responses then settle on the real total. Rejections surface through `error`.
    void Promise.all(
      Array.from({ length: data.views }, (_, index) =>
        registerView({
          variables: { trackId },
          optimisticResponse: {
            incrementTrackViews: {
              __typename: "IncrementTrackViewsResponse",
              code: 200,
              success: true,
              message: "optimistic",
              track: { __typename: "Track", id: trackId, numberOfViews: numberOfViews + index + 1 },
            },
          },
        }),
      ),
    ).catch(() => undefined);
  };

  return (
    <ContentSection>
      <form onSubmit={handleSubmit} noValidate className={styles.form}>
        <input type="hidden" name="trackId" value={trackId} />
        <p className={styles.label}>
          Client form: validated in the browser with the same schema, then useMutation runs
          the mutation here and the normalized cache updates every reader of this track,
          optimistically first.
        </p>
        <p className={styles.count} data-testid="cache-views">
          Cache says: {`${numberOfViews} view(s)`}
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
            aria-describedby={fieldErrors.views ? "client-form-views-error" : undefined}
          />
        </label>
        {fieldErrors.views ? (
          <p id="client-form-views-error" role="alert" className={styles.error}>
            {fieldErrors.views}
          </p>
        ) : null}
        <Button type="submit" disabled={loading} aria-busy={loading}>
          {loading ? "Registering..." : "Register views"}
        </Button>
        {error ? (
          <p role="alert" className={styles.error}>
            {CombinedGraphQLErrors.is(error)
              ? `The API rejected it: ${error.errors.map((graphqlError) => graphqlError.message).join(", ")}`
              : error.message}{" "}
            <button type="button" onClick={reset} className={styles.dismiss}>
              Dismiss
            </button>
          </p>
        ) : null}
      </form>
    </ContentSection>
  );
}
