"use strict";
/**
 * Portfolio Chat Service
 * Handles chat history persistence for wizard
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortfolioChatService = void 0;
const database_1 = __importDefault(require("../config/database"));
class PortfolioChatService {
    /**
     * Save chat history for a section
     */
    static async saveChatHistory(portfolioId, userId, sectionId, messages) {
        const query = `
            UPDATE portfolios
            SET 
                chat_history = jsonb_set(
                    COALESCE(chat_history, '{}'::jsonb),
                    ARRAY[$1],
                    $2::jsonb
                ),
                updated_at = NOW()
            WHERE id = $3 AND user_id = $4
        `;
        await database_1.default.query(query, [
            sectionId,
            JSON.stringify(messages),
            portfolioId,
            userId
        ]);
    }
    /**
     * Get chat history for a section
     */
    static async getChatHistory(portfolioId, userId, sectionId) {
        const query = `
            SELECT chat_history->$1 as messages
            FROM portfolios
            WHERE id = $2 AND user_id = $3
        `;
        const result = await database_1.default.query(query, [sectionId, portfolioId, userId]);
        if (result.rows.length === 0 || !result.rows[0].messages) {
            return [];
        }
        return result.rows[0].messages;
    }
    /**
     * Clear chat history for a section
     */
    static async clearChatHistory(portfolioId, userId, sectionId) {
        const query = `
            UPDATE portfolios
            SET 
                chat_history = chat_history - $1,
                updated_at = NOW()
            WHERE id = $2 AND user_id = $3
        `;
        await database_1.default.query(query, [sectionId, portfolioId, userId]);
    }
    /**
     * Get all unfinished portfolios for a user
     */
    static async getUnfinished(userId) {
        const query = `
            SELECT 
                id, name, portfolio_type, wizard_step, wizard_data,
                updated_at, created_at
            FROM portfolios 
            WHERE user_id = $1 AND status = 'draft'
            ORDER BY updated_at DESC
        `;
        const result = await database_1.default.query(query, [userId]);
        return result.rows;
    }
    /**
     * Check unfinished portfolio count
     */
    static async getUnfinishedCount(userId) {
        const query = `
            SELECT COUNT(*) as count
            FROM portfolios
            WHERE user_id = $1 AND status = 'draft'
        `;
        const result = await database_1.default.query(query, [userId]);
        return parseInt(result.rows[0].count, 10);
    }
}
exports.PortfolioChatService = PortfolioChatService;
exports.default = PortfolioChatService;
