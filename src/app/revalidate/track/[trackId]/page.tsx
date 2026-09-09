import type { Metadata } from "next";
import { GetTrackDocument, GetTracksDocument } from "@/__generated__/graphql";
import { PageContainer } from "@/components/page-container";
import { TrackDetail } from "@/components/track-detail";
import { rethrowAsNotFound } from "@/lib/apollo/not-found";
import { query } from "@/lib/apollo/rsc-client";
import { trackTag } from "@/lib/cache-tags";

type Props = PageProps<"/revalidate/track/[trackId]">;

/**
 * Prerender a page per track at build time. generateStaticParams runs the list query once
 * during `next build`; each returned param becomes a static page.
 */
export async function generateStaticParams() {
  const { data } = await query({ query: GetTracksDocument, errorPolicy: "none" });
  return data.tracksForHome.map(({ id }) => ({ trackId: id }));
}

/** Ids not returned above are rendered on first request and then cached (false would 404). */
export const dynamicParams = true;

/**
 * Fetch-level caching: this response lives in the Data Cache for a minute under its own tag,
 * so a Server Action (updateTag) or the /api/revalidate route handler (revalidateTag) can
 * expire exactly this track. Passed through Apollo's `context.fetchOptions` to Next's fetch.
 */
const getTrack = (trackId: string) =>
  query({
    query: GetTrackDocument,
    variables: { trackId },
    errorPolicy: "none",
    context: { fetchOptions: { next: { revalidate: 60, tags: [trackTag(trackId)] } } },
  }).catch(rethrowAsNotFound);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { trackId } = await params;
  const { data } = await getTrack(trackId);
  return { title: data.track.title };
}

export default async function CachedTrackPage({ params }: Props) {
  const { trackId } = await params;
  const { data } = await getTrack(trackId);

  return (
    <PageContainer>
      <TrackDetail track={data.track} />
    </PageContainer>
  );
}
