-- Add session_key to AI manager sessions for server-side session isolation
ALTER TABLE ai_manager_sessions
ADD COLUMN IF NOT EXISTS session_key TEXT;

CREATE INDEX IF NOT EXISTS idx_sessions_portfolio_session_key
ON ai_manager_sessions (portfolio_id, session_key);
