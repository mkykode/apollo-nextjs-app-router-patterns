import { MockedProvider } from "@apollo/client/testing/react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Suspense } from "react";
import { describe, expect, it } from "vitest";
import { GetTrackDocument, GetTracksDocument } from "@/__generated__/graphql";
import { TrackPreview } from "./track-preview";

const author = { __typename: "Author" as const, id: "cat-1", name: "Henri", photo: null };
const card = (id: string, title: string) => ({
  __typename: "Track" as const,
  id,
  title,
  thumbnail: null,
  length: 60,
  modulesCount: 1,
  author,
});
const detail = (id: string, title: string) => ({
  ...card(id, title),
  description: null,
  numberOfViews: 7,
  modules: [],
});

const mocks = [
  {
    request: { query: GetTracksDocument },
    result: { data: { tracksForHome: [card("c_0", "Current"), card("c_1", "First"), card("c_2", "Second"), card("c_3", "Third")] } },
  },
  { request: { query: GetTrackDocument, variables: { trackId: "c_1" } }, result: { data: { track: detail("c_1", "First") } } },
  { request: { query: GetTrackDocument, variables: { trackId: "c_2" } }, delay: 60, result: { data: { track: detail("c_2", "Second") } } },
  { request: { query: GetTrackDocument, variables: { trackId: "c_3" } }, delay: 60, result: { data: { track: detail("c_3", "Third") } } },
];

// A component that suspends on first render must be rendered inside an awaited act().
async function renderPreview() {
  await act(async () => {
    render(
      <MockedProvider mocks={mocks}>
        <Suspense fallback={<p>outer fallback</p>}>
          <TrackPreview currentTrackId="c_0" />
        </Suspense>
      </MockedProvider>,
    );
  });
}

describe("TrackPreview", () => {
  it("keeps the previous preview and marks it busy while a transition loads the next one", async () => {
    await renderPreview();
    const preview = await screen.findByTestId("track-preview");
    expect(preview).toHaveTextContent("First");

    await act(async () => {
      fireEvent.change(screen.getByLabelText("Track"), { target: { value: "c_2" } });
    });

    // Old content still there, container flagged pending, no fallback.
    await waitFor(() => expect(preview.parentElement).toHaveAttribute("aria-busy", "true"));
    expect(preview).toHaveTextContent("First");
    expect(screen.queryByText("Loading preview...")).not.toBeInTheDocument();

    expect(await screen.findByText(/Second/)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId("track-preview").parentElement).toHaveAttribute("aria-busy", "false"),
    );
  });

  it("shows the Suspense fallback instead when the change is not a transition", async () => {
    await renderPreview();
    await screen.findByTestId("track-preview");

    fireEvent.click(screen.getByLabelText("Wrap the change in startTransition"));
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Track"), { target: { value: "c_3" } });
    });

    expect(await screen.findByText("Loading preview...")).toBeInTheDocument();
    expect(await screen.findByText(/Third/)).toBeInTheDocument();
  });
});
