/**
 * Credits Service
 * Handles credit balance, transactions, and validation
 */

import pool from '../config/database';

// ============================================
// CONSTANTS
// ============================================

export const CREDIT_COSTS = {
    PORTFOLIO_BASIC: 100,
    PORTFOLIO_WITH_AI_MANAGER: 250,
    SIGNUP_BONUS: 500,
} as const;

export const PLAN_LIMITS = {
    free: {
        maxPortfolios: 3,
        maxSections: 5, // Custom sections (hero and contact are always added)
    },
    pro: {
        maxPortfolios: 10,
        maxSections: 15, // Custom sections (hero and contact are always added)
    },
    enterprise: {
        maxPortfolios: Infinity,
        maxSections: Infinity,
    },
} as const;

export type Plan = 'free' | 'pro' | 'enterprise';
export type TransactionType = 'signup_bonus' | 'portfolio_creation' | 'ai_manager' | 'purchase' | 'refund';

// ============================================
// INTERFACES
// ============================================

export interface CreditTransaction {
    id: string;
    user_id: string;
    amount: number;
    type: TransactionType;
    description: string | null;
    portfolio_id: string | null;
    created_at: Date;
}

export interface UserCredits {
    credits: number;
    plan: Plan;
    portfolioCount: number;
    canCreatePortfolio: boolean;
    maxSections: number;
}

// ============================================
// CREDITS SERVICE
// ============================================

export class CreditsService {

    /**
     * Get user's credit balance and plan info
     */
    static async getUserCredits(userId: string): Promise<UserCredits> {
        const userQuery = 'SELECT credits, plan FROM users WHERE id = $1';
        const userResult = await pool.query(userQuery, [userId]);
        
        if (userResult.rows.length === 0) {
            console.error(`User not found in database. userId: ${userId}. Database may have been reset.`);
            throw new Error('User not found - please clear browser data and log in again');
        }

        const { credits, plan } = userResult.rows[0];
        const limits = PLAN_LIMITS[plan as Plan];

        // Count only PUBLISHED portfolios (drafts don't count toward limit)
        const countQuery = "SELECT COUNT(*) as count FROM portfolios WHERE user_id = $1 AND status = 'published'";
        const countResult = await pool.query(countQuery, [userId]);
        const portfolioCount = parseInt(countResult.rows[0].count, 10);

        // Count UNFINISHED portfolios (drafts that are being worked on)
        const unfinishedQuery = "SELECT COUNT(*) as count FROM portfolios WHERE user_id = $1 AND status = 'draft'";
        const unfinishedResult = await pool.query(unfinishedQuery, [userId]);
        const unfinishedCount = parseInt(unfinishedResult.rows[0].count, 10);

        const canCreatePortfolio = portfolioCount < limits.maxPortfolios && unfinishedCount < 5;

        return {
            credits,
            plan,
            portfolioCount,
            canCreatePortfolio,
            maxSections: limits.maxSections,
        };
    }

    /**
     * Check if user has enough credits
     */
    static async hasEnoughCredits(userId: string, amount: number): Promise<boolean> {
        const query = 'SELECT credits FROM users WHERE id = $1';
        const result = await pool.query(query, [userId]);
        
        if (result.rows.length === 0) {
            return false;
        }

        return result.rows[0].credits >= amount;
    }

    /**
     * Deduct credits from user (atomic operation)
     */
    static async deductCredits(
        userId: string,
        amount: number,
        type: TransactionType,
        description?: string,
        portfolioId?: string
    ): Promise<{ success: boolean; newBalance: number }> {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            // Lock the user row and check balance
            const lockQuery = 'SELECT credits FROM users WHERE id = $1 FOR UPDATE';
            const lockResult = await client.query(lockQuery, [userId]);

            if (lockResult.rows.length === 0) {
                throw new Error('User not found');
            }

            const currentCredits = lockResult.rows[0].credits;
            if (currentCredits < amount) {
                await client.query('ROLLBACK');
                return { success: false, newBalance: currentCredits };
            }

            // Deduct credits
            const updateQuery = 'UPDATE users SET credits = credits - $1, updated_at = NOW() WHERE id = $2 RETURNING credits';
            const updateResult = await client.query(updateQuery, [amount, userId]);
            const newBalance = updateResult.rows[0].credits;

            // Log transaction
            const txQuery = `
                INSERT INTO credit_transactions (user_id, amount, type, description, portfolio_id)
                VALUES ($1, $2, $3, $4, $5)
            `;
            await client.query(txQuery, [userId, -amount, type, description, portfolioId || null]);

            await client.query('COMMIT');
            return { success: true, newBalance };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Add credits to user (for purchases, refunds, bonuses)
     */
    static async addCredits(
        userId: string,
        amount: number,
        type: TransactionType,
        description?: string
    ): Promise<number> {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            const updateQuery = 'UPDATE users SET credits = credits + $1, updated_at = NOW() WHERE id = $2 RETURNING credits';
            const result = await client.query(updateQuery, [amount, userId]);

            const txQuery = `
                INSERT INTO credit_transactions (user_id, amount, type, description)
                VALUES ($1, $2, $3, $4)
            `;
            await client.query(txQuery, [userId, amount, type, description]);

            await client.query('COMMIT');
            return result.rows[0].credits;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get credit transaction history
     */
    static async getTransactionHistory(userId: string, limit: number = 20): Promise<CreditTransaction[]> {
        const query = `
            SELECT * FROM credit_transactions 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT $2
        `;
        const result = await pool.query(query, [userId, limit]);
        return result.rows;
    }

    /**
     * Calculate cost for portfolio creation
     */
    static getPortfolioCost(hasAiManager: boolean): number {
        return hasAiManager 
            ? CREDIT_COSTS.PORTFOLIO_WITH_AI_MANAGER 
            : CREDIT_COSTS.PORTFOLIO_BASIC;
    }
}

export default CreditsService;
