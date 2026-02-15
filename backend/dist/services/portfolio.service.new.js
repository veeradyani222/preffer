"use strict";
/**
 * Portfolio Service (v2)
 * Simplified portfolio management for the wizard-based flow
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortfolioService = void 0;
const database_1 = __importDefault(require("../config/database"));
const credits_service_1 = require("./credits.service");
const archestra_agent_service_1 = __importDefault(require("./archestra-agent.service"));
// ============================================
// PORTFOLIO SERVICE
// ============================================
class PortfolioService {
    /**
     * Create a new draft portfolio (wizard start)
     * Drafts are free - credits only deducted on publish
     */
    static async createDraft(userId, input) {
        // Check portfolio count limit (not credits - drafts are free)
        const userCredits = await credits_service_1.CreditsService.getUserCredits(userId);
        if (!userCredits.canCreatePortfolio) {
            throw new Error(`Portfolio limit reached. Your ${userCredits.plan} plan allows ${credits_service_1.PLAN_LIMITS[userCredits.plan].maxPortfolios} portfolios.`);
        }
        const query = `
            INSERT INTO portfolios (user_id, name, portfolio_type, wizard_step, wizard_data)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const wizardData = {
            portfolioType: input.portfolio_type,
        };
        const result = await database_1.default.query(query, [
            userId,
            input.name || 'Untitled Portfolio',
            input.portfolio_type,
            2, // Starting at step 2 since type selection (step 1) is complete
            JSON.stringify(wizardData)
        ]);
        return this.formatPortfolio(result.rows[0]);
    }
    /**
     * Get portfolio by ID
     */
    static async getById(portfolioId, userId) {
        let query = 'SELECT * FROM portfolios WHERE id = $1';
        const params = [portfolioId];
        if (userId) {
            query += ' AND user_id = $2';
            params.push(userId);
        }
        const result = await database_1.default.query(query, params);
        return result.rows[0] ? this.formatPortfolio(result.rows[0]) : null;
    }
    /**
     * Get all portfolios for a user
     */
    static async getByUserId(userId) {
        const query = `
            SELECT * FROM portfolios 
            WHERE user_id = $1 
            ORDER BY updated_at DESC
        `;
        const result = await database_1.default.query(query, [userId]);
        return result.rows.map(row => this.formatPortfolio(row));
    }
    /**
     * Get published portfolio by slug
     */
    static async getBySlug(slug) {
        const query = "SELECT * FROM portfolios WHERE slug = $1 AND status = 'published'";
        const result = await database_1.default.query(query, [slug]);
        return result.rows[0] ? this.formatPortfolio(result.rows[0]) : null;
    }
    /**
     * Update wizard data (for wizard progression)
     */
    static async updateWizard(portfolioId, userId, step, wizardData) {
        // First get current wizard data
        const current = await this.getById(portfolioId, userId);
        if (!current) {
            throw new Error('Portfolio not found');
        }
        const mergedData = { ...current.wizard_data, ...wizardData };
        const query = `
            UPDATE portfolios 
            SET wizard_step = $1, wizard_data = $2, updated_at = NOW()
            WHERE id = $3 AND user_id = $4
            RETURNING *
        `;
        const result = await database_1.default.query(query, [
            step,
            JSON.stringify(mergedData),
            portfolioId,
            userId
        ]);
        if (result.rows.length === 0) {
            throw new Error('Portfolio not found or access denied');
        }
        return this.formatPortfolio(result.rows[0]);
    }
    /**
     * Update sections (during wizard step 4)
     */
    static async updateSections(portfolioId, userId, sections) {
        const query = `
            UPDATE portfolios 
            SET sections = $1, updated_at = NOW()
            WHERE id = $2 AND user_id = $3
            RETURNING *
        `;
        const result = await database_1.default.query(query, [
            JSON.stringify(sections),
            portfolioId,
            userId
        ]);
        if (result.rows.length === 0) {
            throw new Error('Portfolio not found or access denied');
        }
        return this.formatPortfolio(result.rows[0]);
    }
    /**
     * Finalize and publish portfolio
     */
    static async publish(portfolioId, userId, slug, hasAiManager) {
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            // Check slug availability
            const slugCheck = await client.query('SELECT id FROM portfolios WHERE slug = $1 AND id != $2', [slug, portfolioId]);
            if (slugCheck.rows.length > 0) {
                throw new Error('This URL is already taken. Please choose another.');
            }
            // Get portfolio and verify ownership
            const portfolioResult = await client.query('SELECT * FROM portfolios WHERE id = $1 AND user_id = $2 FOR UPDATE', [portfolioId, userId]);
            if (portfolioResult.rows.length === 0) {
                throw new Error('Portfolio not found');
            }
            const portfolio = portfolioResult.rows[0];
            if (portfolio.status === 'published') {
                throw new Error('Portfolio is already published');
            }
            const wizardData = portfolio.wizard_data || {};
            // Resolve AI manager state from both request and persisted wizard data.
            // Frontend snapshots can be stale at publish time, so trust finalized wizard state too.
            const wizardHasAiManager = Boolean(wizardData.hasAiManager);
            const wizardAiConfigured = Boolean(wizardData.aiManagerName ||
                wizardData.aiManagerPersonality ||
                wizardData.aiManagerFinalized);
            const effectiveHasAiManager = Boolean(hasAiManager || wizardHasAiManager || wizardAiConfigured);
            // Calculate and deduct credits
            const cost = credits_service_1.CreditsService.getPortfolioCost(effectiveHasAiManager);
            const aiManagerName = effectiveHasAiManager ? wizardData.aiManagerName || null : null;
            const aiManagerPersonality = effectiveHasAiManager ? wizardData.aiManagerPersonality || null : null;
            const aiManagerHasPortfolioAccess = effectiveHasAiManager
                ? Boolean(wizardData.aiManagerHasPortfolioAccess)
                : false;
            const aiManagerFinalized = effectiveHasAiManager ? Boolean(wizardData.aiManagerFinalized) : false;
            // Update portfolio to published
            const updateQuery = `
                UPDATE portfolios 
                SET 
                    status = 'published',
                    slug = $1,
                    has_ai_manager = $2,
                    name = COALESCE($3, name),
                    profession = $4,
                    description = $5,
                    credits_used = $6,
                    ai_manager_name = $7,
                    ai_manager_personality = $8,
                    ai_manager_has_portfolio_access = $9,
                    ai_manager_finalized = $10,
                    theme = $11,
                    wizard_step = 0,
                    updated_at = NOW()
                WHERE id = $12
                RETURNING *
            `;
            const updateResult = await client.query(updateQuery, [
                slug,
                effectiveHasAiManager,
                wizardData.name,
                wizardData.profession || null,
                wizardData.description || null,
                cost,
                aiManagerName,
                aiManagerPersonality,
                aiManagerHasPortfolioAccess,
                aiManagerFinalized,
                wizardData.theme || 'minimal',
                portfolioId
            ]);
            // Deduct credits (in same transaction conceptually, but credits service handles its own)
            await client.query('COMMIT');
            // Now deduct credits (separate transaction for clean separation)
            const deductResult = await credits_service_1.CreditsService.deductCredits(userId, cost, 'portfolio_creation', `Published portfolio: ${wizardData.name || 'Untitled'}`, portfolioId);
            if (!deductResult.success) {
                // Rollback the publish (rare edge case)
                await database_1.default.query("UPDATE portfolios SET status = 'draft', slug = NULL WHERE id = $1", [portfolioId]);
                throw new Error('Insufficient credits');
            }
            const published = this.formatPortfolio(updateResult.rows[0]);
            // ── Archestra Agent Integration ──
            // Create/sync an Archestra agent when publishing with a finalized AI manager
            if (effectiveHasAiManager && aiManagerFinalized && archestra_agent_service_1.default.isA2AEnabled()) {
                const agent = await archestra_agent_service_1.default.createAgentOrFallback(published, published.id);
                if (agent) {
                    await database_1.default.query('UPDATE portfolios SET archestra_agent_id = $1 WHERE id = $2', [agent.id, published.id]);
                    published.archestra_agent_id = agent.id;
                }
            }
            return published;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Check if slug is available
     */
    static async isSlugAvailable(slug, excludeId) {
        let query = 'SELECT id FROM portfolios WHERE slug = $1';
        const params = [slug];
        if (excludeId) {
            query += ' AND id != $2';
            params.push(excludeId);
        }
        const result = await database_1.default.query(query, params);
        return result.rows.length === 0;
    }
    /**
     * Generate slug suggestion from name
     */
    static generateSlugSuggestion(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .slice(0, 50);
    }
    /**
     * Delete a portfolio (only drafts, or reclaim credits for published)
     */
    static async delete(portfolioId, userId) {
        var _a;
        // Clean up Archestra agent if linked
        const existing = await database_1.default.query('SELECT archestra_agent_id FROM portfolios WHERE id = $1 AND user_id = $2', [portfolioId, userId]);
        if (((_a = existing.rows[0]) === null || _a === void 0 ? void 0 : _a.archestra_agent_id) && archestra_agent_service_1.default.isA2AEnabled()) {
            archestra_agent_service_1.default.deleteAgent(existing.rows[0].archestra_agent_id).catch(() => { });
        }
        const query = 'DELETE FROM portfolios WHERE id = $1 AND user_id = $2';
        await database_1.default.query(query, [portfolioId, userId]);
    }
    /**
     * Format DB row to Portfolio object
     */
    static formatPortfolio(row) {
        return {
            id: row.id,
            user_id: row.user_id,
            name: row.name,
            slug: row.slug,
            portfolio_type: row.portfolio_type,
            profession: row.profession,
            description: row.description,
            sections: row.sections || [],
            theme: row.theme,
            color_scheme: row.wizard_data.colorScheme || row.wizard_data.color_scheme, // Added mapping support for camelCase
            has_ai_manager: row.has_ai_manager,
            ai_manager_name: row.ai_manager_name,
            ai_manager_personality: row.ai_manager_personality,
            ai_manager_has_portfolio_access: row.ai_manager_has_portfolio_access,
            ai_manager_finalized: row.ai_manager_finalized,
            ai_manager_custom_instructions: row.ai_manager_custom_instructions || null,
            archestra_agent_id: row.archestra_agent_id || null,
            status: row.status,
            wizard_step: row.wizard_step,
            wizard_data: row.wizard_data || {},
            chat_history: row.chat_history || {},
            credits_used: row.credits_used,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }
}
exports.PortfolioService = PortfolioService;
exports.default = PortfolioService;
