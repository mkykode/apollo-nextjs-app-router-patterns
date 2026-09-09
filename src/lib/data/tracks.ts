import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { GetTrackDocument, GetTracksDocument } from "@/__generated__/graphql";
import { query } from "@/lib/apollo/rsc-client";
import { TRACKS_TAG, trackTag } from "@/lib/cache-tags";

/**
 * Cached data access for the /use-cache pattern under Cache Components.
 *
 * "use cache" memoizes the function's return value, keyed by its arguments, across requests.
 * cacheLife("minutes") = fresh for 1 minute, served stale for up to 5 minutes while
 * revalidating, dropped after 1 hour. cacheTag names the entry so a Server Action can expire
 * it with updateTag. The Apollo client inside is still the per-request one; on a cache hit
 * this function does not run at all, so neither does the GraphQL request.
 *
 * Return values must be serializable: return `data`, never the client or a queryRef.
 */
export async function getCachedTracks() {
  "use cache";
  cacheLife("minutes");
  cacheTag(TRACKS_TAG);

  const { data } = await query({ query: GetTracksDocument, errorPolicy: "none" });
  return data.tracksForHome;
}

export async function getCachedTrack(trackId: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(trackTag(trackId));

  const { data } = await query({
    query: GetTrackDocument,
    variables: { trackId },
    errorPolicy: "none",
  });
  return data.track;
}
