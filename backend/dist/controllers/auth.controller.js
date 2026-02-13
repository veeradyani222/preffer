"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_service_1 = __importDefault(require("../services/user.service"));
const apiKey_service_1 = __importDefault(require("../services/apiKey.service"));
const credits_service_1 = __importDefault(require("../services/credits.service"));
class AuthController {
    static getFrontendBaseUrl() {
        return (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
    }
    /**
     * Handle Google OAuth callback
     * Generate JWT and redirect to frontend
     */
    static async googleCallback(req, res) {
        try {
            const user = req.user;
            if (!process.env.JWT_SECRET) {
                throw new Error("JWT_SECRET is not defined");
            }
            // Generate JWT token
            const token = jsonwebtoken_1.default.sign({
                userId: user.id,
                email: user.email,
                username: user.username
            }, process.env.JWT_SECRET, { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') });
            // Redirect to frontend with token
            const frontendBaseUrl = AuthController.getFrontendBaseUrl();
            const redirectUrl = `${frontendBaseUrl}/auth/callback?token=${encodeURIComponent(token)}`;
            res.redirect(redirectUrl);
        }
        catch (error) {
            console.error('Google callback error:', error);
            const frontendBaseUrl = AuthController.getFrontendBaseUrl();
            res.redirect(`${frontendBaseUrl}/?error=server_error`);
        }
    }
    /**
     * Get current authenticated user
     */
    static async getCurrentUser(req, res) {
        try {
            const authReq = req;
            if (!authReq.user || !authReq.user.userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const user = await user_service_1.default.findById(authReq.user.userId);
            if (!user) {
                console.error(`User not found for userId: ${authReq.user.userId}. Database may have been reset.`);
                return res.status(404).json({
                    error: 'User not found - your session is invalid. Please log in again.'
                });
            }
            // Return user data (exclude sensitive info)
            res.json({
                id: user.id,
                email: user.email,
                username: user.username,
                displayName: user.display_name,
                profilePicture: user.profile_picture,
                apiKey: user.api_key,
                createdAt: user.created_at
            });
        }
        catch (error) {
            console.error('Get current user error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Logout user
     */
    static async logout(req, res) {
        // With JWT, logout is handled client-side by removing token
        res.json({ message: 'Logged out successfully' });
    }
    /**
     * Regenerate user's API key
     */
    static async regenerateApiKey(req, res) {
        try {
            const authReq = req;
            if (!authReq.user || !authReq.user.userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const newApiKey = await apiKey_service_1.default.regenerateApiKey(authReq.user.userId);
            res.json({
                message: 'API key regenerated successfully',
                apiKey: newApiKey
            });
        }
        catch (error) {
            console.error('Regenerate API key error:', error);
            res.status(500).json({ error: 'Failed to regenerate API key' });
        }
    }
    /**
     * Get user's credits and plan info
     */
    static async getCredits(req, res) {
        try {
            const authReq = req;
            if (!authReq.user || !authReq.user.userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const creditsInfo = await credits_service_1.default.getUserCredits(authReq.user.userId);
            res.json(creditsInfo);
        }
        catch (error) {
            console.error('Get credits error:', error);
            res.status(500).json({ error: 'Failed to get credits information' });
        }
    }
}
exports.default = AuthController;
