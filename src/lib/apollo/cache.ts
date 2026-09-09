import { InMemoryCache } from "@apollo/client-integration-nextjs";
import { favoriteTrackIdsVar } from "./favorites";

/**
 * Apollo local state, part 2: a client-only field. `Track.isFavorite` exists in no server
 * schema; it is computed by this field policy whenever a query or fragment selects
 * `isFavorite @client`. Apollo strips `@client` fields before sending the request, and
 * because the read function calls the reactive variable, the cache re-broadcasts to every
 * watcher of the field when the variable changes. Codegen learns the field from
 * src/graphql/client-schema.graphql.
 */
export function createCache() {
  return new InMemoryCache({
    typePolicies: {
      Track: {
        fields: {
          isFavorite: {
            read(_, { readField }) {
              const id = readField<string>("id");
              return id !== undefined && favoriteTrackIdsVar().includes(id);
            },
          },
        },
      },
    },
  });
}
