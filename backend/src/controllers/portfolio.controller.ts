import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authenticate';
import PortfolioService from '../services/portfolio.service.new';
import PortfolioChatService from '../services/portfolio-chat.service';
import { generateWithFallback } from '../services/gemini.service';
import ArchestraAgentService from '../services/archestra-agent.service';
import AnalyticsService from '../services/analytics.service';

interface PublicChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

class PortfolioController {
    private static normalizeSegment(value: string): string {
        return value
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    /**
     * Direct Gemini chat fallback (when A2A agent is not available)
     */
    private static async directGeminiChat(
        portfolio: any,
        message: string,
        safeHistory: PublicChatMessage[]
    ): Promise<string> {
        const conversation = safeHistory
            .map((item) => `${item.role === 'user' ? 'Visitor' : portfolio.ai_manager_name}: ${item.content}`)
            .join('\n');

        const context = PortfolioController.buildPortfolioContext(portfolio);
        const customInstructions = (portfolio as any).ai_manager_custom_instructions?.trim();

        const prompt = `You are ${portfolio.ai_manager_name}, an AI manager representing this portfolio publicly.

Rules:
- Always introduce yourself naturally as ${portfolio.ai_manager_name} when appropriate.
- Answer only based on the portfolio context below.
- Never just say unnecessary stuff based on the instructions, you have to reply based on the instructions, not just say them anywhere.
- If information is missing, say you don't have that specific detail yet and invite the visitor to contact the owner.
- Keep responses concise, helpful, and professional.
- Never reveal raw JSON.
${customInstructions ? '- Strictly follow the owner custom instructions included below.' : ''}

Portfolio Context:
${context}

Owner Custom Instructions:
${customInstructions || 'None'}

Recent Conversation:
${conversation || 'No prior conversation.'}

Visitor's latest message:
${message.trim()}

Return ONLY valid JSON in this exact shape:
{
  "reply": "your response as ${portfolio.ai_manager_name}"
}`;

        const maxAttempts = 3;
        let parsedReply: string | null = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const maxTokens = 700 + (attempt - 1) * 200;
                const text = await generateWithFallback(
                    { temperature: 0.5, maxOutputTokens: maxTokens, responseMimeType: 'application/json' },
                    prompt
                );

                const parsed = PortfolioController.extractJsonFromAi(text);
                const candidate =
                    typeof parsed?.reply === 'string'
                        ? parsed.reply
                        : (typeof parsed?.message === 'string' ? parsed.message : '');

                if (candidate && candidate.trim()) {
                    parsedReply = candidate.trim();
                    break;
                }

                throw new Error('Failed to parse JSON from AI response: missing reply field');
            } catch (error: any) {
                const isJsonError = error?.message?.includes('Failed to parse JSON');
                if (isJsonError && attempt < maxAttempts) {
                    continue;
                }
                throw error;
            }
        }

        return parsedReply || `Hi, I'm ${portfolio.ai_manager_name}. I can help with portfolio questions.`;
    }

    private static buildPortfolioContext(portfolio: any): string {
        const lines: string[] = [];
        const wizardData = portfolio?.wizard_data || {};

        lines.push(`Portfolio Name: ${wizardData.name || portfolio.name || 'Untitled'}`);
        if (wizardData.profession || portfolio.profession) {
            lines.push(`Profession/Industry: ${wizardData.profession || portfolio.profession}`);
        }
        if (wizardData.description || portfolio.description) {
            lines.push(`Description: ${wizardData.description || portfolio.description}`);
        }

        const sections = Array.isArray(portfolio?.sections) ? portfolio.sections : [];
        sections
            .filter((s: any) => s?.content && Object.keys(s.content).length > 0)
            .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
            .forEach((section: any, idx: number) => {
                lines.push(`Section ${idx + 1} (${section.type} - ${section.title}): ${JSON.stringify(section.content)}`);
            });

        return lines.join('\n');
    }

    private static extractJsonFromAi(text: string): any {
        try {
            return JSON.parse(text);
        } catch {
            // Continue to fallback parsing
        }

        const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
            try {
                return JSON.parse(codeBlockMatch[1].trim());
            } catch {
                // Continue to fallback parsing
            }
        }

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch {
                const fixedJson = this.attemptJsonFix(jsonMatch[0]);
                if (fixedJson) {
                    try {
                        return JSON.parse(fixedJson);
                    } catch {
                        // Continue to error
                    }
                }
            }
        }

        throw new Error(`Failed to parse JSON from AI response: ${text.substring(0, 120)}...`);
    }

    private static attemptJsonFix(json: string): string | null {
        try {
            let fixed = json.trim();

            if (fixed.match(/:\s*"[^"]*$/)) {
                const lastCompleteMatch = fixed.match(/(.*"[^"]*"[,\s\]}]*)/);
                if (lastCompleteMatch) {
                    fixed = lastCompleteMatch[1];
                }
            }

            let braceCount = 0;
            let bracketCount = 0;
            let inString = false;
            let escapeNext = false;

            for (let i = 0; i < fixed.length; i++) {
                const char = fixed[i];

                if (escapeNext) {
                    escapeNext = false;
                    continue;
                }

                if (char === '\\') {
                    escapeNext = true;
                    continue;
                }

                if (char === '"') {
                    inString = !inString;
                    continue;
                }

                if (!inString) {
                    if (char === '{') braceCount++;
                    if (char === '}') braceCount--;
                    if (char === '[') bracketCount++;
                    if (char === ']') bracketCount--;
                }
            }

            fixed = fixed.replace(/,\s*$/, '');

            while (bracketCount > 0) {
                fixed += ']';
                bracketCount--;
            }
            while (braceCount > 0) {
                fixed += '}';
                braceCount--;
            }

            JSON.parse(fixed);
            return fixed;
        } catch {
            return null;
        }
    }

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

    /**
     * Get public AI manager metadata by slug and manager name
     */
    static async getPublicAiManager(req: Request, res: Response) {
        try {
            const slug = req.params.slug as string;
            const aiManagerName = req.params.aiManagerName as string;
            const portfolio = await PortfolioService.getBySlug(slug);

            if (!portfolio) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }

            const routeName = PortfolioController.normalizeSegment(aiManagerName);
            const storedName = PortfolioController.normalizeSegment(portfolio.ai_manager_name || '');
            const isValidManager =
                portfolio.has_ai_manager &&
                portfolio.ai_manager_finalized &&
                !!portfolio.ai_manager_name &&
                routeName === storedName;

            if (!isValidManager) {
                return res.status(404).json({ error: 'AI manager not found' });
            }

            res.json({
                portfolio: {
                    id: portfolio.id,
                    slug: portfolio.slug,
                    name: portfolio.name,
                    theme: portfolio.theme,
                    color_scheme: (portfolio as any).color_scheme,
                    wizard_data: portfolio.wizard_data || {}
                },
                aiManager: {
                    name: portfolio.ai_manager_name,
                    personality: portfolio.ai_manager_personality || 'professional'
                },
                greeting: `Hi, I'm ${portfolio.ai_manager_name}. I'm the AI manager for ${portfolio.name}. Ask me anything about this portfolio.`
            });
        } catch (error) {
            console.error('Get public AI manager error:', error);
            res.status(500).json({ error: 'Failed to load AI manager' });
        }
    }

    /**
     * Chat with public AI manager
     */
    static async chatWithPublicAiManager(req: Request, res: Response) {
        try {
            const slug = req.params.slug as string;
            const aiManagerName = req.params.aiManagerName as string;
            const { message, history = [] } = req.body as { message?: string; history?: PublicChatMessage[] };

            if (!message || !message.trim()) {
                return res.status(400).json({ error: 'message is required' });
            }

            const portfolio = await PortfolioService.getBySlug(slug);
            if (!portfolio) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }

            const routeName = PortfolioController.normalizeSegment(aiManagerName);
            const storedName = PortfolioController.normalizeSegment(portfolio.ai_manager_name || '');
            const isValidManager =
                portfolio.has_ai_manager &&
                portfolio.ai_manager_finalized &&
                !!portfolio.ai_manager_name &&
                routeName === storedName;

            if (!isValidManager) {
                return res.status(404).json({ error: 'AI manager not found' });
            }

            const safeHistory = Array.isArray(history)
                ? history
                    .filter((item) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
                    .slice(-12)
                : [];

            let finalReply: string;

            // ── Route through Archestra A2A if agent is linked ──
            const agentId = (portfolio as any).archestra_agent_id;
            if (agentId && ArchestraAgentService.isA2AEnabled()) {
                try {
                    const a2aResponse = await ArchestraAgentService.sendA2AMessage(
                        agentId,
                        message.trim(),
                        safeHistory,
                        portfolio.ai_manager_name || 'AI Manager'
                    );
                    finalReply = a2aResponse.text;
                } catch (a2aErr: any) {
                    console.error('A2A chat failed, falling back to direct Gemini:', a2aErr.message);
                    finalReply = await PortfolioController.directGeminiChat(portfolio, message, safeHistory);
                }
            } else {
                // ── Fallback: direct Gemini call (no Archestra agent linked) ──
                finalReply = await PortfolioController.directGeminiChat(portfolio, message, safeHistory);
            }

            // Track conversations for analytics (fire-and-forget)
            const visitorIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
            AnalyticsService.recordChatMessage(portfolio.id, visitorIp, 'visitor', message.trim()).catch(() => { });
            AnalyticsService.recordChatMessage(portfolio.id, visitorIp, 'ai', finalReply).catch(() => { });

            res.json({
                reply: finalReply,
                aiManager: {
                    name: portfolio.ai_manager_name,
                    personality: portfolio.ai_manager_personality || 'professional'
                }
            });
        } catch (error) {
            console.error('Public AI manager chat error:', error);
            res.status(500).json({ error: 'Failed to chat with AI manager' });
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
