import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authenticate';
import AnalyticsService from '../services/analytics.service';
import PortfolioService from '../services/portfolio.service.new';

class AnalyticsController {

    /**
     * Record a page view (PUBLIC - no auth required)
     * POST /api/analytics/page-view
     */
    static async recordPageView(req: Request, res: Response) {
        try {
            const { slug } = req.body;
            if (!slug) {
                return res.status(400).json({ error: 'slug is required' });
            }

            const portfolio = await PortfolioService.getBySlug(slug);
            if (!portfolio) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }

            const visitorIp = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
            const userAgent = req.headers['user-agent'] || '';
            const referrer = req.headers['referer'] || req.headers['referrer'] || '';

            AnalyticsService.recordPageView(
                portfolio.id,
                visitorIp,
                userAgent,
                referrer as string
            );

            res.json({ ok: true });
        } catch (error) {
            console.error('Record page view error:', error);
            res.status(500).json({ error: 'Failed to record page view' });
        }
    }

    /**
     * Get aggregated dashboard analytics (PROTECTED)
     * GET /api/analytics/dashboard?portfolioId=optional
     */
    static async getDashboard(req: Request, res: Response) {
        try {
            const userId = (req as AuthRequest).user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const portfolioId = req.query.portfolioId as string | undefined;
            console.log('[Analytics] getDashboard called with portfolioId:', portfolioId || '(all)');

            const [stats, viewsPerDay, messagesPerDay, topPortfolios] = await Promise.all([
                AnalyticsService.getDashboardStats(userId, portfolioId),
                AnalyticsService.getViewsPerDay(userId, 5, portfolioId),
                AnalyticsService.getMessagesPerDay(userId, 5, portfolioId),
                AnalyticsService.getTopPortfolios(userId, portfolioId),
            ]);

            res.json({ stats, viewsPerDay, messagesPerDay, topPortfolios });
        } catch (error) {
            console.error('Get dashboard analytics error:', error);
            res.status(500).json({ error: 'Failed to get analytics' });
        }
    }

    /**
     * Get AI manager conversations (PROTECTED)
     * GET /api/analytics/conversations?portfolioId=optional&limit=50
     */
    static async getConversations(req: Request, res: Response) {
        try {
            const userId = (req as AuthRequest).user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const limit = parseInt(req.query.limit as string) || 50;
            const portfolioId = req.query.portfolioId as string | undefined;
            const conversations = await AnalyticsService.getRecentConversations(userId, Math.min(limit, 100), portfolioId);

            res.json({ conversations });
        } catch (error) {
            console.error('Get conversations error:', error);
            res.status(500).json({ error: 'Failed to get conversations' });
        }
    }

    /**
     * Get AI-driven analytics insights (PROTECTED)
     * GET /api/analytics/insights?portfolioId=optional
     */
    static async getInsights(req: Request, res: Response) {
        try {
            const userId = (req as AuthRequest).user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const portfolioId = req.query.portfolioId as string | undefined;
            const insights = await AnalyticsService.generateInsights(userId, portfolioId);
            res.json({ insights });
        } catch (error) {
            console.error('Get AI insights error:', error);
            res.status(500).json({ error: 'Failed to generate insights' });
        }
    }
}

export default AnalyticsController;
