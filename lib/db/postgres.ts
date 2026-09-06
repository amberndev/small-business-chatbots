import { drizzle } from "drizzle-orm/node-postgres";
import { eq, lte } from "drizzle-orm";
import { Pool } from "pg";
import { messages, requests, sessions } from "./schema";
import type { ChatRepository, SavedRequest, Session } from "./repository";

export class PostgresRepository implements ChatRepository {
  private db;
  constructor(url: string) { this.db = drizzle(new Pool({ connectionString: url, max: 5 })); }
  async prune() { await this.db.delete(sessions).where(lte(sessions.expiresAt, new Date())); }
  async get(id: string) {
    await this.prune();
    const [row] = await this.db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
    return row?.data;
  }
  async save(session: Session) {
    await this.prune();
    await this.db.insert(sessions).values({ id: session.id, chatbotId: session.chatbotId, data: session,
      consentAcknowledged: true, createdAt: new Date(session.createdAt), expiresAt: new Date(session.expiresAt),
    }).onConflictDoUpdate({ target: sessions.id, set: { data: session } });
  }
  async record(request: SavedRequest) {
    await this.db.insert(requests).values({ ...request, createdAt: new Date(request.createdAt), expiresAt: new Date(request.expiresAt) }).onConflictDoNothing();
  }
  async message(session: Session, role: "user" | "assistant") {
    await this.db.insert(messages).values({ id: crypto.randomUUID(), sessionId: session.id,
      chatbotId: session.chatbotId, role, createdAt: new Date(), expiresAt: new Date(session.expiresAt) });
  }
}
