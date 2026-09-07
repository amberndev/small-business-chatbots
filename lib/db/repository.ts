import type { ChatbotId, ConversationState } from "@/lib/types";
import type { Lang } from "@/lib/i18n";

export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
export interface Session {
  id: string;
  chatbotId: ChatbotId;
  state: ConversationState;
  lang?: Lang;                       // detected conversation language (sticky)
  flow: "lead" | "booking" | "handoff";
  fields: Record<string, string>;
  requestId?: string;
  consentAcknowledged: true;
  createdAt: number;
  expiresAt: number;
}
export interface SavedRequest {
  id: string;
  sessionId: string;
  chatbotId: ChatbotId;
  kind: Session["flow"];
  fields: Record<string, string>;
  consentAcknowledged: true;
  createdAt: number;
  expiresAt: number;
}
export interface ChatRepository {
  get(id: string): Promise<Session | undefined>;
  save(session: Session): Promise<void>;
  record(request: SavedRequest): Promise<void>;
  message(session: Session, role: "user" | "assistant"): Promise<void>;
}

// Public demos retain field presence, never the entered values, after confirmation.
export function anonymize(fields: Record<string, string>) {
  return Object.fromEntries(Object.keys(fields).map((key) => [key, "[demo value removed]"]));
}

export class MemoryRepository implements ChatRepository {
  sessions = new Map<string, Session>();
  requests = new Map<string, SavedRequest>();
  messages: { sessionId: string; chatbotId: ChatbotId; role: string; createdAt: number; expiresAt: number }[] = [];
  prune() {
    const now = Date.now();
    for (const [key, value] of this.sessions) if (value.expiresAt <= now) this.sessions.delete(key);
    for (const [key, value] of this.requests) if (value.expiresAt <= now) this.requests.delete(key);
    this.messages = this.messages.filter((message) => message.expiresAt > now).slice(-10000);
  }
  async get(id: string) { this.prune(); const value = this.sessions.get(id); return value ? structuredClone(value) : undefined; }
  async save(session: Session) {
    this.prune();
    if (!this.sessions.has(session.id) && this.sessions.size >= 10000) throw new Error("Session capacity reached");
    this.sessions.set(session.id, structuredClone(session));
  }
  async record(request: SavedRequest) { this.prune(); this.requests.set(request.id, structuredClone(request)); }
  async message(session: Session, role: "user" | "assistant") {
    this.prune();
    this.messages.push({ sessionId: session.id, chatbotId: session.chatbotId, role, createdAt: Date.now(), expiresAt: session.expiresAt });
  }
}

let repository: ChatRepository | undefined;
export async function getRepository(): Promise<ChatRepository> {
  if (!repository) {
    if (process.env.DATABASE_URL) {
      const { PostgresRepository } = await import("./postgres");
      repository = new PostgresRepository(process.env.DATABASE_URL);
    } else repository = new MemoryRepository();
  }
  return repository;
}
