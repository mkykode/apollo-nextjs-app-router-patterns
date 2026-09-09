import { expect, test } from "@playwright/test";

/** The indicator must sit exactly under the active link, before and after a client navigation. */
async function expectIndicatorUnderActiveLink(page: import("@playwright/test").Page) {
  const indicator = page.getByTestId("pattern-indicator");
  await expect(indicator).toHaveAttribute("data-measured", "true");
  const active = page.locator('nav[aria-label="Data-fetching pattern"] a[aria-current="page"]');

  await expect
    .poll(async () => {
      const [bar, link] = await Promise.all([indicator.boundingBox(), active.boundingBox()]);
      if (!bar || !link) return "no boxes";
      return Math.abs(bar.x - link.x) < 1.5 && Math.abs(bar.width - link.width) < 1.5
        ? "aligned"
        : `bar ${bar.x.toFixed(1)}/${bar.width.toFixed(1)} vs link ${link.x.toFixed(1)}/${link.width.toFixed(1)}`;
    })
    .toBe("aligned");
}

test("the active-pattern indicator is measured before paint and follows navigation", async ({
  page,
}) => {
  await page.goto("/rsc");
  await expectIndicatorUnderActiveLink(page);

  await page.getByRole("link", { name: "PreloadQuery" }).click();
  await expect(page).toHaveURL("/preload");
  await expectIndicatorUnderActiveLink(page);
});
