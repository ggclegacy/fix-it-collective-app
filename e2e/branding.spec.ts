import { test, expect } from "@playwright/test";

test("approved partner emblems load across public and booking surfaces", async ({
  page,
  request,
}) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      "/",
      "/collective",
      "/recovery",
      "/book?service=signature-cut",
    ]) {
      await page.goto(route);
      const marks = page.locator("img.brand-emblem");
      await expect(marks.first()).toBeVisible();
      for (const mark of await marks.all()) {
        await mark.scrollIntoViewIfNeeded();
        await expect
          .poll(() =>
            mark.evaluate(
              (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
            ),
          )
          .toBe(true);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({
        path: `/tmp/fic-branded-${route.split("?")[0].replaceAll("/", "") || "home"}-${width}.png`,
        fullPage: true,
      });
    }
  }
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  for (const icon of manifest.icons)
    expect((await request.get(icon.src)).ok()).toBe(true);
});
