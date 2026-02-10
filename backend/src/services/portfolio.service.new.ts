/**
 * Portfolio Service (v2)
 * Simplified portfolio management for the wizard-based flow
 */

import pool from '../config/database';
import { CreditsService, CREDIT_COSTS, PLAN_LIMITS } from './credits.service';

// ============================================
// TYPES
// ============================================

export type PortfolioType = 'individual' | 'company';
export type PortfolioStatus = 'draft' | 'published';

export type SectionType = 
    | 'hero'
    | 'about'
    | 'services'
    | 'skills'
    | 'experience'
    | 'projects'
    | 'testimonials'
    | 'contact'
    | 'faq'
    | 'pricing'
    | 'team'
    | 'menu'
    | 'achievements'
    | 'education';

export interface Section {
    id: string;
    type: SectionType;
    title: string;
    content: any;   // Section-specific content structure
    order: number;
}

export interface Portfolio {
    id: string;
    user_id: string;
    name: string;
    slug: string | null;
    portfolio_type: PortfolioType;
    profession: string | null;
    description: string | null;
    sections: Section[];
    theme: string;
    has_ai_manager: boolean;
    status: PortfolioStatus;
    wizard_step: number;
    wizard_data: any;
    chat_history: Record<string, ChatMessage[]>;  // Per-section chat history
    credits_used: number;
    created_at: Date;
    updated_at: Date;
}

export interface CreatePortfolioInput {
    portfolio_type: PortfolioType;
    name?: string;
}

export interface ChatMessage {
    role: 'user' | 'ai';
    content: string;
    timestamp: Date;
}

export interface WizardData {
    // Step 1: Type selection
    portfolioType?: PortfolioType;
    
    // Step 2: About info
    name?: string;
    profession?: string;
    description?: string;
    
    // Step 3: Section selection
    selectedSections?: SectionType[];
    recommendedSections?: SectionType[];
    
    // Step 4: Section content
    sectionContents?: Record<string, any>;
    currentSectionIndex?: number;
    
    // Step 5: AI Manager
    hasAiManager?: boolean;
    
    // Step 6: Theme
    theme?: string;
    
    // Step 7: Slug
    slug?: string;
}

// ============================================
// PORTFOLIO SERVICE
// ============================================

export class PortfolioService {

    /**
     * Create a new draft portfolio (wizard start)
     * Drafts are free - credits only deducted on publish
     */
    static async createDraft(userId: string, input: CreatePortfolioInput): Promise<Portfolio> {
        // Check portfolio count limit (not credits - drafts are free)
        const userCredits = await CreditsService.getUserCredits(userId);
        if (!userCredits.canCreatePortfolio) {
            throw new Error(`Portfolio limit reached. Your ${userCredits.plan} plan allows ${PLAN_LIMITS[userCredits.plan].maxPortfolios} portfolios.`);
        }

        const query = `
            INSERT INTO portfolios (user_id, name, portfolio_type, wizard_step, wizard_data)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        
        const wizardData: WizardData = {
            portfolioType: input.portfolio_type,
        };

        const result = await pool.query(query, [
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
    static async getById(portfolioId: string, userId?: string): Promise<Portfolio | null> {
        let query = 'SELECT * FROM portfolios WHERE id = $1';
        const params: any[] = [portfolioId];

        if (userId) {
            query += ' AND user_id = $2';
            params.push(userId);
        }

        const result = await pool.query(query, params);
        return result.rows[0] ? this.formatPortfolio(result.rows[0]) : null;
    }

    /**
     * Get all portfolios for a user
     */
    static async getByUserId(userId: string): Promise<Portfolio[]> {
        const query = `
            SELECT * FROM portfolios 
            WHERE user_id = $1 
            ORDER BY updated_at DESC
        `;
        const result = await pool.query(query, [userId]);
        return result.rows.map(row => this.formatPortfolio(row));
    }

    /**
     * Get published portfolio by slug
     */
    static async getBySlug(slug: string): Promise<Portfolio | null> {
        const query = "SELECT * FROM portfolios WHERE slug = $1 AND status = 'published'";
        const result = await pool.query(query, [slug]);
        return result.rows[0] ? this.formatPortfolio(result.rows[0]) : null;
    }

    /**
     * Update wizard data (for wizard progression)
     */
    static async updateWizard(
        portfolioId: string, 
        userId: string, 
        step: number, 
        wizardData: Partial<WizardData>
    ): Promise<Portfolio> {
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

        const result = await pool.query(query, [
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
    static async updateSections(
        portfolioId: string,
        userId: string,
        sections: Section[]
    ): Promise<Portfolio> {
        const query = `
            UPDATE portfolios 
            SET sections = $1, updated_at = NOW()
            WHERE id = $2 AND user_id = $3
            RETURNING *
        `;

        const result = await pool.query(query, [
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
    static async publish(
        portfolioId: string,
        userId: string,
        slug: string,
        hasAiManager: boolean
    ): Promise<Portfolio> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Check slug availability
            const slugCheck = await client.query(
                'SELECT id FROM portfolios WHERE slug = $1 AND id != $2',
                [slug, portfolioId]
            );
            if (slugCheck.rows.length > 0) {
                throw new Error('This URL is already taken. Please choose another.');
            }

            // Get portfolio and verify ownership
            const portfolioResult = await client.query(
                'SELECT * FROM portfolios WHERE id = $1 AND user_id = $2 FOR UPDATE',
                [portfolioId, userId]
            );
            if (portfolioResult.rows.length === 0) {
                throw new Error('Portfolio not found');
            }

            const portfolio = portfolioResult.rows[0];
            if (portfolio.status === 'published') {
                throw new Error('Portfolio is already published');
            }

            // Calculate and deduct credits
            const cost = CreditsService.getPortfolioCost(hasAiManager);
            const wizardData = portfolio.wizard_data || {};
            
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
                    wizard_step = 0,
                    updated_at = NOW()
                WHERE id = $7
                RETURNING *
            `;

            const updateResult = await client.query(updateQuery, [
                slug,
                hasAiManager,
                wizardData.name,
                wizardData.profession || null,
                wizardData.description || null,
                cost,
                portfolioId
            ]);

            // Deduct credits (in same transaction conceptually, but credits service handles its own)
            await client.query('COMMIT');

            // Now deduct credits (separate transaction for clean separation)
            const deductResult = await CreditsService.deductCredits(
                userId,
                cost,
                'portfolio_creation',
                `Published portfolio: ${wizardData.name || 'Untitled'}`,
                portfolioId
            );

            if (!deductResult.success) {
                // Rollback the publish (rare edge case)
                await pool.query(
                    "UPDATE portfolios SET status = 'draft', slug = NULL WHERE id = $1",
                    [portfolioId]
                );
                throw new Error('Insufficient credits');
            }

            return this.formatPortfolio(updateResult.rows[0]);

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Check if slug is available
     */
    static async isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
        let query = 'SELECT id FROM portfolios WHERE slug = $1';
        const params: any[] = [slug];

        if (excludeId) {
            query += ' AND id != $2';
            params.push(excludeId);
        }

        const result = await pool.query(query, params);
        return result.rows.length === 0;
    }

    /**
     * Generate slug suggestion from name
     */
    static generateSlugSuggestion(name: string): string {
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
    static async delete(portfolioId: string, userId: string): Promise<void> {
        const query = 'DELETE FROM portfolios WHERE id = $1 AND user_id = $2';
        await pool.query(query, [portfolioId, userId]);
    }

    /**
     * Format DB row to Portfolio object
     */
    private static formatPortfolio(row: any): Portfolio {
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
            has_ai_manager: row.has_ai_manager,
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

export default PortfolioService;
