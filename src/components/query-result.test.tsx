import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QueryResult } from "./query-result";

describe("QueryResult", () => {
  it("renders the spinner while loading", () => {
    render(<QueryResult loading>child</QueryResult>);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("renders an empty state without data", () => {
    render(<QueryResult loading={false}>child</QueryResult>);
    expect(screen.getByText(/nothing to show/i)).toBeInTheDocument();
  });

  it("renders the error message", () => {
    render(
      <QueryResult loading={false} error={new Error("you lose")}>
        child
      </QueryResult>,
    );
    expect(screen.getByText(/you lose/i)).toBeInTheDocument();
  });

  it("renders children once data arrived", () => {
    render(
      <QueryResult loading={false} data={{ ok: true }}>
        child
      </QueryResult>,
    );
    expect(screen.getByText("child")).toBeInTheDocument();
  });
});
