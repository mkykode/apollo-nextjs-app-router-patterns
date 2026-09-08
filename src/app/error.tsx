"use client";

import { Button } from "@/components/button";
import { PageContainer } from "@/components/page-container";
import styles from "./error.module.css";

/**
 * Nearest error boundary for every route. Suspense hooks (useSuspenseQuery, useReadQuery)
 * and awaited RSC queries throw here; useQuery does not, it returns `error` instead.
 *
 * In production, Next.js redacts errors thrown during Server Component rendering
 * (React error #441) and only forwards a digest, so the GraphQL message is visible in
 * development and in Client Component patterns, but not for the RSC pattern.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageContainer>
      <section className={styles.error}>
        <h2>Houston, something went wrong</h2>
        <pre className={styles.message}>{error.message}</pre>
        {error.digest ? <p className={styles.digest}>Digest: {error.digest}</p> : null}
        <Button onClick={reset}>Try again</Button>
      </section>
    </PageContainer>
  );
}
