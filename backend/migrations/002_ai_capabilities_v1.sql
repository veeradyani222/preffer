-- AI capability configuration per portfolio
CREATE TABLE IF NOT EXISTS portfolio_ai_capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    capability_key VARCHAR(64) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT false,
    settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (portfolio_id, capability_key)
);

CREATE INDEX IF NOT EXISTS idx_portfolio_ai_capabilities_portfolio ON portfolio_ai_capabilities(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_ai_capabilities_enabled ON portfolio_ai_capabilities(enabled);

-- Lead Capture
CREATE TABLE IF NOT EXISTS ai_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(80),
    company VARCHAR(255),
    intent_summary TEXT,
    confidence NUMERIC(3,2),
    status VARCHAR(50) NOT NULL DEFAULT 'new',
    notes TEXT,
    idempotency_key VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_leads_idempotency ON ai_leads(portfolio_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_leads_portfolio ON ai_leads(portfolio_id, created_at DESC);

-- Appointment Requests
CREATE TABLE IF NOT EXISTS ai_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(80),
    requested_datetime VARCHAR(255),
    timezone VARCHAR(100),
    reason TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'new',
    notes TEXT,
    idempotency_key VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_appointments_idempotency ON ai_appointments(portfolio_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_appointments_portfolio ON ai_appointments(portfolio_id, created_at DESC);

-- Order/Quote Requests
CREATE TABLE IF NOT EXISTS ai_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    name VARCHAR(255),
    contact VARCHAR(255),
    item_or_service VARCHAR(255),
    quantity INTEGER,
    budget VARCHAR(120),
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'new',
    idempotency_key VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_orders_idempotency ON ai_orders(portfolio_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_orders_portfolio ON ai_orders(portfolio_id, created_at DESC);

-- Support Escalation
CREATE TABLE IF NOT EXISTS ai_support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    issue_title VARCHAR(255),
    issue_summary TEXT,
    severity VARCHAR(30),
    contact VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    notes TEXT,
    idempotency_key VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_support_idempotency ON ai_support_tickets(portfolio_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_support_portfolio ON ai_support_tickets(portfolio_id, created_at DESC);

-- FAQ Unknowns
CREATE TABLE IF NOT EXISTS ai_faq_unknowns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    question TEXT,
    context TEXT,
    contact_optional VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'new',
    notes TEXT,
    idempotency_key VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_faq_unknowns_idempotency ON ai_faq_unknowns(portfolio_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_faq_unknowns_portfolio ON ai_faq_unknowns(portfolio_id, created_at DESC);

-- Followups
CREATE TABLE IF NOT EXISTS ai_followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    topic VARCHAR(255),
    preferred_contact_time VARCHAR(255),
    contact VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'new',
    notes TEXT,
    idempotency_key VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_followups_idempotency ON ai_followups(portfolio_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_followups_portfolio ON ai_followups(portfolio_id, created_at DESC);

-- Feedback
CREATE TABLE IF NOT EXISTS ai_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    feedback_type VARCHAR(50),
    rating_optional INTEGER,
    message TEXT,
    contact_optional VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'new',
    notes TEXT,
    idempotency_key VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_feedback_idempotency ON ai_feedback(portfolio_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_feedback_portfolio ON ai_feedback(portfolio_id, created_at DESC);

-- Tool event audit
CREATE TABLE IF NOT EXISTS ai_tool_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    capability_key VARCHAR(64) NOT NULL,
    tool_name VARCHAR(120) NOT NULL,
    payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    result_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(20) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_tool_events_portfolio ON ai_tool_events(portfolio_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_tool_events_status ON ai_tool_events(status);
