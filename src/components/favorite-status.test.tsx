import { MockedProvider } from "@apollo/client/testing/react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { FavoriteStatus_TrackFragmentDoc } from "@/__generated__/graphql";
import { createCache } from "@/lib/apollo/cache";
import { favoriteTrackIdsVar, toggleFavorite } from "@/lib/apollo/favorites";
import { FavoriteStatus } from "./favorite-status";

describe("FavoriteStatus", () => {
  beforeEach(() => favoriteTrackIdsVar([]));

  it("resolves the @client field from the reactive variable and re-renders when it changes", async () => {
    const cache = createCache();
    // Only server fields are written; isFavorite is computed by the field policy on read.
    cache.writeFragment({
      id: "Track:c_0",
      fragment: FavoriteStatus_TrackFragmentDoc,
      data: { __typename: "Track", id: "c_0", isFavorite: false },
    });
    render(
      <MockedProvider mocks={[]} cache={cache}>
        <FavoriteStatus trackId="c_0" />
      </MockedProvider>,
    );
    expect(screen.getByTestId("favorite-status")).toHaveTextContent("♡ Not in your favorites");

    await act(async () => toggleFavorite("c_0"));

    await waitFor(() =>
      expect(screen.getByTestId("favorite-status")).toHaveTextContent("♥ In your favorites"),
    );
  });

  it("reports when the entity is not in the cache", () => {
    render(
      <MockedProvider mocks={[]} cache={createCache()}>
        <FavoriteStatus trackId="missing" />
      </MockedProvider>,
    );
    expect(screen.getByTestId("favorite-status")).toHaveTextContent("not in the client cache");
  });
});
