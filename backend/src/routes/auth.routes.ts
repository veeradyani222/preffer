import express from 'express';
import passport from 'passport';
import AuthController from '../controllers/auth.controller';
import authenticate from '../middleware/authenticate';

const router = express.Router();
const frontendBaseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');

// Google OAuth - Start authentication
router.get('/google',
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        session: false
    })
);

// Google OAuth - Callback after authentication
router.get('/google/callback',
    passport.authenticate('google', {
        session: false,
        failureRedirect: `${frontendBaseUrl}/?error=auth_failed`
    }),
    AuthController.googleCallback
);

// Get current user profile (protected route)
router.get('/me', authenticate, AuthController.getCurrentUser);

// Get user credits and plan info
router.get('/credits', authenticate, AuthController.getCredits);

// Get user credits and plan info
router.get('/credits', authenticate, AuthController.getCredits);

// Logout
router.post('/logout', authenticate, AuthController.logout);

// Regenerate API key
router.post('/regenerate-api-key', authenticate, AuthController.regenerateApiKey);

export default router;
