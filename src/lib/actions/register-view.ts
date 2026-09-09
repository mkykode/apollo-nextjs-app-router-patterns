"use server";

import { revalidatePath } from "next/cache";
import { IncrementTrackViewsDocument } from "@/__generated__/graphql";
import { getClient } from "@/lib/apollo/rsc-client";
import { type RegisterViewFieldErrors, parseRegisterView } from "@/lib/schemas/register-view";

/** Returned to useActionState; must be serializable. */
export type RegisterViewState =
  | { status: "idle" }
  | { status: "invalid"; fieldErrors: RegisterViewFieldErrors }
  | { status: "failed"; message: string }
  | { status: "registered"; views: number; numberOfViews: number };

/**
 * Form action for the Server Action form, in the (previousState, formData) shape that
 * useActionState expects. The browser posts the form, Next.js calls this with the FormData,
 * and the mutation runs on the server with the RSC client.
 *
 * Validation runs here even though the form validated in the browser: every "use server"
 * export is a public endpoint. Errors are returned, not thrown, so the form can show them.
 *
 * revalidatePath is what makes the page update: an action that revalidates nothing returns
 * only its value and Next.js does not re-render the route. With it, the action response
 * carries the re-rendered page, so TrackDetail shows the new count in the same roundtrip.
 */
export async function registerView(
  _previous: RegisterViewState,
  formData: FormData,
): Promise<RegisterViewState> {
  const { data, fieldErrors } = parseRegisterView(formData);
  if (fieldErrors) {
    return { status: "invalid", fieldErrors };
  }

  const { trackId, views } = data;
  let numberOfViews = 0;
  try {
    for (let registered = 0; registered < views; registered += 1) {
      const result = await getClient().mutate({
        mutation: IncrementTrackViewsDocument,
        variables: { trackId },
      });
      numberOfViews = result.data?.incrementTrackViews.track?.numberOfViews ?? numberOfViews;
    }
  } catch (error) {
    return {
      status: "failed",
      message: error instanceof Error ? error.message : "The mutation failed",
    };
  }

  revalidatePath(`/rsc/track/${trackId}`);
  return { status: "registered", views, numberOfViews };
}
