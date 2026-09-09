"use client";

import { useFragment } from "@apollo/client/react";
import { FavoriteStatus_TrackFragmentDoc } from "@/__generated__/graphql";
import { ContentSection } from "./content-section";
import styles from "./register-view-form.module.css";

/**
 * Reads local state through the cache instead of the variable: the fragment selects
 * `isFavorite @client`, which the Track field policy computes from the reactive variable.
 * This only works where the Track entity is in the browser cache (the Client Component
 * patterns), which is the trade-off against FavoriteButton's direct read.
 */
export function FavoriteStatus({ trackId }: { trackId: string }) {
  const { data, complete } = useFragment({
    fragment: FavoriteStatus_TrackFragmentDoc,
    from: { __typename: "Track", id: trackId },
  });

  return (
    <ContentSection>
      <p className={styles.label} data-testid="favorite-status">
        {complete
          ? data.isFavorite
            ? "♥ In your favorites, read from the cache field Track.isFavorite @client."
            : "♡ Not in your favorites, read from the cache field Track.isFavorite @client."
          : "Track not in the client cache yet."}
      </p>
    </ContentSection>
  );
}
