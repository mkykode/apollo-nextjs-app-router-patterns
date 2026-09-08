import type { Route } from "next";

export type PatternSlug =
  | "rsc"
  | "suspense"
  | "preload"
  | "background"
  | "legacy";

export interface Pattern {
  slug: PatternSlug;
  title: string;
  /** Where the GraphQL request is made. */
  fetchedBy: "Server Component" | "Client Component";
  summary: string;
}

/**
 * Single source of truth for the demo routes.
 * Every pattern renders the same two pages (track list, track detail) with a different data-fetching strategy.
 */
export const PATTERNS: readonly Pattern[] = [
  {
    slug: "rsc",
    title: "RSC query()",
    fetchedBy: "Server Component",
    summary:
      "registerApolloClient gives one client per request. The page awaits query() and renders on the server; nothing reaches the browser cache. Mutation runs through a Server Action.",
  },
  {
    slug: "suspense",
    title: "useSuspenseQuery",
    fetchedBy: "Client Component",
    summary:
      "The page is a Client Component. It suspends during streaming SSR, the result is transported into the browser cache, and the cache stays live after hydration.",
  },
  {
    slug: "preload",
    title: "PreloadQuery",
    fetchedBy: "Server Component",
    summary:
      "A Server Component starts the request with PreloadQuery and a Client Component reads it with useSuspenseQuery or useReadQuery. No waterfall, and the data lands in the browser cache.",
  },
  {
    slug: "background",
    title: "useBackgroundQuery",
    fetchedBy: "Client Component",
    summary:
      "Client-only version of preloading: the parent starts the query with useBackgroundQuery and passes a queryRef to a child that reads it with useReadQuery.",
  },
  {
    slug: "legacy",
    title: "useQuery",
    fetchedBy: "Client Component",
    summary:
      "The way the Odyssey course does it. useQuery does not suspend, so SSR renders the spinner and the data is fetched only in the browser.",
  },
];

export const tracksHref = (slug: PatternSlug): Route => `/${slug}` as Route;

export const trackHref = (slug: PatternSlug, trackId: string): Route =>
  `/${slug}/track/${trackId}` as Route;
