"use strict";
/**
 * Credits Service
 * Handles credit balance, transactions, and validation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreditsService = exports.PLAN_LIMITS = exports.CREDIT_COSTS = void 0;
const database_1 = __importDefault(require("../config/database"));
// ============================================
// CONSTANTS
// ============================================
exports.CREDIT_COSTS = {
    PORTFOLIO_BASIC: 100,
    PORTFOLIO_WITH_AI_MANAGER: 250,
    SIGNUP_BONUS: 500,
};
exports.PLAN_LIMITS = {
    free: {
        maxPortfolios: 3,
        maxSections: 5,
    },
    pro: {
        maxPortfolios: 10,
        maxSections: 15,
    },
    enterprise: {
        maxPortfolios: Infinity,
        maxSections: Infinity,
    },
};
// ============================================
// CREDITS SERVICE
// ============================================
class CreditsService {
    /**
     * Get user's credit balance and plan info
     */
    static async getUserCredits(userId) {
        const userQuery = 'SELECT credits, plan FROM users WHERE id = $1';
        const userResult = await database_1.default.query(userQuery, [userId]);
        if (userResult.rows.length === 0) {
            throw new Error('User not found');
        }
        const { credits, plan } = userResult.rows[0];
        const limits = exports.PLAN_LIMITS[plan];
        // Count existing portfolios
        const countQuery = 'SELECT COUNT(*) as count FROM portfolios WHERE user_id = $1';
        const countResult = await database_1.default.query(countQuery, [userId]);
        const portfolioCount = parseInt(countResult.rows[0].count, 10);
        const canCreatePortfolio = portfolioCount < limits.maxPortfolios &&
            credits >= exports.CREDIT_COSTS.PORTFOLIO_BASIC;
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
    static async hasEnoughCredits(userId, amount) {
        const query = 'SELECT credits FROM users WHERE id = $1';
        const result = await database_1.default.query(query, [userId]);
        if (result.rows.length === 0) {
            return false;
        }
        return result.rows[0].credits >= amount;
    }
    /**
     * Deduct credits from user (atomic operation)
     */
    static async deductCredits(userId, amount, type, description, portfolioId) {
        const client = await database_1.default.connect();
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
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Add credits to user (for purchases, refunds, bonuses)
     */
    static async addCredits(userId, amount, type, description) {
        const client = await database_1.default.connect();
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
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Get credit transaction history
     */
    static async getTransactionHistory(userId, limit = 20) {
        const query = `
            SELECT * FROM credit_transactions 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT $2
        `;
        const result = await database_1.default.query(query, [userId, limit]);
        return result.rows;
    }
    /**
     * Calculate cost for portfolio creation
     */
    static getPortfolioCost(hasAiManager) {
        return hasAiManager
            ? exports.CREDIT_COSTS.PORTFOLIO_WITH_AI_MANAGER
            : exports.CREDIT_COSTS.PORTFOLIO_BASIC;
    }
}
exports.CreditsService = CreditsService;
exports.default = CreditsService;
