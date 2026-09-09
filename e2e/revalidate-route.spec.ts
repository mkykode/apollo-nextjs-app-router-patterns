import { expect, test } from "@playwright/test";
import { REVALIDATE_SECRET } from "../playwright.config";
import { GRAPHQL_URI } from "../src/lib/graphql-uri";

// A track no other spec opens, so nothing else expires its tag mid-test.
const TRACK_ID = "c_2";
const PATH = `/use-cache/track/${TRACK_ID}`;
const VIEWS = /(\d+) view\(s\)/;

test("POST /api/revalidate refreshes a tagged entry with stale-while-revalidate", async ({
  request,
}) => {
  const views = async () => {
    const match = VIEWS.exec(await (await request.get(PATH)).text());
    return Number.parseInt(match?.[1] ?? "", 10);
  };

  // Settle on a fresh cached entry (a stale one from an earlier run is served once, then refreshed).
  await expect.poll(async () => (await views()) === (await views())).toBe(true);
  const cached = await views();

  await request.post(GRAPHQL_URI, {
    data: { query: `mutation { incrementTrackViews(id: "${TRACK_ID}") { success } }` },
  });
  expect(await views(), "still served from the Data Cache").toBe(cached);

  const unauthorized = await request.post(`/api/revalidate?tag=track:${TRACK_ID}&secret=wrong`);
  expect(unauthorized.status()).toBe(401);

  const revalidated = await request.post(
    `/api/revalidate?tag=track:${TRACK_ID}&secret=${REVALIDATE_SECRET}`,
  );
  expect(await revalidated.json()).toEqual({ revalidated: `track:${TRACK_ID}` });

  // "max" profile: the next read may still be the stale entry while the refresh runs.
  await expect.poll(views).toBeGreaterThan(cached);
});
