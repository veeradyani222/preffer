"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortfolioService = void 0;
const database_1 = __importDefault(require("../config/database"));
// Columns to select (excludes legacy: headline, bio, skills, experience, projects, education, social_links)
const PORTFOLIO_COLUMNS = `
    id, user_id, name, slug, portfolio_type, profession, 
    sections, theme, is_published, published_url, 
    conversation_id, is_active, lifecycle, 
    created_at, updated_at
`;
/**
 * Format raw DB row to Portfolio (strips any extra fields)
 */
function formatPortfolio(row) {
    var _a;
    if (!row)
        return null;
    return {
        id: row.id,
        user_id: row.user_id,
        name: row.name,
        slug: row.slug,
        portfolio_type: row.portfolio_type,
        profession: row.profession,
        sections: row.sections || [],
        theme: row.theme,
        is_published: row.is_published,
        published_url: row.published_url,
        conversation_id: row.conversation_id,
        is_active: (_a = row.is_active) !== null && _a !== void 0 ? _a : true,
        lifecycle: row.lifecycle || 'NEW',
        created_at: row.created_at,
        updated_at: row.updated_at
    };
}
// ============================================
// PORTFOLIO SERVICE
// ============================================
class PortfolioService {
    // ----------------------------------------
    // MULTI-PORTFOLIO METHODS (NEW)
    // ----------------------------------------
    /**
     * Create a fresh portfolio for a new conversation
     * This is the primary method for creating portfolios
     */
    static async createFreshPortfolio(userId, conversationId) {
        const query = `
            INSERT INTO portfolios (
                user_id, conversation_id, is_active, lifecycle,
                name, portfolio_type, profession
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING ${PORTFOLIO_COLUMNS}
        `;
        const result = await database_1.default.query(query, [
            userId,
            conversationId,
            true, // is_active
            'NEW', // lifecycle
            null, // name (to be set by user)
            'individual', // default type
            null // profession (to be set by user)
        ]);
        return formatPortfolio(result.rows[0]);
    }
    /**
     * Get active portfolio for a conversation
     * Returns null if no portfolio exists for this conversation
     */
    static async getActivePortfolioForConversation(conversationId) {
        const query = `
            SELECT ${PORTFOLIO_COLUMNS} 
            FROM portfolios 
            WHERE conversation_id = $1 AND is_active = true
            LIMIT 1
        `;
        const result = await database_1.default.query(query, [conversationId]);
        return formatPortfolio(result.rows[0]);
    }
    /**
     * Get or create portfolio for conversation
     * Creates fresh if none exists
     */
    static async getOrCreateForConversation(userId, conversationId) {
        const existing = await this.getActivePortfolioForConversation(conversationId);
        if (existing) {
            return existing;
        }
        return this.createFreshPortfolio(userId, conversationId);
    }
    /**
     * Create a new portfolio for a user (legacy/manual creation)
     */
    static async createPortfolio(userId, input = {}) {
        const query = `
            INSERT INTO portfolios (user_id, name, portfolio_type, profession, lifecycle)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING ${PORTFOLIO_COLUMNS}
        `;
        const result = await database_1.default.query(query, [
            userId,
            input.name || 'My Portfolio',
            input.portfolio_type || 'individual',
            input.profession || null,
            'NEW'
        ]);
        return formatPortfolio(result.rows[0]);
    }
    /**
     * Get all portfolios for a user
     */
    static async getPortfoliosByUser(userId) {
        const query = `SELECT ${PORTFOLIO_COLUMNS} FROM portfolios WHERE user_id = $1 ORDER BY created_at DESC`;
        const result = await database_1.default.query(query, [userId]);
        return result.rows.map(row => formatPortfolio(row)).filter(Boolean);
    }
    /**
     * Get a single portfolio by ID
     */
    static async getPortfolioById(portfolioId) {
        const query = `SELECT ${PORTFOLIO_COLUMNS} FROM portfolios WHERE id = $1`;
        const result = await database_1.default.query(query, [portfolioId]);
        return formatPortfolio(result.rows[0]);
    }
    /**
     * Get portfolio by slug (for public pages - no auth required)
     */
    static async getPortfolioBySlug(slug) {
        const query = `SELECT ${PORTFOLIO_COLUMNS} FROM portfolios WHERE slug = $1 AND is_published = true`;
        const result = await database_1.default.query(query, [slug]);
        return formatPortfolio(result.rows[0]);
    }
    /**
     * Check if a slug is available
     */
    static async isSlugAvailable(slug) {
        const query = 'SELECT id FROM portfolios WHERE slug = $1';
        const result = await database_1.default.query(query, [slug]);
        return result.rows.length === 0;
    }
    /**
     * Generate a unique slug from a base name
     */
    static async generateUniqueSlug(baseName) {
        // Clean the base name: lowercase, remove special chars, replace spaces with hyphens
        let slug = baseName
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .slice(0, 50);
        // Check if available
        if (await this.isSlugAvailable(slug)) {
            return slug;
        }
        // Try with numbers
        for (let i = 1; i <= 99; i++) {
            const numberedSlug = `${slug}${i}`;
            if (await this.isSlugAvailable(numberedSlug)) {
                return numberedSlug;
            }
        }
        // Fallback: add timestamp
        return `${slug}-${Date.now().toString(36)}`;
    }
    /**
     * Update portfolio sections (for AI-driven updates)
     */
    static async updateSections(portfolioId, sections) {
        const query = `
            UPDATE portfolios 
            SET sections = $2::jsonb
            WHERE id = $1
            RETURNING ${PORTFOLIO_COLUMNS}
        `;
        const result = await database_1.default.query(query, [portfolioId, JSON.stringify(sections)]);
        return formatPortfolio(result.rows[0]);
    }
    /**
     * Update portfolio type and profession
     */
    static async updateTypeAndProfession(portfolioId, portfolioType, profession) {
        const query = `
            UPDATE portfolios 
            SET portfolio_type = $2, profession = $3
            WHERE id = $1
            RETURNING ${PORTFOLIO_COLUMNS}
        `;
        const result = await database_1.default.query(query, [portfolioId, portfolioType, profession]);
        return formatPortfolio(result.rows[0]);
    }
    /**
     * Update portfolio name
     */
    static async updateName(portfolioId, name) {
        const query = `
            UPDATE portfolios 
            SET name = $2
            WHERE id = $1
            RETURNING ${PORTFOLIO_COLUMNS}
        `;
        const result = await database_1.default.query(query, [portfolioId, name]);
        return formatPortfolio(result.rows[0]);
    }
    /**
     * Update portfolio lifecycle state
     */
    static async updateLifecycle(portfolioId, lifecycle) {
        const query = `
            UPDATE portfolios 
            SET lifecycle = $2
            WHERE id = $1
            RETURNING ${PORTFOLIO_COLUMNS}
        `;
        const result = await database_1.default.query(query, [portfolioId, lifecycle]);
        return formatPortfolio(result.rows[0]);
    }
    /**
     * Publish portfolio with a slug
     */
    static async publishPortfolioWithSlug(portfolioId, slug) {
        const query = `
            UPDATE portfolios 
            SET slug = $2, is_published = true, published_url = $3, lifecycle = 'PUBLISHED'
            WHERE id = $1
            RETURNING ${PORTFOLIO_COLUMNS}
        `;
        const publishedUrl = `/${slug}`;
        const result = await database_1.default.query(query, [portfolioId, slug, publishedUrl]);
        return formatPortfolio(result.rows[0]);
    }
    /**
     * Delete a portfolio
     */
    static async deletePortfolio(portfolioId, userId) {
        const query = 'DELETE FROM portfolios WHERE id = $1 AND user_id = $2 RETURNING id';
        const result = await database_1.default.query(query, [portfolioId, userId]);
        return result.rows.length > 0;
    }
    // ----------------------------------------
    // LEGACY METHODS (Kept for backwards compatibility)
    // ----------------------------------------
    /**
     * Get or create portfolio for a user (LEGACY - creates single portfolio)
     */
    static async getOrCreatePortfolio(userId) {
        // Try to get existing portfolio
        const query = `SELECT ${PORTFOLIO_COLUMNS} FROM portfolios WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1`;
        const result = await database_1.default.query(query, [userId]);
        if (result.rows.length > 0) {
            return formatPortfolio(result.rows[0]);
        }
        // Create new portfolio
        return this.createPortfolio(userId, { name: 'My Portfolio' });
    }
    /**
     * Get portfolio by user ID (LEGACY - returns first portfolio)
     */
    static async getByUserId(userId) {
        const query = `SELECT ${PORTFOLIO_COLUMNS} FROM portfolios WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1`;
        const result = await database_1.default.query(query, [userId]);
        return formatPortfolio(result.rows[0]);
    }
    /**
     * Update portfolio (generic update for any fields)
     */
    static async updatePortfolio(portfolioId, updates) {
        // Only allow non-legacy fields
        const allowedFields = [
            'name', 'theme', 'portfolio_type', 'profession', 'sections'
        ];
        const jsonbFields = ['sections'];
        const setClause = [];
        const values = [portfolioId];
        let paramIndex = 2;
        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key) && value !== undefined) {
                if (jsonbFields.includes(key)) {
                    setClause.push(`${key} = $${paramIndex}::jsonb`);
                    values.push(JSON.stringify(value));
                }
                else {
                    setClause.push(`${key} = $${paramIndex}`);
                    values.push(value);
                }
                paramIndex++;
            }
        }
        if (setClause.length === 0) {
            const existing = await this.getPortfolioById(portfolioId);
            if (existing)
                return existing;
            throw new Error('Portfolio not found');
        }
        const query = `
            UPDATE portfolios 
            SET ${setClause.join(', ')}
            WHERE id = $1
            RETURNING ${PORTFOLIO_COLUMNS}
        `;
        const result = await database_1.default.query(query, values);
        return formatPortfolio(result.rows[0]);
    }
    /**
     * Publish portfolio (LEGACY)
     */
    static async publishPortfolio(userId, username) {
        const portfolio = await this.getByUserId(userId);
        if (!portfolio)
            throw new Error('Portfolio not found');
        return this.publishPortfolioWithSlug(portfolio.id, username);
    }
}
exports.PortfolioService = PortfolioService;
exports.default = PortfolioService;
