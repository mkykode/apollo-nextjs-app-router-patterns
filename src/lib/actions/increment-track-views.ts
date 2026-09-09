"use server";

import { updateTag } from "next/cache";
import { IncrementTrackViewsDocument } from "@/__generated__/graphql";
import { getClient } from "@/lib/apollo/rsc-client";
import { TRACKS_TAG, trackTag } from "@/lib/cache-tags";

const TRACK_ID = /^[\w-]{1,64}$/;

/**
 * Server Action version of the mutation: the browser posts to Next.js, and the
 * GraphQL request is made server-side with the RSC client. Use this when the
 * page itself was rendered in RSC, because there is no browser cache to update.
 */
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

/**
 * Same mutation, for routes that cache GraphQL responses in the Next.js Data Cache.
 * updateTag expires the tagged entries immediately, so the render triggered by this
 * click reads the new count (read-your-own-writes). revalidateTag(tag, "max") would
 * instead serve the stale entry once more while refreshing in the background.
 */
export async function incrementTrackViewsAndUpdateCache(trackId: string) {
  const result = await incrementTrackViews(trackId);
  updateTag(TRACKS_TAG);
  updateTag(trackTag(trackId));
  return result;
}
