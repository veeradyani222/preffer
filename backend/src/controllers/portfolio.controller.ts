import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authenticate';
import PortfolioService from '../services/portfolio.service.new';
import PortfolioChatService from '../services/portfolio-chat.service';

class PortfolioController {

    // ============================================
    // MULTI-PORTFOLIO ENDPOINTS (NEW)
    // ============================================

    /**
     * Get all portfolios for the current user
     */
    static async getAllPortfolios(req: Request, res: Response) {
        try {
            const authReq = req as AuthRequest;
            if (!authReq.user?.userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const portfolios = await PortfolioService.getByUserId(authReq.user.userId);
            res.json(portfolios);
        } catch (error) {
            console.error('Get all portfolios error:', error);
            res.status(500).json({ error: 'Failed to get portfolios' });
        }
    }

    /**
     * Create a new portfolio
     */
    static async createPortfolio(req: Request, res: Response) {
        try {
            const authReq = req as AuthRequest;
            if (!authReq.user?.userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { name, portfolio_type } = req.body;
            const portfolio = await PortfolioService.createDraft(authReq.user.userId, {
                name: name || 'Untitled Portfolio',
                portfolio_type: portfolio_type || 'individual'
            });
            res.status(201).json(portfolio);
        } catch (error) {
            console.error('Create portfolio error:', error);
            res.status(500).json({ error: 'Failed to create portfolio' });
        }
    }

    /**
     * Get a single portfolio by ID
     */
    static async getPortfolioById(req: Request, res: Response) {
        try {
            const authReq = req as AuthRequest;
            if (!authReq.user?.userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const id = req.params.id as string;
            const portfolio = await PortfolioService.getById(id, authReq.user.userId);

            if (!portfolio) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }

            res.json(portfolio);
        } catch (error) {
            console.error('Get portfolio by ID error:', error);
            res.status(500).json({ error: 'Failed to get portfolio' });
        }
    }

    /**
     * Get all unfinished/draft portfolios for the current user
     */
    static async getUnfinishedPortfolios(req: Request, res: Response) {
        try {
            const authReq = req as AuthRequest;
            if (!authReq.user?.userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const drafts = await PortfolioChatService.getUnfinished(authReq.user.userId);
            const count = await PortfolioChatService.getUnfinishedCount(authReq.user.userId);
            
            res.json({ 
                portfolios: drafts, 
                count,
                limit: 5 
            });
        } catch (error) {
            console.error('Get unfinished portfolios error:', error);
            res.status(500).json({ error: 'Failed to get unfinished portfolios' });
        }
    }

    /**
     * Update a portfolio by ID
     */
    static async updatePortfolioById(req: Request, res: Response) {
        try {
            const authReq = req as AuthRequest;
            if (!authReq.user?.userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const id = req.params.id as string;
            const portfolio = await PortfolioService.getById(id, authReq.user.userId);

            if (!portfolio) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }

            // For now, just return the portfolio as updates are done through wizard
            res.json(portfolio);
        } catch (error) {
            console.error('Update portfolio error:', error);
            res.status(500).json({ error: 'Failed to update portfolio' });
        }
    }

    /**
     * Delete a portfolio
     */
    static async deletePortfolio(req: Request, res: Response) {
        try {
            const authReq = req as AuthRequest;
            if (!authReq.user?.userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const id = req.params.id as string;
            await PortfolioService.delete(id, authReq.user.userId);
            res.json({ success: true, message: 'Portfolio deleted' });
        } catch (error) {
            console.error('Delete portfolio error:', error);
            res.status(500).json({ error: 'Failed to delete portfolio' });
        }
    }

    /**
     * Check if a slug is available
     */
    static async checkSlug(req: Request, res: Response) {
        try {
            const slug = req.params.slug as string;
            const available = await PortfolioService.isSlugAvailable(slug);
            res.json({ slug, available });
        } catch (error) {
            console.error('Check slug error:', error);
            res.status(500).json({ error: 'Failed to check slug' });
        }
    }

    /**
     * Generate a unique slug suggestion
     */
    static async suggestSlug(req: Request, res: Response) {
        try {
            const { baseName } = req.body;
            if (!baseName) {
                return res.status(400).json({ error: 'baseName is required' });
            }
            const slug = PortfolioService.generateSlugSuggestion(baseName);
            res.json({ slug, available: true });
        } catch (error) {
            console.error('Suggest slug error:', error);
            res.status(500).json({ error: 'Failed to suggest slug' });
        }
    }

    /**
     * Publish portfolio with custom slug
     */
    static async publishWithSlug(req: Request, res: Response) {
        try {
            const authReq = req as AuthRequest;
            if (!authReq.user?.userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const id = req.params.id as string;
            const { slug } = req.body;

            if (!slug) {
                return res.status(400).json({ error: 'slug is required' });
            }

            // Check slug availability
            const available = await PortfolioService.isSlugAvailable(slug, id);
            if (!available) {
                return res.status(400).json({ error: 'Slug is already taken' });
            }

            const published = await PortfolioService.publish(id, authReq.user.userId, slug, false);
            res.json(published);
        } catch (error) {
            console.error('Publish portfolio error:', error);
            res.status(500).json({ error: 'Failed to publish portfolio' });
        }
    }

    /**
     * Get portfolio by slug (PUBLIC - no auth)
     */
    static async getBySlug(req: Request, res: Response) {
        try {
            const slug = req.params.slug as string;
            const portfolio = await PortfolioService.getBySlug(slug);

            if (!portfolio) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }

            res.json(portfolio);
        } catch (error) {
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
    static async getPortfolio(req: Request, res: Response) {
        try {
            const authReq = req as AuthRequest;
            if (!authReq.user?.userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            // Legacy - get first portfolio or create one
            const portfolios = await PortfolioService.getByUserId(authReq.user.userId);
            if (portfolios.length > 0) {
                res.json(portfolios[0]);
            } else {
                const newPortfolio = await PortfolioService.createDraft(authReq.user.userId, {
                    portfolio_type: 'individual',
                    name: 'My Portfolio'
                });
                res.json(newPortfolio);
            }
        } catch (error) {
            console.error('Get portfolio error:', error);
            res.status(500).json({ error: 'Failed to get portfolio' });
        }
    }

    /**
     * Update portfolio (LEGACY)
     */
    static async updatePortfolio(req: Request, res: Response) {
        try {
            const authReq = req as AuthRequest;
            if (!authReq.user?.userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            // Legacy - get first portfolio
            const portfolios = await PortfolioService.getByUserId(authReq.user.userId);
            if (portfolios.length === 0) {
                return res.status(404).json({ error: 'No portfolio found' });
            }
            // Just return the portfolio, updates handled by wizard
            res.json(portfolios[0]);
        } catch (error) {
            console.error('Update portfolio error:', error);
            res.status(500).json({ error: 'Failed to update portfolio' });
        }
    }

    /**
     * Publish portfolio (LEGACY)
     */
    static async publishPortfolio(req: Request, res: Response) {
        try {
            const authReq = req as AuthRequest;
            if (!authReq.user?.userId || !authReq.user?.username) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            // Legacy - publish first draft portfolio
            const portfolios = await PortfolioService.getByUserId(authReq.user.userId);
            const draft = portfolios.find(p => p.status === 'draft');
            if (!draft) {
                return res.status(404).json({ error: 'No draft portfolio found' });
            }
            const slug = authReq.user.username || `user-${authReq.user.userId}`;
            const published = await PortfolioService.publish(draft.id, authReq.user.userId, slug, false);
            res.json(published);
        } catch (error) {
            console.error('Publish portfolio error:', error);
            res.status(500).json({ error: 'Failed to publish portfolio' });
        }
    }

    /**
     * Get public portfolio by username (LEGACY)
     */
    static async getPublicPortfolio(req: Request, res: Response) {
        try {
            const { username } = req.params;

            const pool = (await import('../config/database')).default;
            const userResult = await pool.query(
                'SELECT id FROM users WHERE username = $1',
                [username]
            );

            if (userResult.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            const portfolios = await PortfolioService.getByUserId(userResult.rows[0].id);
            const published = portfolios.find(p => p.status === 'published');

            if (!published) {
                return res.status(404).json({ error: 'Portfolio not found or not published' });
            }

            res.json(published);
        } catch (error) {
            console.error('Get public portfolio error:', error);
            res.status(500).json({ error: 'Failed to get portfolio' });
        }
    }
}

export default PortfolioController;
