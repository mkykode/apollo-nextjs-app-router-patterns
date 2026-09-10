import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GetTracksDocument } from "@/__generated__/graphql";
import { BackLink } from "@/components/back-link";
import { PageContainer } from "@/components/page-container";
import { PageTransition } from "@/components/page-transition";
import { TrackDetail } from "@/components/track-detail";
import { query } from "@/lib/apollo/rsc-client";
import { getCachedTrack } from "@/lib/data/tracks";
import { tracksHref } from "@/lib/patterns";

type Props = PageProps<"/use-cache/track/[trackId]">;

/**
 * Prerender a page per track at build time. generateStaticParams runs the list query once
 * during `next build`; combined with the cached data function, every known track page is
 * fully static. Ids not in the list render on first request (dynamicParams defaults to true).
 */
export async function generateStaticParams() {
  const { data } = await query({ query: GetTracksDocument, errorPolicy: "none" });
  return data.tracksForHome.map(({ id }) => ({ trackId: id }));
}

// `dynamicParams` is not available under Cache Components: ids that generateStaticParams did
// not return render on request, the cached function answers null for the ones the API does
// not know, and notFound() below renders the 404 UI in place (the shell already went out).

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { trackId } = await params;
  const track = await getCachedTrack(trackId);
  if (!track) notFound();
  return { title: track.title };
}

export default async function CachedTrackPage({ params }: Props) {
  const { trackId } = await params;
  const track = await getCachedTrack(trackId);
  if (!track) notFound();

  return (
    <PageTransition>
      <PageContainer>
        <BackLink href={tracksHref("use-cache")}>All tracks</BackLink>
        <TrackDetail track={track} />
      </PageContainer>
    </PageTransition>
  );
}
