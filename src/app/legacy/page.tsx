"use client";

import { useQuery } from "@apollo/client/react";
import { GetTracksDocument } from "@/__generated__/graphql";
import { PageContainer } from "@/components/page-container";
import { QueryResult } from "@/components/query-result";
import { TrackGrid } from "@/components/track-grid";
import { useIncrementTrackViews } from "@/lib/hooks/use-increment-track-views";

/**
 * Pattern 5: useQuery, the way the Odyssey course teaches it.
 * useQuery never suspends, so the SSR pass renders the loading state and the request is
 * only made in the browser after hydration. Loading and error are handled by hand.
 * Still the right tool for polling, lazy queries, or when you must not block rendering.
 */
export default function LegacyTracksPage() {
  const { loading, error, data } = useQuery(GetTracksDocument);
  const incrementTrackViews = useIncrementTrackViews();

  return (
    <PageContainer grid>
      <QueryResult loading={loading} error={error} data={data}>
        {({ tracksForHome }) => (
          <TrackGrid tracks={tracksForHome} pattern="legacy" onOpenTrack={incrementTrackViews} />
        )}
      </QueryResult>
    </PageContainer>
  );
}
