import { cacheLife, cacheTag } from "next/cache";
import { GetTracksDocument } from "@/__generated__/graphql";
import { PageContainer } from "@/components/page-container";
import { PageTransition } from "@/components/page-transition";
import { TrackGrid } from "@/components/track-grid";
import { incrementTrackViewsAndUpdateCache } from "@/lib/actions/increment-track-views";
import { query } from "@/lib/apollo/rsc-client";
import { TRACKS_TAG } from "@/lib/cache-tags";

/**
 * Pattern 6 under Cache Components: RSC + "use cache" at the component level.
 * The directive caches this page's rendered output (the JSX, with the Server Action reference
 * inside it), so the whole route is part of the prerendered static shell and refreshes in the
 * background per the built-in "minutes" profile. The detail page shows the function-level form.
 *
 * Cached output is part of the static shell and prefetched whole, so a navigation between this
 * list and a detail page renders the destination in the same commit: the directional slide
 * plays and the card's cover morphs into the detail cover.
 */
export default async function CachedTracksPage() {
  "use cache";
  cacheLife("minutes");
  cacheTag(TRACKS_TAG);

  const { data } = await query({ query: GetTracksDocument, errorPolicy: "none" });

  return (
    <PageTransition>
      <PageContainer grid>
        <TrackGrid
          tracks={data.tracksForHome}
          pattern="use-cache"
          onOpenTrack={incrementTrackViewsAndUpdateCache}
        />
      </PageContainer>
    </PageTransition>
  );
}
