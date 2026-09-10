import { type Page, expect, test } from "@playwright/test";
import { NAV_BACK, NAV_FORWARD } from "../src/lib/navigation-types";

const FIRST_TRACK = { id: "c_0", title: "Cat-stronomy, an introduction" };

declare global {
  interface Window {
    __viewTransitions?: string[][];
  }
}

/**
 * React drives every animation through document.startViewTransition, passing the transition
 * types the navigation carried. Wrapping it before any script runs records each call, which
 * is the observable part: the pseudo-elements only exist while an animation is running.
 */
const recordViewTransitions = (page: Page) =>
  page.addInitScript(() => {
    const original = document.startViewTransition?.bind(document);
    if (!original) return;
    window.__viewTransitions = [];
    document.startViewTransition = (options?: ViewTransitionUpdateCallback | StartViewTransitionOptions) => {
      const types = options && typeof options === "object" ? Array.from(options.types ?? []) : [];
      window.__viewTransitions?.push(types);
      return original(options);
    };
  });

const recorded = (page: Page) => page.evaluate(() => window.__viewTransitions ?? []);

/** Stretch every animation so a poll can catch it running; the names come from globals.css. */
const slowDown = (page: Page) =>
  page.addStyleTag({ content: ":root { --vt-exit: 2s; --vt-enter: 2s; --vt-move: 4s; }" });

/** Names of the CSS animations running right now, view-transition pseudo-elements included. */
const runningAnimations = (page: Page) =>
  page.evaluate(() =>
    document.getAnimations().map((animation) => (animation as CSSAnimation).animationName),
  );

test("a card click navigates with the forward type and the back link with the back type", async ({
  page,
}) => {
  await recordViewTransitions(page);
  await page.goto("/revalidate");
  await slowDown(page);

  await page.getByRole("link", { name: FIRST_TRACK.title }).click();
  await expect(page).toHaveURL(`/revalidate/track/${FIRST_TRACK.id}`);
  await expect.poll(() => recorded(page)).toContainEqual([NAV_FORWARD]);
  // Static pages are prefetched whole, so the detail rendered in the navigation's commit:
  // the page slid (vt-slide-x) and the two covers paired into a morph (vt-blur).
  await expect.poll(() => runningAnimations(page)).toEqual(
    expect.arrayContaining(["vt-slide-x", "vt-blur"]),
  );

  await page.getByRole("link", { name: "All tracks" }).click();
  await expect(page).toHaveURL("/revalidate");
  await expect.poll(() => recorded(page)).toContainEqual([NAV_BACK]);
});

test("the RSC detail page animates its Suspense reveals and slides back to the list", async ({
  page,
}) => {
  await recordViewTransitions(page);
  await page.goto("/rsc");
  await slowDown(page);

  await page.getByRole("link", { name: FIRST_TRACK.title }).click();
  await expect(page).toHaveURL(`/rsc/track/${FIRST_TRACK.id}`);
  // The sections stream in behind skeletons: the reveal's slide (vt-slide-y) is the animation
  // that plays here, not the morph, because the page suspended before its cover rendered.
  await expect.poll(() => runningAnimations(page)).toContain("vt-slide-y");
  await expect(page.getByRole("heading", { name: FIRST_TRACK.title })).toBeVisible();
  await expect.poll(() => recorded(page)).toContainEqual([NAV_FORWARD]);

  await page.getByRole("link", { name: "All tracks" }).click();
  await expect(page).toHaveURL("/rsc");
  await expect.poll(() => recorded(page)).toContainEqual([NAV_BACK]);
});

test("the client search crossfades its results without a navigation", async ({ page }) => {
  await recordViewTransitions(page);
  await page.goto("/suspense");
  await expect(page.getByRole("searchbox", { name: "Filter tracks" })).toBeVisible();
  const before = (await recorded(page)).length;

  await page.getByRole("searchbox", { name: "Filter tracks" }).fill("kitty");

  // useDeferredValue activated the keyed <ViewTransition>: a transition with no type.
  await expect.poll(async () => (await recorded(page)).length).toBeGreaterThan(before);
  await expect(page).toHaveURL("/suspense");
});
