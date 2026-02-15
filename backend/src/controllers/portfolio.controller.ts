import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authenticate';
import PortfolioService from '../services/portfolio.service.new';
import PortfolioChatService from '../services/portfolio-chat.service';
import { generateWithFallback } from '../services/gemini.service';
import ArchestraAgentService from '../services/archestra-agent.service';
import AnalyticsService from '../services/analytics.service';
import AICapabilityService from '../services/ai-capability.service';
import { AICapabilityKey, AI_CAPABILITY_KEYS, isAICapabilityKey } from '../constants/ai-capabilities';
import pool from '../config/database';

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

    private static normalizeCapabilityPayload(raw: any): Array<{
        capability_key: AICapabilityKey;
        enabled: boolean;
        settings_json?: Record<string, any>;
    }> {
        if (!raw) return [];

        if (Array.isArray(raw)) {
            return raw
                .filter((item) => item && isAICapabilityKey(item.capability_key || item.capabilityKey))
                .map((item) => ({
                    capability_key: (item.capability_key || item.capabilityKey) as AICapabilityKey,
                    enabled: Boolean(item.enabled),
                    settings_json: item.settings_json || item.settings || {},
                }));
        }

        if (typeof raw === 'object') {
            return Object.entries(raw as Record<string, unknown>)
                .filter(([key]) => isAICapabilityKey(key))
                .map(([key, value]) => {
                    let enabled = Boolean(value);
                    let settingsJson: Record<string, any> = {};

                    if (value && typeof value === 'object') {
                        const obj = value as Record<string, unknown>;
                        if (typeof obj.enabled === 'boolean') {
                            enabled = obj.enabled;
                        }

                        const nestedSettings = obj.settings_json ?? obj.settings;
                        if (nestedSettings && typeof nestedSettings === 'object') {
                            settingsJson = nestedSettings as Record<string, any>;
                        }
                    }

                    return {
                        capability_key: key as AICapabilityKey,
                        enabled,
                        settings_json: settingsJson,
                    };
                });
        }

        return [];
    }

    /**
     * Direct Gemini chat fallback (when A2A agent is not available)
     */
    private static async directGeminiChat(
        portfolio: any,
        message: string,
        safeHistory: PublicChatMessage[],
        analyticsContext?: string
    ): Promise<string> {
        const conversation = safeHistory
            .map((item) => `${item.role === 'user' ? 'Visitor' : portfolio.ai_manager_name}: ${item.content}`)
            .join('\n');

        const context = PortfolioController.buildPortfolioContext(portfolio);
        const customInstructions = (portfolio as any).ai_manager_custom_instructions?.trim();
        const capabilityPolicy = PortfolioController.buildCapabilityPolicy(portfolio);

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

Capability Policy:
${capabilityPolicy}

Owner Custom Instructions:
${customInstructions || 'None'}

Private Analytics Context (for response quality; share only when relevant):
${analyticsContext || 'No analytics context available.'}

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

    private static buildCapabilityPolicy(portfolio: any): string {
        const raw = portfolio?.wizard_data?.aiCapabilities || {};
        const enabled = AI_CAPABILITY_KEYS.filter((key) => Boolean(raw?.[key]?.enabled));
        if (enabled.length === 0) {
            return 'No structured capability tools are enabled. Keep chat helpful and informational.';
        }

        const lines: string[] = [
            `Enabled capabilities: ${enabled.join(', ')}`,
            '- Ask for missing details once and keep requirements minimal.',
            '- One contact method (email or phone) is enough when needed.',
            '- If visitor declines contact details, continue helping without pressure.',
            '- Acknowledge support/unknown FAQ escalations clearly.',
            '- Never mention internal tools or whether tools are enabled/disabled.',
            '- Infer intent from natural language semantics, not only explicit keywords.',
            '- Capture and escalation are handled automatically by backend systems.',
            '- Summarize what was captured in plain language when intent is actionable.',
            '- Ask one concise follow-up if required details are missing.',
            '- Do not claim external actions are complete when they are not.',
        ];

        const appointmentSettings = raw?.appointment_requests?.settings;
        if (appointmentSettings) {
            lines.push(`Appointment schedule settings: ${JSON.stringify(appointmentSettings)}`);
        }

        return lines.join('\n');
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
            const conversationContext = safeHistory
                .filter((item) => item.role === 'user')
                .map((item) => `visitor: ${item.content}`)
                .join('\n')
                .slice(-2500);

            let finalReply: string;
            let analyticsContext = '';
            try {
                analyticsContext = await AnalyticsService.getAgentChatContext(portfolio.id);
            } catch {
                // Non-blocking: chat continues even if analytics context fails.
            }

            // ── Route through Archestra A2A if agent is linked ──
            const agentId = (portfolio as any).archestra_agent_id;
            if (agentId && ArchestraAgentService.isA2AEnabled() && ArchestraAgentService.isAgentA2ACompatible(agentId)) {
                try {
                    const a2aResponse = await ArchestraAgentService.sendA2AMessage(
                        agentId,
                        message.trim(),
                        safeHistory,
                        portfolio.ai_manager_name || 'AI Manager',
                        analyticsContext
                    );
                    finalReply = a2aResponse.text;
                } catch (a2aErr: any) {
                    console.error('A2A chat failed, falling back to direct Gemini:', a2aErr.message);
                    finalReply = await PortfolioController.directGeminiChat(
                        portfolio,
                        message,
                        safeHistory,
                        analyticsContext
                    );
                }
            } else {
                // ── Fallback: direct Gemini call (no Archestra agent linked) ──
                finalReply = await PortfolioController.directGeminiChat(
                    portfolio,
                    message,
                    safeHistory,
                    analyticsContext
                );
            }

            // Track conversations for analytics (fire-and-forget)
            const visitorIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
            const sessionPromise = AnalyticsService.recordChatMessage(portfolio.id, visitorIp, 'visitor', message.trim());
            AnalyticsService.recordChatMessage(portfolio.id, visitorIp, 'ai', finalReply).catch(() => { });

            sessionPromise
                .then((sessionId) => AICapabilityService.captureFromConversation({
                    portfolioId: portfolio.id,
                    visitorMessage: message.trim(),
                    aiReply: finalReply,
                    sessionId,
                    conversationContext,
                }))
                .catch(() => { });

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

    static async getAICapabilities(req: Request, res: Response) {
        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.userId;
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });

            const portfolioId = req.params.id as string;
            const owned = await AICapabilityService.getPortfolioOwnedBy(portfolioId, userId);
            if (!owned) return res.status(404).json({ error: 'Portfolio not found' });

            const capabilities = await AICapabilityService.getCapabilities(portfolioId);
            return res.json({ portfolioId, capabilities });
        } catch (error) {
            console.error('Get AI capabilities error:', error);
            return res.status(500).json({ error: 'Failed to get AI capabilities' });
        }
    }

    static async upsertAICapabilities(req: Request, res: Response) {
        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.userId;
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });

            const portfolioId = req.params.id as string;
            const owned = await AICapabilityService.getPortfolioOwnedBy(portfolioId, userId);
            if (!owned) return res.status(404).json({ error: 'Portfolio not found' });

            const incoming = PortfolioController.normalizeCapabilityPayload(
                req.body?.capabilities ?? req.body
            );

            const capabilities = await AICapabilityService.upsertCapabilities(portfolioId, incoming);
            const capabilityMap = capabilities.reduce((acc, item) => {
                acc[item.capability_key] = {
                    enabled: item.enabled,
                    settings: item.settings_json || {},
                };
                return acc;
            }, {} as Record<string, any>);

            await pool.query(
                `UPDATE portfolios
                 SET wizard_data = jsonb_set(COALESCE(wizard_data, '{}'::jsonb), '{aiCapabilities}', $1::jsonb, true),
                     updated_at = NOW()
                 WHERE id = $2`,
                [JSON.stringify(capabilityMap), portfolioId]
            );

            const portfolio = await PortfolioService.getById(portfolioId, userId);
            if (portfolio?.status === 'published' && portfolio.archestra_agent_id && ArchestraAgentService.isA2AEnabled()) {
                ArchestraAgentService.updateAgent(portfolio.archestra_agent_id, portfolio).catch(() => { });
            }

            return res.json({ portfolioId, capabilities });
        } catch (error) {
            console.error('Upsert AI capabilities error:', error);
            return res.status(500).json({ error: 'Failed to update AI capabilities' });
        }
    }

    static async listAICapabilityRecords(req: Request, res: Response) {
        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.userId;
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });

            const portfolioId = req.params.id as string;
            const capability = req.params.capability as string;
            if (!isAICapabilityKey(capability)) {
                return res.status(400).json({ error: `Invalid capability. Allowed: ${AI_CAPABILITY_KEYS.join(', ')}` });
            }

            const owned = await AICapabilityService.getPortfolioOwnedBy(portfolioId, userId);
            if (!owned) return res.status(404).json({ error: 'Portfolio not found' });

            const limit = Number(req.query.limit || 100);
            const records = await AICapabilityService.listRecords(portfolioId, capability, limit);
            return res.json({ portfolioId, capability, records });
        } catch (error) {
            console.error('List AI capability records error:', error);
            return res.status(500).json({ error: 'Failed to list capability records' });
        }
    }

    static async updateAICapabilityRecordStatus(req: Request, res: Response) {
        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.userId;
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });

            const portfolioId = req.params.id as string;
            const capability = req.params.capability as string;
            const recordId = req.params.recordId as string;
            if (!isAICapabilityKey(capability)) {
                return res.status(400).json({ error: `Invalid capability. Allowed: ${AI_CAPABILITY_KEYS.join(', ')}` });
            }

            const owned = await AICapabilityService.getPortfolioOwnedBy(portfolioId, userId);
            if (!owned) return res.status(404).json({ error: 'Portfolio not found' });

            const status = String(req.body?.status || '').trim();
            const notes = req.body?.notes ? String(req.body.notes) : undefined;
            if (!status) return res.status(400).json({ error: 'status is required' });

            const updated = await AICapabilityService.updateRecordStatus(portfolioId, capability, recordId, status, notes);
            if (!updated) return res.status(404).json({ error: 'Record not found' });

            return res.json({ portfolioId, capability, record: updated });
        } catch (error) {
            console.error('Update AI capability status error:', error);
            return res.status(500).json({ error: 'Failed to update record status' });
        }
    }

    static async getAIToolEvents(req: Request, res: Response) {
        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.userId;
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });

            const portfolioId = req.params.id as string;
            const owned = await AICapabilityService.getPortfolioOwnedBy(portfolioId, userId);
            if (!owned) return res.status(404).json({ error: 'Portfolio not found' });

            const statusQuery = String(req.query.status || '').trim().toLowerCase();
            const status = (statusQuery === 'success' || statusQuery === 'error')
                ? (statusQuery as 'success' | 'error')
                : undefined;
            const capabilityQuery = String(req.query.capability || '').trim();
            const capability = isAICapabilityKey(capabilityQuery) ? capabilityQuery : undefined;
            const limit = Number(req.query.limit || 100);
            const events = await AICapabilityService.listToolEvents(portfolioId, limit, status, capability);
            return res.json({ portfolioId, events });
        } catch (error) {
            console.error('Get AI tool events error:', error);
            return res.status(500).json({ error: 'Failed to get tool events' });
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
