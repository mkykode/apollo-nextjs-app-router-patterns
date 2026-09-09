import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { GetTrackDocument } from "@/__generated__/graphql";
import { query } from "@/lib/apollo/rsc-client";
import { trackTag } from "@/lib/cache-tags";

/**
 * Function-level "use cache" for the /use-cache detail page.
 *
 * The return value is memoized across requests, keyed by the arguments. cacheLife("track")
 * is the custom profile from next.config.ts; cacheTag names the entry so a Server Action
 * (updateTag) or the /api/revalidate route handler (revalidateTag) can expire exactly this
 * track. On a hit this function does not run at all, so neither does the GraphQL request.
 *
 * Return values must be serializable: return `data`, never the client or a queryRef.
 * The per-request Apollo client still works in here; React.cache just memoizes nothing.
 */
export async function getCachedTrack(trackId: string) {
  "use cache";
  cacheLife("track");
  cacheTag(trackTag(trackId));

  const { data } = await query({
    query: GetTrackDocument,
    variables: { trackId },
    errorPolicy: "none",
  });
  return data.track;
}
