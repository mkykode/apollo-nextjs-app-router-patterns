"use client";

import { useSuspenseQuery } from "@apollo/client/react";
import { GetTracksDocument } from "@/__generated__/graphql";
import { PageContainer } from "@/components/page-container";
import { TrackGrid } from "@/components/track-grid";
import { useIncrementTrackViews } from "@/lib/hooks/use-increment-track-views";

/**
 * Pattern 2: Client Component with useSuspenseQuery.
 * Rendered twice: during streaming SSR (the request runs on the server and the result is
 * streamed into the HTML alongside the markup) and in the browser, where the transported
 * result hydrates the cache so no second request is made. The route-level loading.tsx is
 * the Suspense boundary. Errors throw to error.tsx.
 */
export default function SuspenseTracksPage() {
  const { data } = useSuspenseQuery(GetTracksDocument);
  const incrementTrackViews = useIncrementTrackViews();

  return (
    <PageContainer grid>
      <TrackGrid tracks={data.tracksForHome} pattern="suspense" onOpenTrack={incrementTrackViews} />
    </PageContainer>
  );
}
