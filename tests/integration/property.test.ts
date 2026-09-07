import { expect, it } from "vitest";
import { chat } from "@/lib/engine";
import { MemoryRepository } from "@/lib/db/repository";
import { filterProperties } from "@/content/properties";

it("separates rental and sale prices and excludes closed homes from available filters", () => {
  expect(filterProperties("Rent", "Available", 0, 600, 0).map(property => property.id)).toEqual(["HH-104"]);
  expect(filterProperties("Buy", "Available", 0, 900000, 3).map(property => property.id)).toEqual(["HH-101"]);
  expect(filterProperties("Buy", "Closed", 0, Infinity, 0).map(property => property.id)).toEqual(["HH-105"]);
});
it.each(["HH-105", "HH-106", "HH-999"])("rejects unavailable catalogue viewing %s server-side", async id => {
  const repository = new MemoryRepository();
  const result = await chat({ chatbotId: "real-estate", sessionId: null, message: `Visit property ${id}`, consentAcknowledged: true }, repository);
  expect(result.stateKind).toBe("idle");
  expect(result.reply.text).toContain("unavailable");
  expect(repository.requests.size).toBe(0);
});
it("preserves the selected property through editing and date changes, then records only anonymized fields", async () => {
  const repository = new MemoryRepository();
  let sessionId: string | null = null;
  const send = async (message: string) => {
    const result = await chat({ chatbotId: "real-estate", sessionId, message, consentAcknowledged: true }, repository);
    sessionId = result.sessionId;
    return result;
  };
  expect((await send("Visit property HH-101")).reply.text).toContain("Willow House");
  await send("Alex Example");
  let result = await send("alex@example.com");
  const day = result.schedule!.days.find(day => day.slots.some(slot => slot.available))!;
  await send(day.date);
  result = await send(day.slots.find(slot => slot.available)!.time);
  expect(result.summary?.Property).toContain("HH-101");
  await send("Edit");
  expect((await repository.get(sessionId!))!.fields).toEqual({ propertyId: "HH-101" });
  await send("Alex Example"); await send("alex@example.com"); await send(day.date);
  await send(day.slots.find(slot => slot.available)!.time);
  await send("Change date");
  expect((await repository.get(sessionId!))!.fields.propertyId).toBe("HH-101");
  await send(day.date); await send(day.slots.find(slot => slot.available)!.time);
  expect((await send("Confirm")).outcome).toBe("booking");
  expect([...repository.requests.values()][0].fields.propertyId).toBe("[demo value removed]");
});
