import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RegisterViewState } from "@/lib/actions/register-view";

// The real action imports the server-only RSC client; replace it with a controllable promise.
const { registerView } = vi.hoisted(() => ({ registerView: vi.fn() }));
vi.mock("@/lib/actions/register-view", () => ({ registerView }));

import { RegisterViewForm } from "./register-view-form";

function deferred() {
  let resolve!: (state: RegisterViewState) => void;
  const promise = new Promise<RegisterViewState>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("RegisterViewForm", () => {
  beforeEach(() => registerView.mockReset());

  it("shows the optimistic count while the action runs, then the state the action returned", async () => {
    const action = deferred();
    registerView.mockReturnValue(action.promise);
    render(<RegisterViewForm trackId="c_0" numberOfViews={10} />);
    const count = screen.getByTestId("optimistic-views");
    expect(count).toHaveTextContent("10 view(s)");

    fireEvent.change(screen.getByLabelText("Views to register"), { target: { value: "2" } });
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: "Register views" }).closest("form")!);
    });

    // Pending: optimistic value shown, the action received the form data.
    expect(count).toHaveTextContent("12 view(s) (pending)");
    expect(registerView).toHaveBeenCalledOnce();
    expect(registerView.mock.calls[0][1].get("views")).toBe("2");

    await act(async () => {
      action.resolve({ status: "registered", views: 2, numberOfViews: 12 });
    });

    // Settled: React drops the optimistic value. Here the prop did not change (no page
    // re-render in a unit test), so it falls back to 10; in the app revalidatePath re-renders
    // the page and the prop arrives as 12.
    expect(count).toHaveTextContent("10 view(s)");
    expect(screen.getByText(/Registered 2 view\(s\)/)).toBeInTheDocument();
  });

  it("drops the optimistic count when the action fails, so the number is never a lie", async () => {
    const action = deferred();
    registerView.mockReturnValue(action.promise);
    render(<RegisterViewForm trackId="c_0" numberOfViews={10} />);
    const count = screen.getByTestId("optimistic-views");

    fireEvent.change(screen.getByLabelText("Views to register"), { target: { value: "3" } });
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: "Register views" }).closest("form")!);
    });
    expect(count).toHaveTextContent("13 view(s) (pending)");

    await act(async () => {
      action.resolve({ status: "failed", message: "Sign in to register views" });
    });

    // A failed action registers nothing and revalidates nothing, so the page does not
    // re-render and the prop is still 10. React discards the optimistic 13 on its own: the
    // rollback needs no code here, which is the difference from Apollo optimisticResponse,
    // where the cache write is undone by the client.
    expect(count).toHaveTextContent("10 view(s)");
    expect(count).not.toHaveTextContent("(pending)");
    expect(screen.getByRole("alert")).toHaveTextContent("Sign in to register views");
  });

  it("validates in the browser and never calls the action for invalid input", async () => {
    render(<RegisterViewForm trackId="c_0" numberOfViews={10} />);

    fireEvent.change(screen.getByLabelText("Views to register"), { target: { value: "9" } });
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: "Register views" }).closest("form")!);
    });

    expect(screen.getByRole("alert")).toHaveTextContent("At most 5 views at a time");
    expect(registerView).not.toHaveBeenCalled();
    expect(screen.getByTestId("optimistic-views")).toHaveTextContent("10 view(s)");
  });
});
