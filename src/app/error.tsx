"use client";

import { useApolloClient } from "@apollo/client/react";
import { useTransition } from "react";
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
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const client = useApolloClient();
  const [isPending, startTransition] = useTransition();

  const handleRetry = () =>
    startTransition(async () => {
      // Suspense hooks keep a rejected result in their cache until it auto-disposes
      // (30 s by default), so retry() alone would re-throw the same error. Refetch the
      // queries that are still watched first; a repeated failure surfaces through retry().
      await client.refetchQueries({ include: "active" }).catch(() => undefined);
      // retry() re-fetches the route segment and re-renders it; reset() would only re-render.
      retry();
    });

  return (
    <PageContainer>
      <section className={styles.error}>
        <h2>Houston, something went wrong</h2>
        <pre className={styles.message}>{error.message}</pre>
        {error.digest ? <p className={styles.digest}>Digest: {error.digest}</p> : null}
        <Button onClick={handleRetry} disabled={isPending}>
          {isPending ? "Retrying..." : "Try again"}
        </Button>
      </section>
    </PageContainer>
  );
}
