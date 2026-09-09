import { connection } from "next/server";
import { Suspense } from "react";
import { GetTrackDocument } from "@/__generated__/graphql";
import { Loading } from "@/components/loading";
import { PageContainer } from "@/components/page-container";
import { PreloadQuery } from "@/lib/apollo/rsc-client";
import { TrackClient } from "./track-client";

/**
 * Pattern 3b: PreloadQuery render prop + useReadQuery.
 * Instead of repeating the query in the Client Component, the queryRef is passed down.
 * The child reads it with useReadQuery and gets refetch/fetchMore from useQueryRefHandlers.
 */
export default async function PreloadTrackPage({ params }: PageProps<"/preload/track/[trackId]">) {
  const { trackId } = await params;
  // Same reason as the list page: PreloadQuery cannot run during prerendering.
  await connection();

  return (
    <PageContainer>
      <PreloadQuery query={GetTrackDocument} variables={{ trackId }}>
        {(queryRef) => (
          <Suspense fallback={<Loading />}>
            <TrackClient queryRef={queryRef} />
          </Suspense>
        )}
      </PreloadQuery>
    </PageContainer>
  );
}
