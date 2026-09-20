"use client";

import { type QueryRef, useBackgroundQuery, useReadQuery } from "@apollo/client/react";
import { Suspense, use } from "react";
import { type GetTrackQuery, GetTrackDocument } from "@/__generated__/graphql";
import { ActivityTabs } from "@/components/activity-tabs";
import { Loading } from "@/components/loading";
import { PageContainer } from "@/components/page-container";
import { TrackDetail } from "@/components/track-detail";

export default function BackgroundTrackPage({ params }: PageProps<"/background/track/[trackId]">) {
  const { trackId } = use(params);
  const [queryRef] = useBackgroundQuery(GetTrackDocument, { variables: { trackId } });

  return (
    <PageContainer>
      <Suspense fallback={<Loading />}>
        <TrackReader queryRef={queryRef} />
      </Suspense>
      {/* Its own boundary: ActivityTabs suspends on the track list, and the detail above
          should not wait for it. */}
      <Suspense fallback={null}>
        <ActivityTabs currentTrackId={trackId} />
      </Suspense>
    </PageContainer>
  );
}

function TrackReader({ queryRef }: { queryRef: QueryRef<GetTrackQuery> }) {
  const { data } = useReadQuery(queryRef);
  return <TrackDetail track={data.track} />;
}
