import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createHash, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
test.use({ actionTimeout: 15000 });
const origin = `http://127.0.0.1:${process.env.TEST_PORT || "3000"}`;
// This suite must never mutate the shared application database.
const safe = process.env.DATABASE_PATH?.startsWith(
  "/private/tmp/fix-it-business-os-",
);
test.skip(
  !safe,
  "Run with an isolated /private/tmp/fix-it-business-os-* DATABASE_PATH.",
);
let ownerToken = "",
  millaToken = "",
  deskToken = "",
  visit = "",
  clientId = "",
  productSku = "",
  productName = "";
test.beforeAll(async ({ request }) => {
  const auth = await request.post("/api/auth", {
    headers: { origin },
    data: { action: "demo", role: "staff" },
  });
  expect(auth.ok(), await auth.text()).toBeTruthy();
  const d = new DatabaseSync(process.env.DATABASE_PATH!);
  d.exec("PRAGMA foreign_keys=ON;PRAGMA busy_timeout=5000;");
  const run = randomUUID().slice(0, 8);
  clientId = `os-client-${run}`;
  visit = `os-visit-${run}`;
  productSku = `OS-${run}`;
  productName = `Groomed Gent test oil ${run}`;
  for (const [id, role, name] of [
    [clientId, "client", "Morgan OS Test"],
    [`os-owner-${run}`, "owner", "Owner Test"],
    [`os-milla-${run}`, "staff", "Kamilla Test"],
    [`os-desk-${run}`, "staff", "Front Desk Test"],
  ])
    d.prepare(
      "INSERT INTO users(id,name,email,password_hash,role) VALUES(?,?,?,?,?)",
    ).run(id, name, `${id}@example.test`, "unusable", role);
  const tokens = [randomUUID(), randomUUID(), randomUUID()];
  [ownerToken, millaToken, deskToken] = tokens;
  for (const [i, role] of ["owner", "milla", "desk"].entries())
    d.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
      createHash("sha256").update(tokens[i]).digest("hex"),
      `os-${role}-${run}`,
      new Date(Date.now() + 3600000).toISOString(),
    );
  for (const [role, clinical] of [
    ["milla", 1],
    ["desk", 0],
  ] as const) {
    d.prepare("INSERT INTO staff_assignments VALUES(?,?)").run(
      `os-${role}-${run}`,
      "pro-b",
    );
    d.prepare("INSERT INTO team_roles VALUES(?,?,?)").run(
      `os-${role}-${run}`,
      role === "desk" ? "front_desk" : "provider",
      clinical,
    );
  }
  const start = new Date(Date.now() - 7200000).toISOString(),
    end = new Date(Date.now() - 3600000).toISOString();
  d.prepare("INSERT INTO appointments VALUES(?,?,?,?,?,?,?,?,?,?,?)").run(
    visit,
    clientId,
    "pro-a",
    "signature-cut",
    start,
    end,
    end,
    6500,
    "completed",
    "[]",
    start,
  );
  d.prepare("INSERT INTO appointments VALUES(?,?,?,?,?,?,?,?,?,?,?)").run(
    `${visit}-massage`,
    clientId,
    "pro-b",
    "massage",
    start,
    end,
    end,
    10000,
    "completed",
    "[]",
    start,
  );
  d.close();
});
test("owner renders, completes service + retail cash checkout, sees ledger and reports", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page
    .context()
    .addCookies([{ name: "fic_session", value: ownerToken, url: origin }]);
  await page.goto("/studio");
  await expect(
    page.getByRole("heading", { name: /Good (morning|afternoon|evening)/ }),
  ).toBeVisible();
  await expect(page.locator("[data-nextjs-dialog]")).toHaveCount(0);
  await page.screenshot({
    path: "artifacts/business-command-desktop.png",
    fullPage: true,
  });
  const axe = await new AxeBuilder({ page }).include(".os-workspace").analyze();
  expect(axe.violations).toEqual([]);
  await page.goto("/studio/operations");
  await page.getByText("Add a product", { exact: true }).click();
  await page.getByLabel("Product name", { exact: true }).fill(productName);
  await page.getByLabel("SKU", { exact: true }).fill(productSku);
  await page.getByLabel("Brand", { exact: true }).fill("Groomed Gent");
  await page.getByLabel("Price ($)", { exact: true }).fill("20");
  await page.getByRole("button", { name: "Add product", exact: true }).click();
  await expect(
    page
      .locator("#inventory strong")
      .filter({ hasText: `${productName} · 0 on hand` }),
  ).toBeVisible();
  await page.getByText("Record stock movement", { exact: true }).click();
  await page
    .getByLabel("Product", { exact: true })
    .selectOption({ label: `${productName} · 0 on hand` });
  await page.getByLabel("Quantity change").fill("5");
  await page.getByLabel("Reason / receipt reference").fill("QA opening stock");
  await page
    .getByRole("button", { name: "Record movement", exact: true })
    .click();
  await expect(
    page
      .locator("#inventory strong")
      .filter({ hasText: `${productName} · 5 on hand` }),
  ).toBeVisible();
  await page.goto(`/studio/operations?appointment=${visit}`);
  await page
    .getByLabel(`Quantity for ${productName}`, { exact: true })
    .fill("1");
  await page.getByLabel("Tip ($)", { exact: true }).fill("10");
  await page
    .getByRole("button", { name: "Create checkout", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Total $95", exact: true }),
  ).toBeVisible();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Record $95 cash received", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Finish visit & rebook ↗", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Finish visit & rebook ↗", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Finish checkout", exact: true })
    .click();
  await expect(page.locator(".os-hero .os-tag")).toHaveText("checked out");
  await page.goto("/studio/business");
  await expect(
    page.getByText(productName, { exact: false }).first(),
  ).toBeVisible();
  await page.goto("/studio/search?q=Morgan");
  await expect(
    page
      .locator(".os-search-results")
      .getByRole("link", { name: /^Morgan OS Test/ })
      .first(),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("Kamilla saves SOAP revisions; front desk cannot receive clinical content", async ({
  page,
  browser,
}) => {
  await page
    .context()
    .addCookies([{ name: "fic_session", value: millaToken, url: origin }]);
  await page.goto(`/studio/workspace/${visit}-massage`);
  await page
    .getByLabel("Subjective · Client report & session goals")
    .fill("PRIVATE QA REPORT");
  await page
    .getByLabel("Objective · Findings & observations")
    .fill("QA observations");
  await page.getByLabel("Assessment · Treatment response").fill("QA response");
  await page.getByLabel("Plan · Next steps & follow-up").fill("QA plan");
  await page
    .getByRole("button", { name: "Save SOAP revision 1", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save SOAP revision 2", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Plan · Next steps & follow-up")
    .fill("QA revised plan");
  await page
    .getByRole("button", { name: "Save SOAP revision 2", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save SOAP revision 3", exact: true }),
  ).toBeVisible();
  const desk = await browser.newContext();
  await desk.addCookies([
    { name: "fic_session", value: deskToken, url: origin },
  ]);
  const tab = await desk.newPage();
  const response = await tab.goto(`/studio/workspace/${visit}-massage`);
  expect(await response!.text()).not.toContain("PRIVATE QA REPORT");
  await expect(
    tab.getByText(
      "Clinical permission is required to view or write SOAP notes.",
    ),
  ).toBeVisible();
  const denied = await tab.request.post("/api/business", {
    headers: { origin },
    data: {
      action: "soap",
      data: {
        id: `${visit}-massage`,
        revision: 2,
        note: {
          subjective: "a",
          objective: "b",
          assessment: "c",
          plan: "d",
          areas: [],
          techniques: "",
          pressure: "",
          response: "",
          followUpDays: null,
        },
      },
    },
  });
  expect(denied.ok()).toBeFalsy();
  await desk.close();
});
test("mobile navigation, growth refresh, task persistence and no overflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .context()
    .addCookies([{ name: "fic_session", value: ownerToken, url: origin }]);
  await page.goto("/studio");
  await expect(
    page.getByRole("link", { name: "Quick action", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "artifacts/business-command-mobile.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Growth", exact: true }).click();
  await page
    .getByRole("button", { name: "Refresh opportunities", exact: true })
    .click();
  await expect(
    page.getByText("Review opportunity · Morgan OS Test").first(),
  ).toBeVisible();
  await page.getByRole("link", { name: "More", exact: true }).click();
  await page.getByText("Add a task", { exact: true }).click();
  await page
    .getByLabel("Task", { exact: true })
    .fill(`Review tomorrow’s appointments ${visit}`);
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(
    page.getByText(`Review tomorrow’s appointments ${visit}`, { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText(`Review tomorrow’s appointments ${visit}`, { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});
