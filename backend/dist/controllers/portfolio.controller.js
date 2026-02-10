"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const portfolio_service_1 = __importDefault(require("../services/portfolio.service"));
class PortfolioController {
    // ============================================
    // MULTI-PORTFOLIO ENDPOINTS (NEW)
    // ============================================
    /**
     * Get all portfolios for the current user
     */
    static async getAllPortfolios(req, res) {
        var _a;
        try {
            const authReq = req;
            if (!((_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId)) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const portfolios = await portfolio_service_1.default.getPortfoliosByUser(authReq.user.userId);
            res.json(portfolios);
        }
        catch (error) {
            console.error('Get all portfolios error:', error);
            res.status(500).json({ error: 'Failed to get portfolios' });
        }
    }
    /**
     * Create a new portfolio
     */
    static async createPortfolio(req, res) {
        var _a;
        try {
            const authReq = req;
            if (!((_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId)) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const { name, portfolio_type, profession } = req.body;
            const portfolio = await portfolio_service_1.default.createPortfolio(authReq.user.userId, {
                name,
                portfolio_type,
                profession
            });
            res.status(201).json(portfolio);
        }
        catch (error) {
            console.error('Create portfolio error:', error);
            res.status(500).json({ error: 'Failed to create portfolio' });
        }
    }
    /**
     * Get a single portfolio by ID
     */
    static async getPortfolioById(req, res) {
        var _a;
        try {
            const authReq = req;
            if (!((_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId)) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const id = req.params.id;
            const portfolio = await portfolio_service_1.default.getPortfolioById(id);
            if (!portfolio || portfolio.user_id !== authReq.user.userId) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }
            res.json(portfolio);
        }
        catch (error) {
            console.error('Get portfolio by ID error:', error);
            res.status(500).json({ error: 'Failed to get portfolio' });
        }
    }
    /**
     * Update a portfolio by ID
     */
    static async updatePortfolioById(req, res) {
        var _a;
        try {
            const authReq = req;
            if (!((_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId)) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const id = req.params.id;
            const portfolio = await portfolio_service_1.default.getPortfolioById(id);
            if (!portfolio || portfolio.user_id !== authReq.user.userId) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }
            const updates = req.body;
            const updated = await portfolio_service_1.default.updatePortfolio(id, updates);
            res.json(updated);
        }
        catch (error) {
            console.error('Update portfolio error:', error);
            res.status(500).json({ error: 'Failed to update portfolio' });
        }
    }
    /**
     * Delete a portfolio
     */
    static async deletePortfolio(req, res) {
        var _a;
        try {
            const authReq = req;
            if (!((_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId)) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const id = req.params.id;
            const deleted = await portfolio_service_1.default.deletePortfolio(id, authReq.user.userId);
            if (!deleted) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }
            res.json({ success: true, message: 'Portfolio deleted' });
        }
        catch (error) {
            console.error('Delete portfolio error:', error);
            res.status(500).json({ error: 'Failed to delete portfolio' });
        }
    }
    /**
     * Check if a slug is available
     */
    static async checkSlug(req, res) {
        try {
            const slug = req.params.slug;
            const available = await portfolio_service_1.default.isSlugAvailable(slug);
            res.json({ slug, available });
        }
        catch (error) {
            console.error('Check slug error:', error);
            res.status(500).json({ error: 'Failed to check slug' });
        }
    }
    /**
     * Generate a unique slug suggestion
     */
    static async suggestSlug(req, res) {
        try {
            const { baseName } = req.body;
            if (!baseName) {
                return res.status(400).json({ error: 'baseName is required' });
            }
            const slug = await portfolio_service_1.default.generateUniqueSlug(baseName);
            res.json({ slug, available: true });
        }
        catch (error) {
            console.error('Suggest slug error:', error);
            res.status(500).json({ error: 'Failed to suggest slug' });
        }
    }
    /**
     * Publish portfolio with custom slug
     */
    static async publishWithSlug(req, res) {
        var _a;
        try {
            const authReq = req;
            if (!((_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId)) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const id = req.params.id;
            const { slug } = req.body;
            if (!slug) {
                return res.status(400).json({ error: 'slug is required' });
            }
            // Verify ownership
            const portfolio = await portfolio_service_1.default.getPortfolioById(id);
            if (!portfolio || portfolio.user_id !== authReq.user.userId) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }
            // Check slug availability
            const available = await portfolio_service_1.default.isSlugAvailable(slug);
            if (!available) {
                return res.status(400).json({ error: 'Slug is already taken' });
            }
            const published = await portfolio_service_1.default.publishPortfolioWithSlug(id, slug);
            res.json(published);
        }
        catch (error) {
            console.error('Publish portfolio error:', error);
            res.status(500).json({ error: 'Failed to publish portfolio' });
        }
    }
    /**
     * Get portfolio by slug (PUBLIC - no auth)
     */
    static async getBySlug(req, res) {
        try {
            const slug = req.params.slug;
            const portfolio = await portfolio_service_1.default.getPortfolioBySlug(slug);
            if (!portfolio) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }
            res.json(portfolio);
        }
        catch (error) {
            console.error('Get portfolio by slug error:', error);
            res.status(500).json({ error: 'Failed to get portfolio' });
        }
    }
    // ============================================
    // LEGACY ENDPOINTS (Kept for backwards compatibility)
    // ============================================
    /**
     * Get current user's portfolio (LEGACY - returns first portfolio)
     */
    static async getPortfolio(req, res) {
        var _a;
        try {
            const authReq = req;
            if (!((_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId)) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const portfolio = await portfolio_service_1.default.getOrCreatePortfolio(authReq.user.userId);
            res.json(portfolio);
        }
        catch (error) {
            console.error('Get portfolio error:', error);
            res.status(500).json({ error: 'Failed to get portfolio' });
        }
    }
    /**
     * Update portfolio (LEGACY)
     */
    static async updatePortfolio(req, res) {
        var _a;
        try {
            const authReq = req;
            if (!((_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId)) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const portfolio = await portfolio_service_1.default.getOrCreatePortfolio(authReq.user.userId);
            const updates = req.body;
            const updated = await portfolio_service_1.default.updatePortfolio(portfolio.id, updates);
            res.json(updated);
        }
        catch (error) {
            console.error('Update portfolio error:', error);
            res.status(500).json({ error: 'Failed to update portfolio' });
        }
    }
    /**
     * Publish portfolio (LEGACY)
     */
    static async publishPortfolio(req, res) {
        var _a, _b;
        try {
            const authReq = req;
            if (!((_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId) || !((_b = authReq.user) === null || _b === void 0 ? void 0 : _b.username)) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const portfolio = await portfolio_service_1.default.publishPortfolio(authReq.user.userId, authReq.user.username);
            res.json(portfolio);
        }
        catch (error) {
            console.error('Publish portfolio error:', error);
            res.status(500).json({ error: 'Failed to publish portfolio' });
        }
    }
    /**
     * Get public portfolio by username (LEGACY)
     */
    static async getPublicPortfolio(req, res) {
        try {
            const { username } = req.params;
            const pool = (await Promise.resolve().then(() => __importStar(require('../config/database')))).default;
            const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
            if (userResult.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            const portfolio = await portfolio_service_1.default.getByUserId(userResult.rows[0].id);
            if (!portfolio || !portfolio.is_published) {
                return res.status(404).json({ error: 'Portfolio not found or not published' });
            }
            res.json(portfolio);
        }
        catch (error) {
            console.error('Get public portfolio error:', error);
            res.status(500).json({ error: 'Failed to get portfolio' });
        }
    }
}
exports.default = PortfolioController;
