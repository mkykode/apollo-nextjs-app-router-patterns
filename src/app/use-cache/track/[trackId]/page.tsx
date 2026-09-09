import type { Metadata } from "next";
import { GetTracksDocument } from "@/__generated__/graphql";
import { PageContainer } from "@/components/page-container";
import { TrackDetail } from "@/components/track-detail";
import { rethrowAsNotFound } from "@/lib/apollo/not-found";
import { query } from "@/lib/apollo/rsc-client";
import { getCachedTrack } from "@/lib/data/tracks";

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

/**
 * Under Cache Components every dynamic route has a prerendered shell that is served with a
 * 200 before anything runs, so a data-driven notFound() can only render in place. For a
 * finite, known set of ids, `dynamicParams = false` is the way to a real 404: any id that
 * generateStaticParams did not return is rejected by the router before rendering.
 */
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { trackId } = await params;
  const track = await getCachedTrack(trackId).catch(rethrowAsNotFound);
  return { title: track.title };
}

export default async function CachedTrackPage({ params }: Props) {
  const { trackId } = await params;
  // Still mapped, for the case where a listed track disappears from the API later.
  const track = await getCachedTrack(trackId).catch(rethrowAsNotFound);

  return (
    <PageContainer>
      <TrackDetail track={track} />
    </PageContainer>
  );
}
