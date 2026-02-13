import express from 'express';
import AnalyticsController from '../controllers/analytics.controller';
import authenticate from '../middleware/authenticate';

const router = express.Router();

// ============================================
// PUBLIC ROUTES
// ============================================

// Record a page view (called from public portfolio page)
router.post('/page-view', AnalyticsController.recordPageView);

// ============================================
// PROTECTED ROUTES
// ============================================

// Get aggregated dashboard analytics
router.get('/dashboard', authenticate, AnalyticsController.getDashboard);

// Get recent AI manager conversations
router.get('/conversations', authenticate, AnalyticsController.getConversations);

// Get AI-driven analytics insights
router.get('/insights', authenticate, AnalyticsController.getInsights);

export default router;
