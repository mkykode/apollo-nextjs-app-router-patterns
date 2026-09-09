import { expect, test } from "@playwright/test";
import { GRAPHQL_URI } from "../src/lib/graphql-uri";

const GRAPHQL_HOST = new URL(GRAPHQL_URI).host;
const VIEWS = /(\d+) view\(s\)/;

test("startTransition keeps the current preview on screen while the next one loads", async ({
  page,
}) => {
  await page.goto("/suspense/track/c_0");
  const preview = page.getByTestId("track-preview");
  await expect(preview).toBeVisible();
  const first = (await preview.textContent()) ?? "";

  // Slow every GraphQL response down so the pending state is observable.
  await page.route(
    (url) => url.host === GRAPHQL_HOST,
    async (route) => {
      const response = await route.fetch();
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.fulfill({ response });
    },
  );
  const select = page.getByRole("combobox");

  // Transition on (default): the old preview stays, dimmed, and the fallback never shows.
  await select.selectOption({ index: 1 });
  await expect(page.locator("[aria-busy='true']").getByTestId("track-preview")).toHaveText(first);
  await expect(page.getByText("Loading preview...")).toHaveCount(0);
  await expect(preview).not.toHaveText(first);
  const second = (await preview.textContent()) ?? "";

  // Transition off: the Suspense fallback replaces the preview until the data arrives.
  await page.getByLabel("Wrap the change in startTransition").uncheck();
  await select.selectOption({ index: 2 });
  await expect(page.getByText("Loading preview...")).toBeVisible();
  await expect(preview).toBeVisible();
  expect(await preview.textContent()).not.toBe(second);
});

test("a Server Action from a button inside useTransition refreshes the route in place", async ({
  page,
}) => {
  // A track no other spec opens.
  await page.goto("/rsc/track/c_5");
  const views = page.getByText(VIEWS).first();
  const before = Number.parseInt(VIEWS.exec((await views.textContent()) ?? "")?.[1] ?? "", 10);

  const action = page.waitForRequest(
    (candidate) => candidate.method() === "POST" && "next-action" in candidate.headers(),
  );
  await page.getByRole("button", { name: "Quick +1 view" }).click();
  expect((await (await action).response())?.ok()).toBe(true);

  await expect
    .poll(async () => Number.parseInt(VIEWS.exec((await views.textContent()) ?? "")?.[1] ?? "", 10))
    .toBeGreaterThanOrEqual(before + 1);
});
