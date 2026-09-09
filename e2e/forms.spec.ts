import { expect, test } from "@playwright/test";
import { GRAPHQL_URI } from "../src/lib/graphql-uri";
import { signIn } from "./helpers/auth";

const GRAPHQL_HOST = new URL(GRAPHQL_URI).host;
const VIEWS = /(\d+) view\(s\)/;
const parse = (text: string | null) => Number.parseInt(VIEWS.exec(text ?? "")?.[1] ?? "", 10);

// Tracks no other spec opens, so parallel workers cannot change these counts.

test("signed out, the Server Action form gives way to a sign-in link that comes back here", async ({
  page,
}) => {
  await page.goto("/rsc/track/c_3");
  await expect(page.getByTestId("sign-in-prompt")).toBeVisible();
  await expect(page.getByRole("button", { name: "Register views", exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Sign in to register views" }).click();
  await expect(page).toHaveURL("/login?callbackUrl=%2Frsc%2Ftrack%2Fc_3");
});

test("Server Action form: validated in the browser, run and re-rendered on the server", async ({
  page,
}) => {
  await signIn(page, "/rsc/track/c_3");
  const views = page.getByText(VIEWS).first();
  const before = parse(await views.textContent());
  const field = page.getByLabel("Views to register");
  const submit = page.getByRole("button", { name: "Register views" });

  // Client-side Zod: invalid input never leaves the browser.
  let actionRequests = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && "next-action" in request.headers()) actionRequests += 1;
  });
  await field.fill("9");
  await submit.click();
  await expect(page.getByText("At most 5 views at a time")).toBeVisible();
  expect(actionRequests).toBe(0);

  // Valid input: one Server Action POST, N mutations on the server, page re-rendered.
  await field.fill("2");
  const action = page.waitForRequest(
    (candidate) => candidate.method() === "POST" && "next-action" in candidate.headers(),
  );
  await submit.click();
  expect((await (await action).response())?.ok()).toBe(true);

  await expect(page.getByText(/Registered 2 view\(s\)/)).toBeVisible();
  await expect.poll(async () => parse(await views.textContent())).toBeGreaterThanOrEqual(before + 2);
});

test("Client form: validated in the browser, useMutation updates every reader of the track", async ({
  page,
}) => {
  await page.goto("/suspense/track/c_4");
  const detailViews = page.getByText(VIEWS).first();
  const cacheViews = page.getByTestId("cache-views");
  const before = parse(await detailViews.textContent());
  expect(parse(await cacheViews.textContent()), "useFragment reads the same entity").toBe(before);
  const field = page.getByLabel("Views to register");
  const submit = page.getByRole("button", { name: "Register views" });

  let graphqlRequests = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).host === GRAPHQL_HOST) {
      graphqlRequests += 1;
    }
  });

  await field.fill("0");
  await submit.click();
  await expect(page.getByText("Register at least 1 view")).toBeVisible();
  expect(graphqlRequests).toBe(0);

  await field.fill("2");
  await submit.click();

  // The mutation responses wrote Track:c_4.numberOfViews; both readers re-rendered from the cache.
  await expect.poll(async () => parse(await detailViews.textContent())).toBeGreaterThanOrEqual(before + 2);
  expect(graphqlRequests).toBe(2);
  expect(parse(await cacheViews.textContent())).toBe(parse(await detailViews.textContent()));
});

test("useOptimistic shows the expected count while the Server Action is pending", async ({
  page,
}) => {
  await signIn(page, "/rsc/track/c_6");
  const detailViews = page.getByText(VIEWS).first();
  const optimistic = page.getByTestId("optimistic-views");
  const before = parse(await detailViews.textContent());
  expect(parse(await optimistic.textContent())).toBe(before);

  // Slow the action down so the pending state is observable.
  await page.route(
    (url) => url.host === new URL(page.url()).host,
    async (route, request) => {
      if (request.method() === "POST" && "next-action" in request.headers()) {
        const response = await route.fetch();
        await new Promise((resolve) => setTimeout(resolve, 800));
        await route.fulfill({ response });
        return;
      }
      await route.continue();
    },
  );

  await page.getByLabel("Views to register").fill("3");
  await page.getByRole("button", { name: "Register views" }).click();

  // Optimistic: the form's count moved by 3 at once; the server-rendered detail has not.
  await expect(optimistic).toHaveText(`Server count: ${before + 3} view(s) (pending)`);
  expect(parse(await detailViews.textContent())).toBe(before);

  // Settled: the page re-rendered; both counts agree and the optimistic value is gone.
  await expect.poll(async () => parse(await detailViews.textContent())).toBeGreaterThanOrEqual(before + 3);
  await expect(optimistic).not.toContainText("(pending)");
  expect(parse(await optimistic.textContent())).toBe(parse(await detailViews.textContent()));
});
