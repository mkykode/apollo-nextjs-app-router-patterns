/**
 * Single source of truth for the GraphQL endpoint.
 * Read by codegen (schema introspection), the RSC client, and the browser/SSR client.
 * Must be absolute: relative URLs cannot be fetched during server rendering.
 */
export const GRAPHQL_URI =
  process.env.NEXT_PUBLIC_GRAPHQL_URI ??
  "https://odyssey-lift-off-server.herokuapp.com/";
