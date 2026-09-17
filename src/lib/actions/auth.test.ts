import { APIError } from "better-auth/api";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { signInEmail, signOut, redirect, headers } = vi.hoisted(() => ({
  signInEmail: vi.fn(),
  signOut: vi.fn(),
  redirect: vi.fn(),
  headers: vi.fn(),
}));
vi.mock("@/lib/auth/auth", () => ({ auth: { api: { signInEmail, signOut } } }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/headers", () => ({ headers }));

import { type LoginState, authenticate, signOutAction } from "./auth";

const IDLE: LoginState = { status: "idle" };
const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
};
const VALID = { email: "cadet@catstronauts.dev", password: "space-cat" };
const REQUEST_HEADERS = new Headers({ cookie: "better-auth.session_token=abc" });

describe("authenticate (Server Action)", () => {
  beforeEach(() => {
    signInEmail.mockReset();
    signOut.mockReset();
    redirect.mockReset();
    headers.mockReset();
    headers.mockResolvedValue(REQUEST_HEADERS);
  });

  it("validates on the server and returns field errors instead of calling Better Auth", async () => {
    await expect(authenticate(IDLE, form({ email: "cadet", password: "" }))).resolves.toEqual({
      status: "invalid",
      fieldErrors: { email: "Enter a valid email address", password: "Enter your password" },
    });
    expect(signInEmail).not.toHaveBeenCalled();
  });

  it("signs in in-process, then redirects to the requested path itself", async () => {
    await authenticate(IDLE, form({ ...VALID, redirectTo: "/rsc/track/c_3" }));

    expect(signInEmail).toHaveBeenCalledWith({ body: VALID });
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
    signInEmail.mockRejectedValue(
      new APIError("UNAUTHORIZED", { message: "Invalid email or password" }),
    );

    await expect(authenticate(IDLE, form(VALID))).resolves.toEqual({
      status: "failed",
      message: "Wrong email or password",
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("keeps other Better Auth failures generic (nothing about the configuration reaches the form)", async () => {
    signInEmail.mockRejectedValue(
      new APIError("INTERNAL_SERVER_ERROR", { message: "secret missing" }),
    );

    await expect(authenticate(IDLE, form(VALID))).resolves.toEqual({
      status: "failed",
      message: "Could not sign you in",
    });
  });

  it("rethrows anything that is not a Better Auth API error", async () => {
    signInEmail.mockRejectedValue(new Error("network down"));

    await expect(authenticate(IDLE, form(VALID))).rejects.toThrow("network down");
  });

  it("signOutAction revokes the session row and goes home", async () => {
    await signOutAction();

    expect(signOut).toHaveBeenCalledWith({ headers: REQUEST_HEADERS });
    expect(redirect).toHaveBeenCalledWith("/");
  });
});
