import { GetTracksDocument } from "@/__generated__/graphql";
import { PageContainer } from "@/components/page-container";
import { TrackGrid } from "@/components/track-grid";
import { incrementTrackViewsAndUpdateCache } from "@/lib/actions/increment-track-views";
import { query } from "@/lib/apollo/rsc-client";

/**
 * Segment-level caching: the whole page is prerendered and regenerated at most once a minute
 * (Incremental Static Regeneration). The fetch inside needs no options; it simply runs whenever
 * the page is regenerated. Invalidate it by path: the Server Action calls revalidatePath.
 */
export const revalidate = 60;

/**
 * Pattern 6: RSC + the Next.js Data Cache.
 * Same client and query as /rsc, but nothing here is fetched per request. This list page is
 * cached at the segment level (above); the detail page caches at the fetch level with tags.
 * A click runs a Server Action that invalidates both, so the next render is fresh.
 */
export default async function CachedTracksPage() {
  const { data } = await query({ query: GetTracksDocument, errorPolicy: "none" });

  return (
    <PageContainer grid>
      <TrackGrid
        tracks={data.tracksForHome}
        pattern="revalidate"
        onOpenTrack={incrementTrackViewsAndUpdateCache}
      />
    </PageContainer>
  );
}
