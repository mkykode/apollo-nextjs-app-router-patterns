import { PageContainer } from "@/components/page-container";
import { TrackGrid } from "@/components/track-grid";
import { incrementTrackViewsAndUpdateCache } from "@/lib/actions/increment-track-views";
import { getCachedTracks } from "@/lib/data/tracks";

/**
 * Pattern 6 under Cache Components: RSC + "use cache".
 * The data function is cached with cacheLife and tagged with cacheTag, so this page is part
 * of the prerendered static shell and refreshes in the background. A click runs a Server
 * Action that calls updateTag, so the next render is fresh.
 */
export default async function CachedTracksPage() {
  const tracks = await getCachedTracks();

  return (
    <PageContainer grid>
      <TrackGrid tracks={tracks} pattern="cached" onOpenTrack={incrementTrackViewsAndUpdateCache} />
    </PageContainer>
  );
}
