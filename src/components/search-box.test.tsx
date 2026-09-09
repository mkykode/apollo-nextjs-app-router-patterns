import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchBox } from "./search-box";

const { replace, searchParams } = vi.hoisted(() => ({
  replace: vi.fn(),
  searchParams: { value: new URLSearchParams() },
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams.value,
  usePathname: () => "/rsc",
  useRouter: () => ({ replace }),
}));

describe("SearchBox", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    replace.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it("starts from the query in the URL and rewrites the URL after the debounce", () => {
    searchParams.value = new URLSearchParams("query=cat&page=3");
    render(<SearchBox placeholder="Search" />);
    const input = screen.getByRole("searchbox", { name: "Search tracks" });
    expect(input).toHaveValue("cat");

    fireEvent.change(input, { target: { value: "kitty" } });
    expect(replace).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    // Page resets to 1 and is omitted from the URL; the query is the only state.
    expect(replace).toHaveBeenCalledExactlyOnceWith("/rsc?query=kitty");
  });

  it("clears the query from the URL when the box is emptied", () => {
    searchParams.value = new URLSearchParams("query=cat");
    render(<SearchBox placeholder="Search" />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "" } });
    vi.advanceTimersByTime(300);

    expect(replace).toHaveBeenCalledExactlyOnceWith("/rsc");
  });
});
