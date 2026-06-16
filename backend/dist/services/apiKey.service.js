"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeyService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const database_1 = __importDefault(require("../config/database"));
class ApiKeyService {
    /**
     * Generate a cryptographically secure API key
     * Format: 64 random hex characters (32 bytes)
     */
    static generateApiKey() {
        const randomBytes = crypto_1.default.randomBytes(32);
        const apiKey = randomBytes.toString('hex');
        return apiKey;
    }
    /**
     * Validate if API key exists and belongs to a user
     * @param {string} apiKey - The API key to validate
     * @returns {Object|null} User object if valid, null otherwise
     */
    static async validateApiKey(apiKey) {
        try {
            const query = 'SELECT id, email, username FROM users WHERE api_key = $1';
            const result = await database_1.default.query(query, [apiKey]);
            return result.rows.length > 0 ? result.rows[0] : null;
        }
        catch (error) {
            console.error('API key validation error:', error);
            return null;
        }
    }
    /**
     * Regenerate API key for a user
     * @param {string} userId - User UUID
     * @returns {string} New API key
     */
    static async regenerateApiKey(userId) {
        try {
            const newApiKey = this.generateApiKey();
            const query = 'UPDATE users SET api_key = $1, updated_at = NOW() WHERE id = $2 RETURNING api_key';
            const result = await database_1.default.query(query, [newApiKey, userId]);
            return result.rows[0].api_key;
        }
        catch (error) {
            console.error('API key regeneration error:', error);
            throw error;
        }
    }
}
exports.ApiKeyService = ApiKeyService;
exports.default = ApiKeyService;
