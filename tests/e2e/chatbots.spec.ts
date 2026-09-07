import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": crypto.randomUUID() });
});

const cases = [
  { slug: "dental", title: "BrightSmile Dental", start: "Book an appointment", values: ["Cleaning"] },
  { slug: "real-estate", title: "Harbor Homes", start: "Find a property", values: ["Rent", "Riverside", "AUD 500 per week", "0", "1–3 months", "alex@example.com"] },
  { slug: "home-services", title: "FixRight Home Services", start: "Request a quote", values: ["Plumbing", "A dripping fictional tap", "Riverside", "Urgent but no immediate danger", "Morning", "Alex Example", "alex@example.com"] },
];
for (const demo of cases) {
  test(`${demo.slug}: accessible complete confirmation flow`, async ({ page }, testInfo) => {
    await page.goto(`/demos/${demo.slug}-chatbot`);
    await expect(page.getByRole("heading", { name: demo.title, exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Send message" })).toBeDisabled();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: demo.start, exact: true }).click();
    await expect(page.getByRole("textbox", { name: "Your message" })).toBeEnabled();
    for (const value of demo.values) {
      const input = page.getByRole("textbox", { name: "Your message" });
      await input.fill(value);
      await page.getByRole("button", { name: "Send message" }).click();
      await expect(input).toBeEnabled();
    }
    if (demo.slug === "dental") {
      expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
      await page.locator(".calendar-days button:enabled").first().click();
      await expect(page.locator(".time-slots button:disabled").first()).toBeVisible();
      await page.locator(".time-slots button:enabled").first().click();
      // New guided order collects name and phone after day/time.
      for (const value of ["Alex Example", "0400000000"]) {
        const input = page.getByRole("textbox", { name: "Your message" });
        await input.fill(value);
        await page.getByRole("button", { name: "Send message" }).click();
        await expect(input).toBeEnabled();
      }
    }
    await expect(page.getByRole("heading", { name: "Review before confirming" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Review your request" })).toContainText(demo.slug === "real-estate" ? "alex@example.com" : "Alex");
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(axe.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (testInfo.project.name === "chromium") await page.screenshot({ path: `public/screenshots/${demo.slug}.png`, fullPage: true });
    if (demo.slug === "dental") { await page.getByRole("button", { name: "Change date or time" }).click(); await page.locator(".calendar-days button:enabled").last().click(); await page.locator(".time-slots button:enabled").last().click(); await expect(page.getByRole("region", { name: "Review your request" })).toContainText("Alex"); }
    await page.getByRole("button", { name: "Confirm request", exact: true }).click();
    await expect(page.getByRole("heading", { name: "✓ Demo request recorded" })).toBeVisible();
    await page.getByRole("button", { name: "Restart conversation" }).click();
    await expect(page.getByRole("heading", { name: "✓ Demo request recorded" })).toHaveCount(0);
    await expect(page.getByRole("log")).not.toContainText("alex@example.com");
  });
}

test("case links, disclosure and accessibility", async ({ page }) => {
  await page.goto("/selected-work/small-business-chatbots");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("AI Chatbots for");
  await expect(page.getByRole("heading", { name: "Tell us what your first response needs to do." })).toBeVisible();
  await expect(page.getByRole("link", { name: /WhatsApp/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "vinicius@ambern.dev" })).toBeVisible();
  await expect(page.getByText("Portfolio demonstration created by Ambern.", { exact: false })).toBeVisible();
  for (const demo of cases) await expect(page.locator(`a[href='/demos/${demo.slug}-chatbot']`)).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("safe refusal and recoverable API error", async ({ page }) => {
  await page.goto("/demos/dental-chatbot");
  await page.getByRole("checkbox").check();
  await page.getByRole("textbox", { name: "Your message" }).fill("Prescribe antibiotics for my toothache");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("log")).toContainText("not medical advice");
  await page.route("**/api/chat", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "PROVIDER_ERROR", message: "Please try again shortly." } }) }));
  await page.getByRole("textbox", { name: "Your message" }).fill("Opening hours");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.locator(".chat-error")).toContainText("Please try again");
  await expect(page.getByRole("textbox", { name: "Your message" })).toHaveValue("Opening hours");
});
