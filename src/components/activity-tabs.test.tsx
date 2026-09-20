import { MockedProvider } from "@apollo/client/testing/react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Suspense } from "react";
import { describe, expect, it } from "vitest";
import { GetTrackDocument, GetTracksDocument } from "@/__generated__/graphql";
import { ActivityTabs } from "./activity-tabs";

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

// `others.at(-1)` of everything that is not c_0, so the quick look asks for c_3.
const tracksMock = {
  request: { query: GetTracksDocument },
  result: {
    data: {
      tracksForHome: [
        card("c_0", "Current"),
        card("c_1", "First"),
        card("c_2", "Second"),
        card("c_3", "Last"),
      ],
    },
  },
};

// maxUsageCount because the unmounting path can mount this query more than once.
const quickLookMock = {
  request: { query: GetTrackDocument, variables: { trackId: "c_3" } },
  result: { data: { track: detail("c_3", "Last") } },
  delay: 60,
  maxUsageCount: 10,
};

async function renderTabs() {
  await act(async () => {
    render(
      <MockedProvider mocks={[{ ...tracksMock, maxUsageCount: 10 }, quickLookMock]}>
        <Suspense fallback={<p>outer fallback</p>}>
          <ActivityTabs currentTrackId="c_0" />
        </Suspense>
      </MockedProvider>,
    );
  });
}

const tab = (name: string) => screen.getByRole("tab", { name });

describe("ActivityTabs", () => {
  it("renders the hidden tab and resolves its query before it is ever selected", async () => {
    await renderTabs();
    const quickLook = await screen.findByTestId("activity-quick-look");

    // Selected tab is the notes one, yet the quick look is mounted, resolved and hidden.
    expect(tab("Notes")).toHaveAttribute("aria-selected", "true");
    expect(tab("Quick look")).toHaveAttribute("aria-selected", "false");

    expect(quickLook).toHaveTextContent("Last");
    expect(quickLook).not.toBeVisible();
    expect(screen.queryByText("Loading quick look...")).not.toBeInTheDocument();
  });

  it("keeps the uncontrolled draft when the tab is hidden by Activity", async () => {
    await renderTabs();
    await screen.findByTestId("activity-quick-look");

    fireEvent.change(screen.getByLabelText("Draft note"), { target: { value: "unsaved" } });

    await act(async () => {
      fireEvent.click(tab("Quick look"));
    });
    // Hidden, not gone: the textarea is still the same DOM node holding the same value.
    expect(screen.getByTestId("activity-notes")).not.toBeVisible();

    await act(async () => {
      fireEvent.click(tab("Notes"));
    });
    expect(screen.getByLabelText("Draft note")).toHaveValue("unsaved");
  });

  /**
   * The same interaction with the box unticked. Note what is deliberately not asserted: that
   * the user sees the Suspense fallback on the way back. Apollo keeps a resolved query ref in
   * its suspense cache for a while after unmount, so a remount within that window does not
   * suspend and no fallback appears. The reliable contrast is structural, and it is the one
   * below: without Activity the hidden panel does not exist.
   */
  it("drops the panel and loses the draft when hiding by unmounting instead", async () => {
    await renderTabs();
    await screen.findByTestId("activity-quick-look");

    fireEvent.click(screen.getByLabelText("Hide with <Activity> instead of unmounting"));
    fireEvent.change(screen.getByLabelText("Draft note"), { target: { value: "unsaved" } });

    await act(async () => {
      fireEvent.click(tab("Quick look"));
    });
    await waitFor(() => expect(screen.queryByTestId("activity-notes")).not.toBeInTheDocument());

    await act(async () => {
      fireEvent.click(tab("Notes"));
    });
    expect(screen.getByLabelText("Draft note")).toHaveValue("");
  });
});
