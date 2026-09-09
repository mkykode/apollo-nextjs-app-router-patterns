import { connection } from "next/server";
import type { ReactNode } from "react";

/**
 * The SSR pass of these Client Components fetches through the browser-side Apollo link, which
 * Cache Components cannot see, so the route would be prerendered at build with stale data.
 * connection() defers everything below it to request time; the root loading.tsx is the
 * Suspense boundary that keeps the shell prerenderable.
 */
export default async function BackgroundLayout({ children }: { children: ReactNode }) {
  await connection();
  return children;
}
