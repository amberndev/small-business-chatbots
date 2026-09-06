import { z } from "zod";
export const chatRequestSchema = z.object({
  chatbotId: z.enum(["dental", "real-estate", "home-services"]),
  sessionId: z.uuid().nullable(), message: z.string().trim().min(1).max(1000),
  consentAcknowledged: z.literal(true),
}).strict();
export const chatResponseSchema = z.object({
  sessionId: z.uuid(), reply: z.object({ role: z.literal("assistant"), text: z.string().min(1).max(4000) }),
  stateKind: z.string(), quickReplies: z.array(z.string()), summary: z.record(z.string(), z.string()).optional(),
  outcome: z.enum(["lead", "booking", "handoff"]).optional(), demoMode: z.boolean(),
});
export const injectionPattern = /ignore.{0,40}(instructions|rules|previous)|system\s*prompt|developer\s*message|reveal.{0,30}(secret|key|prompt)|you are now|jailbreak|<\/?script/i;
export function rateLimit(key: string, now = Date.now()) {
  for (const [id, bucket] of buckets) if (bucket.until <= now) buckets.delete(id);
  const bucket = buckets.get(key) ?? { count: 0, until: now + 60000 };
  if (!buckets.has(key) && buckets.size >= 20000) return false;
  bucket.count++;
  buckets.set(key, bucket);
  return bucket.count <= 30;
}
const buckets = new Map<string, { count: number; until: number }>();
export function clearRateLimits() { buckets.clear(); }
