import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Pagination } from "./pagination";

describe("Pagination", () => {
  it("renders nothing for a single page", () => {
    const { container } = render(<Pagination pathname="/rsc" page={1} totalPages={1} query="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("links every page, keeps the query, and marks the current one", () => {
    render(<Pagination pathname="/rsc" page={2} totalPages={3} query="cat" />);

    expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute("href", "/rsc?query=cat");
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute("href", "/rsc?query=cat&page=3");
    expect(screen.getByRole("link", { name: "2", current: "page" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "1" })).toHaveAttribute("href", "/rsc?query=cat");
  });

  it("disables the edge links at the bounds", () => {
    render(<Pagination pathname="/rsc" page={3} totalPages={3} query="" />);
    expect(screen.queryByRole("link", { name: "Next" })).not.toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
  });
});
