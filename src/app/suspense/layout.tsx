import type { ReactNode } from "react";

/**
 * This pattern fetches at request time. Without this segment config Next.js would fetch once
 * during `next build` and prerender the route with that data (the default `auto no cache`).
 */
export const dynamic = "force-dynamic";

export default function SuspenseLayout({ children }: { children: ReactNode }) {
  return children;
}
