"use client";

import { useReactiveVar } from "@apollo/client/react";
import { favoriteTrackIdsVar } from "@/lib/apollo/favorites";
import styles from "./favorites-count.module.css";

/** Header badge: the same reactive variable, read from a different part of the tree. */
export function FavoritesCount() {
  const count = useReactiveVar(favoriteTrackIdsVar).length;
  if (count === 0) return null;
  return (
    <span className={styles.badge} data-testid="favorites-count" aria-label={`${count} favorite tracks`}>
      ♥ {count}
    </span>
  );
}
