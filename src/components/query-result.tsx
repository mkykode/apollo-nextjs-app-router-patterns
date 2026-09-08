import type { ErrorLike } from "@apollo/client";
import type { ReactNode } from "react";
import { Loading } from "./loading";

interface QueryResultProps<TData> {
  loading: boolean;
  error?: ErrorLike;
  data: TData | undefined;
  /** Rendered once data is available, with `data` narrowed to a defined value. */
  children: (data: TData) => ReactNode;
}

/**
 * Renders the three states of a non-suspense hook (useQuery): loading, error, or children.
 * Suspense hooks do not need this; Suspense and error boundaries take over.
 */
export function QueryResult<TData>({ loading, error, data, children }: QueryResultProps<TData>) {
  if (error) {
    return <p>ERROR: {error.message}</p>;
  }
  if (loading) {
    return <Loading />;
  }
  if (data === undefined) {
    return <p>Nothing to show...</p>;
  }
  return <>{children(data)}</>;
}
