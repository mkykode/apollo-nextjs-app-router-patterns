import { expect, test } from "@playwright/test";

// A track no other spec opens.
const TRACK = "/legacy/track/c_11";

const NARROW = { width: 480, height: 900 };
const WIDE = { width: 1280, height: 900 };

test("the server renders its constant snapshot, and the browser corrects it after hydration", async ({
  page,
}) => {
  await page.setViewportSize(NARROW);

  // A plain HTTP request: no browser, no viewport, nothing for the server to measure. This is
  // the markup every visitor receives, whatever their screen.
  const html = await (await page.request.get(TRACK)).text();
  expect(html).toContain('data-viewport="wide"');
  expect(html).not.toContain('data-viewport="narrow"');

  // The same URL in a 480px browser. React hydrates with the server snapshot, then re-reads
  // the store and re-renders with the truth.
  await page.goto(TRACK);
  await expect(page.getByTestId("viewport-store")).toHaveAttribute("data-viewport", "narrow");
  await expect(page.getByTestId("viewport-now")).toHaveText("narrow");

  // The panel still reports what the server committed to, which is the disagreement itself.
  await expect(page.getByText("Server snapshot")).toBeVisible();
});

test("a wide browser agrees with the server, so nothing changes after hydration", async ({
  page,
}) => {
  await page.setViewportSize(WIDE);
  await page.goto(TRACK);

  await expect(page.getByTestId("viewport-store")).toHaveAttribute("data-viewport", "wide");
  await expect(page.getByTestId("viewport-now")).toHaveText("wide");
});

test("the store pushes changes into React with no navigation and no effect", async ({ page }) => {
  await page.setViewportSize(WIDE);
  await page.goto(TRACK);
  await expect(page.getByTestId("viewport-now")).toHaveText("wide");

  // Crossing the breakpoint fires matchMedia's change event, subscribe calls React back, and
  // React re-reads getSnapshot. No state is set anywhere in the component.
  await page.setViewportSize(NARROW);
  await expect(page.getByTestId("viewport-now")).toHaveText("narrow");

  await page.setViewportSize(WIDE);
  await expect(page.getByTestId("viewport-now")).toHaveText("wide");
});
