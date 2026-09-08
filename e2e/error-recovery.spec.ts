import { expect, test } from "@playwright/test";
import { GRAPHQL_URI } from "../src/lib/graphql-uri";

const FIRST_TRACK = { id: "c_0", title: "Cat-stronomy, an introduction" };

/**
 * A client-side navigation runs the detail query in the browser. Block it to reach the error
 * boundary, then lift the block: "Try again" must recover instead of re-throwing the cached error.
 */
test("error boundary retry recovers from a transient GraphQL failure (useSuspenseQuery)", async ({
  page,
}) => {
  await page.goto("/suspense");
  await expect(page.getByRole("link", { name: FIRST_TRACK.title })).toBeVisible();

  await page.route(GRAPHQL_URI, (route) => route.abort("connectionfailed"));
  await page.getByRole("link", { name: FIRST_TRACK.title }).click();
  await expect(page.getByRole("heading", { name: /houston, something went wrong/i })).toBeVisible();

  await page.unroute(GRAPHQL_URI);
  await page.getByRole("button", { name: "Try again" }).click();

  await expect(page.getByRole("heading", { level: 1, name: FIRST_TRACK.title })).toBeVisible({
    timeout: 10_000,
  });
});
