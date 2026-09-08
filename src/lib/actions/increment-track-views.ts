"use server";

import { IncrementTrackViewsDocument } from "@/__generated__/graphql";
import { getClient } from "@/lib/apollo/rsc-client";

/**
 * Server Action version of the mutation: the browser posts to Next.js, and the
 * GraphQL request is made server-side with the RSC client. Use this when the
 * page itself was rendered in RSC, because there is no browser cache to update.
 */
export async function incrementTrackViews(trackId: string) {
  const { data } = await getClient().mutate({
    mutation: IncrementTrackViewsDocument,
    variables: { trackId },
  });
  return data?.incrementTrackViews ?? null;
}
