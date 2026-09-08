"use client";

import type { TrackCard_TrackFragment } from "@/__generated__/graphql";
import { type PatternSlug, trackHref } from "@/lib/patterns";
import { TrackCard } from "./track-card";

/** Cards visible above the fold at desktop width; their images load eagerly (LCP). */
const ABOVE_THE_FOLD = 3;

interface TrackGridProps {
  tracks: readonly TrackCard_TrackFragment[];
  /** Which pattern's detail page the cards link to. */
  pattern: PatternSlug;
  /**
   * Increments the view count. Either the useMutation callback (Client Component pages)
   * or the Server Action (RSC page): both are serializable across the RSC boundary.
   */
  onOpenTrack: (trackId: string) => Promise<unknown>;
}

/** Client Component so it can bind per-card click handlers; the page decides how the mutation runs. */
export function TrackGrid({ tracks, pattern, onOpenTrack }: TrackGridProps) {
  return tracks.map((track, index) => (
    <TrackCard
      key={track.id}
      track={track}
      href={trackHref(pattern, track.id)}
      onOpen={() => onOpenTrack(track.id)}
      eager={index < ABOVE_THE_FOLD}
    />
  ));
}
