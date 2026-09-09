import { AuthError, CredentialsSignin } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { signIn, signOut, redirect } = vi.hoisted(() => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  redirect: vi.fn(),
}));
vi.mock("@/lib/auth/auth", () => ({ signIn, signOut }));
vi.mock("next/navigation", () => ({ redirect }));

import { type LoginState, authenticate, signOutAction } from "./auth";

const IDLE: LoginState = { status: "idle" };
const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
};
const VALID = { email: "cadet@catstronauts.dev", password: "space-cat" };

describe("authenticate (Server Action)", () => {
  beforeEach(() => {
    signIn.mockReset();
    signOut.mockReset();
    redirect.mockReset();
  });

  it("validates on the server and returns field errors instead of calling Auth.js", async () => {
    await expect(authenticate(IDLE, form({ email: "cadet", password: "" }))).resolves.toEqual({
      status: "invalid",
      fieldErrors: { email: "Enter a valid email address", password: "Enter your password" },
    });
    expect(signIn).not.toHaveBeenCalled();
  });

  it("signs in without Auth.js redirecting, then redirects to the requested path itself", async () => {
    await authenticate(IDLE, form({ ...VALID, redirectTo: "/rsc/track/c_3" }));

    expect(signIn).toHaveBeenCalledWith("credentials", { ...VALID, redirect: false });
    expect(redirect).toHaveBeenCalledWith("/rsc/track/c_3");
  });

  it("falls back to the account page when redirectTo is missing or not a relative path", async () => {
    await authenticate(IDLE, form(VALID));
    await authenticate(IDLE, form({ ...VALID, redirectTo: "https://evil.example/" }));
    await authenticate(IDLE, form({ ...VALID, redirectTo: "//evil.example" }));

    expect(redirect).toHaveBeenCalledTimes(3);
    for (const call of redirect.mock.calls) expect(call[0]).toBe("/account");
  });

  it("turns wrong credentials into state, without redirecting", async () => {
    signIn.mockRejectedValue(new CredentialsSignin());

    await expect(authenticate(IDLE, form(VALID))).resolves.toEqual({
      status: "failed",
      message: "Wrong email or password",
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("keeps other Auth.js failures generic (nothing about the configuration reaches the form)", async () => {
    signIn.mockRejectedValue(new AuthError("MissingSecret"));

    await expect(authenticate(IDLE, form(VALID))).resolves.toEqual({
      status: "failed",
      message: "Could not sign you in",
    });
  });

  it("rethrows anything that is not an Auth.js error", async () => {
    signIn.mockRejectedValue(new Error("network down"));

    await expect(authenticate(IDLE, form(VALID))).rejects.toThrow("network down");
  });

  it("signOutAction ends the session and goes home", async () => {
    await signOutAction();
    expect(signOut).toHaveBeenCalledWith({ redirectTo: "/" });
  });
});
