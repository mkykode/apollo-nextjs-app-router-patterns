import { io } from "next/cache";
import type { ReactNode } from "react";

/**
 * The SSR pass of these Client Components fetches through the browser-side Apollo link, which
 * Cache Components cannot see, so the route would be prerendered at build with stale data.
 * `await io()` suspends during prerendering and resolves at once on a request, so everything
 * below it stays out of the static shell; the root loading.tsx is the Suspense boundary that
 * keeps the shell prerenderable.
 *
 * Not connection(). It excludes the subtree from the shell just the same, but it stays
 * suspended until a real user navigation reaches the server, so it also blocks prefetches and
 * anything cached below it. Nothing here needs a real user request, only a real request, and
 * for that the docs say to prefer io().
 */
export default async function SuspenseLayout({ children }: { children: ReactNode }) {
  await io();
  return children;
}
