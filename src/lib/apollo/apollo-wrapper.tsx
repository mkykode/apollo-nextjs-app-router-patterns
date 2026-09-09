"use client";

import "./dev-messages";
import { ApolloClient, ApolloNextAppProvider } from "@apollo/client-integration-nextjs";
import type { PropsWithChildren } from "react";
import { GRAPHQL_URI } from "@/lib/graphql-uri";
import { createCache } from "./cache";
import { createLinkChain } from "./links";

/**
 * Apollo Client for Client Components.
 *
 * Client Components render twice: once on the server (streaming SSR) and once in the browser.
 * ApolloNextAppProvider calls makeClient in both environments. During SSR it records every
 * query result and streams it into the HTML, so the browser client hydrates with a warm cache
 * instead of refetching. The ApolloClient and InMemoryCache imported from the integration
 * package are subclasses instrumented for that transport.
 */
function makeClient() {
  return new ApolloClient({
    cache: createCache(),
    // No custom headers here: the browser would need CORS approval for each one. A session
    // token would come from getToken (a cookie-backed session or an in-memory value).
    link: createLinkChain({ uri: GRAPHQL_URI }),
  });
}

export function ApolloWrapper({ children }: PropsWithChildren) {
  return (
    <ApolloNextAppProvider makeClient={makeClient}>
      {children}
    </ApolloNextAppProvider>
  );
}
