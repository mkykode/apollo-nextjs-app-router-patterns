import { expect, test } from "@playwright/test";
import { GRAPHQL_URI } from "../src/lib/graphql-uri";

const GRAPHQL_HOST = new URL(GRAPHQL_URI).host;

// A track no other spec opens, so the quick look's request is this spec's alone.
const TRACK = "/background/track/c_4";

test("a hidden Activity renders and fetches before its tab is ever selected", async ({ page }) => {
  const quickLookRequests: string[] = [];
  await page.route(
    (url) => url.host === GRAPHQL_HOST,
    async (route) => {
      const body = route.request().postDataJSON();
      if (body?.operationName === "GetTrack" && body.variables?.trackId) {
        quickLookRequests.push(body.variables.trackId as string);
      }
      await route.continue();
    },
  );

  await page.goto(TRACK);

  // Notes is the selected tab; the quick look has never been clicked.
  await expect(page.getByRole("tab", { name: "Notes" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tab", { name: "Quick look" })).toHaveAttribute(
    "aria-selected",
    "false",
  );

  // Yet its panel is in the document, already filled in, and hidden by display: none.
  const quickLook = page.getByTestId("activity-quick-look");
  await expect(quickLook).toHaveCount(1);
  await expect(quickLook).toContainText("view(s)");
  await expect(quickLook).toBeHidden();

  // And the browser really did ask for the track behind that hidden tab.
  await expect
    .poll(() => quickLookRequests.some((id) => id !== "c_4"))
    .toBe(true);

  // Revealing it is instant: nothing left to wait for.
  await page.getByRole("tab", { name: "Quick look" }).click();
  await expect(quickLook).toBeVisible();
  await expect(page.getByText("Loading quick look...")).toHaveCount(0);
});

test("Activity keeps the draft that unmounting throws away", async ({ page }) => {
  await page.goto(TRACK);
  const draft = page.getByLabel("Draft note");
  await expect(draft).toBeVisible();

  // With Activity: hide the notes, come back, the uncontrolled textarea still holds the text.
  await draft.fill("half-written thought");
  await page.getByRole("tab", { name: "Quick look" }).click();
  await expect(page.getByTestId("activity-notes")).toBeHidden();
  await page.getByRole("tab", { name: "Notes" }).click();
  await expect(page.getByLabel("Draft note")).toHaveValue("half-written thought");

  // Unmounting instead: the panel leaves the document and takes the draft with it.
  await page.getByLabel("Hide with <Activity> instead of unmounting").uncheck();
  await page.getByLabel("Draft note").fill("this one is doomed");
  await page.getByRole("tab", { name: "Quick look" }).click();
  await expect(page.getByTestId("activity-notes")).toHaveCount(0);
  await page.getByRole("tab", { name: "Notes" }).click();
  await expect(page.getByLabel("Draft note")).toHaveValue("");
});

test("without Activity the hidden panel does not exist at all", async ({ page }) => {
  await page.goto(TRACK);

  // With Activity: both panels are mounted, one of them hidden.
  await expect(page.getByTestId("activity-quick-look")).toHaveCount(1);
  await expect(page.getByTestId("activity-notes")).toHaveCount(1);

  // Without it: only the selected tab is in the document, so there is nothing pre-rendered
  // and nothing holding state. This is the structural difference the whole component is about.
  await page.getByLabel("Hide with <Activity> instead of unmounting").uncheck();
  await expect(page.getByTestId("activity-quick-look")).toHaveCount(0);
  await expect(page.getByTestId("activity-notes")).toBeVisible();

  await page.getByRole("tab", { name: "Quick look" }).click();
  await expect(page.getByTestId("activity-quick-look")).toBeVisible();
  await expect(page.getByTestId("activity-notes")).toHaveCount(0);
});
