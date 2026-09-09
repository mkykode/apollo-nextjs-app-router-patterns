"use server";

import { revalidatePath, updateTag } from "next/cache";
import { IncrementTrackViewsDocument } from "@/__generated__/graphql";
import { getClient } from "@/lib/apollo/rsc-client";
import { trackTag } from "@/lib/cache-tags";

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
 * Same mutation, for the /use-cache pattern, followed by both on-demand invalidation APIs:
 * - updateTag expires the track's cached function result immediately, so the render
 *   triggered by this click reads the new count (read-your-own-writes).
 * - revalidatePath marks the cached list page for regeneration on its next request
 *   (updateTag(TRACKS_TAG) would do the same through the page's cacheTag).
 * revalidateTag(tag, "max") is the third option, used by /api/revalidate: serve the stale
 * entry once more while refreshing in the background.
 */
export async function incrementTrackViewsAndUpdateCache(trackId: string) {
  const result = await incrementTrackViews(trackId);
  updateTag(trackTag(trackId));
  revalidatePath("/use-cache");
  return result;
}
