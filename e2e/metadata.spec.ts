import { expect, test } from "@playwright/test";

test("file-convention metadata: icons, manifest, and generated Open Graph images", async ({
  request,
}) => {
  const home = await (await request.get("/")).text();
  expect(home).toMatch(/rel="icon" href="\/favicon\.ico/);
  expect(home).toMatch(/rel="apple-touch-icon" href="\/apple-icon\.png/);
  expect(home).toMatch(/rel="manifest" href="\/manifest\.webmanifest/);
  expect(home).toMatch(/property="og:image" content="http:\/\/localhost:\d+\/opengraph-image/);

  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBe(true);
  expect((await manifest.json()).short_name).toBe("Catstronauts");

  const image = await request.get("/opengraph-image");
  expect(image.ok()).toBe(true);
  expect(image.headers()["content-type"]).toContain("image/png");
});

test("a dynamic route can generate its own Open Graph image from GraphQL data", async ({
  request,
}) => {
  const html = await (await request.get("/rsc/track/c_0")).text();
  expect(html).toMatch(/property="og:image" content="http:\/\/localhost:\d+\/rsc\/track\/c_0\/opengraph-image/);
  expect(html).toContain('property="og:title" content="Cat-stronomy, an introduction | Catstronauts"');

  const image = await request.get("/rsc/track/c_0/opengraph-image");
  expect(image.ok()).toBe(true);
  expect(image.headers()["content-type"]).toContain("image/png");
  expect((await image.body()).byteLength).toBeGreaterThan(10_000);
});
