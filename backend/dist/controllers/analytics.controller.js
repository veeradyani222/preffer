"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const analytics_service_1 = __importDefault(require("../services/analytics.service"));
const portfolio_service_new_1 = __importDefault(require("../services/portfolio.service.new"));
class AnalyticsController {
    /**
     * Record a page view (PUBLIC - no auth required)
     * POST /api/analytics/page-view
     */
    static async recordPageView(req, res) {
        try {
            const { slug } = req.body;
            if (!slug) {
                return res.status(400).json({ error: 'slug is required' });
            }
            const portfolio = await portfolio_service_new_1.default.getBySlug(slug);
            if (!portfolio) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }
            const visitorIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
            const userAgent = req.headers['user-agent'] || '';
            const referrer = req.headers['referer'] || req.headers['referrer'] || '';
            analytics_service_1.default.recordPageView(portfolio.id, visitorIp, userAgent, referrer);
            res.json({ ok: true });
        }
        catch (error) {
            console.error('Record page view error:', error);
            res.status(500).json({ error: 'Failed to record page view' });
        }
    }
    /**
     * Get aggregated dashboard analytics (PROTECTED)
     * GET /api/analytics/dashboard?portfolioId=optional
     */
    static async getDashboard(req, res) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const portfolioId = req.query.portfolioId;
            console.log('[Analytics] getDashboard called with portfolioId:', portfolioId || '(all)');
            const [stats, viewsPerDay, messagesPerDay, topPortfolios] = await Promise.all([
                analytics_service_1.default.getDashboardStats(userId, portfolioId),
                analytics_service_1.default.getViewsPerDay(userId, 5, portfolioId),
                analytics_service_1.default.getMessagesPerDay(userId, 5, portfolioId),
                analytics_service_1.default.getTopPortfolios(userId, portfolioId),
            ]);
            res.json({ stats, viewsPerDay, messagesPerDay, topPortfolios });
        }
        catch (error) {
            console.error('Get dashboard analytics error:', error);
            res.status(500).json({ error: 'Failed to get analytics' });
        }
    }
    /**
     * Get AI manager conversations (PROTECTED)
     * GET /api/analytics/conversations?portfolioId=optional&limit=50
     */
    static async getConversations(req, res) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const limit = parseInt(req.query.limit) || 50;
            const portfolioId = req.query.portfolioId;
            const conversations = await analytics_service_1.default.getRecentConversations(userId, Math.min(limit, 100), portfolioId);
            res.json({ conversations });
        }
        catch (error) {
            console.error('Get conversations error:', error);
            res.status(500).json({ error: 'Failed to get conversations' });
        }
    }
    /**
     * Get AI-driven analytics insights (PROTECTED)
     * GET /api/analytics/insights?portfolioId=optional
     */
    static async getInsights(req, res) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const portfolioId = req.query.portfolioId;
            const insights = await analytics_service_1.default.generateInsights(userId, portfolioId);
            res.json({ insights });
        }
        catch (error) {
            console.error('Get AI insights error:', error);
            res.status(500).json({ error: 'Failed to generate insights' });
        }
    }
}
exports.default = AnalyticsController;
