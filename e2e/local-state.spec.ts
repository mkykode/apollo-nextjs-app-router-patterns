import { expect, test } from "@playwright/test";

test("favorites live in a reactive variable and reach the header and a cache field", async ({
  page,
}) => {
  await page.goto("/rsc");
  await expect(page.getByTestId("favorites-count")).toHaveCount(0);

  // The RSC list never puts tracks in the client cache; the button reads the variable directly.
  await page.getByRole("button", { name: /Add Cat-stronomy, an introduction to favorites/ }).click();
  await expect(page.getByTestId("favorites-count")).toHaveText("♥ 1");

  // Client-side navigation keeps the browser's Apollo state. On a client pattern the Track
  // entity is in the cache, so the @client field can be read through useFragment.
  await page.getByRole("link", { name: "useSuspenseQuery" }).click();
  await page.getByRole("link", { name: "Cat-stronomy, an introduction" }).click();
  await expect(page).toHaveURL("/suspense/track/c_0");
  await expect(page.getByTestId("favorite-status")).toContainText("♥ In your favorites");

  // The pattern nav keeps the sub-path, so go home first (client-side, keeping the state), then to the list.
  await page.getByRole("link", { name: "Catstronaut Kitty space academy" }).click();
  await page.getByRole("link", { name: "useSuspenseQuery" }).click();
  await expect(page).toHaveURL("/suspense");
  await page.getByRole("button", { name: /Remove Cat-stronomy, an introduction from favorites/ }).click();
  await expect(page.getByTestId("favorites-count")).toHaveCount(0);
});
