import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QueryResult } from "./query-result";

const renderChild = (data: { name: string }) => <span>{data.name}</span>;

describe("QueryResult", () => {
  it("renders the spinner while loading", () => {
    render(
      <QueryResult loading data={undefined}>
        {renderChild}
      </QueryResult>,
    );
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("renders an empty state without data", () => {
    render(
      <QueryResult loading={false} data={undefined}>
        {renderChild}
      </QueryResult>,
    );
    expect(screen.getByText(/nothing to show/i)).toBeInTheDocument();
  });

  it("renders the error message", () => {
    render(
      <QueryResult loading={false} error={new Error("you lose")} data={undefined}>
        {renderChild}
      </QueryResult>,
    );
    expect(screen.getByText(/you lose/i)).toBeInTheDocument();
  });

  it("renders children with the data once it arrived", () => {
    render(
      <QueryResult loading={false} data={{ name: "Henri" }}>
        {renderChild}
      </QueryResult>,
    );
    expect(screen.getByText("Henri")).toBeInTheDocument();
  });
});
