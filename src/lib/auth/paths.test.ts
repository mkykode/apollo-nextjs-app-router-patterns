import { describe, expect, it } from "vitest";
import { isProtectedPath, isRedirectPath, safeRedirectPath, signInHref } from "./paths";

describe("auth paths", () => {
  it("protects /account and everything under it, nothing else", () => {
    expect(isProtectedPath("/account")).toBe(true);
    expect(isProtectedPath("/account/settings")).toBe(true);
    expect(isProtectedPath("/accounts")).toBe(false);
    expect(isProtectedPath("/rsc")).toBe(false);
  });

  it("accepts only relative paths as redirect targets", () => {
    expect(isRedirectPath("/rsc/track/c_3")).toBe(true);
    expect(isRedirectPath("https://evil.example/")).toBe(false);
    expect(isRedirectPath("//evil.example")).toBe(false);
    expect(isRedirectPath(["/a", "/b"])).toBe(false);
    expect(isRedirectPath(undefined)).toBe(false);
  });

  it("falls back to the account page", () => {
    expect(safeRedirectPath("/rsc")).toBe("/rsc");
    expect(safeRedirectPath("https://evil.example/")).toBe("/account");
    expect(safeRedirectPath(undefined, "/")).toBe("/");
  });

  it("encodes the callback into the sign-in href", () => {
    expect(signInHref("/rsc/track/c_3?x=1")).toBe("/login?callbackUrl=%2Frsc%2Ftrack%2Fc_3%3Fx%3D1");
  });
});
