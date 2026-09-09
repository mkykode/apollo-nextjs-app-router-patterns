import { PageContainer } from "@/components/page-container";
import { TrackGridSkeleton } from "@/components/skeletons";

/**
 * A route group, `(list)`, scopes this loading.tsx to the list page only: without the group
 * it would sit at /rsc and also wrap /rsc/track/[trackId], where a grid skeleton is wrong.
 * Groups never appear in the URL; this page is still /rsc.
 */
export default function RscListLoading() {
  return (
    <PageContainer grid>
      <TrackGridSkeleton />
    </PageContainer>
  );
}
