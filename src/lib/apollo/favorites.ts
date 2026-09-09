import { makeVar } from "@apollo/client";

/**
 * Apollo local state, part 1: a reactive variable. It lives outside the cache, any code can
 * read or set it, and every `useReactiveVar` subscriber and every cache field policy that
 * read it re-renders when it changes.
 *
 * It is a module singleton. On the server that would be shared by every request, so it is
 * only read in Client Components, where each browser tab has its own copy.
 */
export const favoriteTrackIdsVar = makeVar<readonly string[]>([]);

export function toggleFavorite(trackId: string) {
  const current = favoriteTrackIdsVar();
  favoriteTrackIdsVar(
    current.includes(trackId) ? current.filter((id) => id !== trackId) : [...current, trackId],
  );
}
