import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("entry, keyboard skip, returning visit and live homepage", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "ENTER THE EXPERIENCE", exact: true }),
  ).toBeFocused();
  await page.screenshot({ path: "/tmp/restore-entry-desktop.png" });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Skip Experience" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("#home-content h1")).toBeFocused();
  await page.getByRole("link", { name: "Find your next visit" }).click();
  await expect(page).toHaveURL(/\/book/);
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "ENTER SITE", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "ENTER SITE", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Replay Experience" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("full cinematic playback, pause, audio controls and seamless completion", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "ENTER THE EXPERIENCE", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Enable sound" }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".restore-caption")).toContainText("quiet power", {
    timeout: 15000,
  });
  await page
    .getByRole("button", { name: "Pause experience", exact: true })
    .click();
  const time = await page
    .getByRole("progressbar")
    .getAttribute("aria-valuenow");
  await page.waitForTimeout(400);
  expect(
    await page.getByRole("progressbar").getAttribute("aria-valuenow"),
  ).toBe(time);
  await page.screenshot({ path: "/tmp/restore-confidence-desktop.png" });
  await page.getByRole("button", { name: "Enable sound" }).click();
  await expect(
    page.getByRole("button", { name: "Mute sound" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Resume experience" }).click();
  await expect(page.locator(".restore-caption")).toContainText(
    "deeper exhale",
    { timeout: 15000 },
  );
  await page.screenshot({ path: "/tmp/restore-relief-desktop.png" });
  await expect(page.locator(".restore-caption")).toContainText(
    "carry everything",
    { timeout: 15000 },
  );
  await expect(page.locator(".restore-caption")).toContainText(
    "Safety should",
    { timeout: 15000 },
  );
  await page.screenshot({ path: "/tmp/restore-safety-desktop.png" });
  await expect(page.locator(".restore-caption")).toContainText(
    "place for you",
    { timeout: 15000 },
  );
  await expect(page.locator(".restore-caption")).toContainText(
    "One collective",
    { timeout: 15000 },
  );
  await page.screenshot({ path: "/tmp/restore-louisiana-desktop.png" });
  await expect(page.locator(".restore-reveal")).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: "/tmp/restore-seal-desktop.png" });
  await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 15000 });
  await expect(page.locator("#home-content h1")).toBeFocused();
  await page.screenshot({ path: "/tmp/restore-home-desktop.png" });
  expect(errors).toEqual([]);
});

test("mobile reduced-motion story is self-paced and accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "ENTER SITE", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "/tmp/restore-entry-mobile.png" });
  await page
    .getByRole("button", { name: "Explore the story at your pace" })
    .click();
  await expect(page.locator(".restore")).toHaveAttribute(
    "data-renderer",
    "lightweight",
  );
  await page.waitForTimeout(300);
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "0",
  );
  for (let i = 0; i < 7; i++) {
    await page.getByRole("button", { name: "Continue story" }).click();
    await expect(
      page.locator(".restore-stills img.current-shot"),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (i === 3)
      await page.screenshot({ path: "/tmp/restore-safety-mobile.png" });
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: "/tmp/restore-seal-mobile.png" });
  await page.getByRole("button", { name: "Enter site", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("WebGL failure preserves the complete lightweight film", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: Parameters<typeof original>
    ) {
      if (String(args[0]).includes("webgl"))
        throw new Error("WebGL unavailable");
      return original.apply(this, args);
    } as typeof original;
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "ENTER THE EXPERIENCE", exact: true })
    .click();
  await expect(page.locator(".restore-caption")).toContainText("quiet power", {
    timeout: 15000,
  });
  await expect(page.locator(".restore")).toHaveAttribute(
    "data-renderer",
    "lightweight",
  );
  expect(
    await page
      .locator(".restore-stills img.current-shot")
      .evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
      ),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/restore-fallback-mobile.png" });
  await page.getByRole("button", { name: "Skip Experience" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("JavaScript disabled still exposes the real homepage", async ({
  browser,
}) => {
  test.setTimeout(45000);
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(test.info().project.use.baseURL as string);
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.screenshot({ path: "/tmp/restore-nojs.png" });
  await page.getByRole("link", { name: "Find your next visit" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/book/);
  await context.close();
});
