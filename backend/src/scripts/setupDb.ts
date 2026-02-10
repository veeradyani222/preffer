import pool from '../config/database';

const schema = `
-- ============================================
-- DROP EXISTING TABLES (for clean migration)
-- ============================================
DROP TABLE IF EXISTS credit_transactions CASCADE;
DROP TABLE IF EXISTS portfolios CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
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
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_api_key ON users(api_key);

-- ============================================
-- PORTFOLIOS TABLE
-- ============================================
CREATE TABLE portfolios (
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
    
    -- Features
    has_ai_manager BOOLEAN NOT NULL DEFAULT false,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    
    -- Wizard state (for incomplete portfolios)
    wizard_step INTEGER NOT NULL DEFAULT 1,
    wizard_data JSONB DEFAULT '{}'::jsonb,
    
    -- Chat history for resumable conversations
    chat_history JSONB DEFAULT '{}'::jsonb,
    
    -- Credits charged
    credits_used INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX idx_portfolios_slug ON portfolios(slug);
CREATE INDEX idx_portfolios_status ON portfolios(status);

-- ============================================
-- CREDIT TRANSACTIONS (audit log)
-- ============================================
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- positive = add, negative = deduct
    type VARCHAR(50) NOT NULL, -- 'signup_bonus', 'portfolio_creation', 'ai_manager', 'purchase', 'refund'
    description TEXT,
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);

-- ============================================
-- TRIGGER FUNCTION FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_portfolios_updated_at ON portfolios;
CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON portfolios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

async function setupDb() {
    try {
        console.log('🔌 Connecting to database...');
        const client = await pool.connect();
        try {
            console.log('🚀 Running schema migration...');
            await client.query('BEGIN');
            await client.query(schema);
            await client.query('COMMIT');
            console.log('✅ Database schema setup completed successfully!');
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Error creating schema:', error);
            process.exit(1);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('❌ Unknown error:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

setupDb();
