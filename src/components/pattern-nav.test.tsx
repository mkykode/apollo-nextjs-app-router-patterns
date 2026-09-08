import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
