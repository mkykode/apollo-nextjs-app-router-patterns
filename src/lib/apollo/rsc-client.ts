import "server-only";
import "./dev-messages";
import { ApolloClient, registerApolloClient } from "@apollo/client-integration-nextjs";
import { GRAPHQL_URI } from "@/lib/graphql-uri";
import { createCache } from "./cache";
import { createLinkChain } from "./links";

/**
 * Apollo Client for React Server Components and Server Actions.
 *
 * registerApolloClient wraps the factory in React's `cache()`, so every Server Component
 * in one request shares a single client and identical queries are deduplicated.
 * Data fetched here is rendered on the server; it never reaches the browser cache.
 *
 * - getClient(): the per-request client (query, mutate, readQuery...)
 * - query(): shortcut for getClient().query()
 * - PreloadQuery: start a request in RSC and hand the result to Client Components
 *
 * Caching is decided per route, not here. On the server, HttpLink hands `fetchOptions` to
 * Next.js's patched fetch, so Next-only options apply: a route can pass
 * `context: { fetchOptions: { next: { revalidate, tags } } }` to store a response in the
 * Data Cache (see /revalidate), or export `dynamic = "force-dynamic"` to render per request
 * (see the layout.tsx of /rsc). Without either, Next.js fetches once at build time.
 */
export const { getClient, query, PreloadQuery } = registerApolloClient(
  () =>
    new ApolloClient({
      cache: createCache(),
      // The same chain as the browser client (src/lib/apollo/links.ts), with a header that
      // marks server-side requests in the API's logs. A session token would be resolved here
      // per request, for example from cookies(), and attached by the SetContextLink.
      link: createLinkChain({ uri: GRAPHQL_URI, headers: { "x-apollo-origin": "rsc" } }),
    }),
);
