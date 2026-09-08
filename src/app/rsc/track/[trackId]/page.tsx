import type { Metadata } from "next";
import { GetTrackDocument } from "@/__generated__/graphql";
import { PageContainer } from "@/components/page-container";
import { TrackDetail } from "@/components/track-detail";
import { query } from "@/lib/apollo/rsc-client";

type Props = PageProps<"/rsc/track/[trackId]">;

const getTrack = (trackId: string) =>
  query({ query: GetTrackDocument, variables: { trackId }, errorPolicy: "none" });

/**
 * generateMetadata and the page both run GetTrack. Because registerApolloClient shares
 * one client per request, the second call is served from that client's cache:
 * one network request, not two. Only RSC data can drive metadata like this.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { trackId } = await params;
  const { data } = await getTrack(trackId);
  return { title: data.track.title };
}

export default async function RscTrackPage({ params }: Props) {
  const { trackId } = await params;
  const { data } = await getTrack(trackId);

  return (
    <PageContainer>
      <TrackDetail track={data.track} />
    </PageContainer>
  );
}
