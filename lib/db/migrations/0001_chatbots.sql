CREATE TABLE chatbot_sessions (
  id uuid PRIMARY KEY, chatbot_id text NOT NULL,
  data jsonb NOT NULL, consent_acknowledged boolean NOT NULL,
  created_at timestamptz NOT NULL, expires_at timestamptz NOT NULL
);
CREATE INDEX chatbot_sessions_expiry ON chatbot_sessions(expires_at);
CREATE TABLE chatbot_messages (
  id uuid PRIMARY KEY, session_id uuid NOT NULL REFERENCES chatbot_sessions(id) ON DELETE CASCADE,
  chatbot_id text NOT NULL, role text NOT NULL CHECK(role IN ('user','assistant')),
  created_at timestamptz NOT NULL, expires_at timestamptz NOT NULL
);
CREATE TABLE chatbot_requests (
  id uuid PRIMARY KEY, session_id uuid NOT NULL REFERENCES chatbot_sessions(id) ON DELETE CASCADE,
  chatbot_id text NOT NULL, kind text NOT NULL CHECK(kind IN ('lead','booking','handoff')),
  fields jsonb NOT NULL, consent_acknowledged boolean NOT NULL,
  created_at timestamptz NOT NULL, expires_at timestamptz NOT NULL
);
CREATE VIEW captured_leads AS SELECT * FROM chatbot_requests WHERE kind = 'lead';
CREATE VIEW booking_requests AS SELECT * FROM chatbot_requests WHERE kind = 'booking';
CREATE VIEW handoff_requests AS SELECT * FROM chatbot_requests WHERE kind = 'handoff';
-- Schedule hourly in production; application also prunes expired sessions on access.
-- DELETE FROM chatbot_sessions WHERE expires_at <= now();
