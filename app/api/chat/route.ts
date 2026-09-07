import { createHash } from "node:crypto";
import { chat, ChatFailure } from "@/lib/engine";
import { getRepository } from "@/lib/db/repository";
import { chatRequestSchema, chatResponseSchema, rateLimit } from "@/lib/security/validation";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
function error(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status, headers: { ...headers, ...(status === 429 ? { "Retry-After": "60" } : {}) } });
}
const inFlight = new Set<string>();
export async function POST(request: Request) {
  let lock: string | undefined;
  try {
    const origin = request.headers.get("origin");
    // TLS terminates at the proxy, so request.url may contain the internal HTTP origin.
    // Use an explicit public origin instead of trusting client-controlled forwarded headers.
    const publicOrigin = new URL(process.env.APP_ORIGIN || "https://chatbots.ambern.dev").origin;
    if (origin && origin !== new URL(request.url).origin && origin !== publicOrigin) return error("INVALID_REQUEST", "Cross-origin requests are not supported.", 403);
    // Default bucket cannot be bypassed by spoofing proxy headers. Enable only behind a trusted, header-replacing proxy.
    const address = process.env.TRUST_PROXY === "true" ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown" : "local";
    const ipKey = createHash("sha256").update(address).digest("hex");
    if (!rateLimit(`ip:${ipKey}`)) return error("RATE_LIMITED", "Too many messages. Please wait a minute.", 429);
    if (!request.headers.get("content-type")?.includes("application/json")) return error("INVALID_REQUEST", "Expected a JSON request.", 415);
    if (Number(request.headers.get("content-length") ?? 0) > 8192) return error("PAYLOAD_TOO_LARGE", "Request is too large.", 413);
    const reader = request.body?.getReader();
    if (!reader) return error("INVALID_REQUEST", "A request body is required.", 400);
    let bytes = 0; const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 8192) { await reader.cancel(); return error("PAYLOAD_TOO_LARGE", "Request is too large.", 413); }
      chunks.push(value);
    }
    let raw: unknown;
    try { raw = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return error("INVALID_REQUEST", "Please send valid JSON.", 400); }
    const parsed = chatRequestSchema.safeParse(raw);
    if (!parsed.success) return error("INVALID_REQUEST", "Choose a supported demo, acknowledge the disclosure and enter 1–1000 characters.", 400);
    if (parsed.data.sessionId && !rateLimit(`session:${parsed.data.sessionId}`)) return error("RATE_LIMITED", "Too many messages. Please wait a minute.", 429);
    lock = parsed.data.sessionId ?? crypto.randomUUID();
    if (inFlight.has(lock)) { lock = undefined; return error("INVALID_REQUEST", "Please wait for the previous reply.", 409); }
    inFlight.add(lock);
    const result = await chat(parsed.data, await getRepository());
    return Response.json(chatResponseSchema.parse(result), { headers });
  } catch (failure) {
    if (failure instanceof ChatFailure) return error(failure.code, failure.code === "PROVIDER_ERROR" ? "The AI provider is unavailable. Please try again shortly." : "This session is unavailable for this demo. Please restart the conversation.", failure.status);
    return error("INTERNAL_ERROR", "We could not process that message. Please try again.", 500);
  } finally { if (lock) inFlight.delete(lock); }
}
