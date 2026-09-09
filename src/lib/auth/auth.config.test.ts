import type { Session } from "next-auth";
import type { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { authConfig } from "./auth.config";

const SESSION: Session = {
  user: { name: "Cadet Kitty", email: "cadet@catstronauts.dev" },
  expires: "2099-01-01T00:00:00.000Z",
  accessToken: "token-123",
};

/** The proxy hands the callback a NextRequest; only nextUrl is read. */
const authorized = (pathname: string, signedIn: boolean) =>
  authConfig.callbacks.authorized({
    auth: signedIn ? SESSION : null,
    request: { nextUrl: new URL(pathname, "http://localhost:3000") } as NextRequest,
  });

const location = (result: ReturnType<typeof authorized>) =>
  result instanceof Response ? result.headers.get("location") : result;

describe("authConfig.callbacks.authorized (the proxy's decision)", () => {
  it("sends a signed-out visitor from a protected route to /login, remembering the path", () => {
    expect(location(authorized("/account", false))).toBe(
      "http://localhost:3000/login?callbackUrl=%2Faccount",
    );
    expect(location(authorized("/account/settings?tab=1", false))).toBe(
      "http://localhost:3000/login?callbackUrl=%2Faccount%2Fsettings%3Ftab%3D1",
    );
  });

  it("lets a signed-in user into protected routes", () => {
    expect(authorized("/account", true)).toBe(true);
  });

  it("sends a signed-in user away from the sign-in page", () => {
    expect(location(authorized("/login", true))).toBe("http://localhost:3000/account");
    expect(authorized("/login", false)).toBe(true);
  });

  it("ignores every other route", () => {
    expect(authorized("/rsc", false)).toBe(true);
    expect(authorized("/rsc", true)).toBe(true);
  });
});

describe("authConfig token callbacks", () => {
  // The declared parameter types describe the sign-in call; later calls arrive without `user`.
  const jwt = (params: object) =>
    authConfig.callbacks.jwt(params as Parameters<typeof authConfig.callbacks.jwt>[0]);
  const session = (params: object) =>
    authConfig.callbacks.session(params as Parameters<typeof authConfig.callbacks.session>[0]);

  it("mints an access token at sign-in only and copies it into the session", () => {
    const signedIn = jwt({ token: {}, user: { id: "cadet-1" }, account: null });
    expect(signedIn.accessToken).toMatch(/^[0-9a-f-]{36}$/);

    const later = jwt({ token: { accessToken: "kept" }, account: null });
    expect(later.accessToken).toBe("kept");

    const shaped = session({ session: { ...SESSION, accessToken: "" }, token: { accessToken: "kept" } });
    expect(shaped.accessToken).toBe("kept");
  });
});
