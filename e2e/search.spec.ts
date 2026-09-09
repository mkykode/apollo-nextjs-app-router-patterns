import { type APIRequestContext, expect, test } from "@playwright/test";
import { GRAPHQL_URI } from "../src/lib/graphql-uri";
import { PAGE_SIZE, filterTracks } from "../src/lib/search";

const GRAPHQL_HOST = new URL(GRAPHQL_URI).host;
const cards = (page: import("@playwright/test").Page) =>
  page.getByRole("article").filter({ has: page.getByRole("heading", { level: 3 }) });

/** The expectations come from the live catalog and the app's own filter, not hand counts. */
async function catalog(request: APIRequestContext) {
  const response = await request.post(GRAPHQL_URI, {
    data: { query: "{ tracksForHome { id title author { name } } }" },
  });
  const body = (await response.json()) as {
    data: { tracksForHome: { id: string; title: string; author: { name: string } }[] };
  };
  return body.data.tracksForHome;
}

test("URL state: the Server Component page paginates and filters from searchParams", async ({
  page,
  request,
}) => {
  const tracks = await catalog(request);
  const totalPages = Math.ceil(tracks.length / PAGE_SIZE);
  expect(totalPages).toBeGreaterThan(1);

  await page.goto("/rsc");
  await expect(cards(page)).toHaveCount(PAGE_SIZE);
  const pagination = page.getByRole("navigation", { name: "Pagination" });
  await expect(pagination.locator('a[aria-current="page"]')).toHaveText("1");

  await pagination.getByRole("link", { name: "2" }).click();
  await expect(page).toHaveURL("/rsc?page=2");
  await expect(cards(page)).toHaveCount(Math.min(PAGE_SIZE, tracks.length - PAGE_SIZE));

  const kitty = filterTracks(tracks, "kitty");
  await page.goto("/rsc?query=kitty");
  await expect(cards(page)).toHaveCount(kitty.length);
  for (const track of kitty) {
    await expect(page.getByRole("heading", { level: 3, name: track.title })).toBeVisible();
  }
  if (kitty.length <= PAGE_SIZE) await expect(pagination).toHaveCount(0);
});

test("URL state: typing rewrites the URL after a debounce and the server re-renders", async ({
  page,
  request,
}) => {
  const tracks = await catalog(request);
  const famous = filterTracks(tracks, "famous");

  await page.goto("/rsc");
  await page.getByRole("searchbox", { name: "Search tracks" }).fill("famous");
  await expect(page).toHaveURL("/rsc?query=famous");
  await expect(cards(page)).toHaveCount(famous.length);

  await page.getByRole("searchbox", { name: "Search tracks" }).fill("nothing matches this");
  await expect(page).toHaveURL("/rsc?query=nothing+matches+this");
  await expect(page.getByTestId("no-results")).toBeVisible();
});

test("component state: the client list filters instantly without touching the URL or the network", async ({
  page,
  request,
}) => {
  const tracks = await catalog(request);
  const kitty = filterTracks(tracks, "kitty");

  await page.goto("/suspense");
  await expect(cards(page)).toHaveCount(tracks.length);
  let graphqlRequests = 0;
  page.on("request", (candidate) => {
    if (new URL(candidate.url()).host === GRAPHQL_HOST) graphqlRequests += 1;
  });

  await page.getByRole("searchbox", { name: "Filter tracks" }).fill("kitty");
  await expect(cards(page)).toHaveCount(kitty.length);
  await expect(page).toHaveURL("/suspense");
  expect(graphqlRequests).toBe(0);
});
