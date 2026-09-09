import type { Route } from "next";

export const SIGN_IN_PATH = "/login";
export const ACCOUNT_PATH = "/account";

/** Routes the proxy keeps behind a session. Prefix match, so /account/anything counts too. */
const PROTECTED_PREFIXES = [ACCOUNT_PATH];

export const isProtectedPath = (pathname: string) =>
  PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

/**
 * Only a relative path is accepted as a place to return to after sign-in: an absolute URL
 * would let a crafted link send a fresh session to another site.
 */
export const isRedirectPath = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("/") && !value.startsWith("//");

export const safeRedirectPath = (value: unknown, fallback: string = ACCOUNT_PATH) =>
  isRedirectPath(value) ? value : fallback;

/** The sign-in page, remembering where to go afterwards. */
export const signInHref = (callbackUrl: string): Route =>
  `${SIGN_IN_PATH}?callbackUrl=${encodeURIComponent(callbackUrl)}` as Route;
