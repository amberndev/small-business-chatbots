import { boolean, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { Session } from "./repository";

export const sessions = pgTable("chatbot_sessions", {
  id: uuid("id").primaryKey(), chatbotId: text("chatbot_id").notNull(),
  data: jsonb("data").$type<Session>().notNull(),
  consentAcknowledged: boolean("consent_acknowledged").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
export const messages = pgTable("chatbot_messages", {
  id: uuid("id").primaryKey(), sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  chatbotId: text("chatbot_id").notNull(), role: text("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
// One normalized relation exposes separate lead/booking/handoff views in the migration.
export const requests = pgTable("chatbot_requests", {
  id: uuid("id").primaryKey(), sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  chatbotId: text("chatbot_id").notNull(), kind: text("kind").notNull(),
  fields: jsonb("fields").$type<Record<string, string>>().notNull(),
  consentAcknowledged: boolean("consent_acknowledged").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
