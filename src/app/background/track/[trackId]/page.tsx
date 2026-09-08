"use client";

import { type QueryRef, useBackgroundQuery, useReadQuery } from "@apollo/client/react";
import { Suspense, use } from "react";
import { type GetTrackQuery, GetTrackDocument } from "@/__generated__/graphql";
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
    </PageContainer>
  );
}

function TrackReader({ queryRef }: { queryRef: QueryRef<GetTrackQuery> }) {
  const { data } = useReadQuery(queryRef);
  return <TrackDetail track={data.track} />;
}
