-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    profile_picture TEXT,
    api_key VARCHAR(64) UNIQUE NOT NULL,
    
    -- Credits & Plan
    credits INTEGER NOT NULL DEFAULT 500,
    plan VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create index on google_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Create index on api_key for API authentication
CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);

-- ============================================
-- PORTFOLIOS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Basic Info
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    portfolio_type VARCHAR(20) NOT NULL DEFAULT 'individual' CHECK (portfolio_type IN ('individual', 'company')),
    profession VARCHAR(255),
    description TEXT,
    
    -- Content
    sections JSONB NOT NULL DEFAULT '[]'::jsonb,
    theme VARCHAR(50) NOT NULL DEFAULT 'minimal',
    color_scheme JSONB DEFAULT NULL,
    
    -- Features
    has_ai_manager BOOLEAN NOT NULL DEFAULT false,
    ai_manager_name VARCHAR(120) DEFAULT NULL,
    ai_manager_personality VARCHAR(60) DEFAULT NULL,
    ai_manager_has_portfolio_access BOOLEAN NOT NULL DEFAULT false,
    ai_manager_finalized BOOLEAN NOT NULL DEFAULT false,
    ai_manager_custom_instructions TEXT DEFAULT NULL,
    
    -- Archestra Agent Integration
    archestra_agent_id TEXT DEFAULT NULL,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    
    -- Wizard state (for incomplete portfolios)
    wizard_step INTEGER NOT NULL DEFAULT 1,
    wizard_data JSONB DEFAULT '{}'::jsonb,
    chat_history JSONB DEFAULT '{}'::jsonb,  -- Store chat per section: {sectionId: [{role, content, timestamp}]}
    
    -- Credits charged
    credits_used INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_slug ON portfolios(slug);
CREATE INDEX IF NOT EXISTS idx_portfolios_status ON portfolios(status);

-- ============================================
-- ASSISTANT CHATS (OWNER WORKSPACE)
-- ============================================

CREATE TABLE IF NOT EXISTS assistant_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    context_type VARCHAR(20) NOT NULL CHECK (context_type IN ('portfolio', 'ai_manager')),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assistant_chats_user_id ON assistant_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_chats_portfolio_id ON assistant_chats(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_assistant_chats_updated_at ON assistant_chats(updated_at DESC);

CREATE TABLE IF NOT EXISTS assistant_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES assistant_chats(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assistant_chat_messages_chat_id ON assistant_chat_messages(chat_id);

-- ============================================
-- CREDIT TRANSACTIONS (audit log)
-- ============================================

CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- positive = add, negative = deduct
    type VARCHAR(50) NOT NULL, -- 'signup_bonus', 'portfolio_creation', 'ai_manager', 'purchase', 'refund'
    description TEXT,
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
