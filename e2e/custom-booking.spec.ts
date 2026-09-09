import { emptyIntake } from "../src/lib/recovery/model";
import { test, expect } from "@playwright/test";
import { DateTime } from "luxon";
import AxeBuilder from "@axe-core/playwright";
test.use({ actionTimeout: 15000 });
for (const mobile of [false, true])
  test(`Katie booking, reschedule and cancel ${mobile ? "mobile" : "desktop"}`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/book");
    expect(
      (
        await page.request.post("/api/auth", {
          data: { action: "demo", role: "client" },
          headers: { origin: new URL(page.url()).origin },
        })
      ).ok(),
    ).toBeTruthy();
    await page.reload();
    await page.getByRole("button", { name: /Katie Men’s grooming/ }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: "Haircut", exact: true }).click();
    await page.getByRole("button", { name: /The signature cut/ }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    let day = DateTime.now()
      .setZone("America/Chicago")
      .plus({ days: mobile ? 23 : 21 });
    if (day.weekday === 7) day = day.plus({ days: 1 });
    await page.getByLabel("Appointment date").fill(day.toISODate()!);
    await expect(page.locator(".slots button").first()).toBeVisible();
    await page.locator(".slots button").first().click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("checkbox", { name: /I acknowledge/ }).check();
    await page
      .getByRole("button", { name: "Confirm visit", exact: true })
      .click();
    await expect(
      page.getByText("Your appointment is saved.", { exact: false }),
    ).toBeVisible();
    const link = page.getByRole("link", { name: "Reschedule", exact: true });
    const href = await link.getAttribute("href");
    const id = new URL("http://localhost" + href).searchParams.get(
      "reschedule",
    )!;
    await page.screenshot({
      path: `test-results/booking-${mobile ? "mobile" : "desktop"}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    const axe = await new AxeBuilder({ page })
      .include(".confirmation")
      .analyze();
    expect(axe.violations).toEqual([]);
    await link.click();
    let movedDay = day.plus({ days: 2 });
    if (movedDay.weekday === 7) movedDay = movedDay.plus({ days: 1 });
    await page.getByLabel("Appointment date").fill(movedDay.toISODate()!);
    await expect(page.locator(".slots button").first()).toBeVisible();
    await page.locator(".slots button").first().click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("checkbox", { name: /I acknowledge/ }).check();
    await page.getByRole("button", { name: "Confirm new time" }).click();
    await expect(
      page.getByText("Your appointment is saved.", { exact: false }),
    ).toBeVisible();
    const response = await page.request.patch(`/api/appointments/${id}`, {
      data: { status: "cancelled" },
      headers: { origin: new URL(page.url()).origin },
    });
    expect(response.ok()).toBeTruthy();
    expect(errors).toEqual([]);
  });
test("Kamilla goal-based flow waits for approved business configuration", async ({
  page,
}) => {
  await page.goto("/book?experience=camilla");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "First massage", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Personalized massage/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Personalized massage/ }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByText("No openings on this date.", { exact: false }),
  ).toBeVisible();
});
test("configured Kamilla intake → appointment → therapist calendar → returning visit", async ({
  page,
  browser,
}) => {
  const { DatabaseSync } = await import("node:sqlite");
  const path = process.env.DATABASE_PATH;
  if (
    !path?.startsWith("/tmp/fic-booking-") &&
    !path?.startsWith("/private/tmp/fix-it-business-os-")
  )
    throw new Error("Use an isolated booking test database.");
  await page.goto("/book");
  const database = new DatabaseSync(path);
  database
    .prepare(
      "UPDATE staff_assignments SET professional_id='pro-a' WHERE user_id='demo-staff'",
    )
    .run();
  try {
    database
      .prepare(
        "INSERT OR REPLACE INTO service_rules VALUES(?,?,?,?,?,?,?,?,?,?)",
      )
      .run("massage", 60, 20, 10000, 0, 0, 120, 45, 24, 1);
    for (const key of [
      "therapist_name",
      "therapist_license",
      "establishment_name",
      "establishment_license",
    ])
      database
        .prepare("INSERT OR REPLACE INTO business_settings VALUES(?,?)")
        .run(key, "TEST FIXTURE");
    expect(
      (
        await page.request.post("/api/auth", {
          data: { action: "demo", role: "client" },
          headers: { origin: new URL(page.url()).origin },
        })
      ).ok(),
    ).toBeTruthy();
    await page.goto("/book?experience=camilla");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: "Relaxation", exact: true }).click();
    await page.getByRole("button", { name: /Personalized massage/ }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    let day = DateTime.now().setZone("America/Chicago").plus({ days: 25 });
    if (day.weekday === 7) day = day.plus({ days: 1 });
    await page.getByLabel("Appointment date").fill(day.toISODate()!);
    await page.locator(".slots button").first().click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    const saved = await page.request.post("/api/recovery", {
      headers: { origin: new URL(page.url()).origin },
      data: {
        revision: database
          .prepare(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='recovery_profiles'",
          )
          .get()
          ? ((
              database
                .prepare(
                  "SELECT revision FROM recovery_profiles WHERE client_id='demo-client'",
                )
                .get() as { revision: number } | undefined
            )?.revision ?? 0)
          : 0,
        mode: "full",
        answers: {
          ...emptyIntake,
          work: "Mostly sitting",
          activity: "Moderate",
          firstMassage: "No",
          goal: "Relaxation",
          pressure: "Medium",
          health: ["None of these"],
          care: "No",
          allergies: "No",
          medications: "No",
          bloodThinner: "No",
          bruising: "No",
          consent: true,
          signature: "TEST FIXTURE CLIENT",
        },
      },
    });
    expect(saved.ok()).toBeTruthy();
    await page.getByRole("button", { name: "Check saved intake" }).click();
    await page
      .getByRole("checkbox", { name: /My health information is current/ })
      .check();
    await page.getByRole("checkbox", { name: /I acknowledge/ }).check();
    await page
      .getByRole("button", { name: "Confirm visit", exact: true })
      .click();
    await expect(
      page.getByText("Your appointment is saved.", { exact: false }),
    ).toBeVisible();
    const visits = await (await page.request.get("/api/appointments")).json();
    const confirmationHref = await page
      .getByRole("link", { name: "Reschedule", exact: true })
      .getAttribute("href");
    const confirmedId = new URL(confirmationHref!, page.url()).searchParams.get(
      "reschedule",
    );
    const visit = visits.appointments.find(
      (a: { id: string }) => a.id === confirmedId,
    );
    expect(visit.intake_id).toBeTruthy();
    const staff = await browser.newContext();
    const therapist = await staff.newPage();
    await therapist.goto("/signin");
    await therapist.request.post("/api/auth", {
      data: { action: "demo", role: "staff" },
      headers: { origin: new URL(page.url()).origin },
    });
    expect(
      (await therapist.request.get(`/api/intake?id=${visit.intake_id}`)).ok(),
    ).toBeFalsy();
    database
      .prepare(
        "UPDATE staff_assignments SET professional_id='pro-b' WHERE user_id='demo-staff'",
      )
      .run();
    await therapist.goto("/studio/calendar");
    await therapist
      .getByRole("button", { name: "Agenda", exact: true })
      .click();
    const visitCard = therapist
      .locator(".appointment-card")
      .filter({
        has: therapist.locator(`a[href="/studio/workspace/${visit.id}"]`),
      });
    await expect(
      visitCard.getByRole("heading", { name: "Personalized massage" }),
    ).toBeVisible();
    await visitCard
      .getByRole("button", { name: "Review confidential intake" })
      .click();
    await expect(therapist.getByText(/TEST FIXTURE CLIENT/)).toBeVisible();
    await page.goto("/book?experience=camilla");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: "Relaxation", exact: true }).click();
    await page.getByRole("button", { name: /Personalized massage/ }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByLabel("Appointment date").fill(day.toISODate()!);
    await page.locator(".slots button").last().click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(
      page.getByRole("checkbox", { name: /My health information is current/ }),
    ).toBeVisible();
    database
      .prepare(
        "UPDATE staff_assignments SET professional_id='pro-a' WHERE user_id='demo-staff'",
      )
      .run();
    database
      .prepare("UPDATE service_rules SET enabled=0 WHERE service_id='massage'")
      .run();
    await staff.close();
  } finally {
    database
      .prepare(
        "UPDATE staff_assignments SET professional_id='pro-a' WHERE user_id='demo-staff'",
      )
      .run();
    database
      .prepare("UPDATE service_rules SET enabled=0 WHERE service_id='massage'")
      .run();
    database.close();
  }
});
