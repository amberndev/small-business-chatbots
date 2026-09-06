import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/chat/route";
import { clearRateLimits } from "@/lib/security/validation";

beforeEach(() => { clearRateLimits(); vi.stubEnv("OPENROUTER_API_KEY", ""); vi.stubEnv("DATABASE_URL", ""); vi.stubEnv("TRUST_PROXY", "false"); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const valid = { chatbotId: "dental", sessionId: null, message: "hours", consentAcknowledged: true };
const request = (body: unknown = valid, headers: Record<string, string> = {}) => new Request("http://localhost/api/chat", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
it("returns validated conversation data with no-store security headers", async () => {
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(await response.json()).toMatchObject({ demoMode: true, reply: { role: "assistant" }, stateKind: "faq" });
});
it.each([{ message: "" }, { message: " " }, { message: "a".repeat(1001) }, { consentAcknowledged: false }, { chatbotId: "wrong" }, { sessionId: "not-a-uuid" }, { unexpected: true }])("rejects invalid payload %j", async (change) => {
  expect((await POST(request({ ...valid, ...change }))).status).toBe(400);
});
it("rejects unsupported content type, malformed JSON and cross-origin callers", async () => {
  expect((await POST(request(valid, { "Content-Type": "text/plain" }))).status).toBe(415);
  expect((await POST(new Request("http://localhost/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }))).status).toBe(400);
  expect((await POST(request(valid, { origin: "https://attacker.example" }))).status).toBe(403);
});
it("enforces actual body bytes even without a content-length header", async () => {
  expect((await POST(request({ ...valid, message: "a".repeat(9000) }))).status).toBe(413);
  expect((await POST(request(valid, { "content-length": "9000" }))).status).toBe(413);
});
it("does not let spoofed proxy headers bypass the rate limit", async () => {
  for (let i = 0; i < 30; i++) expect((await POST(request(valid, { "x-forwarded-for": `192.0.2.${i}` }))).status).toBe(200);
  const response = await POST(request(valid, { "x-forwarded-for": "192.0.2.99" }));
  expect(response.status).toBe(429);
  expect(response.headers.get("retry-after")).toBe("60");
});
it("returns session isolation and missing-session errors", async () => {
  const first = await (await POST(request())).json();
  expect((await POST(request({ ...valid, sessionId: first.sessionId, chatbotId: "real-estate" }))).status).toBe(409);
  expect((await POST(request({ ...valid, sessionId: crypto.randomUUID() }))).status).toBe(404);
});
it("returns a safe provider failure without exposing upstream details", async () => {
  vi.stubEnv("OPENROUTER_API_KEY", "private-test-key");
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("secret upstream detail")));
  const response = await POST(request());
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ error: { code: "PROVIDER_ERROR" } });
});
