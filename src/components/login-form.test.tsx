import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The real action imports Auth.js and the server-only user table; replace it.
const { authenticate } = vi.hoisted(() => ({ authenticate: vi.fn() }));
vi.mock("@/lib/actions/auth", () => ({ authenticate }));

import { LoginForm } from "./login-form";

const submit = async () => {
  await act(async () => {
    fireEvent.submit(screen.getByRole("button", { name: "Sign in" }).closest("form")!);
  });
};

describe("LoginForm", () => {
  beforeEach(() => authenticate.mockReset());

  it("validates in the browser and never calls the action for invalid input", async () => {
    render(<LoginForm redirectTo="/account" />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "cadet" } });
    await submit();

    expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
    expect(screen.getByText("Enter your password")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(authenticate).not.toHaveBeenCalled();
  });

  it("posts the redirect target with the credentials and shows the server's verdict", async () => {
    authenticate.mockResolvedValue({ status: "failed", message: "Wrong email or password" });
    render(<LoginForm redirectTo="/rsc/track/c_3" />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "cadet@catstronauts.dev" },
    });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "space-dog" } });
    await submit();

    expect(authenticate).toHaveBeenCalledOnce();
    const posted: FormData = authenticate.mock.calls[0][1];
    expect(posted.get("redirectTo")).toBe("/rsc/track/c_3");
    expect(posted.get("password")).toBe("space-dog");
    expect(screen.getByRole("alert")).toHaveTextContent("Wrong email or password");
  });
});
