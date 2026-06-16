-- Migration: Add AI manager metadata fields to portfolios table
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS ai_manager_name VARCHAR(120) DEFAULT NULL;
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS ai_manager_personality VARCHAR(60) DEFAULT NULL;
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS ai_manager_has_portfolio_access BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS ai_manager_finalized BOOLEAN NOT NULL DEFAULT false;
