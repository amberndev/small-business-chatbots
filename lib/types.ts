/**
 * lib/types.ts — CONTRATO COMPARTILHADO (FROZEN)
 *
 * Fonte: docs/chatbots/ARCHITECTURE-PLAN.md §2.2, §2.3, §3.1–3.4, §6.3, §9.2.
 * Este arquivo é escrito UMA única vez pelo scaffold e é READ-ONLY para as
 * lanes A (engine), B (frontend) e C (knowledge). Qualquer mudança de
 * contrato passa pelo coordenador.
 */

// ---------------------------------------------------------------------------
// Identidade e config (produzido por C, consumido por A e B) — §2.2, §6.3
// ---------------------------------------------------------------------------

export type ChatbotId = "dental" | "real-estate" | "home-services";

export interface ChatbotConfig {
  id: ChatbotId;
  businessName: string;              // ex.: "BrightSmile Dental" (fictício)
  assistantName?: string;            // nome da persona (ex.: "Bia")
  tagline: string;
  theme: ChatbotTheme;               // identidade visual (§6.3)
  systemPrompt: string;              // prompt base, inclui restrições (ex.: recusa médica)
  knowledgeBase: KnowledgeEntry[];   // FAQ isolada por chatbotId
  quickReplies: string[];            // sugestões iniciais
  leadFields: LeadFieldSpec[];       // campos de qualificação, ordem e validação
  bookingServices: string[];         // serviços agendáveis (demo)
  guardrails: GuardrailSpec;         // recusas obrigatórias (ex.: diagnóstico médico)
  demoScript: DemoScriptEntry[];     // respostas determinísticas do DEMO MODE
}

// `answer` is the English (canonical) answer; `answerPt` is the optional PT-BR
// variant. The engine picks by the visitor's detected language.
export interface KnowledgeEntry { topic: string; question: string; answer: string; answerPt?: string; keywords: string[]; }
export interface LeadFieldSpec { key: string; label: string; required: boolean; validate: "text" | "phone" | "email" | "number" | "enum"; options?: string[]; }
export interface GuardrailSpec { refusalTopics: string[]; refusalMessage: string; }
export interface DemoScriptEntry { match: RegExp | string; response: string; intent: Intent; }

export interface ChatbotTheme {
  primary: string; primarySoft: string; accent: string;
  avatarEmoji: string; headerGradient: string;
}

// ---------------------------------------------------------------------------
// FSM e engine (produzido por A, consumido por testes) — §2.3
// ---------------------------------------------------------------------------

export interface BookingDraft {
  service: string;
  date: string;
  period: string;
}

export type ConversationState =
  | { kind: "idle" }
  | { kind: "faq" }
  | { kind: "lead_qualification"; collected: Partial<Record<string, string>>; nextFieldIndex: number }
  | { kind: "lead_confirmation"; collected: Record<string, string> }
  | { kind: "booking"; collected: Partial<BookingDraft> }
  | { kind: "booking_confirmation"; draft: BookingDraft }
  | { kind: "handoff_pending"; reason: string }
  | { kind: "completed"; outcome: "lead" | "booking" | "handoff" };

export type ConversationEvent =
  | { type: "USER_MESSAGE"; text: string }
  | { type: "INTENT_DETECTED"; intent: Intent }
  | { type: "FIELD_COLLECTED"; key: string; value: string }
  | { type: "USER_CONFIRMED" }
  | { type: "USER_REJECTED" }
  | { type: "RESET" };

export type Intent = "faq" | "lead" | "booking" | "handoff" | "out_of_scope" | "refusal_required";

// ---------------------------------------------------------------------------
// Contrato HTTP (produzido por A, consumido por B) — §3.1, §3.2, §3.4
// ---------------------------------------------------------------------------

export interface ChatRequest {
  chatbotId: ChatbotId;         // enum fechado
  sessionId: string | null;     // uuid v4; null no primeiro turno (servidor cria)
  message: string;              // 1..1000 caracteres após trim
  consentAcknowledged: boolean; // true obrigatório a partir do primeiro turno
}

export interface ChatResponse {
  form?: { key: string; label: string; step: number; total: number };
  schedule?: { timeZone: string; selectedDate?: string; days: import("@/lib/booking/availability").AvailabilityDay[] };
  sessionId: string;
  reply: { role: "assistant"; text: string };
  stateKind: string;                        // kind da FSM (para a UI renderizar SummaryCard/SuccessState)
  quickReplies: string[];                   // sugestões contextuais
  summary?: Record<string, string>;         // presente em *_confirmation (alimenta SummaryCard)
  outcome?: "lead" | "booking" | "handoff"; // presente em completed (alimenta SuccessState)
  demoMode: boolean;                        // true quando sem OPENROUTER_API_KEY (alimenta DemoModeBadge)
}

export type ChatErrorCode =
  | "INVALID_REQUEST"
  | "EMPTY_MESSAGE"
  | "MESSAGE_TOO_LONG"
  | "CONSENT_REQUIRED"
  | "UNKNOWN_CHATBOT"
  | "SESSION_CHATBOT_MISMATCH"
  | "SESSION_NOT_FOUND"
  | "PAYLOAD_TOO_LARGE"
  | "RATE_LIMITED"
  | "PROVIDER_ERROR"
  | "INTERNAL_ERROR";

export interface ChatErrorResponse {
  error: { code: ChatErrorCode; message: string };
}

// ---------------------------------------------------------------------------
// Subconjunto seguro para o cliente (consumido por B; sem systemPrompt/KB) — §9.2
// ---------------------------------------------------------------------------

export type ChatbotClientConfig = Pick<
  ChatbotConfig,
  "id" | "businessName" | "assistantName" | "tagline" | "theme" | "quickReplies"
>;
