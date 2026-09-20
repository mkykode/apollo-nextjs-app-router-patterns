import { ApolloLink, HttpLink } from "@apollo/client";
import { CombinedGraphQLErrors, ServerError } from "@apollo/client/errors";
import { SetContextLink } from "@apollo/client/link/context";
import { ErrorLink } from "@apollo/client/link/error";
import { RetryLink } from "@apollo/client/link/retry";
import type { ErrorLike } from "@apollo/client";

interface LinkChainOptions {
  uri: string;
  /** Extra headers, for example a marker that tells the two clients apart in server logs. */
  headers?: Record<string, string>;
  /** Next.js fetch options for the server-side client. */
  fetchOptions?: RequestInit;
}

const operationType = (operation: ApolloLink.Operation) =>
  operation.query.definitions.find((definition) => definition.kind === "OperationDefinition")
    ?.operation;

/**
 * Retry only what is safe to retry: transient network failures and 5xx responses on
 * queries. GraphQL errors are deterministic (same request, same error), 4xx responses are
 * the client's fault, and mutations are not idempotent.
 */
export function shouldRetry(error: ErrorLike, operation: ApolloLink.Operation) {
  if (operationType(operation) === "mutation") return false;
  if (CombinedGraphQLErrors.is(error)) return false;
  if (ServerError.is(error)) return error.statusCode >= 500;
  return true;
}

/**
 * The link chain both Apollo Clients use. Links run left to right on the way out and right
 * to left on the way back, so the order matters:
 *
 *   ErrorLink   observes every failure (logging, metrics); it does not swallow errors
 *   RetryLink   re-sends transient failures with exponential backoff and jitter
 *   SetContextLink   merges this client's headers with the operation's own
 *   HttpLink    performs the request; the terminating link must be last
 */
export function createLinkChain({ uri, headers, fetchOptions }: LinkChainOptions) {
  const errorLink = new ErrorLink(({ error, operation }) => {
    const label = `[Apollo] ${operationType(operation) ?? "operation"} ${operation.operationName}`;
    if (CombinedGraphQLErrors.is(error)) {
      console.error(`${label}: ${error.errors.map((graphqlError) => graphqlError.message).join("; ")}`);
    } else {
      console.error(`${label}: ${error.message}`);
    }
  });

  const retryLink = new RetryLink({
    delay: { initial: 300, max: 2000, jitter: true },
    attempts: { max: 3, retryIf: shouldRetry },
  });

  /**
   * The per-operation header slot, and the reason this link exists at all: a caller can put
   * headers on an individual operation's `context` and they arrive merged with the client's
   * own. That is how the one authenticated request in the app gets its bearer token, in
   * src/lib/actions/register-view.ts, next to the session read that produced it.
   */
  const headersLink = new SetContextLink((previousContext) => ({
    headers: { ...previousContext.headers, ...headers },
  }));

  return ApolloLink.from([errorLink, retryLink, headersLink, new HttpLink({ uri, fetchOptions })]);
}
