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
const portfolio_service_new_1 = __importDefault(require("../services/portfolio.service.new"));
const portfolio_chat_service_1 = __importDefault(require("../services/portfolio-chat.service"));
const gemini_service_1 = require("../services/gemini.service");
const archestra_agent_service_1 = __importDefault(require("../services/archestra-agent.service"));
const analytics_service_1 = __importDefault(require("../services/analytics.service"));
const ai_capability_service_1 = __importDefault(require("../services/ai-capability.service"));
const ai_capabilities_1 = require("../constants/ai-capabilities");
const database_1 = __importDefault(require("../config/database"));
class PortfolioController {
    static normalizeSegment(value) {
        return value
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
    static normalizeCapabilityPayload(raw) {
        if (!raw)
            return [];
        if (Array.isArray(raw)) {
            return raw
                .filter((item) => item && (0, ai_capabilities_1.isAICapabilityKey)(item.capability_key || item.capabilityKey))
                .map((item) => ({
                capability_key: (item.capability_key || item.capabilityKey),
                enabled: Boolean(item.enabled),
                settings_json: item.settings_json || item.settings || {},
            }));
        }
        if (typeof raw === 'object') {
            return Object.entries(raw)
                .filter(([key]) => (0, ai_capabilities_1.isAICapabilityKey)(key))
                .map(([key, value]) => {
                var _a;
                let enabled = Boolean(value);
                let settingsJson = {};
                if (value && typeof value === 'object') {
                    const obj = value;
                    if (typeof obj.enabled === 'boolean') {
                        enabled = obj.enabled;
                    }
                    const nestedSettings = (_a = obj.settings_json) !== null && _a !== void 0 ? _a : obj.settings;
                    if (nestedSettings && typeof nestedSettings === 'object') {
                        settingsJson = nestedSettings;
                    }
                }
                return {
                    capability_key: key,
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
    static async directGeminiChat(portfolio, message, safeHistory, analyticsContext) {
        var _a, _b;
        const conversation = safeHistory
            .map((item) => `${item.role === 'user' ? 'Visitor' : portfolio.ai_manager_name}: ${item.content}`)
            .join('\n');
        const context = PortfolioController.buildPortfolioContext(portfolio);
        const customInstructions = (_a = portfolio.ai_manager_custom_instructions) === null || _a === void 0 ? void 0 : _a.trim();
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
        let parsedReply = null;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const maxTokens = 700 + (attempt - 1) * 200;
                const text = await (0, gemini_service_1.generateWithFallback)({ temperature: 0.5, maxOutputTokens: maxTokens, responseMimeType: 'application/json' }, prompt);
                const parsed = PortfolioController.extractJsonFromAi(text);
                const candidate = typeof (parsed === null || parsed === void 0 ? void 0 : parsed.reply) === 'string'
                    ? parsed.reply
                    : (typeof (parsed === null || parsed === void 0 ? void 0 : parsed.message) === 'string' ? parsed.message : '');
                if (candidate && candidate.trim()) {
                    parsedReply = candidate.trim();
                    break;
                }
                throw new Error('Failed to parse JSON from AI response: missing reply field');
            }
            catch (error) {
                const isJsonError = (_b = error === null || error === void 0 ? void 0 : error.message) === null || _b === void 0 ? void 0 : _b.includes('Failed to parse JSON');
                if (isJsonError && attempt < maxAttempts) {
                    continue;
                }
                throw error;
            }
        }
        return parsedReply || `Hi, I'm ${portfolio.ai_manager_name}. I can help with portfolio questions.`;
    }
    static buildCapabilityPolicy(portfolio) {
        var _a, _b;
        const raw = ((_a = portfolio === null || portfolio === void 0 ? void 0 : portfolio.wizard_data) === null || _a === void 0 ? void 0 : _a.aiCapabilities) || {};
        const enabled = ai_capabilities_1.AI_CAPABILITY_KEYS.filter((key) => { var _a; return Boolean((_a = raw === null || raw === void 0 ? void 0 : raw[key]) === null || _a === void 0 ? void 0 : _a.enabled); });
        if (enabled.length === 0) {
            return 'No structured capability tools are enabled. Keep chat helpful and informational.';
        }
        const lines = [
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
        const appointmentSettings = (_b = raw === null || raw === void 0 ? void 0 : raw.appointment_requests) === null || _b === void 0 ? void 0 : _b.settings;
        if (appointmentSettings) {
            lines.push(`Appointment schedule settings: ${JSON.stringify(appointmentSettings)}`);
        }
        return lines.join('\n');
    }
    static buildPortfolioContext(portfolio) {
        const lines = [];
        const wizardData = (portfolio === null || portfolio === void 0 ? void 0 : portfolio.wizard_data) || {};
        lines.push(`Portfolio Name: ${wizardData.name || portfolio.name || 'Untitled'}`);
        if (wizardData.profession || portfolio.profession) {
            lines.push(`Profession/Industry: ${wizardData.profession || portfolio.profession}`);
        }
        if (wizardData.description || portfolio.description) {
            lines.push(`Description: ${wizardData.description || portfolio.description}`);
        }
        const sections = Array.isArray(portfolio === null || portfolio === void 0 ? void 0 : portfolio.sections) ? portfolio.sections : [];
        sections
            .filter((s) => (s === null || s === void 0 ? void 0 : s.content) && Object.keys(s.content).length > 0)
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .forEach((section, idx) => {
            lines.push(`Section ${idx + 1} (${section.type} - ${section.title}): ${JSON.stringify(section.content)}`);
        });
        return lines.join('\n');
    }
    static extractJsonFromAi(text) {
        try {
            return JSON.parse(text);
        }
        catch (_a) {
            // Continue to fallback parsing
        }
        const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
            try {
                return JSON.parse(codeBlockMatch[1].trim());
            }
            catch (_b) {
                // Continue to fallback parsing
            }
        }
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            }
            catch (_c) {
                const fixedJson = this.attemptJsonFix(jsonMatch[0]);
                if (fixedJson) {
                    try {
                        return JSON.parse(fixedJson);
                    }
                    catch (_d) {
                        // Continue to error
                    }
                }
            }
        }
        throw new Error(`Failed to parse JSON from AI response: ${text.substring(0, 120)}...`);
    }
    static attemptJsonFix(json) {
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
                    if (char === '{')
                        braceCount++;
                    if (char === '}')
                        braceCount--;
                    if (char === '[')
                        bracketCount++;
                    if (char === ']')
                        bracketCount--;
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
        }
        catch (_a) {
            return null;
        }
    }
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
            const portfolios = await portfolio_service_new_1.default.getByUserId(authReq.user.userId);
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
            const { name, portfolio_type } = req.body;
            const portfolio = await portfolio_service_new_1.default.createDraft(authReq.user.userId, {
                name: name || 'Untitled Portfolio',
                portfolio_type: portfolio_type || 'individual'
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
            const portfolio = await portfolio_service_new_1.default.getById(id, authReq.user.userId);
            if (!portfolio) {
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
     * Get all unfinished/draft portfolios for the current user
     */
    static async getUnfinishedPortfolios(req, res) {
        var _a;
        try {
            const authReq = req;
            if (!((_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId)) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const drafts = await portfolio_chat_service_1.default.getUnfinished(authReq.user.userId);
            const count = await portfolio_chat_service_1.default.getUnfinishedCount(authReq.user.userId);
            res.json({
                portfolios: drafts,
                count,
                limit: 5
            });
        }
        catch (error) {
            console.error('Get unfinished portfolios error:', error);
            res.status(500).json({ error: 'Failed to get unfinished portfolios' });
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
            const portfolio = await portfolio_service_new_1.default.getById(id, authReq.user.userId);
            if (!portfolio) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }
            // For now, just return the portfolio as updates are done through wizard
            res.json(portfolio);
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
            await portfolio_service_new_1.default.delete(id, authReq.user.userId);
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
            const available = await portfolio_service_new_1.default.isSlugAvailable(slug);
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
            const slug = portfolio_service_new_1.default.generateSlugSuggestion(baseName);
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
            // Check slug availability
            const available = await portfolio_service_new_1.default.isSlugAvailable(slug, id);
            if (!available) {
                return res.status(400).json({ error: 'Slug is already taken' });
            }
            const published = await portfolio_service_new_1.default.publish(id, authReq.user.userId, slug, false);
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
            const portfolio = await portfolio_service_new_1.default.getBySlug(slug);
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
    /**
     * Get public AI manager metadata by slug and manager name
     */
    static async getPublicAiManager(req, res) {
        try {
            const slug = req.params.slug;
            const aiManagerName = req.params.aiManagerName;
            const portfolio = await portfolio_service_new_1.default.getBySlug(slug);
            if (!portfolio) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }
            const routeName = PortfolioController.normalizeSegment(aiManagerName);
            const storedName = PortfolioController.normalizeSegment(portfolio.ai_manager_name || '');
            const isValidManager = portfolio.has_ai_manager &&
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
                    color_scheme: portfolio.color_scheme,
                    wizard_data: portfolio.wizard_data || {}
                },
                aiManager: {
                    name: portfolio.ai_manager_name,
                    personality: portfolio.ai_manager_personality || 'professional'
                },
                greeting: `Hi, I'm ${portfolio.ai_manager_name}. I'm the AI manager for ${portfolio.name}. Ask me anything about this portfolio.`
            });
        }
        catch (error) {
            console.error('Get public AI manager error:', error);
            res.status(500).json({ error: 'Failed to load AI manager' });
        }
    }
    /**
     * Chat with public AI manager
     */
    static async chatWithPublicAiManager(req, res) {
        var _a, _b, _c;
        try {
            const slug = req.params.slug;
            const aiManagerName = req.params.aiManagerName;
            const { message, history = [] } = req.body;
            if (!message || !message.trim()) {
                return res.status(400).json({ error: 'message is required' });
            }
            const portfolio = await portfolio_service_new_1.default.getBySlug(slug);
            if (!portfolio) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }
            const routeName = PortfolioController.normalizeSegment(aiManagerName);
            const storedName = PortfolioController.normalizeSegment(portfolio.ai_manager_name || '');
            const isValidManager = portfolio.has_ai_manager &&
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
            let finalReply;
            let analyticsContext = '';
            try {
                analyticsContext = await analytics_service_1.default.getAgentChatContext(portfolio.id);
            }
            catch (_d) {
                // Non-blocking: chat continues even if analytics context fails.
            }
            // ── Route through Archestra A2A if agent is linked ──
            const agentId = portfolio.archestra_agent_id;
            if (agentId && archestra_agent_service_1.default.isA2AEnabled() && archestra_agent_service_1.default.isAgentA2ACompatible(agentId)) {
                try {
                    const a2aResponse = await archestra_agent_service_1.default.sendA2AMessage(agentId, message.trim(), safeHistory, portfolio.ai_manager_name || 'AI Manager', analyticsContext);
                    finalReply = a2aResponse.text;
                }
                catch (a2aErr) {
                    console.error('A2A chat failed, falling back to direct Gemini:', a2aErr.message);
                    finalReply = await PortfolioController.directGeminiChat(portfolio, message, safeHistory, analyticsContext);
                }
            }
            else {
                // ── Fallback: direct Gemini call (no Archestra agent linked) ──
                finalReply = await PortfolioController.directGeminiChat(portfolio, message, safeHistory, analyticsContext);
            }
            // Track conversations for analytics (fire-and-forget)
            const visitorIp = ((_b = (_a = req.headers['x-forwarded-for']) === null || _a === void 0 ? void 0 : _a.split(',')[0]) === null || _b === void 0 ? void 0 : _b.trim()) || ((_c = req.socket) === null || _c === void 0 ? void 0 : _c.remoteAddress) || 'unknown';
            const sessionPromise = analytics_service_1.default.recordChatMessage(portfolio.id, visitorIp, 'visitor', message.trim());
            analytics_service_1.default.recordChatMessage(portfolio.id, visitorIp, 'ai', finalReply).catch(() => { });
            sessionPromise
                .then((sessionId) => ai_capability_service_1.default.captureFromConversation({
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
        }
        catch (error) {
            console.error('Public AI manager chat error:', error);
            res.status(500).json({ error: 'Failed to chat with AI manager' });
        }
    }
    static async getAICapabilities(req, res) {
        var _a;
        try {
            const authReq = req;
            const userId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId)
                return res.status(401).json({ error: 'Unauthorized' });
            const portfolioId = req.params.id;
            const owned = await ai_capability_service_1.default.getPortfolioOwnedBy(portfolioId, userId);
            if (!owned)
                return res.status(404).json({ error: 'Portfolio not found' });
            const capabilities = await ai_capability_service_1.default.getCapabilities(portfolioId);
            return res.json({ portfolioId, capabilities });
        }
        catch (error) {
            console.error('Get AI capabilities error:', error);
            return res.status(500).json({ error: 'Failed to get AI capabilities' });
        }
    }
    static async upsertAICapabilities(req, res) {
        var _a, _b, _c;
        try {
            const authReq = req;
            const userId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId)
                return res.status(401).json({ error: 'Unauthorized' });
            const portfolioId = req.params.id;
            const owned = await ai_capability_service_1.default.getPortfolioOwnedBy(portfolioId, userId);
            if (!owned)
                return res.status(404).json({ error: 'Portfolio not found' });
            const incoming = PortfolioController.normalizeCapabilityPayload((_c = (_b = req.body) === null || _b === void 0 ? void 0 : _b.capabilities) !== null && _c !== void 0 ? _c : req.body);
            const capabilities = await ai_capability_service_1.default.upsertCapabilities(portfolioId, incoming);
            const capabilityMap = capabilities.reduce((acc, item) => {
                acc[item.capability_key] = {
                    enabled: item.enabled,
                    settings: item.settings_json || {},
                };
                return acc;
            }, {});
            await database_1.default.query(`UPDATE portfolios
                 SET wizard_data = jsonb_set(COALESCE(wizard_data, '{}'::jsonb), '{aiCapabilities}', $1::jsonb, true),
                     updated_at = NOW()
                 WHERE id = $2`, [JSON.stringify(capabilityMap), portfolioId]);
            const portfolio = await portfolio_service_new_1.default.getById(portfolioId, userId);
            if ((portfolio === null || portfolio === void 0 ? void 0 : portfolio.status) === 'published' && portfolio.archestra_agent_id && archestra_agent_service_1.default.isA2AEnabled()) {
                archestra_agent_service_1.default.updateAgent(portfolio.archestra_agent_id, portfolio).catch(() => { });
            }
            return res.json({ portfolioId, capabilities });
        }
        catch (error) {
            console.error('Upsert AI capabilities error:', error);
            return res.status(500).json({ error: 'Failed to update AI capabilities' });
        }
    }
    static async listAICapabilityRecords(req, res) {
        var _a;
        try {
            const authReq = req;
            const userId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId)
                return res.status(401).json({ error: 'Unauthorized' });
            const portfolioId = req.params.id;
            const capability = req.params.capability;
            if (!(0, ai_capabilities_1.isAICapabilityKey)(capability)) {
                return res.status(400).json({ error: `Invalid capability. Allowed: ${ai_capabilities_1.AI_CAPABILITY_KEYS.join(', ')}` });
            }
            const owned = await ai_capability_service_1.default.getPortfolioOwnedBy(portfolioId, userId);
            if (!owned)
                return res.status(404).json({ error: 'Portfolio not found' });
            const limit = Number(req.query.limit || 100);
            const records = await ai_capability_service_1.default.listRecords(portfolioId, capability, limit);
            return res.json({ portfolioId, capability, records });
        }
        catch (error) {
            console.error('List AI capability records error:', error);
            return res.status(500).json({ error: 'Failed to list capability records' });
        }
    }
    static async updateAICapabilityRecordStatus(req, res) {
        var _a, _b, _c;
        try {
            const authReq = req;
            const userId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId)
                return res.status(401).json({ error: 'Unauthorized' });
            const portfolioId = req.params.id;
            const capability = req.params.capability;
            const recordId = req.params.recordId;
            if (!(0, ai_capabilities_1.isAICapabilityKey)(capability)) {
                return res.status(400).json({ error: `Invalid capability. Allowed: ${ai_capabilities_1.AI_CAPABILITY_KEYS.join(', ')}` });
            }
            const owned = await ai_capability_service_1.default.getPortfolioOwnedBy(portfolioId, userId);
            if (!owned)
                return res.status(404).json({ error: 'Portfolio not found' });
            const status = String(((_b = req.body) === null || _b === void 0 ? void 0 : _b.status) || '').trim();
            const notes = ((_c = req.body) === null || _c === void 0 ? void 0 : _c.notes) ? String(req.body.notes) : undefined;
            if (!status)
                return res.status(400).json({ error: 'status is required' });
            const updated = await ai_capability_service_1.default.updateRecordStatus(portfolioId, capability, recordId, status, notes);
            if (!updated)
                return res.status(404).json({ error: 'Record not found' });
            return res.json({ portfolioId, capability, record: updated });
        }
        catch (error) {
            console.error('Update AI capability status error:', error);
            return res.status(500).json({ error: 'Failed to update record status' });
        }
    }
    static async getAIToolEvents(req, res) {
        var _a;
        try {
            const authReq = req;
            const userId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId)
                return res.status(401).json({ error: 'Unauthorized' });
            const portfolioId = req.params.id;
            const owned = await ai_capability_service_1.default.getPortfolioOwnedBy(portfolioId, userId);
            if (!owned)
                return res.status(404).json({ error: 'Portfolio not found' });
            const statusQuery = String(req.query.status || '').trim().toLowerCase();
            const status = (statusQuery === 'success' || statusQuery === 'error')
                ? statusQuery
                : undefined;
            const capabilityQuery = String(req.query.capability || '').trim();
            const capability = (0, ai_capabilities_1.isAICapabilityKey)(capabilityQuery) ? capabilityQuery : undefined;
            const limit = Number(req.query.limit || 100);
            const events = await ai_capability_service_1.default.listToolEvents(portfolioId, limit, status, capability);
            return res.json({ portfolioId, events });
        }
        catch (error) {
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
    static async getPortfolio(req, res) {
        var _a;
        try {
            const authReq = req;
            if (!((_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId)) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            // Legacy - get first portfolio or create one
            const portfolios = await portfolio_service_new_1.default.getByUserId(authReq.user.userId);
            if (portfolios.length > 0) {
                res.json(portfolios[0]);
            }
            else {
                const newPortfolio = await portfolio_service_new_1.default.createDraft(authReq.user.userId, {
                    portfolio_type: 'individual',
                    name: 'My Portfolio'
                });
                res.json(newPortfolio);
            }
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
            // Legacy - get first portfolio
            const portfolios = await portfolio_service_new_1.default.getByUserId(authReq.user.userId);
            if (portfolios.length === 0) {
                return res.status(404).json({ error: 'No portfolio found' });
            }
            // Just return the portfolio, updates handled by wizard
            res.json(portfolios[0]);
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
            // Legacy - publish first draft portfolio
            const portfolios = await portfolio_service_new_1.default.getByUserId(authReq.user.userId);
            const draft = portfolios.find(p => p.status === 'draft');
            if (!draft) {
                return res.status(404).json({ error: 'No draft portfolio found' });
            }
            const slug = authReq.user.username || `user-${authReq.user.userId}`;
            const published = await portfolio_service_new_1.default.publish(draft.id, authReq.user.userId, slug, false);
            res.json(published);
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
            const portfolios = await portfolio_service_new_1.default.getByUserId(userResult.rows[0].id);
            const published = portfolios.find(p => p.status === 'published');
            if (!published) {
                return res.status(404).json({ error: 'Portfolio not found or not published' });
            }
            res.json(published);
        }
        catch (error) {
            console.error('Get public portfolio error:', error);
            res.status(500).json({ error: 'Failed to get portfolio' });
        }
    }
}
exports.default = PortfolioController;
