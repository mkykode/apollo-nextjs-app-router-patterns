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

/**
 * Where the proxy should send a request, or null to let it through. Keeping the decision here
 * as a pure function is what makes it testable: the proxy supplies nothing but `signedIn`,
 * read from the presence of the session cookie, so there is no request or database to fake.
 *
 * It only ever guards protected routes, never /login, and that asymmetry is the whole lesson
 * of an optimistic check. `signedIn` means "a session cookie is present", not "the session is
 * good". Bouncing a cookie-holder off the sign-in page would trap anyone whose cookie outlives
 * its row (signed out elsewhere, row deleted, the gitignored database recreated): /account
 * verifies, finds nothing, and redirects to /login, which would bounce them back to /account
 * forever, with no way to reach the form that fixes it. Sending a stranger *to* a check is
 * safe; sending them away from one on an unverified signal is not. /login does its own
 * verified check instead.
 */
export function proxyRedirect({
  pathname,
  search,
  signedIn,
}: {
  pathname: string;
  search: string;
  signedIn: boolean;
}): Route | null {
  if (isProtectedPath(pathname)) {
    return signedIn ? null : signInHref(pathname + search);
  }
  return null;
}
