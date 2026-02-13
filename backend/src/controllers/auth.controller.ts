import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import UserService from '../services/user.service';
import ApiKeyService from '../services/apiKey.service';
import CreditsService from '../services/credits.service';
import { AuthRequest } from '../middleware/authenticate';

class AuthController {
    private static getFrontendBaseUrl(): string {
        return (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
    }
    /**
     * Handle Google OAuth callback
     * Generate JWT and redirect to frontend
     */
    static async googleCallback(req: any, res: Response) {
        try {
            const user = req.user;

            if (!process.env.JWT_SECRET) {
                throw new Error("JWT_SECRET is not defined");
            }

            // Generate JWT token
            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    username: user.username
                },
                process.env.JWT_SECRET,
                { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'] }
            );

            // Redirect to frontend with token
            const frontendBaseUrl = AuthController.getFrontendBaseUrl();
            const redirectUrl = `${frontendBaseUrl}/auth/callback?token=${encodeURIComponent(token)}`;
            res.redirect(redirectUrl);
        } catch (error) {
            console.error('Google callback error:', error);
            const frontendBaseUrl = AuthController.getFrontendBaseUrl();
            res.redirect(`${frontendBaseUrl}/?error=server_error`);
        }
    }

    /**
     * Get current authenticated user
     */
    static async getCurrentUser(req: Request, res: Response) {
        try {
            const authReq = req as AuthRequest;
            if (!authReq.user || !authReq.user.userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const user = await UserService.findById(authReq.user.userId);

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
        } catch (error) {
            console.error('Get current user error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Logout user
     */
    static async logout(req: Request, res: Response) {
        // With JWT, logout is handled client-side by removing token
        res.json({ message: 'Logged out successfully' });
    }

    /**
     * Regenerate user's API key
     */
    static async regenerateApiKey(req: Request, res: Response) {
        try {
            const authReq = req as AuthRequest;
            if (!authReq.user || !authReq.user.userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const newApiKey = await ApiKeyService.regenerateApiKey(authReq.user.userId);

            res.json({
                message: 'API key regenerated successfully',
                apiKey: newApiKey
            });
        } catch (error) {
            console.error('Regenerate API key error:', error);
            res.status(500).json({ error: 'Failed to regenerate API key' });
        }
    }

    /**
     * Get user's credits and plan info
     */
    static async getCredits(req: Request, res: Response) {
        try {
            const authReq = req as AuthRequest;
            if (!authReq.user || !authReq.user.userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const creditsInfo = await CreditsService.getUserCredits(authReq.user.userId);

            res.json(creditsInfo);
        } catch (error) {
            console.error('Get credits error:', error);
            res.status(500).json({ error: 'Failed to get credits information' });
        }
    }
}

export default AuthController;
