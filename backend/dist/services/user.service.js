"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const database_1 = __importDefault(require("../config/database"));
const apiKey_service_1 = __importDefault(require("./apiKey.service"));
const credits_service_1 = require("./credits.service");
class UserService {
    /**
     * Find or create user from Google OAuth data
     * This is called after successful Google authentication
     */
    static async findOrCreateGoogleUser(googleUser) {
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            // Check if user exists by Google ID
            let query = 'SELECT * FROM users WHERE google_id = $1';
            let result = await client.query(query, [googleUser.googleId]);
            if (result.rows.length > 0) {
                // User exists, update their info
                const updateQuery = `
          UPDATE users 
          SET display_name = $1, profile_picture = $2, updated_at = NOW()
          WHERE google_id = $3
          RETURNING *
        `;
                result = await client.query(updateQuery, [
                    googleUser.displayName,
                    googleUser.profilePicture,
                    googleUser.googleId
                ]);
            }
            else {
                // New user, create account
                const username = await this.generateUniqueUsername(googleUser.email, client);
                const apiKey = apiKey_service_1.default.generateApiKey();
                const insertQuery = `
          INSERT INTO users (email, google_id, username, display_name, profile_picture, api_key)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;
                result = await client.query(insertQuery, [
                    googleUser.email,
                    googleUser.googleId,
                    username,
                    googleUser.displayName,
                    googleUser.profilePicture,
                    apiKey
                ]);
                // Log signup bonus transaction
                const newUser = result.rows[0];
                const txQuery = `
          INSERT INTO credit_transactions (user_id, amount, type, description)
          VALUES ($1, $2, $3, $4)
        `;
                await client.query(txQuery, [
                    newUser.id,
                    credits_service_1.CREDIT_COSTS.SIGNUP_BONUS,
                    'signup_bonus',
                    'Welcome bonus - create your first portfolio!'
                ]);
            }
            await client.query('COMMIT');
            return result.rows[0];
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
     * Generate unique username from email
     * Format: firstname + random4digits
     */
    static async generateUniqueUsername(email, client) {
        const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        let username = baseUsername;
        let counter = 1;
        // Check if username exists, add numbers if needed
        while (true) {
            const query = 'SELECT id FROM users WHERE username = $1';
            const result = await client.query(query, [username]);
            if (result.rows.length === 0) {
                break; // Username is unique
            }
            username = `${baseUsername}${Math.floor(1000 + Math.random() * 9000)}`;
            counter++;
            if (counter > 10) {
                // Fallback: use timestamp if still not unique
                username = `${baseUsername}${Date.now()}`;
                break;
            }
        }
        return username;
    }
    /**
     * Find user by ID
     */
    static async findById(userId) {
        const query = 'SELECT * FROM users WHERE id = $1';
        const result = await database_1.default.query(query, [userId]);
        return result.rows[0] || null;
    }
    /**
     * Find user by email
     */
    static async findByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = $1';
        const result = await database_1.default.query(query, [email]);
        return result.rows[0] || null;
    }
}
exports.UserService = UserService;
exports.default = UserService;
