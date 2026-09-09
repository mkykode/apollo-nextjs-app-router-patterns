import { type Page, expect } from "@playwright/test";
import { DEMO_ACCOUNT } from "../../src/lib/auth/demo-account";

/** Auth.js's cookie name over plain http; over https it is prefixed with `__Secure-`. */
export const SESSION_COOKIE = "authjs.session-token";

export const hasSession = async (page: Page) =>
  (await page.context().cookies()).some((cookie) => cookie.name === SESSION_COOKIE);

/** Signs in through the real form and waits for the redirect, so the cookie is set the way a user's would be. */
export async function signIn(page: Page, callbackUrl = "/account") {
  await page.goto(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  await page.getByLabel("Email").fill(DEMO_ACCOUNT.email);
  await page.getByLabel("Password").fill(DEMO_ACCOUNT.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(callbackUrl);
}
