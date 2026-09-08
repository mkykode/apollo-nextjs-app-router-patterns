"use client";

import { useQuery } from "@apollo/client/react";
import { use } from "react";
import { GetTrackDocument } from "@/__generated__/graphql";
import { PageContainer } from "@/components/page-container";
import { QueryResult } from "@/components/query-result";
import { TrackDetail } from "@/components/track-detail";

export default function LegacyTrackPage({ params }: PageProps<"/legacy/track/[trackId]">) {
  const { trackId } = use(params);
  const { loading, error, data } = useQuery(GetTrackDocument, { variables: { trackId } });

  return (
    <PageContainer>
      <QueryResult loading={loading} error={error} data={data}>
        {data ? <TrackDetail track={data.track} /> : null}
      </QueryResult>
    </PageContainer>
  );
}
