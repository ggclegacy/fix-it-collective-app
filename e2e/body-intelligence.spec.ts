import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const origin = `http://127.0.0.1:${process.env.TEST_PORT || "3000"}`;
test.use({ actionTimeout: 15000, hasTouch: true });
async function start(page: Page) {
  const signup = await page.request.post("/api/auth", {
    headers: { origin },
    data: {
      action: "signup",
      name: "Body Map QA",
      email: `body-${Date.now()}-${Math.random()}@example.test`,
      password: "Body-Map-QA-2026-Long",
    },
  });
  expect(signup.ok()).toBe(true);
  await page.goto("/recovery/prepare");
  await page
    .getByRole("button", { name: "Let’s prepare", exact: false })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Mostly sitting", exact: true })
    .click();
  await page.getByRole("button", { name: "Moderate", exact: true }).click();
  await page.getByRole("button", { name: "No", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}
for (const width of [1440, 390, 320])
  test(`body map touch, keyboard, review and layout at ${width}`, async ({
    page,
  }) => {
    test.setTimeout(180000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width, height: 850 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await start(page);
    await page.getByRole("button", { name: "Open full-screen map" }).click();
    const full = page.getByRole("dialog", {
      name: "Full-screen Body Intelligence Map",
      exact: true,
    });
    await expect(full).toBeVisible();
    const shoulder = page.getByRole("button", {
      name: "Left shoulder",
      exact: true,
    });
    if (width < 700) await shoulder.tap();
    else await shoulder.click();
    const sheet = page.getByRole("dialog", {
      name: "Left shoulder",
      exact: true,
    });
    await sheet.getByRole("button", { name: "Tightness", exact: true }).click();
    await sheet
      .getByRole("slider", { name: "Adjust region intensity" })
      .focus();
    await page.keyboard.press("ArrowRight");
    await expect(sheet.getByLabel("How noticeable is it?")).toHaveValue("1");
    await sheet.getByLabel("How noticeable is it?").selectOption("7");
    await sheet
      .getByRole("button", { name: "Light pressure", exact: true })
      .click();
    expect(
      (
        await new AxeBuilder({ page })
          .include(".bim-sheet")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(sheet).not.toBeVisible();
    await expect(full).toBeVisible();
    await page.getByRole("button", { name: "Front", exact: true }).click();
    await page.getByRole("button", { name: "Lower body", exact: true }).click();
    await page.getByLabel("Choose an area by name").selectOption("Right knee");
    await page
      .getByRole("button", { name: "Avoid this area", exact: true })
      .click();
    await page.getByRole("button", { name: "Done with this area" }).click();
    await page.getByRole("button", { name: "Whole body", exact: true }).click();
    await expect(page.locator(".bim-selections")).toContainText(
      "intensity 7/10",
    );
    await expect(page.locator(".bim-selections")).toContainText("Right knee");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .include(".bim-full")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.screenshot({
      path: `/tmp/fic-body-map-${width}.png`,
      fullPage: false,
    });
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Open full-screen map" }),
    ).toBeFocused();
    await page
      .getByRole("button", { name: "No pain / problem areas", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Clear symptoms", exact: true })
      .click();
    await expect(page.locator(".bim-selections")).not.toContainText(
      "Left shoulder",
    );
    await expect(page.locator(".bim-selections")).toContainText("Right knee");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(
      page.getByRole("button", {
        name: "No pain / problem areas",
        exact: true,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(errors).toEqual([]);
  });
test("complete intake persists new fields, returning-client changes and body history", async ({
  page,
  browser,
}) => {
  test.setTimeout(240000);
  await start(page);
  await page.getByLabel("Choose an area by name").selectOption("Left shoulder");
  await page.getByRole("button", { name: "Stiffness", exact: true }).click();
  await page.getByLabel("How noticeable is it?").selectOption("6");
  await page.getByRole("button", { name: "Focus here" }).click();
  await page.getByRole("button", { name: "Done with this area" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Recovery", exact: true }).click();
  await page.getByRole("button", { name: "Medium", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "None of these", exact: true })
    .click();
  for (const field of await page.locator("fieldset").all()) {
    const no = field.getByRole("button", { name: "No", exact: true });
    if (await no.count()) await no.click();
  }
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  for (const no of await page
    .getByRole("button", { name: "No", exact: true })
    .all())
    await no.click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator(".rr-consent input[type=checkbox]").check();
  await page
    .locator(".rr-consent input:not([type=checkbox])")
    .fill("Body Map QA");
  await page.getByRole("button", { name: "Finish preparation" }).click();
  await expect(
    page.getByRole("heading", { name: /You’re ready/ }),
  ).toBeVisible();
  const saved = await (await page.request.get("/api/recovery")).json();
  expect(saved.answers.body).toEqual([
    { area: "Left shoulder", tags: ["Stiffness", "Focus"], intensity: 6 },
  ]);
  const anon = await browser.newContext();
  expect((await anon.request.get(`${origin}/api/recovery`)).status()).toBe(401);
  await anon.close();
  await page.reload();
  await page.getByRole("button", { name: "Review my full profile" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator(".bim-selections")).toContainText("intensity 6/10");
  await page
    .getByText("Body History · 1 saved reports", { exact: true })
    .click();
  await expect(page.locator(".bim-history").last()).toContainText("Report 1");
  await page.getByLabel("Choose an area by name").selectOption("Left shoulder");
  await page.getByLabel("How noticeable is it?").selectOption("3");
  await page.getByRole("button", { name: "Done with this area" }).click();
  await page
    .getByText("What changed from your saved report?", { exact: true })
    .click();
  await expect(page.locator(".bim-history").first()).toContainText(
    "intensity 6/10 → Stiffness · Focus · intensity 3/10",
  );
  for (let step = 1; step < 5; step++)
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator(".rr-consent input[type=checkbox]").check();
  await page.getByRole("button", { name: "Finish preparation" }).click();
  await expect(
    page.getByRole("heading", { name: /You’re ready/ }),
  ).toBeVisible();
  const updated = await (await page.request.get("/api/recovery")).json();
  expect(updated.revision).toBe(2);
  expect(updated.answers.body[0].intensity).toBe(3);
  await page.reload();
  await page.getByRole("button", { name: "Review my full profile" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByText("Body History · 2 saved reports", { exact: true })
    .click();
  await expect(page.locator(".bim-history").last()).toContainText(
    "intensity 6/10",
  );
  await expect(page.locator(".bim-history").last()).toContainText(
    "intensity 3/10",
  );
});
