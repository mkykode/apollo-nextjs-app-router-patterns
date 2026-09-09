import { expect, test } from "@playwright/test";

test("an unknown track id is a real 404 where dynamicParams is false", async ({ page }) => {
  // Under Cache Components the prerendered shell is served with a 200 before anything runs,
  // so /use-cache/track/[trackId] lists its ids with generateStaticParams and rejects the
  // rest at the router with dynamicParams = false: a genuine 404 status.
  const response = await page.goto("/use-cache/track/does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByTestId("not-found")).toBeVisible();
});

test("on a streamed page the not-found UI replaces the section in place, status already sent", async ({
  page,
}) => {
  // /rsc/track/[trackId] streams its sections, so the 200 shell is out before the inner
  // section calls notFound(); the trade-off of streaming.
  const response = await page.goto("/rsc/track/does-not-exist");
  expect(response?.status()).toBe(200);
  await expect(page.getByTestId("not-found")).toBeVisible();
});

test("an unknown track id shows the same not-found UI from a Client Component pattern", async ({
  page,
}) => {
  await page.goto("/suspense/track/does-not-exist");
  await expect(page.getByTestId("not-found")).toBeVisible();
});

test("the RSC detail page streams each section behind its own skeleton", async ({
  page,
  request,
}) => {
  // page.route cannot slow down the server's own GraphQL calls, so prove streaming from the
  // HTML itself: the shell with both skeletons is written first, and each real section is
  // appended later in the same response (React swaps them in with inline scripts).
  const html = await (await request.get("/rsc/track/c_0")).text();
  const at = (marker: string) => html.indexOf(marker);
  expect(at('data-testid="track-detail-skeleton"')).toBeGreaterThan(-1);
  expect(at('data-testid="more-tracks-skeleton"')).toBeGreaterThan(-1);
  expect(at("<h1>Cat-stronomy, an introduction</h1>")).toBeGreaterThan(
    at('data-testid="track-detail-skeleton"'),
  );
  expect(at('id="more-tracks-heading"')).toBeGreaterThan(at('data-testid="more-tracks-skeleton"'));

  await page.goto("/rsc/track/c_0");
  await expect(page.getByRole("heading", { level: 1, name: "Cat-stronomy, an introduction" })).toBeVisible();
  await expect(page.getByTestId("track-detail-skeleton")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "More tracks" }).getByRole("link")).toHaveCount(4);
});

test("the list route group scopes its grid skeleton to /rsc only", async ({ request }) => {
  // The skeleton is part of the streamed shell for the list; the detail page uses its own.
  const list = await (await request.get("/rsc")).text();
  expect(list).toContain('data-testid="track-grid-skeleton"');
  const detail = await (await request.get("/rsc/track/c_0")).text();
  expect(detail).not.toContain('data-testid="track-grid-skeleton"');
  expect(detail).toContain('data-testid="track-detail-skeleton"');
});
