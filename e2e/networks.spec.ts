import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("distinct network journeys route to real resources and reset without storage", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/men");
  await page.getByRole("button", { name: "Hormone health / TRT" }).click();
  await expect(
    page.getByRole("heading", { name: "Find a Health Center" }),
  ).toBeVisible();
  await expect(page.getByText(/Symptoms alone/)).toBeVisible();
  await page.getByRole("button", { name: /Clear choices/ }).click();
  await page
    .getByRole("button", { name: /I just don’t feel like myself/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "FindTreatment.gov" }),
  ).toBeVisible();
  await page.goto("/women");
  await page.getByRole("button", { name: /I need safety & support/ }).click();
  await expect(page.locator("#navigator-title")).toBeFocused();
  await page
    .getByRole("button", { name: "Domestic violence", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Faith House", exact: true }),
  ).toBeVisible();
  await page.getByLabel(/Optional: narrow/).selectOption("Iberia");
  await expect(
    page.getByRole("heading", { name: "Faith House", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "Louisiana Coalition Against Domestic Violence",
    }),
  ).toBeVisible();
  expect(new URL(page.url()).search).toBe("");
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
    })),
  ).toEqual({ local: 0, session: 0 });
  await page.reload();
  await expect(
    page.getByRole("button", { name: /I need safety & support/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Skip the guide/ }).click();
  await page.getByRole("button", { name: "Custody / family law" }).click();
  await expect(
    page.getByRole("heading", { name: "Acadiana Legal Service Corporation" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("quick exit replaces the current page and works from the keyboard", async ({
  page,
}) => {
  await page.route("https://www.weather.gov/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<h1>Weather</h1>" }),
  );
  for (const keyboard of [false, true]) {
    await page.goto("/");
    await page.goto("/women");
    if (keyboard) {
      await page
        .getByRole("button", { name: /I’m not sure what I need/ })
        .click();
      await expect(
        page.getByRole("heading", { name: "Louisiana 211", exact: true }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
    } else await page.getByRole("link", { name: /Quick Exit/ }).click();
    await expect(page).toHaveURL("https://www.weather.gov/");
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    expect(new URL(page.url()).pathname).toBe("/");
  }
});

test("women route has discreet metadata and referrer protections", async ({
  request,
}) => {
  const response = await request.get("/women");
  expect(response.headers()["referrer-policy"]).toBe("no-referrer");
  expect(response.headers()["x-robots-tag"]).toContain("noindex");
  const html = await response.text();
  expect(html).toContain("Your Next Step");
});

test("network routes and results work on desktop and phone with accessible controls", async ({
  page,
}) => {
  for (const width of [1440, 700, 390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const route of ["/men", "/women"]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      const audit = async () => {
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${route} width ${width}`,
        ).toBeTruthy();
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        expect(
          results.violations
            .filter((v) => v.impact === "serious" || v.impact === "critical")
            .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
        ).toEqual([]);
      };
      await audit();
      await page.screenshot({
        path: `/tmp/fic-${route.slice(1)}-${width}.png`,
        fullPage: true,
      });
      await page
        .getByRole("button", {
          name:
            route === "/men"
              ? /I just don’t feel like myself/
              : /I’m not sure what I need/,
        })
        .click();
      await audit();
      await page.screenshot({
        path: `/tmp/fic-${route.slice(1)}-results-${width}.png`,
        fullPage: true,
      });
    }
  }
});

test("direct help and Quick Exit remain usable without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3000/women");
  await expect(page.getByRole("link", { name: /Quick Exit/ })).toHaveAttribute(
    "href",
    "https://www.weather.gov/",
  );
  await expect(
    page.getByRole("link", { name: /Domestic violence support 24/ }),
  ).toHaveAttribute("href", "tel:18884111333");
  await page.getByText("Go directly to an organization").click();
  await expect(
    page.getByRole("link", {
      name: "LaFASA · statewide sexual assault support",
    }),
  ).toBeVisible();
  await context.close();
});

test("women mobile navigation stays unobstructed beneath Quick Exit", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/women");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("link", { name: /Quick Exit/ })).toBeVisible();
  await page
    .getByRole("link", { name: "Experiences", exact: true })
    .click({ timeout: 5000 });
  await expect(page).toHaveURL(/services$/);
});
