import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { IncrementTrackViewsDocument } from "@/__generated__/graphql";

/**
 * Client-side version of the mutation. The response selects `track { id numberOfViews }`,
 * so InMemoryCache normalizes it into the existing `Track:<id>` entity and every
 * component reading that track re-renders. No refetch, no manual cache write.
 */
export function useIncrementTrackViews() {
  const [incrementTrackViews] = useMutation(IncrementTrackViewsDocument);
  return useCallback(
    (trackId: string) => incrementTrackViews({ variables: { trackId } }),
    [incrementTrackViews],
  );
}
