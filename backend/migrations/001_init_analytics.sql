-- ============================================
-- ANALYTICS TABLES
-- ============================================

-- Page view events (one row per visit)
CREATE TABLE IF NOT EXISTS portfolio_page_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  visitor_ip TEXT,
  user_agent TEXT,
  referrer TEXT,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI manager conversation sessions (one per visitor session)
CREATE TABLE IF NOT EXISTS ai_manager_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  visitor_ip TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  message_count INT DEFAULT 0
);

-- Individual messages within a session
CREATE TABLE IF NOT EXISTS ai_manager_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES ai_manager_sessions(id) ON DELETE CASCADE,
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('visitor', 'ai')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_page_views_portfolio ON portfolio_page_views(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_page_views_created ON portfolio_page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_portfolio ON ai_manager_sessions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_sessions_last_msg ON ai_manager_sessions(last_message_at);
CREATE INDEX IF NOT EXISTS idx_messages_session ON ai_manager_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_portfolio ON ai_manager_messages(portfolio_id);
