"use client";

import { useSuspenseQuery } from "@apollo/client/react";
import { GetTracksDocument } from "@/__generated__/graphql";
import { ClientSearch } from "@/components/client-search";
import { PageContainer } from "@/components/page-container";
import { TrackGrid } from "@/components/track-grid";
import { useIncrementTrackViews } from "@/lib/hooks/use-increment-track-views";

/**
 * Pattern 2: Client Component with useSuspenseQuery.
 * Rendered twice: during streaming SSR (the request runs on the server and the result is
 * streamed into the HTML alongside the markup) and in the browser, where the transported
 * result hydrates the cache so no second request is made. The pattern's loading.tsx is
 * the Suspense boundary. Errors throw to error.tsx.
 *
 * The search here is component state with useDeferredValue, the counterpart of the
 * URL-state search on /rsc: the whole list is already in the browser cache.
 */
export default function SuspenseTracksPage() {
  const { data } = useSuspenseQuery(GetTracksDocument);
  const incrementTrackViews = useIncrementTrackViews();

  return (
    <PageContainer grid>
      <ClientSearch tracks={data.tracksForHome} placeholder="Filter tracks by title or author">
        {(matches) =>
          matches.length > 0 ? (
            <TrackGrid tracks={matches} pattern="suspense" onOpenTrack={incrementTrackViews} />
          ) : (
            <p data-testid="no-results">No tracks match.</p>
          )
        }
      </ClientSearch>
    </PageContainer>
  );
}
