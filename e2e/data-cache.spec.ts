import { type APIRequestContext, expect, test } from "@playwright/test";
import { GRAPHQL_URI } from "../src/lib/graphql-uri";

const TRACK = { id: "c_0", title: "Cat-stronomy, an introduction" };

const VIEWS = /(\d+) view\(s\)/;

async function renderedViews(request: APIRequestContext, path: string) {
  const html = await (await request.get(path)).text();
  const match = VIEWS.exec(html);
  if (!match) throw new Error(`no view count in ${path}`);
  return Number.parseInt(match[1], 10);
}

async function incrementViaApi(request: APIRequestContext) {
  await request.post(GRAPHQL_URI, {
    data: { query: `mutation { incrementTrackViews(id: "${TRACK.id}") { success } }` },
  });
}

test("/cached serves the Data Cache until a Server Action calls updateTag", async ({
  page,
  request,
}) => {
  const path = `/cached/track/${TRACK.id}`;

  // Fill the cache, change the source of truth behind its back, and read again: still cached.
  const cached = await renderedViews(request, path);
  await incrementViaApi(request);
  expect(await renderedViews(request, path)).toBe(cached);

  // The Server Action increments once more and expires the tags: the render after it is fresh.
  await page.goto("/cached");
  await page.getByRole("link", { name: TRACK.title }).click();
  await expect(page).toHaveURL(path);
  await expect(page.getByText(VIEWS)).toBeVisible();
  const afterAction = Number.parseInt((await page.getByText(VIEWS).textContent()) ?? "", 10);
  expect(afterAction).toBeGreaterThanOrEqual(cached + 2);
});
