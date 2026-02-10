"use strict";
/**
 * Portfolio Controller (v2)
 * Simplified controller for viewing portfolios
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortfolioController = void 0;
const portfolio_service_new_1 = __importDefault(require("../services/portfolio.service.new"));
class PortfolioController {
    /**
     * GET /api/portfolios
     * Get all portfolios for the authenticated user
     */
    static async getUserPortfolios(req, res, next) {
        var _a;
        try {
            const authReq = req;
            const userId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const portfolios = await portfolio_service_new_1.default.getByUserId(userId);
            res.json({
                portfolios,
                count: portfolios.length
            });
        }
        catch (error) {
            console.error('Get user portfolios error:', error);
            next(error);
        }
    }
    /**
     * GET /api/portfolios/:slug
     * Get a published portfolio by slug (public endpoint)
     */
    static async getBySlug(req, res, next) {
        try {
            const slug = req.params.slug;
            const portfolio = await portfolio_service_new_1.default.getBySlug(slug);
            if (!portfolio) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }
            // Return portfolio without sensitive data
            res.json({
                id: portfolio.id,
                name: portfolio.name,
                slug: portfolio.slug,
                portfolioType: portfolio.portfolio_type,
                profession: portfolio.profession,
                description: portfolio.description,
                sections: portfolio.sections,
                theme: portfolio.theme,
                hasAiManager: portfolio.has_ai_manager,
                createdAt: portfolio.created_at
            });
        }
        catch (error) {
            console.error('Get portfolio by slug error:', error);
            next(error);
        }
    }
    /**
     * DELETE /api/portfolios/:id
     * Delete a portfolio (authenticated)
     */
    static async deletePortfolio(req, res, next) {
        var _a;
        try {
            const authReq = req;
            const userId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const portfolioId = req.params.id;
            await portfolio_service_new_1.default.delete(portfolioId, userId);
            res.json({ message: 'Portfolio deleted successfully' });
        }
        catch (error) {
            console.error('Delete portfolio error:', error);
            next(error);
        }
    }
}
exports.PortfolioController = PortfolioController;
exports.default = PortfolioController;
