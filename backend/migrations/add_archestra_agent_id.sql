-- Migration: Add Archestra agent ID to portfolios table
-- This links each AI manager to an Archestra agent for A2A protocol chat
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS archestra_agent_id TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_portfolios_archestra_agent_id ON portfolios(archestra_agent_id);
