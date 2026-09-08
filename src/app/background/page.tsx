"use client";

import { type QueryRef, useBackgroundQuery, useReadQuery } from "@apollo/client/react";
import { Suspense } from "react";
import { type GetTracksQuery, GetTracksDocument } from "@/__generated__/graphql";
import { Loading } from "@/components/loading";
import { PageContainer } from "@/components/page-container";
import { TrackGrid } from "@/components/track-grid";
import { useIncrementTrackViews } from "@/lib/hooks/use-increment-track-views";

/**
 * Pattern 4: useBackgroundQuery + useReadQuery, entirely in Client Components.
 * The parent kicks off the request without suspending, then the child suspends on the
 * queryRef. This avoids waterfalls when a parent needs to render before its data-bound
 * children. PreloadQuery is the RSC equivalent of this pattern.
 */
export default function BackgroundTracksPage() {
  const [queryRef] = useBackgroundQuery(GetTracksDocument);

  return (
    <PageContainer grid>
      <Suspense fallback={<Loading />}>
        <TracksReader queryRef={queryRef} />
      </Suspense>
    </PageContainer>
  );
}

function TracksReader({ queryRef }: { queryRef: QueryRef<GetTracksQuery> }) {
  const { data } = useReadQuery(queryRef);
  const incrementTrackViews = useIncrementTrackViews();

  return (
    <TrackGrid tracks={data.tracksForHome} pattern="background" onOpenTrack={incrementTrackViews} />
  );
}
