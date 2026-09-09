import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PatternNav } from "./pattern-nav";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn<() => string>() }));
vi.mock("next/navigation", () => ({ usePathname }));

describe("PatternNav", () => {
  it("links every pattern to its list page when no pattern is active", () => {
    usePathname.mockReturnValue("/");
    render(<PatternNav />);

    expect(screen.getByRole("link", { name: "RSC query()" })).toHaveAttribute("href", "/rsc");
    expect(screen.getByRole("link", { name: "useQuery" })).toHaveAttribute("href", "/legacy");
    expect(screen.queryByRole("link", { current: "page" })).not.toBeInTheDocument();
  });

  it("marks the active pattern", () => {
    usePathname.mockReturnValue("/rsc");
    render(<PatternNav />);

    expect(screen.getByRole("link", { current: "page" })).toHaveTextContent("RSC query()");
  });

  it("keeps the current sub-path when switching pattern", () => {
    usePathname.mockReturnValue("/rsc/track/c_0");
    render(<PatternNav />);

    expect(screen.getByRole("link", { name: "PreloadQuery" })).toHaveAttribute(
      "href",
      "/preload/track/c_0",
    );
    expect(screen.getByRole("link", { current: "page" })).toHaveTextContent("RSC query()");
  });
});

describe("PatternNav indicator", () => {
  it("is measured for the active pattern before the first paint", () => {
    usePathname.mockReturnValue("/preload/track/c_0");
    render(<PatternNav />);

    // useLayoutEffect ran synchronously inside render's act(): no unmeasured frame exists.
    expect(screen.getByTestId("pattern-indicator")).toHaveAttribute("data-measured", "true");
  });

  it("stays hidden when no pattern is active", () => {
    usePathname.mockReturnValue("/");
    render(<PatternNav />);

    expect(screen.getByTestId("pattern-indicator")).toHaveAttribute("data-measured", "false");
  });
});

describe("PatternNav resize subscription (useEffectEvent)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("subscribes once, yet measures the pathname that is current when the event fires", () => {
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    const resizeCalls = () => add.mock.calls.filter(([type]) => type === "resize").length;

    usePathname.mockReturnValue("/rsc");
    const { rerender } = render(<PatternNav />);
    expect(resizeCalls()).toBe(1);

    // A client navigation: with `measure` as a dependency the effect would re-subscribe here.
    usePathname.mockReturnValue("/preload");
    rerender(<PatternNav />);
    expect(resizeCalls()).toBe(1);
    expect(remove).not.toHaveBeenCalledWith("resize", expect.anything());

    // With an empty dependency array and no Effect Event, the handler would still close over
    // "/rsc", measure for it, and the indicator would flip to unmeasured for "/preload".
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(screen.getByTestId("pattern-indicator")).toHaveAttribute("data-measured", "true");
  });
});
