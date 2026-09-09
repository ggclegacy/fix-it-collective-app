import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.use({ actionTimeout: 15000 });
const origin = `http://127.0.0.1:${process.env.TEST_PORT || "3000"}`;
for (const width of [1440, 768, 390, 320]) {
  for (const route of ["/grooming", "/recovery"]) {
    test(`${route} is accessible and responsive at ${width}px`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.setViewportSize({ width, height: 950 });
      await page.goto(route);
      await expect(page.locator(".provider-profile")).not.toHaveAttribute(
        "aria-busy",
        "true",
      );
      await expect(page.locator("main h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(page.locator(".provider-atmosphere")).toBeVisible();
      const results = await new AxeBuilder({ page })
        .include("main")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
      await page.screenshot({
        path: `/tmp/fic-provider-${route.slice(1)}-${width}.png`,
        fullPage: true,
      });
      expect(errors).toEqual([]);
    });
  }
}
test("body map and checklist stay synchronized and reset without persistence", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/recovery");
  await page.getByRole("button", { name: "Neck", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Neck", exact: true }),
  ).toBeChecked();
  await page.getByRole("checkbox", { name: "Shoulders", exact: true }).check();
  await expect(
    page.getByRole("button", { name: "Shoulders", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Pressure preference").selectOption("Light");
  await expect(page.locator(".brief-text")).toContainText("Pressure: Light");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download your brief" }).click();
  expect((await download).suggestedFilename()).toBe("camilla-consultation.txt");
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some((x) => /camilla|profile|intake/i.test(x)),
    ),
  ).toBe(false);
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "Neck", exact: true }),
  ).not.toBeChecked();
});
test("saved profiles are private, survive reload, can enter booking and can be deleted", async ({
  page,
  browser,
}) => {
  await page.goto("/signin");
  await page.getByRole("button", { name: "Enter client preview" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await page.goto("/grooming");
  await expect(page.getByLabel("Your cut, in your words")).toBeEnabled();
  await page.getByLabel("Your cut, in your words").fill("QA textured crop");
  await page
    .getByRole("combobox", { name: "Fade preference", exact: true })
    .selectOption("Low");
  await page
    .getByRole("checkbox", { name: /Save these preferences privately/ })
    .check();
  await page
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText(
    "Preferences saved to your account.",
  );
  await page.reload();
  await expect(page.getByLabel("Your cut, in your words")).toHaveValue(
    "QA textured crop",
  );
  const other = await browser.newContext();
  const anonymous = await other.request.get(
    `${origin}/api/provider-profile?provider=katie`,
  );
  expect(anonymous.status()).toBe(401);
  const registration = await other.request.post(`${origin}/api/auth`, {
    headers: { origin },
    data: {
      action: "signup",
      name: "Provider QA",
      email: `provider-qa-${Date.now()}@example.test`,
      password: "Provider-QA-Passphrase-2026",
    },
  });
  expect(registration.ok()).toBe(true);
  const isolated = await other.request.get(
    `${origin}/api/provider-profile?provider=katie&client_id=demo-client`,
  );
  expect((await isolated.json()).saved).toBeNull();
  const malicious = await other.request.put(`${origin}/api/provider-profile`, {
    headers: { origin },
    data: {
      provider: "katie",
      consent: true,
      client_id: "demo-client",
      style: "Cross-account attempt",
    },
  });
  expect(malicious.status()).toBe(400);

  const foreign = await page.request.put("/api/provider-profile", {
    headers: { origin: "https://untrusted.example" },
    data: { provider: "katie", consent: true },
  });
  expect(foreign.status()).toBe(400);
  const own = await page.request.get(
    "/api/provider-profile?provider=katie&client_id=someone-else",
  );
  expect((await own.json()).saved.profile.style).toBe("QA textured crop");
  await page
    .getByRole("link", { name: "Explore preview times" })
    .first()
    .click();
  await expect(page).toHaveURL(/service=signature-cut/);
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator(".slots button").first()).toBeVisible();
  await page.locator(".slots button").first().click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Use my saved grooming brief" })
    .click();
  await expect(page.locator("textarea")).toHaveValue(/QA textured crop/);
  await page.goto("/grooming");
  await page.getByRole("button", { name: "Delete saved preferences" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Saved preferences deleted.",
  );
  await page.reload();
  await expect(page.getByLabel("Your cut, in your words")).toHaveValue("");

  await page.goto("/recovery");
  await expect(
    page.getByRole("button", { name: "Neck", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Neck", exact: true }).click();
  await page
    .getByRole("checkbox", { name: /Save these preferences privately/ })
    .check();
  await page
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText(
    "Preferences saved to your account.",
  );
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "Neck", exact: true }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Delete saved preferences" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Saved preferences deleted.",
  );
  await other.close();
});
