"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const passport_1 = __importDefault(require("passport"));
const auth_controller_1 = __importDefault(require("../controllers/auth.controller"));
const authenticate_1 = __importDefault(require("../middleware/authenticate"));
const router = express_1.default.Router();
const frontendBaseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
// Google OAuth - Start authentication
router.get('/google', passport_1.default.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
}));
// Google OAuth - Callback after authentication
router.get('/google/callback', passport_1.default.authenticate('google', {
    session: false,
    failureRedirect: `${frontendBaseUrl}/?error=auth_failed`
}), auth_controller_1.default.googleCallback);
// Get current user profile (protected route)
router.get('/me', authenticate_1.default, auth_controller_1.default.getCurrentUser);
// Get user credits and plan info
router.get('/credits', authenticate_1.default, auth_controller_1.default.getCredits);
// Get user credits and plan info
router.get('/credits', authenticate_1.default, auth_controller_1.default.getCredits);
// Logout
router.post('/logout', authenticate_1.default, auth_controller_1.default.logout);
// Regenerate API key
router.post('/regenerate-api-key', authenticate_1.default, auth_controller_1.default.regenerateApiKey);
exports.default = router;
