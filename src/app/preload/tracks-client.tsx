"use client";

import { useSuspenseQuery } from "@apollo/client/react";
import { GetTracksDocument } from "@/__generated__/graphql";
import { TrackGrid } from "@/components/track-grid";
import { useIncrementTrackViews } from "@/lib/hooks/use-increment-track-views";

/** Same query and variables as the PreloadQuery above, so the preloaded result is picked up. */
export function TracksClient() {
  const { data } = useSuspenseQuery(GetTracksDocument);
  const incrementTrackViews = useIncrementTrackViews();

  return (
    <TrackGrid tracks={data.tracksForHome} pattern="preload" onOpenTrack={incrementTrackViews} />
  );
}
