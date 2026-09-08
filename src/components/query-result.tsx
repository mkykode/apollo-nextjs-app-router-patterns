import type { ErrorLike } from "@apollo/client";
import type { PropsWithChildren } from "react";
import { Loading } from "./loading";

interface QueryResultProps {
  loading: boolean;
  error?: ErrorLike;
  data?: unknown;
}

/**
 * Renders the three states of a non-suspense hook (useQuery): loading, error, or children.
 * Suspense hooks do not need this; Suspense and error boundaries take over.
 */
export function QueryResult({ loading, error, data, children }: PropsWithChildren<QueryResultProps>) {
  if (error) {
    return <p>ERROR: {error.message}</p>;
  }
  if (loading) {
    return <Loading />;
  }
  if (data) {
    return <>{children}</>;
  }
  return <p>Nothing to show...</p>;
}
