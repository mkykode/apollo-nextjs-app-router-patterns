import type { Metadata } from "next";
import { Suspense, ViewTransition } from "react";
import { GetTrackDocument, GetTracksDocument } from "@/__generated__/graphql";
import { BackLink } from "@/components/back-link";
import { MoreTracks } from "@/components/more-tracks";
import { PageContainer } from "@/components/page-container";
import { PageTransition } from "@/components/page-transition";
import { QuickViewButton } from "@/components/quick-view-button";
import { RegisterViewForm } from "@/components/register-view-form";
import { SignInPrompt } from "@/components/sign-in-prompt";
import { MoreTracksSkeleton, TrackDetailSkeleton } from "@/components/skeletons";
import { TrackDetail } from "@/components/track-detail";
import { rethrowAsNotFound } from "@/lib/apollo/not-found";
import { query } from "@/lib/apollo/rsc-client";
import { auth } from "@/lib/auth/auth";
import { trackHref, tracksHref } from "@/lib/patterns";

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
 *
 * Each reveal is animated: the fallback's <ViewTransition> exits downwards and the content's
 * enters from below. They are two boundaries, not one around the Suspense, so React treats
 * the swap as exit plus enter rather than a crossfade of one snapshot. Because this page
 * suspends before its cover renders, the card-to-cover morph never pairs here; it does on
 * the prefetched /revalidate pages.
 */
export default async function RscTrackPage({ params }: Props) {
  const { trackId } = await params;

  return (
    <PageTransition>
      <PageContainer>
        <BackLink href={tracksHref("rsc")}>All tracks</BackLink>
        <Suspense
          fallback={
            <ViewTransition exit="slide-down" default="none">
              <TrackDetailSkeleton />
            </ViewTransition>
          }
        >
          <ViewTransition enter="slide-up" default="none">
            <TrackSection trackId={trackId} />
          </ViewTransition>
        </Suspense>
        <Suspense
          fallback={
            <ViewTransition exit="slide-down" default="none">
              <MoreTracksSkeleton />
            </ViewTransition>
          }
        >
          <ViewTransition enter="slide-up" default="none">
            <MoreTracksSection currentTrackId={trackId} />
          </ViewTransition>
        </Suspense>
      </PageContainer>
    </PageTransition>
  );
}

/**
 * The session is read next to the data, inside the boundary, so the request-time cookie read
 * never blocks the shell. Signed out, the form gives way to a sign-in link; the action would
 * refuse anyway, so this is a courtesy, not the check.
 */
async function TrackSection({ trackId }: { trackId: string }) {
  const [{ data }, session] = await Promise.all([getTrack(trackId), auth()]);
  return (
    <>
      <TrackDetail track={data.track} />
      <QuickViewButton trackId={trackId} />
      {session?.user ? (
        <RegisterViewForm trackId={trackId} numberOfViews={data.track.numberOfViews ?? 0} />
      ) : (
        <SignInPrompt callbackUrl={trackHref("rsc", trackId)} />
      )}
    </>
  );
}

async function MoreTracksSection({ currentTrackId }: { currentTrackId: string }) {
  const { data } = await query({ query: GetTracksDocument, errorPolicy: "none" });
  const others = data.tracksForHome.filter(({ id }) => id !== currentTrackId).slice(0, 4);
  return <MoreTracks tracks={others} href={(id) => trackHref("rsc", id)} />;
}
