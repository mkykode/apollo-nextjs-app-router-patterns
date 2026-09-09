import { InMemoryCache } from "@apollo/client";
import { MockedProvider } from "@apollo/client/testing/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  IncrementTrackViewsDocument,
  RegisterViewClientForm_TrackFragmentDoc,
} from "@/__generated__/graphql";
import { RegisterViewClientForm } from "./register-view-client-form";

const TRACK_ID = "c_0";

function seededCache(numberOfViews: number) {
  const cache = new InMemoryCache();
  cache.writeFragment({
    id: `Track:${TRACK_ID}`,
    fragment: RegisterViewClientForm_TrackFragmentDoc,
    data: { __typename: "Track", id: TRACK_ID, numberOfViews },
  });
  return cache;
}

const mutationMock = (numberOfViews: number) => ({
  request: { query: IncrementTrackViewsDocument, variables: { trackId: TRACK_ID } },
  delay: 20,
  result: {
    data: {
      incrementTrackViews: {
        __typename: "IncrementTrackViewsResponse" as const,
        code: 200,
        success: true,
        message: "Incremented",
        track: { __typename: "Track" as const, id: TRACK_ID, numberOfViews },
      },
    },
  },
});

describe("RegisterViewClientForm", () => {
  it("reads the live count from the cache and updates it optimistically, then from the server", async () => {
    const cache = seededCache(51);
    render(
      <MockedProvider mocks={[mutationMock(60)]} cache={cache}>
        <RegisterViewClientForm trackId={TRACK_ID} />
      </MockedProvider>,
    );

    expect(screen.getByTestId("cache-views")).toHaveTextContent("51 view(s)");

    fireEvent.click(screen.getByRole("button", { name: "Register views" }));

    // Optimistic write: the cache moved before the mocked response arrived.
    expect(await screen.findByText(/52 view\(s\)/)).toBeInTheDocument();
    // Server response replaces the optimistic value.
    expect(await screen.findByText(/60 view\(s\)/)).toBeInTheDocument();
    expect(cache.extract()[`Track:${TRACK_ID}`]).toMatchObject({ numberOfViews: 60 });
  });

  it("validates in the browser and does not send an invalid request", () => {
    render(
      <MockedProvider mocks={[]} cache={seededCache(51)}>
        <RegisterViewClientForm trackId={TRACK_ID} />
      </MockedProvider>,
    );

    fireEvent.change(screen.getByLabelText("Views to register"), { target: { value: "9" } });
    fireEvent.click(screen.getByRole("button", { name: "Register views" }));

    expect(screen.getByRole("alert")).toHaveTextContent("At most 5 views at a time");
    expect(screen.getByTestId("cache-views")).toHaveTextContent("51 view(s)");
  });

  it("shows the server error and rolls the optimistic value back", async () => {
    const cache = seededCache(51);
    const mocks = [
      {
        request: { query: IncrementTrackViewsDocument, variables: { trackId: TRACK_ID } },
        error: new Error("network down"),
      },
    ];
    render(
      <MockedProvider mocks={mocks} cache={cache}>
        <RegisterViewClientForm trackId={TRACK_ID} />
      </MockedProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Register views" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("network down");
    expect(screen.getByTestId("cache-views")).toHaveTextContent("51 view(s)");

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
