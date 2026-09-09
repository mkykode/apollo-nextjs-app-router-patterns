import { GetTracksDocument } from "@/__generated__/graphql";
import { PageContainer } from "@/components/page-container";
import { TrackGrid } from "@/components/track-grid";
import { incrementTrackViewsAndUpdateCache } from "@/lib/actions/increment-track-views";
import { query } from "@/lib/apollo/rsc-client";
import { TRACKS_TAG } from "@/lib/cache-tags";

/**
 * Pattern 6: RSC + the Next.js Data Cache.
 * Same client and query as /rsc, but the response is stored in Next's Data Cache for a
 * minute and tagged. Next.js serves the cached response and refreshes it in the background
 * (stale-while-revalidate), and the route itself is prerendered: check the build output.
 * A click runs a Server Action that calls updateTag, so the next render is fresh.
 */
export default async function CachedTracksPage() {
  const { data } = await query({
    query: GetTracksDocument,
    errorPolicy: "none",
    context: { fetchOptions: { next: { revalidate: 60, tags: [TRACKS_TAG] } } },
  });

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
