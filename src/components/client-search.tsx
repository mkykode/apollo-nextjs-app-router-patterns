"use client";

import { type ReactNode, ViewTransition, useDeferredValue, useState } from "react";
import { filterTracks } from "@/lib/search";
import styles from "./search-box.module.css";

interface ClientSearchProps<T> {
  tracks: readonly T[];
  placeholder: string;
  children: (matches: readonly T[]) => ReactNode;
}

/**
 * Component state instead of URL state: the list is already in the browser, so filtering
 * needs no navigation. useDeferredValue lets the input update on every keystroke while the
 * (potentially expensive) filtered list re-renders at a lower priority; while the list still
 * shows results for the previous value it is marked stale and dimmed. Trade-off against
 * SearchBox: instant, but not shareable and invisible to the server.
 *
 * useDeferredValue is one of the three things that activate <ViewTransition> (with Transitions
 * and Suspense). The results are keyed by the deferred query: when it changes, React deletes
 * the old list and inserts the new one, pairs them by name, and the browser crossfades. That
 * is the same-route pattern from the Next.js guide; the cost is that the cards remount.
 */
export function ClientSearch<T extends { title: string; author: { name: string } }>({
  tracks,
  placeholder,
  children,
}: ClientSearchProps<T>) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const matches = filterTracks(tracks, deferredQuery);
  const isStale = query !== deferredQuery;

  return (
    <>
      <div className={styles.box}>
        <label htmlFor="client-track-search" className={styles.srOnly}>
          Filter tracks
        </label>
        <input
          id="client-track-search"
          type="search"
          className={styles.input}
          placeholder={placeholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className={styles.results} data-stale={isStale}>
        <ViewTransition
          key={deferredQuery}
          name="track-results"
          share="auto"
          enter="auto"
          default="none"
        >
          {children(matches)}
        </ViewTransition>
      </div>
    </>
  );
}
