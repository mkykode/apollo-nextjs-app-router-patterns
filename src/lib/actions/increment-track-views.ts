"use server";

import { IncrementTrackViewsDocument } from "@/__generated__/graphql";
import { getClient } from "@/lib/apollo/rsc-client";

/**
 * Server Action version of the mutation: the browser posts to Next.js, and the
 * GraphQL request is made server-side with the RSC client. Use this when the
 * page itself was rendered in RSC, because there is no browser cache to update.
 */
const TRACK_ID = /^[\w-]{1,64}$/;

export async function incrementTrackViews(trackId: string) {
  // Every "use server" export is a public endpoint: validate before forwarding.
  if (typeof trackId !== "string" || !TRACK_ID.test(trackId)) {
    throw new Error("Invalid track id");
  }
  const { data } = await getClient().mutate({
    mutation: IncrementTrackViewsDocument,
    variables: { trackId },
  });
  return data?.incrementTrackViews ?? null;
}
