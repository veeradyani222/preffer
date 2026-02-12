-- Migration: Add color_scheme column to portfolios table
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS color_scheme JSONB DEFAULT NULL;
