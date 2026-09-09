"use client";

import { useReactiveVar } from "@apollo/client/react";
import { favoriteTrackIdsVar, toggleFavorite } from "@/lib/apollo/favorites";
import styles from "./favorite-button.module.css";

/**
 * Reads local state straight from the reactive variable. useReactiveVar subscribes this
 * component to the variable, so every card and the header count update together, without
 * a provider and without the entity having to exist in the Apollo cache (RSC pages never
 * put their tracks there).
 */
export function FavoriteButton({ trackId, title }: { trackId: string; title: string }) {
  const favorites = useReactiveVar(favoriteTrackIdsVar);
  const isFavorite = favorites.includes(trackId);

  return (
    <button
      type="button"
      className={styles.button}
      aria-pressed={isFavorite}
      aria-label={`${isFavorite ? "Remove" : "Add"} ${title} ${isFavorite ? "from" : "to"} favorites`}
      onClick={() => toggleFavorite(trackId)}
    >
      {isFavorite ? "♥" : "♡"}
    </button>
  );
}
