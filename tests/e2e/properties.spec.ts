import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("property filters, map selection, unavailable homes and complete viewing", async ({ page }) => {
  await page.goto("/demos/real-estate-chatbot");
  await expect(page.locator(".property-card")).toHaveCount(3);
  await expect(page.locator(".property-results")).toContainText("952,500");
  await page.getByRole("button", { name: "The Garden House, Sold", exact: false }).click();
  await expect(page.getByRole("button", { name: "Sold · Viewings unavailable" })).toBeDisabled();
  await page.getByRole("button", { name: "Rent", exact: true }).click();
  await expect(page.locator(".property-results")).toContainText("550 / week");
  await page.getByLabel("Max price (USD/week)").fill("500");
  await expect(page.locator(".property-card")).toHaveCount(1);
  await expect(page.locator(".property-card")).toContainText("Cedar Cottage");
  await page.getByLabel("Max price (USD/week)").fill("100");
  await expect(page.getByText("No homes match these filters.")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByRole("button", { name: "Buy", exact: true }).click();
  await page.getByRole("button", { name: "The Willow House, For sale", exact: false }).click();
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Request a demo viewing" }).click();
  await page.waitForTimeout(500);
  expect(await page.locator("#property-assistant .chat-widget").evaluate(element => element.getBoundingClientRect().top)).toBeLessThan(130);
  await expect(page.getByRole("button", { name: "Start this viewing request" })).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Start this viewing request" }).click();
  await expect(page.locator(".selected-viewing")).toHaveCount(0);
  for (const value of ["Alex Example", "alex@example.com"]) {
    const input = page.getByRole("textbox", { name: "Your message" });
    await expect(input).toBeEnabled(); await input.fill(value);
    await page.getByRole("button", { name: "Send message" }).click();
  }
  await page.locator(".calendar-days button:enabled").first().click();
  await page.locator(".time-slots button:enabled").first().click();
  await expect(page.getByRole("region", { name: "Review your request" })).toContainText("HH-101");
  await page.getByRole("button", { name: "Confirm request", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Demo request recorded/ })).toBeVisible();
});
