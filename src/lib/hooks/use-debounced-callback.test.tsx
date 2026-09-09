import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedCallback } from "./use-debounced-callback";

describe("useDebouncedCallback", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("calls the latest callback once with the last arguments after the delay", () => {
    const spy = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(spy, 300));

    result.current("c");
    result.current("ca");
    result.current("cat");
    vi.advanceTimersByTime(299);
    expect(spy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(spy).toHaveBeenCalledExactlyOnceWith("cat");
  });

  it("drops a pending call when the component unmounts", () => {
    const spy = vi.fn();
    const { result, unmount } = renderHook(() => useDebouncedCallback(spy, 300));

    result.current("cat");
    unmount();
    vi.advanceTimersByTime(300);

    expect(spy).not.toHaveBeenCalled();
  });
});
