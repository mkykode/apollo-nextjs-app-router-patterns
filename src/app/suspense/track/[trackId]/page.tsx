"use client";

import { useSuspenseQuery } from "@apollo/client/react";
import { use } from "react";
import { GetTrackDocument } from "@/__generated__/graphql";
import { PageContainer } from "@/components/page-container";
import { TrackDetail } from "@/components/track-detail";

/**
 * Client pages receive `params` as a Promise too; unwrap it with React's `use()`.
 * If the card on the list page was clicked, the mutation response already updated
 * `Track:<id>.numberOfViews` in the cache, and cache-first serves it here.
 */
export default function SuspenseTrackPage({ params }: PageProps<"/suspense/track/[trackId]">) {
  const { trackId } = use(params);
  const { data } = useSuspenseQuery(GetTrackDocument, { variables: { trackId } });

  return (
    <PageContainer>
      <TrackDetail track={data.track} />
    </PageContainer>
  );
}
