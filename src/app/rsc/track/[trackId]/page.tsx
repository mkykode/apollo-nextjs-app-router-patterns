import type { Metadata } from "next";
import { Suspense } from "react";
import { GetTrackDocument, GetTracksDocument } from "@/__generated__/graphql";
import { MoreTracks } from "@/components/more-tracks";
import { PageContainer } from "@/components/page-container";
import { QuickViewButton } from "@/components/quick-view-button";
import { RegisterViewForm } from "@/components/register-view-form";
import { MoreTracksSkeleton, TrackDetailSkeleton } from "@/components/skeletons";
import { TrackDetail } from "@/components/track-detail";
import { rethrowAsNotFound } from "@/lib/apollo/not-found";
import { query } from "@/lib/apollo/rsc-client";
import { trackHref } from "@/lib/patterns";

type Props = PageProps<"/rsc/track/[trackId]">;

/** Unknown ids become a 404 page instead of an error boundary. */
const getTrack = (trackId: string) =>
  query({ query: GetTrackDocument, variables: { trackId }, errorPolicy: "none" }).catch(
    rethrowAsNotFound,
  );

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

/**
 * The page itself awaits nothing but params. Each section is an async Server Component in
 * its own Suspense boundary, so the two queries start in parallel and each streams in
 * behind a skeleton shaped like the content, whichever finishes first.
 */
export default async function RscTrackPage({ params }: Props) {
  const { trackId } = await params;

  return (
    <PageContainer>
      <Suspense fallback={<TrackDetailSkeleton />}>
        <TrackSection trackId={trackId} />
      </Suspense>
      <Suspense fallback={<MoreTracksSkeleton />}>
        <MoreTracksSection currentTrackId={trackId} />
      </Suspense>
    </PageContainer>
  );
}

async function TrackSection({ trackId }: { trackId: string }) {
  const { data } = await getTrack(trackId);
  return (
    <>
      <TrackDetail track={data.track} />
      <QuickViewButton trackId={trackId} />
      <RegisterViewForm trackId={trackId} numberOfViews={data.track.numberOfViews ?? 0} />
    </>
  );
}

async function MoreTracksSection({ currentTrackId }: { currentTrackId: string }) {
  const { data } = await query({ query: GetTracksDocument, errorPolicy: "none" });
  const others = data.tracksForHome.filter(({ id }) => id !== currentTrackId).slice(0, 4);
  return <MoreTracks tracks={others} href={(id) => trackHref("rsc", id)} />;
}
