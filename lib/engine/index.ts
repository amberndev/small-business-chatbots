import { chatbots } from "@/content/chatbots";
import type { ChatRequest, ChatResponse, LeadFieldSpec } from "@/lib/types";
import { anonymize, SESSION_TTL_MS, type ChatRepository, type Session } from "@/lib/db/repository";
import { BookingAgent, FAQAgent, HumanHandoffAgent, LeadQualificationAgent, RouterAgent, safetyReply } from "./agents";

export class ChatFailure extends Error {
  constructor(public code: "SESSION_NOT_FOUND" | "SESSION_CHATBOT_MISMATCH" | "PROVIDER_ERROR", public status: number) { super(code); }
}
export function flowFields(session: Session): LeadFieldSpec[] {
  const config = chatbots[session.chatbotId];
  return session.flow === "handoff" ? HumanHandoffAgent() : session.flow === "booking" ? BookingAgent(config) : config.leadFields;
}

export async function chat(input: ChatRequest, repository: ChatRepository): Promise<ChatResponse> {
  const config = chatbots[input.chatbotId];
  let session = input.sessionId ? await repository.get(input.sessionId) : undefined;
  if (input.sessionId && !session) throw new ChatFailure("SESSION_NOT_FOUND", 404);
  if (session && session.chatbotId !== input.chatbotId) throw new ChatFailure("SESSION_CHATBOT_MISMATCH", 409);
  session ??= { id: crypto.randomUUID(), chatbotId: input.chatbotId, state: { kind: "idle" }, flow: "lead", fields: {}, consentAcknowledged: true, createdAt: Date.now(), expiresAt: Date.now() + SESSION_TTL_MS };
  const text = input.message.trim();
  let reply: string;
  let quickReplies = config.quickReplies;
  let summary: Record<string, string> | undefined;
  let outcome: ChatResponse["outcome"];
  const safe = safetyReply(config, text);
  if (safe) reply = safe;
  else if (/^(reset|restart|cancel|start over)$/i.test(text)) {
    session.state = { kind: "idle" }; session.fields = {};
    reply = "The current request has been cleared. What would you like to explore?";
  } else if (session.state.kind.endsWith("confirmation")) {
    if (/^(confirm|yes|confirm request|confirm details)$/i.test(text)) {
      const request = { id: session.requestId ?? session.id, sessionId: session.id, chatbotId: session.chatbotId, kind: session.flow,
        fields: anonymize(session.fields), consentAcknowledged: true as const, createdAt: Date.now(), expiresAt: session.expiresAt };
      await repository.record(request);
      session.fields = {}; session.state = { kind: "completed", outcome: session.flow }; outcome = session.flow;
      reply = "Your demonstration request has been recorded with its values removed for privacy. No appointment is booked and no person will contact you. Thank you for trying the demo.";
      quickReplies = ["Start over"];
    } else if (/^(edit|no|change|edit details)$/i.test(text)) {
      session.fields = {}; session.state = { kind: "lead_qualification", collected: {}, nextFieldIndex: 0 };
      const first = flowFields(session)[0]; reply = `Let’s update the details. ${first.label}? Please use fictional details.`;
      quickReplies = first.options ?? [];
    } else {
      reply = "Please review the details, then choose Confirm or Edit. This only records a demonstration request.";
      quickReplies = ["Confirm", "Edit", "Cancel"];
    }
  } else if (session.state.kind === "lead_qualification") {
    const fields = flowFields(session);
    const field = fields[session.state.nextFieldIndex];
    const invalid = LeadQualificationAgent(field, text);
    if (invalid) { reply = invalid; quickReplies = field.options ?? []; }
    else {
      session.fields[field.key] = field.options?.find((option) => option.toLowerCase() === text.toLowerCase()) ?? text;
      const next = session.state.nextFieldIndex + 1;
      if (next < fields.length) {
        session.state = { kind: "lead_qualification", collected: session.fields, nextFieldIndex: next };
        reply = `${fields[next].label}?`; quickReplies = fields[next].options ?? [];
      } else {
        session.state = { kind: "lead_confirmation", collected: session.fields };
        reply = "Please review your fictional details. Confirm to record this demo request, or edit to start the details again. Availability is not checked and no real service or contact is arranged.";
        quickReplies = ["Confirm", "Edit", "Cancel"];
      }
    }
  } else {
    const intent = RouterAgent(config, text);
    if (intent === "lead" || intent === "booking" || intent === "handoff") {
      session.flow = intent; session.fields = {}; session.requestId = crypto.randomUUID();
      session.state = { kind: "lead_qualification", collected: {}, nextFieldIndex: 0 };
      const field = flowFields(session)[0];
      reply = `Let’s prepare a demo ${intent === "handoff" ? "human contact" : intent} request. Use fictional details only. ${field.label}?`;
      quickReplies = field.options ?? [];
    } else {
      try { reply = await FAQAgent(config, text); } catch { throw new ChatFailure("PROVIDER_ERROR", 503); }
      session.state = { kind: "faq" };
    }
  }
  if (session.state.kind.endsWith("confirmation")) {
    summary = Object.fromEntries(flowFields(session).map((field) => [field.label, session.fields[field.key] ?? ""]));
  }
  await repository.save(session);
  await repository.message(session, "user");
  await repository.message(session, "assistant");
  return { sessionId: session.id, reply: { role: "assistant", text: reply }, stateKind: session.state.kind,
    quickReplies, ...(summary ? { summary } : {}), ...(outcome ? { outcome } : {}), demoMode: !process.env.OPENROUTER_API_KEY };
}
