import { chatbots } from "@/content/chatbots";
import type { ChatRequest, ChatResponse, LeadFieldSpec } from "@/lib/types";
import { anonymize, SESSION_TTL_MS, type ChatRepository, type Session } from "@/lib/db/repository";
import { BookingAgent, FAQAgent, HumanHandoffAgent, LeadQualificationAgent, RouterAgent, safetyReply } from "./agents";
import { availability, BOOKING_TIME_ZONE, scheduleError } from "@/lib/booking/availability";
import { properties, isAvailable, priceLabel } from "@/content/properties";
import { detectLang, engineCopy, fieldLabels, ui, type Lang } from "@/lib/i18n";

export class ChatFailure extends Error {
  constructor(public code: "SESSION_NOT_FOUND" | "SESSION_CHATBOT_MISMATCH" | "PROVIDER_ERROR", public status: number) { super(code); }
}
export function flowFields(session: Session): LeadFieldSpec[] {
  const lang: Lang = session.lang ?? "en";
  if (session.chatbotId === "real-estate" && session.flow === "booking" && session.fields.propertyId) return [
    { key: "name", label: "Fictional name", validate: "text", required: true },
    { key: "contact", label: "Fictional email", validate: "email", required: true },
    { key: "date", label: "Preferred date", validate: "text", required: true },
    { key: "period", label: "Viewing time (Sydney)", validate: "text", required: true },
  ];
  const config = chatbots[session.chatbotId];
  const fields = session.flow === "handoff" ? HumanHandoffAgent() : session.flow === "booking" ? BookingAgent(config) : config.leadFields;
  const hasDate = fields.some(item => item.key === "date");
  return fields.map(field => {
    if (field.key === "period" && hasDate) return { ...field, label: fieldLabels[lang].period, validate: "text" as const, options: undefined };
    if (field.key === "date") return { ...field, label: fieldLabels[lang].date };
    // Only the dental demo is bilingual: localise the whole guided flow so no
    // step or confirmation label leaks the other language.
    if (session.chatbotId === "dental" && fieldLabels[lang][field.key]) return { ...field, label: fieldLabels[lang][field.key] };
    return field;
  });
}

export async function chat(input: ChatRequest, repository: ChatRepository): Promise<ChatResponse> {
  const config = chatbots[input.chatbotId];
  let session = input.sessionId ? await repository.get(input.sessionId) : undefined;
  if (input.sessionId && !session) throw new ChatFailure("SESSION_NOT_FOUND", 404);
  if (session && session.chatbotId !== input.chatbotId) throw new ChatFailure("SESSION_CHATBOT_MISMATCH", 409);
  session ??= { id: crypto.randomUUID(), chatbotId: input.chatbotId, state: { kind: "idle" }, flow: "lead", fields: {}, consentAcknowledged: true, createdAt: Date.now(), expiresAt: Date.now() + SESSION_TTL_MS };
  const text = input.message.trim();
  // Reply in the visitor's language. Re-detect only outside a guided flow, so
  // field values (a name, an English enum like "Cleaning", a time) never flip
  // the language mid-collection. Default to PT-BR when the first message is
  // ambiguous.
  const detected = detectLang(text);
  const collecting = session.state.kind === "lead_qualification" || session.state.kind.endsWith("confirmation");
  if (detected && !collecting) session.lang = detected;
  session.lang ??= "en";
  const lang: Lang = session.lang;
  const copy = engineCopy[lang];
  // Command words accept English (sent by the UI buttons) and Portuguese (typed).
  const isReset = /^(reset|restart|cancel|start over|cancelar|reiniciar|recome[çc]ar)$/i.test(text);
  const isConfirm = /^(confirm|yes|confirm request|confirm details|sim|confirmar|confirmo|confirmar pedido)$/i.test(text);
  const isEdit = /^(edit|no|change|edit details|n[ãa]o|editar|corrigir|alterar|corrigir dados)$/i.test(text);
  const isChangeDate = /^(change date|trocar data|mudar data|trocar (data ou )?hor[áa]rio)$/i.test(text);
  const defaultQuickReplies = config.id === "dental" ? ui[lang].quickReplies : config.quickReplies;
  let reply: string;
  let quickReplies = defaultQuickReplies;
  let summary: Record<string, string> | undefined;
  let outcome: ChatResponse["outcome"];
  const safe = safetyReply(config, text);
  const propertyCommand = /^Visit property (HH-\d{3})$/i.exec(text);
  if (safe) reply = safe;
  else if (propertyCommand) {
    const property = config.id === "real-estate" ? properties.find(item => item.id === propertyCommand[1].toUpperCase()) : undefined;
    if (!property || !isAvailable(property)) {
      reply = "This property is unavailable for a demo viewing. Please choose an available home in the catalogue.";
      quickReplies = [];
    } else {
      session.flow = "booking"; session.fields = { propertyId: property.id }; session.requestId = crypto.randomUUID();
      session.state = { kind: "lead_qualification", collected: session.fields, nextFieldIndex: 0 };
      reply = `Let's prepare a simulated viewing for ${property.name}, ${property.address}, Riverside Gardens (${priceLabel(property)}). No real viewing will be booked. Fictional name?`;
      quickReplies = [];
    }
  }
  else if (isReset) {
    session.state = { kind: "idle" }; session.fields = {};
    reply = copy.cleared;
  } else if (session.state.kind.endsWith("confirmation")) {
    const dateIndex = flowFields(session).findIndex(field => field.key === "date");
    const expired = session.fields.date ? scheduleError(session.chatbotId, session.fields.date, session.fields.period) : undefined;
    if (dateIndex >= 0 && (isChangeDate || (isConfirm && expired))) {
      delete session.fields.date; delete session.fields.period;
      session.state = { kind: "lead_qualification", collected: session.fields, nextFieldIndex: dateIndex };
      reply = expired ? copy.changeDateExpired : copy.changeDateKeep;
      quickReplies = [];
    } else if (isConfirm && session.fields.propertyId && !properties.some(property => property.id === session.fields.propertyId && isAvailable(property))) {
      reply = "This property is no longer available. Please choose another home in the catalogue."; quickReplies = ["Cancel"];
    } else if (isConfirm) {
      const request = { id: session.requestId ?? session.id, sessionId: session.id, chatbotId: session.chatbotId, kind: session.flow,
        fields: anonymize(session.fields), consentAcknowledged: true as const, createdAt: Date.now(), expiresAt: session.expiresAt };
      await repository.record(request);
      session.fields = {}; session.state = { kind: "completed", outcome: session.flow }; outcome = session.flow;
      reply = copy.recorded;
      quickReplies = ["Start over"];
    } else if (isEdit) {
      session.fields = session.fields.propertyId ? { propertyId: session.fields.propertyId } : {}; session.state = { kind: "lead_qualification", collected: session.fields, nextFieldIndex: 0 };
      const first = flowFields(session)[0]; reply = copy.editUpdate(first.label);
      quickReplies = first.options ?? [];
    } else {
      reply = copy.reviewFallback;
      quickReplies = ["Confirm", "Edit", "Cancel"];
    }
  } else if (session.state.kind === "lead_qualification") {
    const fields = flowFields(session);
    const field = fields[session.state.nextFieldIndex];
    const invalid = field.key === "date" ? scheduleError(session.chatbotId, text) : field.key === "period" && session.fields.date ? scheduleError(session.chatbotId, session.fields.date, text) : LeadQualificationAgent(field, text);
    if (invalid) { reply = invalid; quickReplies = field.options ?? []; }
    else {
      session.fields[field.key] = field.options?.find((option) => option.toLowerCase() === text.toLowerCase()) ?? text;
      // Advance to the next field still missing. When "change date" sends the
      // visitor back to the middle-of-flow date/time, already-collected details
      // (service, name, phone) are skipped so we return straight to review.
      let next = session.state.nextFieldIndex + 1;
      while (next < fields.length && session.fields[fields[next].key] !== undefined) next++;
      if (next < fields.length) {
        session.state = { kind: "lead_qualification", collected: session.fields, nextFieldIndex: next };
        reply = copy.nextField(fields[next].label); quickReplies = fields[next].options ?? [];
      } else {
        session.state = { kind: "lead_confirmation", collected: session.fields };
        reply = copy.reviewReady;
        quickReplies = ["Confirm", "Edit", "Cancel"];
      }
    }
  } else {
    const intent = RouterAgent(config, text);
    if (intent === "lead" || intent === "booking" || intent === "handoff") {
      session.flow = intent; session.fields = {}; session.requestId = crypto.randomUUID();
      session.state = { kind: "lead_qualification", collected: {}, nextFieldIndex: 0 };
      const field = flowFields(session)[0];
      reply = copy.startFlow(intent, field.label);
      quickReplies = field.options ?? [];
    } else {
      try { reply = await FAQAgent(config, text, lang); } catch { throw new ChatFailure("PROVIDER_ERROR", 503); }
      session.state = { kind: "faq" };
    }
  }
  if (session.state.kind.endsWith("confirmation")) {
    summary = Object.fromEntries(flowFields(session).map((field) => [field.label, session.fields[field.key] ?? ""]));
    const property = properties.find(property => property.id === session.fields.propertyId);
    if (property) summary = { Property: `${property.id} · ${property.name}`, Location: `${property.address}, Riverside Gardens`, "Illustrative price": priceLabel(property), ...summary };
  }
  await repository.save(session);
  await repository.message(session, "user");
  await repository.message(session, "assistant");
  const fields = flowFields(session);
  const current = session.state.kind === "lead_qualification" ? fields[session.state.nextFieldIndex] : undefined;
  const form = current && session.state.kind === "lead_qualification" ? { key: current.key, label: current.label, step: session.state.nextFieldIndex + 1, total: fields.length } : undefined;
  const schedule = current && (current.key === "date" || current.key === "period" && session.fields.date) ? { timeZone: BOOKING_TIME_ZONE, selectedDate: session.fields.date, days: availability(session.chatbotId) } : undefined;
  return { sessionId: session.id, reply: { role: "assistant", text: reply }, stateKind: session.state.kind,
    quickReplies, ...(form ? { form } : {}), ...(schedule ? { schedule } : {}), ...(summary ? { summary } : {}), ...(outcome ? { outcome } : {}), demoMode: !process.env.OPENROUTER_API_KEY };
}
