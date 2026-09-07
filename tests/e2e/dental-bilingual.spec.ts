import { test, expect } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": crypto.randomUUID() });
});

// Regression guard for the QA-reported language leak: a PT session must stay
// Portuguese through every guided booking step and the confirmation, in the
// owner-specified order Service -> Day -> Time -> Name -> Phone.
test("PT booking flow stays Portuguese end to end", async ({ page }) => {
  await page.goto("/demos/dental-chatbot");
  // Force Portuguese via the language toggle.
  await page.getByRole("button", { name: "PT", exact: true }).click();
  // Greeting is Portuguese.
  await expect(page.getByRole("log")).toContainText("Oi! Eu sou a Bia");
  await page.getByRole("checkbox").check();
  // Free-text PT routing into booking.
  await page.getByRole("textbox", { name: "Sua mensagem" }).fill("quero agendar");
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  // Step 1 is Service (Portuguese prompt), not "Your name".
  await expect(page.getByRole("log")).toContainText("Serviço?");
  await expect(page.getByRole("log")).not.toContainText("Your name");
  // Pick service chip (displays "Limpeza").
  await page.getByRole("button", { name: "Limpeza", exact: true }).click();
  // Day then time via calendar.
  await page.locator(".calendar-days button:enabled").first().click();
  await page.locator(".time-slots button:enabled").first().click();
  // Name then phone (Portuguese labels in progress bar).
  await expect(page.locator(".request-progress")).toContainText("Seu nome");
  await page.getByRole("textbox", { name: "Sua mensagem" }).fill("Maria Fictícia");
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(page.locator(".request-progress")).toContainText("Telefone");
  await page.getByRole("textbox", { name: "Sua mensagem" }).fill("+5511999990000");
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  // Confirmation card: Portuguese heading + all-Portuguese labels.
  await expect(page.getByRole("heading", { name: "Confira antes de confirmar" })).toBeVisible();
  const region = page.getByRole("region", { name: "Confira seu pedido" });
  for (const label of ["Serviço", "Data preferida", "Horário preferido", "Seu nome", "Telefone"]) {
    await expect(region).toContainText(label);
  }
  await expect(region).not.toContainText("Your name");
  await expect(region).not.toContainText("Phone number");
  await page.getByRole("button", { name: "Confirmar pedido", exact: true }).click();
  await expect(page.getByRole("heading", { name: "✓ Pedido de demonstração registrado" })).toBeVisible();
  await expect(page.getByRole("log")).toContainText("nenhuma consulta");
});
