import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { GetTrackDocument } from "@/__generated__/graphql";
import { isNotFoundError } from "@/lib/apollo/not-found";
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
 *
 * Unknown ids resolve to null instead of throwing: errors leave a "use cache" scope as
 * plain errors (Apollo's branded class is lost), notFound() must not be called inside one,
 * and "this id does not exist" is a perfectly cacheable answer. The page decides.
 */
export async function getCachedTrack(trackId: string) {
  "use cache";
  cacheLife("track");
  cacheTag(trackTag(trackId));

  try {
    const { data } = await query({
      query: GetTrackDocument,
      variables: { trackId },
      errorPolicy: "none",
    });
    return data.track;
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
}
