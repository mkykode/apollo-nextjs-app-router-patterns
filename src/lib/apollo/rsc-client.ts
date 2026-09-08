import "server-only";
import "./dev-messages";
import { HttpLink } from "@apollo/client";
import {
  ApolloClient,
  InMemoryCache,
  registerApolloClient,
} from "@apollo/client-integration-nextjs";
import { GRAPHQL_URI } from "@/lib/graphql-uri";

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
 */
export const { getClient, query, PreloadQuery } = registerApolloClient(
  () =>
    new ApolloClient({
      cache: new InMemoryCache(),
      link: new HttpLink({
        uri: GRAPHQL_URI,
        // Next.js fetch options go here. `no-store` keeps responses out of the Data Cache and
        // marks every route that awaits this client as dynamic, so the RSC pages stay live even
        // without the layout-level `dynamic = "force-dynamic"`. Use `next: { revalidate: 60 }`
        // instead to cache GraphQL responses for a minute.
        fetchOptions: { cache: "no-store" },
      }),
    }),
);
