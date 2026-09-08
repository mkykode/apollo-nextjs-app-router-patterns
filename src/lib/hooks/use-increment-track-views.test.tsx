import { InMemoryCache, gql } from "@apollo/client";
import { MockedProvider } from "@apollo/client/testing/react";
import { renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { describe, expect, it } from "vitest";
import { IncrementTrackViewsDocument } from "@/__generated__/graphql";
import { useIncrementTrackViews } from "./use-increment-track-views";

const TRACK_VIEWS = gql`
  fragment TrackViews on Track {
    id
    numberOfViews
  }
`;

const mocks = [
  {
    request: { query: IncrementTrackViewsDocument, variables: { trackId: "c_0" } },
    result: {
      data: {
        incrementTrackViews: {
          __typename: "IncrementTrackViewsResponse" as const,
          code: 200,
          success: true,
          message: "Incremented",
          track: { __typename: "Track" as const, id: "c_0", numberOfViews: 52 },
        },
      },
    },
  },
];

describe("useIncrementTrackViews", () => {
  it("runs the mutation and updates the normalized Track entity in the cache", async () => {
    const cache = new InMemoryCache();
    cache.writeFragment({
      id: "Track:c_0",
      fragment: TRACK_VIEWS,
      data: { __typename: "Track", id: "c_0", numberOfViews: 51 },
    });

    const wrapper = ({ children }: PropsWithChildren) => (
      <MockedProvider mocks={mocks} cache={cache}>
        {children}
      </MockedProvider>
    );
    const { result } = renderHook(() => useIncrementTrackViews(), { wrapper });

    const response = await result.current("c_0");

    expect(response.data?.incrementTrackViews.success).toBe(true);
    expect(cache.extract()["Track:c_0"]).toMatchObject({ numberOfViews: 52 });
  });
});
