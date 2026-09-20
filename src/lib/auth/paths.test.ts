import { describe, expect, it } from "vitest";
import {
  isProtectedPath,
  isRedirectPath,
  proxyRedirect,
  safeRedirectPath,
  signInHref,
} from "./paths";

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

/**
 * The decision the proxy makes on nothing but the presence of a session cookie. Pure, so it
 * needs no request and no database; proxy.ts only turns the result into a NextResponse.
 */
describe("proxyRedirect (the proxy's decision)", () => {
  const redirect = (pathname: string, signedIn: boolean, search = "") =>
    proxyRedirect({ pathname, search, signedIn });

  it("sends a signed-out visitor from a protected route to /login, remembering the path", () => {
    expect(redirect("/account", false)).toBe("/login?callbackUrl=%2Faccount");
    expect(redirect("/account/settings", false, "?tab=1")).toBe(
      "/login?callbackUrl=%2Faccount%2Fsettings%3Ftab%3D1",
    );
  });

  it("lets a signed-in user into protected routes", () => {
    expect(redirect("/account", true)).toBeNull();
  });

  /**
   * The bounce off /login is the login page's job, not the proxy's, because a cookie is not a
   * session. A cookie whose row is gone would be sent to /account, which verifies, finds
   * nothing, and sends it back here: a loop with no way to reach the form.
   */
  it("lets a cookie-holder reach the sign-in page", () => {
    expect(redirect("/login", true)).toBeNull();
    expect(redirect("/login", false)).toBeNull();
  });

  it("ignores every other route", () => {
    expect(redirect("/rsc", false)).toBeNull();
    expect(redirect("/rsc", true)).toBeNull();
  });
});
