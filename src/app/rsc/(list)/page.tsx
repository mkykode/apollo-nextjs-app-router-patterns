import { Suspense } from "react";
import { GetTracksDocument } from "@/__generated__/graphql";
import { PageContainer } from "@/components/page-container";
import { PageTransition } from "@/components/page-transition";
import { Pagination } from "@/components/pagination";
import { SearchBox, SearchBoxFallback } from "@/components/search-box";
import { TrackGrid } from "@/components/track-grid";
import { incrementTrackViews } from "@/lib/actions/increment-track-views";
import { query } from "@/lib/apollo/rsc-client";
import { filterTracks, paginate, parseSearch } from "@/lib/search";

const PLACEHOLDER = "Search tracks by title or author";

/**
 * Pattern 1: React Server Component.
 * The GraphQL request happens on the server during render. The HTML arrives complete,
 * no Apollo code or data is shipped for this page, and the browser cache knows nothing about it.
 * The mutation therefore runs through a Server Action instead of useMutation.
 *
 * Search and pagination are URL state: the page reads `searchParams` (a Promise in Next 16),
 * filters and slices the list on the server, and the SearchBox and Pagination only change
 * the URL. The API has no arguments for this, so the filtering happens here.
 *
 * errorPolicy "none" is the default, but stating it narrows `data` to a defined value:
 * GraphQL errors reject the promise and land in error.tsx.
 */
export default async function RscTracksPage({ searchParams }: PageProps<"/rsc">) {
  const { query: search, page: requestedPage } = parseSearch(await searchParams);
  const { data } = await query({ query: GetTracksDocument, errorPolicy: "none" });
  const matches = filterTracks(data.tracksForHome, search);
  const { items, page, totalPages } = paginate(matches, requestedPage);

  return (
    <PageTransition>
      <PageContainer grid>
        <Suspense fallback={<SearchBoxFallback placeholder={PLACEHOLDER} />}>
          <SearchBox placeholder={PLACEHOLDER} />
        </Suspense>
        {items.length > 0 ? (
          <TrackGrid tracks={items} pattern="rsc" onOpenTrack={incrementTrackViews} />
        ) : (
          <p data-testid="no-results">No tracks match &ldquo;{search}&rdquo;.</p>
        )}
        <Pagination pathname="/rsc" page={page} totalPages={totalPages} query={search} />
      </PageContainer>
    </PageTransition>
  );
}
