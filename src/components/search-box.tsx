"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";
import { searchHref } from "@/lib/search";
import styles from "./search-box.module.css";

/**
 * URL as state. Typing rewrites the query string (debounced), the Server Component page
 * reads it from `searchParams` and re-renders with the filtered list, and the URL stays
 * shareable and bookmarkable. `replace` keeps each keystroke out of the history stack;
 * resetting `page` avoids landing on an empty page of a shorter result set.
 *
 * useSearchParams is request-time data, so the page renders this inside a Suspense boundary.
 */
export function SearchBox({ placeholder }: { placeholder: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const updateQuery = useDebouncedCallback((query: string) => {
    router.replace(searchHref(pathname, { query, page: 1 }) as Route);
  }, 300);

  return (
    <div className={styles.box}>
      <label htmlFor="track-search" className={styles.srOnly}>
        Search tracks
      </label>
      <input
        id="track-search"
        type="search"
        className={styles.input}
        placeholder={placeholder}
        defaultValue={searchParams.get("query") ?? ""}
        onChange={(event) => updateQuery(event.target.value)}
      />
    </div>
  );
}

/** Suspense fallback with the same footprint, so the grid does not jump. */
export function SearchBoxFallback({ placeholder }: { placeholder: string }) {
  return (
    <div className={styles.box}>
      <input type="search" className={styles.input} placeholder={placeholder} disabled />
    </div>
  );
}
