import { PageContainer } from "@/components/page-container";
import { MoreTracksSkeleton, TrackDetailSkeleton } from "@/components/skeletons";

/**
 * Cache Components need a Suspense boundary above every read of request-time data, and the
 * page reads `params` before it renders its own boundaries. This one covers that first
 * await with the same skeletons the sections use, so the shell looks identical either way.
 */
export default function RscTrackLoading() {
  return (
    <PageContainer>
      <TrackDetailSkeleton />
      <MoreTracksSkeleton />
    </PageContainer>
  );
}
