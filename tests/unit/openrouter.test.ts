import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { chatbots } from "@/content/chatbots";
import { proposeTopic } from "@/lib/llm/openrouter";
import { FAQAgent } from "@/lib/engine/agents";

beforeEach(() => vi.stubEnv("OPENROUTER_API_KEY", "test-key"));
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const answer = (content: string) => Response.json({ choices: [{ message: { content } }] });
it("uses deterministic knowledge without calling a provider when no key exists", async () => {
  vi.stubEnv("OPENROUTER_API_KEY", "");
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  expect(await proposeTopic(chatbots.dental, "hours")).toBeNull();
  expect(await FAQAgent(chatbots.dental, "hours")).toBe(chatbots.dental.knowledgeBase.find((item) => item.topic === "hours")!.answer);
  expect(fetcher).not.toHaveBeenCalled();
});
it("uses a validated topic to select local facts and redacts contact details", async () => {
  const fetcher = vi.fn().mockResolvedValue(answer('{"topic":"hours"}')); vi.stubGlobal("fetch", fetcher);
  expect(await FAQAgent(chatbots.dental, "hours alex@example.com +15555550123")).toBe(chatbots.dental.knowledgeBase.find((item) => item.topic === "hours")!.answer);
  const options = fetcher.mock.calls[0][1];
  const body = JSON.parse(options.body);
  expect(body.messages[1].content).not.toContain("alex@example.com");
  expect(body.messages[1].content).not.toContain("15555550123");
  expect(options.signal).toBeInstanceOf(AbortSignal);
});
it.each(['{"topic":"invented"}', '{"topic":"hours","reply":"invented facts"}', 'not json', '{"topic":42}'])("rejects invalid provider output %s", async (content) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(answer(content)));
  await expect(proposeTopic(chatbots.dental, "hours")).rejects.toThrow();
});
it("handles a valid unsupported topic without inventing an answer", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(answer('{"topic":null}')));
  expect(await FAQAgent(chatbots.dental, "unknown")).toMatch(/don.t have a reliable answer/i);
});
it("rejects provider HTTP failures", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 })));
  await expect(proposeTopic(chatbots.dental, "hours")).rejects.toThrow("Provider unavailable");
});
it("enforces an eight-second timeout and propagates abort failure", async () => {
  const timeout = vi.spyOn(AbortSignal, "timeout");
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("Timed out", "TimeoutError")));
  await expect(proposeTopic(chatbots.dental, "hours")).rejects.toThrow("Timed out");
  expect(timeout).toHaveBeenCalledWith(8000);
});
