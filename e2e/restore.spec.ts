import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("homepage is available immediately, autoplay is muted, scrolling never waits", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "becoming better",
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Book Your Experience", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime),
    )
    .toBeGreaterThan(0);
  expect(
    await page.locator("video").evaluate((v: HTMLVideoElement) => ({
      muted: v.muted,
      inline: v.playsInline,
      controls: v.controls,
    })),
  ).toEqual({ muted: true, inline: true, controls: false });
  expect(await page.locator("[inert]").count()).toBe(0);
  await page.mouse.wheel(0, 700);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(300);
  await page
    .getByRole("heading", { name: "Three visions. One Sanctum." })
    .scrollIntoViewIfNeeded();
  await expect(page.locator(".sanctum-portal")).toHaveCount(3);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(errors).toEqual([]);
});

test("still-image selection persists offscreen and motion can resume", async ({
  page,
}) => {
  await page.goto("/");
  await expect
    .poll(() =>
      page.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime),
    )
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Still image", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Enable motion" }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    await page.locator("video").evaluate((v: HTMLVideoElement) => v.paused),
  ).toBe(true);
  await page.evaluate(() => scrollTo({ top: 1600, behavior: "instant" }));
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  expect(
    await page.locator("video").evaluate((v: HTMLVideoElement) => v.paused),
  ).toBe(true);
  await page.getByRole("button", { name: "Enable motion" }).click();
  await expect
    .poll(() =>
      page.locator("video").evaluate((v: HTMLVideoElement) => v.paused),
    )
    .toBe(false);
  await page.evaluate(() => scrollTo({ top: 1600, behavior: "instant" }));
  await expect
    .poll(() =>
      page.locator("video").evaluate((v: HTMLVideoElement) => v.paused),
    )
    .toBe(true);
});

for (const mode of ["reduced", "save-data", "failed", "blocked"] as const) {
  test(`${mode} keeps the poster and site usable`, async ({ page }) => {
    const videos: string[] = [];
    page.on("request", (r) => {
      if (r.url().endsWith(".mp4")) videos.push(r.url());
    });
    if (mode === "reduced")
      await page.emulateMedia({ reducedMotion: "reduce" });
    if (mode === "save-data")
      await page.addInitScript(() =>
        Object.defineProperty(navigator, "connection", {
          value: Object.assign(new EventTarget(), { saveData: true }),
        }),
      );
    if (mode === "failed")
      await page.route("**/sanctum/**/*.mp4", (route) => route.abort());
    if (mode === "blocked")
      await page.addInitScript(() => {
        HTMLMediaElement.prototype.play = () =>
          Promise.reject(new DOMException("Blocked", "NotAllowedError"));
      });
    await page.goto("/");
    await expect(page.locator(".sanctum-poster")).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator(".sanctum-poster")
          .evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0),
      )
      .toBe(true);
    if (mode === "reduced" || mode === "save-data") {
      await expect(page.locator("video")).not.toHaveAttribute("src");
      expect(videos).toEqual([]);
    }
    await page
      .getByRole("link", { name: "Book Your Experience", exact: true })
      .click();
    await expect(page).toHaveURL(/\/book/);
  });
}

test("changing motion preference removes the active video source", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("video")).toHaveAttribute("src", /desktop/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("video")).not.toHaveAttribute("src");
  await expect(page.getByRole("button", { name: "Still image" })).toHaveCount(
    0,
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect
    .poll(() =>
      page.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime),
    )
    .toBeGreaterThan(0);
});

test("responsive framing, navigation, single mobile source and silent controls", async ({
  page,
}) => {
  const videos: string[] = [];
  page.on("request", (r) => {
    if (r.url().endsWith(".mp4")) videos.push(r.url());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("video")).toHaveAttribute("src", /mobile/);
  await expect(page.getByRole("button", { name: "Enable sound" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close navigation" }).click();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 768 ? 500 : 900 });
    await expect
      .poll(
        () =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        { message: `${width}px overflow` },
      )
      .toBe(true);
  }
  expect(videos.every((url) => url.includes("mobile"))).toBe(true);
});

test("no JavaScript still exposes navigation, poster and all three destinations", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(test.info().project.use.baseURL as string);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".sanctum-portal")).toHaveCount(3);
  await page
    .getByRole("link", { name: "Book Your Experience", exact: true })
    .click();
  await expect(page).toHaveURL(/\/book/);
  await context.close();
});

test("failed video releases its source and a deliberate retry recovers", async ({
  page,
}) => {
  await page.route("**/sanctum/**/*.mp4", (route) => route.abort());
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Enable motion" }),
  ).toBeVisible();
  await expect(page.locator("video")).not.toHaveAttribute("src");
  await page.unroute("**/sanctum/**/*.mp4");
  await page.getByRole("button", { name: "Enable motion" }).click();
  await expect
    .poll(() =>
      page.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime),
    )
    .toBeGreaterThan(0);
});

test("prolonged buffering falls back without blocking the homepage", async ({
  page,
}) => {
  // Hold the media response; native autoplay can otherwise play even when
  // a stubbed play() promise never resolves.
  await page.route("**/sanctum/**/*.mp4", () => new Promise<void>(() => {}));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Enable motion" })).toBeVisible(
    { timeout: 15000 },
  );
  await expect(page.locator("video")).not.toHaveAttribute("src");
  await expect(page.locator(".sanctum-poster")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Book Your Experience", exact: true }),
  ).toBeVisible();
  expect(await page.locator("[inert]").count()).toBe(0);
});
