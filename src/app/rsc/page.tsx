import { GetTracksDocument } from "@/__generated__/graphql";
import { PageContainer } from "@/components/page-container";
import { TrackGrid } from "@/components/track-grid";
import { incrementTrackViews } from "@/lib/actions/increment-track-views";
import { query } from "@/lib/apollo/rsc-client";

/**
 * Pattern 1: React Server Component.
 * The GraphQL request happens on the server during render. The HTML arrives complete,
 * no Apollo code or data is shipped for this page, and the browser cache knows nothing about it.
 * The mutation therefore runs through a Server Action instead of useMutation.
 *
 * errorPolicy "none" is the default, but stating it narrows `data` to a defined value:
 * GraphQL errors reject the promise and land in error.tsx.
 */
export default async function RscTracksPage() {
  const { data } = await query({ query: GetTracksDocument, errorPolicy: "none" });

  return (
    <PageContainer grid>
      <TrackGrid tracks={data.tracksForHome} pattern="rsc" onOpenTrack={incrementTrackViews} />
    </PageContainer>
  );
}
