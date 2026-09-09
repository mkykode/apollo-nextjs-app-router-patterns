import { type APIRequestContext, expect, test } from "@playwright/test";
import { GRAPHQL_URI } from "../src/lib/graphql-uri";
import { PATTERNS } from "../src/lib/patterns";

const FIRST_TRACK = { id: "c_0", title: "Cat-stronomy, an introduction" };
const GRAPHQL_HOST = new URL(GRAPHQL_URI).host;

/** Reads the live view count straight from the API, bypassing the app. */
async function viewCount(request: APIRequestContext) {
  const response = await request.post(GRAPHQL_URI, {
    data: { query: `{ track(id: "${FIRST_TRACK.id}") { numberOfViews } }` },
  });
  const body = (await response.json()) as { data: { track: { numberOfViews: number } } };
  return body.data.track.numberOfViews;
}

for (const pattern of PATTERNS) {
  test(`${pattern.title}: renders the list and navigates to a track`, async ({ page }) => {
    await page.goto(`/${pattern.slug}`);
    const card = page.getByRole("link", { name: FIRST_TRACK.title });
    await expect(card).toBeVisible();

    await card.click();

    await expect(page).toHaveURL(`/${pattern.slug}/track/${FIRST_TRACK.id}`);
    await expect(page.getByRole("heading", { level: 1, name: FIRST_TRACK.title })).toBeVisible();
    await expect(page.getByText(/\d+ view\(s\)/).first()).toBeVisible();
  });
}

test("server-rendered patterns ship the data in the HTML, useQuery ships the spinner", async ({
  request,
}) => {
  for (const { slug, shipsDataInHtml } of PATTERNS) {
    const html = await (await request.get(`/${slug}`)).text();
    if (shipsDataInHtml) {
      expect(html, `/${slug} should contain the track title`).toContain(FIRST_TRACK.title);
    } else {
      expect(html, `/${slug} should not contain the track title`).not.toContain(FIRST_TRACK.title);
      expect(html, `/${slug} should contain the spinner`).toContain('role="progressbar"');
    }
  }
});

test("useSuspenseQuery hydrates from the transported result, useQuery fetches in the browser", async ({
  page,
}) => {
  const graphqlRequests: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).host === GRAPHQL_HOST) {
      graphqlRequests.push(request.url());
    }
  });

  await page.goto("/suspense");
  await expect(page.getByRole("link", { name: FIRST_TRACK.title })).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(graphqlRequests, "no browser GraphQL request after SSR transport").toHaveLength(0);

  await page.goto("/legacy");
  await expect(page.getByRole("link", { name: FIRST_TRACK.title })).toBeVisible();
  expect(graphqlRequests.length, "useQuery must fetch in the browser").toBeGreaterThan(0);
});

test("RSC pattern: opening a track runs the mutation through a Server Action", async ({
  page,
  request,
}) => {
  const before = await viewCount(request);
  await page.goto("/rsc");

  // Assert the mechanism (a Server Action POST), not only the shared counter, because
  // other workers click the same card against the same live API.
  const serverAction = page.waitForRequest(
    (candidate) => candidate.method() === "POST" && "next-action" in candidate.headers(),
  );
  await page.getByRole("link", { name: FIRST_TRACK.title }).click();
  const actionResponse = await (await serverAction).response();
  expect(actionResponse?.ok()).toBe(true);

  await expect(page).toHaveURL(`/rsc/track/${FIRST_TRACK.id}`);
  await expect.poll(() => viewCount(request)).toBeGreaterThan(before);
});

test("PreloadQuery queryRef: useQueryRefHandlers refetch picks up a server-side change", async ({
  page,
  request,
}) => {
  await page.goto(`/preload/track/${FIRST_TRACK.id}`);
  const views = page.getByText(/\d+ view\(s\)/).first();
  const shown = Number.parseInt((await views.textContent()) ?? "", 10);

  await request.post(GRAPHQL_URI, {
    data: { query: `mutation { incrementTrackViews(id: "${FIRST_TRACK.id}") { success } }` },
  });
  await page.getByRole("button", { name: "Refresh view count" }).click();

  await expect(views).not.toHaveText(`${shown} view(s)`);
  expect(Number.parseInt((await views.textContent()) ?? "", 10)).toBeGreaterThan(shown);
});
