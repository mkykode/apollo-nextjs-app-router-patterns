import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { notFound } from "next/navigation";

/**
 * The Odyssey API is Apollo Server in front of a REST service. An unknown id is an HTTP 200
 * with a GraphQL error whose `extensions.response` carries the upstream 404, so it arrives
 * as CombinedGraphQLErrors, not ServerError. Check the extension, not the message text.
 */
export const isNotFoundError = (error: unknown) =>
  CombinedGraphQLErrors.is(error) &&
  error.errors.some((graphqlError) => {
    const response = graphqlError.extensions?.response;
    return typeof response === "object" && response !== null && "status" in response
      ? response.status === 404
      : false;
  });

/**
 * Translate the API's 404 into Next.js's 404 and rethrow everything else. `notFound()` throws,
 * so the nearest not-found.tsx renders in place of the segment. The status code is only a
 * real 404 if the throw happens before the shell is sent; inside a streamed Suspense boundary
 * the response is already a 200 and the not-found UI replaces the fallback in place.
 */
export function rethrowAsNotFound(error: unknown): never {
  if (isNotFoundError(error)) notFound();
  throw error;
}
