import { expect, test } from "@playwright/test";
import { DEMO_ACCOUNT } from "../src/lib/auth/demo-account";
import { SESSION_COOKIE, hasSession, signIn } from "./helpers/auth";

test("the proxy sends a signed-out visitor from /account to /login, remembering the path", async ({
  page,
  request,
}) => {
  // The redirect is decided before anything renders: a 307 from the proxy, not a page.
  const response = await request.get("/account", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
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

  // Signed in, the login page itself sends the visitor on to /account.
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

/**
 * The regression test for the reason this app moved off Auth.js.
 *
 * There the session endpoint served whatever the session callback had put on the session, and
 * the API token the Server Action needed rode along on that same object, so this endpoint
 * handed an upstream bearer credential to any script on the page. Here the token is a
 * server-owned field on the session row (`returned: false` in src/lib/auth/auth.ts), so it
 * cannot reach a response body at all. The endpoint still has to work.
 */
test("the session endpoint identifies the user without leaking the API token", async ({ page }) => {
  await signIn(page);

  const session = await (await page.request.get("/api/auth/get-session")).json();

  expect(session.user.email).toBe(DEMO_ACCOUNT.email);
  expect(session.session).not.toHaveProperty("accessToken");
  expect(session.user).not.toHaveProperty("accessToken");
  // Nothing anywhere in the payload, whatever shape a future plugin gives it.
  expect(JSON.stringify(session)).not.toContain("accessToken");

  // The page reads the same token server-side, so the field is populated, not merely absent.
  await page.goto("/account");
  await expect(page.getByText(/^API token/)).toContainText(/[0-9a-f]{8}…/);
});

/**
 * Sessions are rows now, which is what makes sign-out a revocation rather than a cookie
 * deletion. Replaying a cookie captured before sign-out proves the difference: under the
 * Auth.js JWT strategy the same replay would have been accepted until the token expired.
 */
test("a session cookie captured before sign-out stops working after it", async ({ page }) => {
  await signIn(page);
  const captured = (await page.context().cookies()).find(
    (cookie) => cookie.name === SESSION_COOKIE,
  );
  expect(captured).toBeDefined();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/");

  // Put the captured cookie back, exactly as it was, and ask again.
  await page.context().addCookies([captured!]);
  const replayed = await (await page.request.get("/api/auth/get-session")).json();
  expect(replayed).toBeNull();

  await page.goto("/account");
  await expect(page).toHaveURL("/login?callbackUrl=%2Faccount");

  /**
   * And the visitor can actually use the page they landed on. A dead cookie still looks signed
   * in to the proxy, which reads presence and not validity; when the proxy also bounced
   * cookie-holders off /login, this pair of redirects chased each other forever and the form
   * was unreachable. Rendering the form is the assertion, and the settled URL after it is what
   * proves nothing is still redirecting.
   */
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page).toHaveURL("/login?callbackUrl=%2Faccount");

  // Signing in over the stale cookie works, and lands on the remembered path.
  await page.getByLabel("Email").fill(DEMO_ACCOUNT.email);
  await page.getByLabel("Password").fill(DEMO_ACCOUNT.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/account");
});

/**
 * Enabling email and password also mounts a sign-up endpoint on the catch-all route, which the
 * Auth.js credentials provider never had. `disabledPaths` in src/lib/auth/auth.ts closes it, so
 * the demo's one account stays the only one; migrate.ts seeds it in-process, past the router.
 */
test("the mounted auth route does not expose public sign-up", async ({ request }) => {
  const response = await request.post("/api/auth/sign-up/email", {
    data: { email: "outsider@example.com", password: "let-me-in-please", name: "Outsider" },
  });

  expect(response.status()).toBe(404);

  const signedIn = await request.post("/api/auth/sign-in/email", {
    data: { email: "outsider@example.com", password: "let-me-in-please" },
  });
  expect(signedIn.ok()).toBe(false);
});
