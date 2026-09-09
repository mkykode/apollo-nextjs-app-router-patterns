import type { ReactNode } from "react";

/**
 * The opposite of the other patterns: nothing here fetches on the server, so the spinner shell
 * is prerendered. `force-static` makes that explicit and keeps it true even if a request-time
 * API sneaks in later (it would return empty values instead of making the route dynamic).
 * Compare `dynamic = "error"` on the index page, which fails the build in that case.
 */
export const dynamic = "force-static";

export default function LegacyLayout({ children }: { children: ReactNode }) {
  return children;
}
