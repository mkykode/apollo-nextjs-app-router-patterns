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
  /** Resolves a bearer token per operation; return null when there is no session. */
  getToken?: () => Promise<string | null> | string | null;
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
 *   SetContextLink   adds headers per operation: the place for an auth token
 *   HttpLink    performs the request; the terminating link must be last
 */
export function createLinkChain({ uri, headers, fetchOptions, getToken }: LinkChainOptions) {
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

  const authLink = new SetContextLink(async (previousContext) => {
    const token = (await getToken?.()) ?? null;
    return {
      headers: {
        ...previousContext.headers,
        ...headers,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    };
  });

  return ApolloLink.from([errorLink, retryLink, authLink, new HttpLink({ uri, fetchOptions })]);
}
