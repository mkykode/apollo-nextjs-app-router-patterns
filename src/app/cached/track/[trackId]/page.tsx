import type { Metadata } from "next";
import { PageContainer } from "@/components/page-container";
import { TrackDetail } from "@/components/track-detail";
import { getCachedTrack } from "@/lib/data/tracks";

type Props = PageProps<"/cached/track/[trackId]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { trackId } = await params;
  const track = await getCachedTrack(trackId);
  return { title: track.title };
}

export default async function CachedTrackPage({ params }: Props) {
  const { trackId } = await params;
  const track = await getCachedTrack(trackId);

  return (
    <PageContainer>
      <TrackDetail track={track} />
    </PageContainer>
  );
}
