import crypto from 'crypto';
import pool from '../config/database';

export class ApiKeyService {
    /**
     * Generate a cryptographically secure API key
     * Format: 64 random hex characters (32 bytes)
     */
    static generateApiKey(): string {
        const randomBytes = crypto.randomBytes(32);
        const apiKey = randomBytes.toString('hex');
        return apiKey;
    }

    /**
     * Validate if API key exists and belongs to a user
     * @param {string} apiKey - The API key to validate
     * @returns {Object|null} User object if valid, null otherwise
     */
    static async validateApiKey(apiKey: string): Promise<any | null> {
        try {
            const query = 'SELECT id, email, username FROM users WHERE api_key = $1';
            const result = await pool.query(query, [apiKey]);

            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            console.error('API key validation error:', error);
            return null;
        }
    }

    /**
     * Regenerate API key for a user
     * @param {string} userId - User UUID
     * @returns {string} New API key
     */
    static async regenerateApiKey(userId: string): Promise<string> {
        try {
            const newApiKey = this.generateApiKey();
            const query = 'UPDATE users SET api_key = $1, updated_at = NOW() WHERE id = $2 RETURNING api_key';
            const result = await pool.query(query, [newApiKey, userId]);

            return result.rows[0].api_key;
        } catch (error) {
            console.error('API key regeneration error:', error);
            throw error;
        }
    }
}

export default ApiKeyService;
