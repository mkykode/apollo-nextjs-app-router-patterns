"use client";

import { useQuery } from "@apollo/client/react";
import { use } from "react";
import { GetTrackDocument } from "@/__generated__/graphql";
import { PageContainer } from "@/components/page-container";
import { QueryResult } from "@/components/query-result";
import { TrackDetail } from "@/components/track-detail";
import { ViewportPanel } from "@/components/viewport-panel";

export default function LegacyTrackPage({ params }: PageProps<"/legacy/track/[trackId]">) {
  const { trackId } = use(params);
  const { loading, error, data } = useQuery(GetTrackDocument, { variables: { trackId } });

  return (
    <PageContainer>
      <QueryResult loading={loading} error={error} data={data}>
        {({ track }) => <TrackDetail track={track} />}
      </QueryResult>
      {/* Outside the QueryResult: it has no data of its own to wait for, and the contrast is
          the point. This page's track is missing from the server HTML because useQuery only
          runs in the browser, while the panel below is rendered on the server from a snapshot
          the server had to invent. */}
      <ViewportPanel />
    </PageContainer>
  );
}
