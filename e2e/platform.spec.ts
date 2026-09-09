import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { DateTime } from "luxon";
let visitDate = DateTime.now().setZone("America/Chicago").plus({ days: 14 });
if (visitDate.weekday === 7) visitDate = visitDate.plus({ days: 1 });
const clientName = `Preview QA ${Date.now()}`;
const email = `qa-${Date.now()}@example.test`;
test("public booking → new client account → same appointment in studio → cancellation", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("link", { name: "Find your next visit" }).click();
  await page.getByRole("button", { name: "HAIR The signature cut" }).click();
  await page.getByRole("checkbox", { name: "Scalp refresh" }).check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Best available" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Appointment date").fill(visitDate.toISODate()!);
  await expect(page.locator(".slots button").first()).toBeVisible();
  const time = await page.locator(".slots button").first().innerText();
  await page.locator(".slots button").first().click();
  const quotedPrice = await page.locator(".summary-total strong").innerText();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByLabel("Your name").fill(clientName);
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Preview-Test-Passphrase-2026");
  await page.getByRole("button", { name: "Create your space" }).click();
  await expect(page.getByText("Anything you’d like us to know?")).toBeVisible();
  await page.getByRole("checkbox", { name: "I acknowledge" }).check();
  await page.getByRole("button", { name: "Confirm preview visit" }).click();
  await expect(
    page.getByText("Your preview appointment is saved."),
  ).toBeVisible();
  await page.getByRole("link", { name: "View your visits" }).click();
  await expect(
    page.getByRole("heading", { name: "The signature cut" }).first(),
  ).toBeVisible();
  const clientRecords = await (
    await page.request.get("/api/appointments")
  ).json();
  expect(clientRecords.appointments).toHaveLength(1);
  const id = clientRecords.appointments[0].id;
  expect(clientRecords.appointments[0].price).toBe(
    Number(quotedPrice.replace(/[^0-9.]/g, "")) * 100,
  );
  const staff = await browser.newContext();
  const studio = await staff.newPage();
  await studio.goto("/signin?next=/studio");
  await studio.getByRole("button", { name: "Enter studio preview" }).click();
  await expect(
    studio.getByRole("heading", { name: "Make it a good day." }),
  ).toBeVisible();
  const records = await (await studio.request.get("/api/appointments")).json();
  expect(
    records.appointments.some((a: { id: string }) => a.id === id),
  ).toBeTruthy();
  await studio.goto("/studio/calendar");
  await studio.getByLabel("Calendar date").fill(visitDate.toISODate()!);
  await expect(studio.getByText(clientName, { exact: true })).toBeVisible();
  await studio.getByText(clientName, { exact: true }).click();
  await expect(studio.getByRole("heading", { name: clientName })).toBeVisible();
  await studio.getByLabel("Service note").fill("INTERNAL QA NOTE");
  await studio.getByRole("button", { name: "Save note" }).click();
  await expect(
    studio.getByText("INTERNAL QA NOTE", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("INTERNAL QA NOTE")).toHaveCount(0);
  // The client can reschedule the same record; history and intake stay linked.
  await page.getByRole("link", { name: "Move visit" }).click();
  await page
    .getByLabel("Appointment date")
    .fill(
      visitDate.plus({ days: visitDate.weekday === 6 ? 2 : 1 }).toISODate()!,
    );
  await page.locator(".slots button").first().click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("checkbox", { name: "I acknowledge" }).check();
  await page.getByRole("button", { name: "Confirm new time" }).click();
  await expect(
    page.getByText("Your preview appointment is saved."),
  ).toBeVisible();
  const moved = await (await page.request.get("/api/appointments")).json();
  expect(moved.appointments[0].id).toBe(id);
  expect(moved.appointments[0].start_at).not.toBe(
    clientRecords.appointments[0].start_at,
  );
  await page.getByRole("link", { name: "View your visits" }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Yes, cancel visit" }).click();
  await expect(page.locator(".status.cancelled")).toBeVisible();
  const response = await studio.request.get("/api/appointments");
  const final = await response.json();
  expect(
    final.appointments.find((a: { id: string }) => a.id === id).status,
  ).toBe("cancelled");
  expect(errors).toEqual([]);
  expect(time).toBeTruthy();
  await staff.close();
});
test("private endpoints reject guests and cross-origin mutations", async ({
  request,
}) => {
  const guest = await request.get("/api/appointments");
  expect(guest.status()).toBe(401);
  const forged = await request.post("/api/auth", {
    headers: { Origin: "https://untrusted.example" },
    data: { action: "demo", role: "staff" },
  });
  expect(forged.status()).toBe(400);
});
test("desktop and phone pages have no horizontal overflow or serious accessibility errors", async ({
  page,
}) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/",
      "/services",
      "/collective",
      "/policies",
      "/book",
      "/signin",
    ]) {
      await page.goto(route);
      await expect(page.locator('main[aria-busy="true"]')).toHaveCount(0);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `${width} ${route} overflows`,
      ).toBeTruthy();
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        axe.violations
          .filter((v) => v.impact === "critical" || v.impact === "serious")
          .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
        `${width} ${route}`,
      ).toEqual([]);
      if (route === "/" || route === "/book")
        await page.screenshot({
          path: `/tmp/fic-${route === "/" ? "home" : "booking"}-${width}.png`,
          fullPage: width === 390,
        });
    }
  }
  await page.goto("/signin?next=/studio");
  await page.getByRole("button", { name: "Enter studio preview" }).click();
  await expect(
    page.getByRole("heading", { name: "Make it a good day." }),
  ).toBeVisible();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/studio",
      "/studio/calendar",
      "/studio/clients",
      "/studio/insights",
      "/studio/settings",
    ]) {
      await page.goto(route);
      await expect(page.locator('main[aria-busy="true"]')).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `${width} ${route} overflows`,
      ).toBeTruthy();
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        axe.violations
          .filter((v) => v.impact === "critical" || v.impact === "serious")
          .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
        `${width} ${route}`,
      ).toEqual([]);
      if (route === "/studio")
        await page.screenshot({
          path: `/tmp/fic-studio-${width}.png`,
          fullPage: width === 390,
        });
    }
  }
});

test("client visits and preferences work at desktop and phone sizes", async ({
  page,
}) => {
  await page.goto("/signin");
  await page.getByRole("button", { name: "Enter client preview" }).click();
  await expect(page.getByRole("heading", { name: "Hey, Alex." })).toBeVisible();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/account", "/account/profile"]) {
      await page.goto(route);
      await expect(page.locator('main[aria-busy="true"]')).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBeTruthy();
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        audit.violations
          .filter((v) => v.impact === "critical" || v.impact === "serious")
          .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      ).toEqual([]);
      if (route === "/account")
        await page.screenshot({
          path: `/tmp/fic-account-${width}.png`,
          fullPage: width === 390,
        });
    }
  }
});
