import { type APIRequestContext, expect, test } from "@playwright/test";
import { GRAPHQL_URI } from "../src/lib/graphql-uri";

// A track no other spec opens: their Server Actions call updateTag on the track they click.
const TRACK = { id: "c_1", title: "Famous Catstronauts" };

const VIEWS = /(\d+) view\(s\)/;

async function renderedViews(request: APIRequestContext, path: string) {
  const html = await (await request.get(path)).text();
  const match = VIEWS.exec(html);
  if (!match) throw new Error(`no view count in ${path}`);
  return Number.parseInt(match[1], 10);
}

/**
 * The cache is stale-while-revalidate: a stale entry left by an earlier run is served once and
 * refreshed in the background. Read until two consecutive responses agree, which means the
 * entry is fresh and will be served unchanged for the rest of its revalidate window.
 */
async function stableViews(request: APIRequestContext, path: string) {
  let previous = await renderedViews(request, path);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const current = await renderedViews(request, path);
    if (current === previous) return current;
    previous = current;
  }
  throw new Error(`${path} never settled on a cached view count`);
}

async function incrementViaApi(request: APIRequestContext) {
  await request.post(GRAPHQL_URI, {
    data: { query: `mutation { incrementTrackViews(id: "${TRACK.id}") { success } }` },
  });
}

test("/revalidate serves the Data Cache until a Server Action calls updateTag", async ({
  page,
  request,
}) => {
  const path = `/revalidate/track/${TRACK.id}`;

  // Fill the cache, change the source of truth behind its back, and read again: still cached.
  const cached = await stableViews(request, path);
  await incrementViaApi(request);
  expect(await renderedViews(request, path)).toBe(cached);

  // The Server Action increments once more and expires the tags: the render after it is fresh.
  await page.goto("/revalidate");
  await page.getByRole("link", { name: TRACK.title }).click();
  await expect(page).toHaveURL(path);
  await expect(page.getByText(VIEWS)).toBeVisible();
  const afterAction = Number.parseInt((await page.getByText(VIEWS).textContent()) ?? "", 10);
  expect(afterAction).toBeGreaterThanOrEqual(cached + 2);
});
