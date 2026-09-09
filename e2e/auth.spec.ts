import { expect, test } from "@playwright/test";
import { DEMO_ACCOUNT } from "../src/lib/auth/demo-account";
import { hasSession, signIn } from "./helpers/auth";

test("the proxy sends a signed-out visitor from /account to /login, remembering the path", async ({
  page,
  request,
}) => {
  // The redirect is decided before anything renders: a 302 from the proxy, not a page.
  const response = await request.get("/account", { maxRedirects: 0 });
  expect(response.status()).toBe(302);
  expect(response.headers().location).toMatch(/\/login\?callbackUrl=%2Faccount$/);

  await page.goto("/account");
  await expect(page).toHaveURL("/login?callbackUrl=%2Faccount");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  // The header's user menu streamed in behind the static shell and knows there is no session.
  await expect(page.getByTestId("user-menu")).toHaveText("Sign in");
});

test("client-side Zod blocks an invalid email without a Server Action request", async ({
  page,
}) => {
  await page.goto("/login");
  let actionRequests = 0;
  page.on("request", (candidate) => {
    if (candidate.method() === "POST" && "next-action" in candidate.headers()) actionRequests += 1;
  });

  await page.getByLabel("Email").fill("cadet");
  await page.getByLabel("Password").fill(DEMO_ACCOUNT.password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText("Enter a valid email address")).toBeVisible();
  expect(actionRequests).toBe(0);
});

test("wrong credentials come back as state: same page, a message, no session cookie", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO_ACCOUNT.email);
  await page.getByLabel("Password").fill("space-dog");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText("Wrong email or password")).toBeVisible();
  await expect(page).toHaveURL("/login");
  expect(await hasSession(page)).toBe(false);
});

test("signing in sets the session cookie, lands on the callback, and renders the user on the server", async ({
  page,
}) => {
  await signIn(page);

  await expect(page.getByTestId("signed-in-as")).toHaveText(
    `Signed in as ${DEMO_ACCOUNT.name} (${DEMO_ACCOUNT.email}).`,
  );
  expect(await hasSession(page)).toBe(true);
  await expect(page.getByTestId("user-menu")).toHaveText(DEMO_ACCOUNT.name);

  // page.request shares the browser's cookies: the HTML already contains the user, no client fetch.
  const html = await (await page.request.get("/account")).text();
  expect(html).toContain(`Signed in as ${DEMO_ACCOUNT.name}`);

  // On a static route the shell is prerendered without a session; the menu still streams in.
  await page.goto("/");
  await expect(page.getByTestId("user-menu")).toHaveText(DEMO_ACCOUNT.name);

  // Signed in, the proxy turns /login into /account.
  await page.goto("/login");
  await expect(page).toHaveURL("/account");
});

test("signing out clears the cookie and /account is protected again", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: "Sign out" }).click();

  await expect(page).toHaveURL("/");
  expect(await hasSession(page)).toBe(false);
  await page.goto("/account");
  await expect(page).toHaveURL("/login?callbackUrl=%2Faccount");
});
