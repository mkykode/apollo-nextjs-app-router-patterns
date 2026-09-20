import { act, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ViewportPanel } from "./viewport-panel";

/**
 * jsdom does not implement matchMedia, which is convenient: a stub here is a real fake store,
 * with its own listeners, so the tests can change the "viewport" and watch React react.
 */
function stubMatchMedia(initialMatches: boolean) {
  const listeners = new Set<() => void>();
  let matches = initialMatches;

  const mql = {
    get matches() {
      return matches;
    },
    addEventListener: (_event: string, listener: () => void) => void listeners.add(listener),
    removeEventListener: (_event: string, listener: () => void) => void listeners.delete(listener),
  };

  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => mql),
  );

  return {
    listenerCount: () => listeners.size,
    resize(next: boolean) {
      matches = next;
      for (const listener of listeners) listener();
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

/** The module memoises its MediaQueryList, so each test needs a fresh copy of it. */
async function freshPanel() {
  vi.resetModules();
  const { ViewportPanel: Panel } = await import("./viewport-panel");
  return Panel;
}

describe("ViewportPanel", () => {
  it("reads the store during render and re-renders when it changes", async () => {
    const media = stubMatchMedia(false);
    const Panel = await freshPanel();

    render(<Panel />);
    expect(screen.getByTestId("viewport-now")).toHaveTextContent("wide");
    expect(media.listenerCount()).toBe(1);

    // The store changes without React being told: exactly what the hook is for.
    act(() => media.resize(true));
    expect(screen.getByTestId("viewport-now")).toHaveTextContent("narrow");
  });

  it("unsubscribes on unmount", async () => {
    const media = stubMatchMedia(false);
    const Panel = await freshPanel();

    const { unmount } = render(<Panel />);
    expect(media.listenerCount()).toBe(1);
    unmount();
    expect(media.listenerCount()).toBe(0);
  });

  /**
   * The point of the component. Server rendering never calls getSnapshot, so matchMedia is
   * never touched: if it were, this would throw, because the stub is deliberately absent.
   */
  it("renders on the server from getServerSnapshot, without touching matchMedia", () => {
    vi.stubGlobal("matchMedia", undefined);

    const html = renderToString(<ViewportPanel />);

    expect(html).toContain('data-viewport="wide"');
    expect(html).not.toContain('data-viewport="narrow"');
  });
});
