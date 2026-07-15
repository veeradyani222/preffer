"use strict";
/**
 * Wizard Controller (v2)
 * Handles the portfolio creation wizard with conversational AI
 * Now with approval flow and verbose logging
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WizardController = void 0;
const portfolio_service_new_1 = __importDefault(require("../services/portfolio.service.new"));
const ai_service_1 = __importDefault(require("../services/ai.service"));
const credits_service_1 = __importDefault(require("../services/credits.service"));
const portfolio_chat_service_1 = __importDefault(require("../services/portfolio-chat.service"));
const logger_1 = __importDefault(require("../utils/logger"));
const ai_capability_service_1 = __importDefault(require("../services/ai-capability.service"));
const ai_capabilities_1 = require("../constants/ai-capabilities");
const interfaze_service_1 = __importDefault(require("../services/interfaze.service"));
const document_context_service_1 = require("../services/document-context.service");
// In-memory store for pending content (in production, use Redis)
const pendingContentStore = new Map();
// ============================================
// WIZARD CONTROLLER
// ============================================
class WizardController {
    static buildStoredDocument(fileName, mimeType, sizeBytes, extractedText, previewText) {
        return {
            id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            fileName,
            mimeType,
            sizeBytes,
            extractedText: extractedText.slice(0, 20000),
            previewText,
            relevantSections: (0, document_context_service_1.inferRelevantSectionsFromText)(extractedText),
            createdAt: new Date().toISOString(),
        };
    }
    static normalizeExternalWebLink(value, options) {
        const raw = typeof value === 'string' ? value.trim() : '';
        if (!raw)
            return '';
        // Prevent internal/relative route links.
        if (raw.startsWith('/'))
            return '';
        if (/\s/.test(raw))
            return '';
        const disallowedHosts = new Set(['preffer.me', 'www.preffer.me', 'prefer.me', 'www.prefer.me']);
        const blockPreferProjectsPath = Boolean(options === null || options === void 0 ? void 0 : options.blockPreferProjectsPath);
        const isDisallowedProjectPath = (url) => {
            if (!blockPreferProjectsPath)
                return false;
            const host = url.hostname.toLowerCase();
            const path = (url.pathname || '').toLowerCase();
            return disallowedHosts.has(host) && path.startsWith('/projects');
        };
        try {
            const parsed = new URL(raw);
            if (!['http:', 'https:'].includes(parsed.protocol))
                return '';
            if (isDisallowedProjectPath(parsed))
                return '';
            return parsed.toString();
        }
        catch (_a) {
            // If no protocol, treat as external host/path and force https.
            try {
                const parsed = new URL(`https://${raw}`);
                if (isDisallowedProjectPath(parsed))
                    return '';
                return parsed.toString();
            }
            catch (_b) {
                return '';
            }
        }
    }
    static sanitizeProjectsContent(content) {
        if (!content || typeof content !== 'object')
            return content;
        const items = Array.isArray(content.items) ? content.items : [];
        return {
            ...content,
            items: items.map((item) => {
                if (!item || typeof item !== 'object')
                    return item;
                const candidateLink = typeof item.link === 'string'
                    ? item.link
                    : (typeof item.url === 'string' ? item.url : '');
                return {
                    ...item,
                    link: WizardController.normalizeExternalWebLink(candidateLink, { blockPreferProjectsPath: true }),
                };
            }),
        };
    }
    static sanitizeContactContent(content) {
        if (!content || typeof content !== 'object')
            return content;
        const urlFields = ['website', 'github', 'linkedin', 'twitter', 'instagram', 'dribbble', 'behance'];
        const sanitized = { ...content };
        for (const field of urlFields) {
            if (typeof sanitized[field] === 'string') {
                sanitized[field] = WizardController.normalizeExternalWebLink(sanitized[field]);
            }
        }
        if (Array.isArray(sanitized.links)) {
            sanitized.links = sanitized.links
                .map((item) => {
                if (!item || typeof item !== 'object')
                    return null;
                const candidate = item.url || item.href || item.value || item.text || '';
                const safe = WizardController.normalizeExternalWebLink(candidate);
                if (!safe)
                    return null;
                return { ...item, url: safe };
            })
                .filter(Boolean);
        }
        return sanitized;
    }
    static tryParseJsonString(value) {
        if (typeof value !== 'string')
            return value;
        const trimmed = value.trim();
        if (!trimmed.startsWith('{') && !trimmed.startsWith('[') && !trimmed.startsWith('"'))
            return value;
        try {
            const first = JSON.parse(trimmed);
            if (typeof first === 'string') {
                const inner = first.trim();
                if (inner.startsWith('{') || inner.startsWith('[')) {
                    try {
                        return JSON.parse(inner);
                    }
                    catch (_a) {
                        return first;
                    }
                }
            }
            return first;
        }
        catch (_b) {
            return value;
        }
    }
    /**
     * POST /api/wizard/start
     * Step 1: Create a new draft portfolio
     */
    static async startWizard(req, res, next) {
        var _a;
        logger_1.default.divider('WIZARD: START');
        logger_1.default.request('POST', '/wizard/start', req.body);
        try {
            const authReq = req;
            const userId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                logger_1.default.error('Unauthorized request');
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const { portfolioType, name } = req.body;
            logger_1.default.wizard(1, 'Creating portfolio', { portfolioType, name, userId });
            if (!portfolioType || !['individual', 'company'].includes(portfolioType)) {
                logger_1.default.error('Invalid portfolio type', { portfolioType });
                return res.status(400).json({ error: 'Invalid portfolio type' });
            }
            // Check credits
            const userCredits = await credits_service_1.default.getUserCredits(userId);
            logger_1.default.info('User credits check', userCredits);
            if (!userCredits.canCreatePortfolio) {
                // Check if it's unfinished limit or portfolio limit
                const unfinishedCount = await portfolio_chat_service_1.default.getUnfinishedCount(userId);
                if (unfinishedCount >= 5) {
                    logger_1.default.warn('Cannot create portfolio - 5 unfinished portfolio limit reached');
                    return res.status(403).json({
                        error: 'Unfinished portfolio limit reached',
                        message: `You have 5 unfinished portfolios. Please complete or delete one before creating a new portfolio.`,
                        unfinishedCount
                    });
                }
                const maxPortfolios = userCredits.plan === 'free' ? 3 : userCredits.plan === 'pro' ? 10 : 'unlimited';
                logger_1.default.warn('Cannot create portfolio - portfolio limit reached');
                return res.status(403).json({
                    error: 'Portfolio limit reached',
                    message: `Your ${userCredits.plan} plan allows ${maxPortfolios} portfolios. You currently have ${userCredits.portfolioCount}.`
                });
            }
            // Create draft portfolio
            const portfolio = await portfolio_service_new_1.default.createDraft(userId, {
                portfolio_type: portfolioType,
                name: name || 'Untitled Portfolio'
            });
            logger_1.default.db('INSERT', 'portfolios', { id: portfolio.id });
            logger_1.default.wizard(1, 'Portfolio created successfully', { portfolioId: portfolio.id });
            const response = {
                portfolioId: portfolio.id,
                wizardStep: portfolio.wizard_step,
                portfolio
            };
            logger_1.default.response(201, response);
            res.status(201).json(response);
        }
        catch (error) {
            logger_1.default.error('Start wizard failed', error);
            next(error);
        }
    }
    /**
     * GET /api/wizard/:id
     * Get current wizard state
     */
    static async getWizardState(req, res, next) {
        var _a, _b;
        logger_1.default.request('GET', `/wizard/${req.params.id}`);
        try {
            const authReq = req;
            const userId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const portfolioId = req.params.id;
            const portfolio = await portfolio_service_new_1.default.getById(portfolioId, userId);
            if (!portfolio) {
                logger_1.default.warn('Portfolio not found', { portfolioId, userId });
                return res.status(404).json({ error: 'Portfolio not found' });
            }
            logger_1.default.wizard(portfolio.wizard_step, 'Retrieved wizard state', {
                sections: ((_b = portfolio.sections) === null || _b === void 0 ? void 0 : _b.length) || 0,
                status: portfolio.status
            });
            const response = {
                portfolioId: portfolio.id,
                wizardStep: portfolio.wizard_step,
                wizardData: portfolio.wizard_data,
                status: portfolio.status,
                sections: portfolio.sections,
                creditsUsed: portfolio.credits_used,
                portfolio,
                themeOptions: [
                    { name: 'Modern Minimal', id: 'modern_minimal', colors: ['#1a1a1a', '#4a4a4a', '#e5e5e5', '#ffffff'] },
                    { name: 'Ocean Blue', id: 'ocean_blue', colors: ['#0f172a', '#1e3a8a', '#60a5fa', '#eff6ff'] },
                    { name: 'Forest Green', id: 'forest_green', colors: ['#052e16', '#166534', '#4ade80', '#f0fdf4'] },
                    { name: 'Luxury Gold', id: 'luxury_gold', colors: ['#271c19', '#43302b', '#d4b483', '#f9f5eb'] },
                    { name: 'Sunset Purple', id: 'sunset_purple', colors: ['#2e1065', '#581c87', '#c084fc', '#faf5ff'] },
                    { name: 'Berry Burst', id: 'berry_burst', colors: ['#15173D', '#982598', '#E491C9', '#F1E9E9'] }
                ]
            };
            logger_1.default.response(200, { portfolioId: portfolio.id, step: portfolio.wizard_step });
            res.json(response);
        }
        catch (error) {
            logger_1.default.error('Get wizard state failed', error);
            next(error);
        }
    }
    /**
     * PATCH /api/wizard/:id/step/:stepNum
     * Save submitted wizard step data and advance to the next step
     */
    static async updateWizardStep(req, res, next) {
        var _a;
        const stepNum = req.params.stepNum;
        logger_1.default.request('PATCH', `/wizard/${req.params.id}/step/${stepNum}`, req.body);
        try {
            const authReq = req;
            const userId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const portfolioId = req.params.id;
            const submittedStep = parseInt(stepNum, 10);
            const wizardData = req.body;
            if (isNaN(submittedStep) || submittedStep < 1 || submittedStep > 6) {
                logger_1.default.error('Invalid submitted step number', { submittedStep });
                return res.status(400).json({ error: 'Invalid step number (must be 1-6)' });
            }
            const nextStep = submittedStep + 1;
            logger_1.default.wizard(submittedStep, 'Saving wizard step data', {
                submittedStep,
                nextStep,
                wizardData,
            });
            const portfolio = await portfolio_service_new_1.default.updateWizard(portfolioId, userId, nextStep, wizardData);
            const rawCapabilities = wizardData === null || wizardData === void 0 ? void 0 : wizardData.aiCapabilities;
            if (rawCapabilities && typeof rawCapabilities === 'object') {
                const capabilityPayload = Object.entries(rawCapabilities)
                    .filter(([key]) => (0, ai_capabilities_1.isAICapabilityKey)(key))
                    .map(([key, value]) => ({
                    capability_key: key,
                    enabled: Boolean(value === null || value === void 0 ? void 0 : value.enabled),
                    settings_json: (value === null || value === void 0 ? void 0 : value.settings) || (value === null || value === void 0 ? void 0 : value.settings_json) || {},
                }));
                await ai_capability_service_1.default.upsertCapabilities(portfolioId, capabilityPayload);
            }
            logger_1.default.db('UPDATE', 'portfolios', { id: portfolioId, submittedStep, nextStep });
            res.json({
                portfolioId: portfolio.id,
                wizardStep: portfolio.wizard_step,
                wizardData: portfolio.wizard_data,
                portfolio
            });
        }
        catch (error) {
            logger_1.default.error('Update wizard step failed', error);
            next(error);
        }
    }
    /**
     * POST /api/wizard/:id/recommend
     * Step 3: AI recommends sections based on description
     */
    static async recommendSections(req, res, next) {
        var _a, _b, _c;
        logger_1.default.divider('AI: RECOMMEND SECTIONS');
        logger_1.default.request('POST', `/wizard/${req.params.id}/recommend`, req.body);
        try {
            const authReq = req;
            const userId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const portfolioId = req.params.id;
            const portfolio = await portfolio_service_new_1.default.getById(portfolioId, userId);
            if (!portfolio) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }
            const { description } = req.body;
            if (!description || description.trim().length === 0) {
                logger_1.default.error('Description is required');
                return res.status(400).json({ error: 'Description is required' });
            }
            logger_1.default.ai('Starting section recommendation', {
                portfolioType: portfolio.portfolio_type,
                descriptionLength: description.length
            });
            const userCredits = await credits_service_1.default.getUserCredits(userId);
            logger_1.default.info('User plan', { plan: userCredits.plan, maxSections: userCredits.maxSections });
            const documentContext = (0, document_context_service_1.buildGeneralDocumentContext)((_b = portfolio.wizard_data) === null || _b === void 0 ? void 0 : _b.documentSources, { intro: 'SUPPORTING DOCUMENT CONTEXT FOR SECTION RECOMMENDATIONS:' });
            // Get AI recommendations
            const recommendation = await ai_service_1.default.recommendSections(portfolio.portfolio_type, ((_c = portfolio.wizard_data) === null || _c === void 0 ? void 0 : _c.profession) || '', description, userCredits.plan, documentContext);
            logger_1.default.ai('Sections recommended', recommendation);
            // Update wizard data
            await portfolio_service_new_1.default.updateWizard(portfolioId, userId, 3, {
                description,
                recommendedSections: recommendation.sections
            });
            const response = {
                sections: recommendation.sections,
                reasoning: recommendation.reasoning,
                maxSections: userCredits.maxSections + 2 // +2 for mandatory hero and contact
            };
            logger_1.default.response(200, response);
            res.json(response);
        }
        catch (error) {
            logger_1.default.error('Recommend sections failed', error);
            next(error);
        }
    }
    /**
     * POST /api/wizard/:id/sections
     * Step 3/4: Save selected sections (with empty content initially)
     */
    static async saveSections(req, res, next) {
        var _a;
        logger_1.default.divider('WIZARD: SAVE SECTIONS');
        logger_1.default.request('POST', `/wizard/${req.params.id}/sections`, req.body);
        try {
            const authReq = req;
            const userId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const portfolioId = req.params.id;
            const { sections: sectionTypes } = req.body;
            if (!Array.isArray(sectionTypes) || sectionTypes.length === 0) {
                logger_1.default.error('Sections array is required');
                return res.status(400).json({ error: 'Sections array is required' });
            }
            // Ensure hero and contact are always included (mandatory sections)
            if (!sectionTypes.includes('hero') || !sectionTypes.includes('contact')) {
                logger_1.default.error('Hero and Contact sections are mandatory');
                return res.status(400).json({
                    error: 'Hero and Contact sections are required for every portfolio'
                });
            }
            logger_1.default.section('CREATE', sectionTypes.join(', '), { count: sectionTypes.length });
            // Check plan limits (maxSections is for custom sections, +2 for hero and contact)
            const userCredits = await credits_service_1.default.getUserCredits(userId);
            const maxTotalSections = userCredits.maxSections + 2; // +2 for mandatory hero and contact
            if (sectionTypes.length > maxTotalSections) {
                logger_1.default.warn('Section limit exceeded', { selected: sectionTypes.length, max: maxTotalSections });
                return res.status(403).json({
                    error: `Maximum ${userCredits.maxSections} custom sections allowed (plus Hero and Contact) for your plan`
                });
            }
            // Create section objects with empty content
            const sections = sectionTypes.map((type, index) => ({
                id: `section-${Date.now()}-${index}`,
                type,
                title: type.charAt(0).toUpperCase() + type.slice(1),
                content: {}, // Empty initially - will be filled via chat
                order: index
            }));
            logger_1.default.db('UPDATE', 'portfolios.sections', { sectionCount: sections.length });
            const portfolio = await portfolio_service_new_1.default.updateSections(portfolioId, userId, sections);
            // Update wizard data
            await portfolio_service_new_1.default.updateWizard(portfolioId, userId, 4, {
                selectedSections: sectionTypes,
                currentSectionIndex: 0
            });
            logger_1.default.wizard(4, 'Sections saved', { sections: sectionTypes });
            res.json({
                portfolioId: portfolio.id,
                sections: portfolio.sections,
                message: 'Sections saved successfully'
            });
        }
        catch (error) {
            logger_1.default.error('Save sections failed', error);
            next(error);
        }
    }
    /**
     * GET /api/wizard/:id/history/:sectionId
     * Get chat history for a specific section
     */
    static async getChatHistory(req, res, next) {
        var _a;
        logger_1.default.divider('WIZARD: GET CHAT HISTORY');
        logger_1.default.request('GET', `/wizard/${req.params.id}/history/${req.params.sectionId}`);
        try {
            const authReq = req;
            const userId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const portfolioId = req.params.id;
            const sectionId = req.params.sectionId;
            const portfolio = await portfolio_service_new_1.default.getById(portfolioId, userId);
            if (!portfolio) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }
            // Get chat history from database
            const history = await portfolio_chat_service_1.default.getChatHistory(portfolioId, userId, sectionId);
            logger_1.default.info('Chat history retrieved', { sectionId, messageCount: history.length });
            res.json({
                history,
                sectionId
            });
        }
        catch (error) {
            logger_1.default.error('Get chat history failed', error);
            next(error);
        }
    }
    /**
     * POST /api/wizard/:id/chat
     * Conversational AI for building section content
     * This is the main chat endpoint
     */
    static async chat(req, res, next) {
        var _a;
        logger_1.default.divider('AI: CHAT');
        logger_1.default.request('POST', `/wizard/${req.params.id}/chat`, req.body);
        try {
            const authReq = req;
            const userId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const portfolioId = req.params.id;
            const { sectionId, message, conversationHistory = [] } = req.body;
            if (!sectionId || !message) {
                logger_1.default.error('Missing required fields', { sectionId: !!sectionId, message: !!message });
                return res.status(400).json({ error: 'sectionId and message are required' });
            }
            const portfolio = await portfolio_service_new_1.default.getById(portfolioId, userId);
            if (!portfolio) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }
            // Find the section
            const section = portfolio.sections.find((s) => s.id === sectionId);
            if (!section) {
                logger_1.default.error('Section not found', { sectionId });
                return res.status(404).json({ error: 'Section not found' });
            }
            logger_1.default.conversation('Processing chat', {
                sectionType: section.type,
                messageLength: message.length,
                historyLength: conversationHistory.length
            });
            // Load existing chat history from DB
            const savedHistory = await portfolio_chat_service_1.default.getChatHistory(portfolioId, userId, sectionId);
            const fullHistory = savedHistory.length > 0 ? savedHistory : conversationHistory;
            // Build portfolio context
            const wizardData = portfolio.wizard_data || {};
            const context = {
                name: wizardData.name || portfolio.name,
                profession: wizardData.profession,
                description: wizardData.description,
                portfolioType: portfolio.portfolio_type,
                existingSections: portfolio.sections.reduce((acc, s) => {
                    if (s.content && Object.keys(s.content).length > 0) {
                        acc[s.type] = s.content;
                    }
                    return acc;
                }, {})
            };
            logger_1.default.info('Portfolio context', {
                name: context.name,
                profession: context.profession,
                existingSections: Object.keys(context.existingSections || {})
            });
            // Get AI response
            const aiResponse = await ai_service_1.default.chat(section.type, message, context, fullHistory);
            logger_1.default.ai('Chat response', {
                action: aiResponse.action,
                hasProposal: !!aiResponse.proposedContent,
                isComplete: aiResponse.isComplete
            });
            // Save updated chat history to database
            const updatedHistory = [
                ...fullHistory,
                { role: 'user', content: message, timestamp: new Date() },
                { role: 'ai', content: aiResponse.message, timestamp: new Date() }
            ];
            await portfolio_chat_service_1.default.saveChatHistory(portfolioId, userId, sectionId, updatedHistory);
            // If AI proposed content, store it as pending
            if (aiResponse.proposedContent) {
                const pendingKey = `${portfolioId}-${sectionId}`;
                pendingContentStore.set(pendingKey, {
                    sectionId,
                    sectionType: section.type,
                    content: aiResponse.proposedContent,
                    proposedAt: new Date()
                });
                logger_1.default.info('Content stored as pending', { key: pendingKey });
            }
            const response = {
                message: aiResponse.message,
                action: aiResponse.action,
                proposedContent: aiResponse.proposedContent,
                displayContent: aiResponse.displayContent,
                isComplete: aiResponse.isComplete,
                sectionType: section.type
            };
            logger_1.default.response(200, { action: aiResponse.action, isComplete: aiResponse.isComplete });
            res.json(response);
        }
        catch (error) {
            logger_1.default.error('Chat failed', error);
            next(error);
        }
    }
    /**
     * POST /api/wizard/:id/generate
     * Direct content generation (when user wants auto-generate)
     */
    static async generateContent(req, res, next) {
        var _a;
        logger_1.default.divider('AI: GENERATE CONTENT');
        logger_1.default.request('POST', `/wizard/${req.params.id}/generate`, req.body);
        try {
            const authReq = req;
            const userId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const portfolioId = req.params.id;
            const { sectionId, additionalInfo } = req.body;
            const portfolio = await portfolio_service_new_1.default.getById(portfolioId, userId);
            if (!portfolio) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }
            const section = portfolio.sections.find((s) => s.id === sectionId);
            if (!section) {
                return res.status(404).json({ error: 'Section not found' });
            }
            logger_1.default.ai('Generating content', { sectionType: section.type, hasAdditionalInfo: !!additionalInfo });
            // Build context
            const wizardData = portfolio.wizard_data || {};
            const documentContext = (0, document_context_service_1.buildDocumentContextForSection)(wizardData.documentSources, section.type);
            const context = {
                name: wizardData.name || portfolio.name,
                profession: wizardData.profession,
                description: wizardData.description,
                portfolioType: portfolio.portfolio_type,
                documentContext,
                existingSections: portfolio.sections.reduce((acc, s) => {
                    if (s.content && Object.keys(s.content).length > 0) {
                        acc[s.type] = s.content;
                    }
                    return acc;
                }, {})
            };
            try {
                // Generate content
                const result = await ai_service_1.default.generateSectionContent(section.type, context, additionalInfo);
                logger_1.default.ai('Content generated', { sectionType: section.type, contentKeys: Object.keys(result.content || {}) });
                // Store as pending (don't save to DB yet)
                const pendingKey = `${portfolioId}-${sectionId}`;
                pendingContentStore.set(pendingKey, {
                    sectionId,
                    sectionType: section.type,
                    content: result.content,
                    proposedAt: new Date()
                });
                // Save generation event to chat history
                const existingHistory = await portfolio_chat_service_1.default.getChatHistory(portfolioId, userId, sectionId);
                const updatedHistory = [
                    ...existingHistory,
                    { role: 'user', content: 'Auto content generation selected', timestamp: new Date() },
                    { role: 'ai', content: result.message || 'I\'ve generated content for this section. Review it below!', timestamp: new Date() }
                ];
                await portfolio_chat_service_1.default.saveChatHistory(portfolioId, userId, sectionId, updatedHistory);
                logger_1.default.info('Content stored as pending for approval', { key: pendingKey });
                const response = {
                    message: result.message,
                    proposedContent: result.content,
                    displayContent: result.displayContent,
                    action: 'proposal',
                    sectionType: section.type,
                    requiresApproval: true
                };
                logger_1.default.response(200, { sectionType: section.type, requiresApproval: true });
                res.json(response);
            }
            catch (error) {
                // Handle errors gracefully - don't refuse, just ask for more info
                logger_1.default.warn('Content generation issue', { reason: error.message });
                return res.status(200).json({
                    message: error.message || "I'd love to help! Could you tell me a bit more about what you'd like for this section?",
                    action: 'continue',
                    sectionType: section.type
                });
            }
        }
        catch (error) {
            logger_1.default.error('Generate content failed', error);
            next(error);
        }
    }
    /**
     * POST /api/wizard/:id/approve
     * Approve and save proposed content to portfolio
     */
    static async approveContent(req, res, next) {
        var _a;
        logger_1.default.divider('WIZARD: APPROVE CONTENT');
        logger_1.default.request('POST', `/wizard/${req.params.id}/approve`, req.body);
        try {
            const authReq = req;
            const userId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const portfolioId = req.params.id;
            const { sectionId, content } = req.body;
            if (!sectionId) {
                return res.status(400).json({ error: 'sectionId is required' });
            }
            const portfolio = await portfolio_service_new_1.default.getById(portfolioId, userId);
            if (!portfolio) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }
            // Find section
            const sectionIndex = portfolio.sections.findIndex((s) => s.id === sectionId);
            if (sectionIndex === -1) {
                return res.status(404).json({ error: 'Section not found' });
            }
            const section = portfolio.sections[sectionIndex];
            // Get content to save - either from request body or from pending store
            let contentToSave = content;
            if (!contentToSave) {
                const pendingKey = `${portfolioId}-${sectionId}`;
                const pending = pendingContentStore.get(pendingKey);
                if (!pending) {
                    logger_1.default.error('No pending content found', { pendingKey });
                    return res.status(400).json({ error: 'No pending content to approve. Generate content first.' });
                }
                contentToSave = pending.content;
                pendingContentStore.delete(pendingKey);
                logger_1.default.info('Using pending content', { key: pendingKey });
            }
            contentToSave = WizardController.tryParseJsonString(contentToSave);
            if (section.type === 'projects') {
                contentToSave = WizardController.sanitizeProjectsContent(contentToSave);
            }
            else if (section.type === 'contact') {
                contentToSave = WizardController.sanitizeContactContent(contentToSave);
            }
            logger_1.default.section('SAVE', section.type, { contentKeys: Object.keys(contentToSave || {}) });
            // Update section content
            const updatedSections = [...portfolio.sections];
            updatedSections[sectionIndex] = {
                ...section,
                content: contentToSave
            };
            await portfolio_service_new_1.default.updateSections(portfolioId, userId, updatedSections);
            // Save approval event to chat history
            const existingHistory = await portfolio_chat_service_1.default.getChatHistory(portfolioId, userId, sectionId);
            const updatedHistory = [
                ...existingHistory,
                { role: 'ai', content: `✅ **${section.type.charAt(0).toUpperCase() + section.type.slice(1)} section approved and saved!**`, timestamp: new Date() }
            ];
            await portfolio_chat_service_1.default.saveChatHistory(portfolioId, userId, sectionId, updatedHistory);
            logger_1.default.db('UPDATE', 'portfolios.sections', { sectionId, sectionType: section.type });
            logger_1.default.wizard(4, 'Content approved and saved', { sectionType: section.type });
            res.json({
                message: `${section.type.charAt(0).toUpperCase() + section.type.slice(1)} section saved successfully!`,
                sectionId,
                content: contentToSave,
                saved: true
            });
        }
        catch (error) {
            logger_1.default.error('Approve content failed', error);
            next(error);
        }
    }
    /**
     * POST /api/wizard/:id/improve
     * Improve existing section content with AI
     */
    static async improveContent(req, res, next) {
        var _a, _b;
        logger_1.default.divider('AI: IMPROVE CONTENT');
        logger_1.default.request('POST', `/wizard/${req.params.id}/improve`, req.body);
        try {
            const authReq = req;
            const userId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const portfolioId = req.params.id;
            const { sectionId, feedback } = req.body;
            if (!(feedback === null || feedback === void 0 ? void 0 : feedback.trim())) {
                return res.status(400).json({ error: 'Feedback is required' });
            }
            const portfolio = await portfolio_service_new_1.default.getById(portfolioId, userId);
            if (!portfolio) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }
            const sectionIndex = portfolio.sections.findIndex((s) => s.id === sectionId);
            if (sectionIndex === -1) {
                return res.status(404).json({ error: 'Section not found' });
            }
            const section = portfolio.sections[sectionIndex];
            const documentContext = (0, document_context_service_1.buildDocumentContextForSection)((_b = portfolio.wizard_data) === null || _b === void 0 ? void 0 : _b.documentSources, section.type);
            // Get current content - either from pending or from saved
            const pendingKey = `${portfolioId}-${sectionId}`;
            const pending = pendingContentStore.get(pendingKey);
            const currentContent = (pending === null || pending === void 0 ? void 0 : pending.content) || section.content;
            if (!currentContent || Object.keys(currentContent).length === 0) {
                return res.status(400).json({ error: 'No content to improve. Generate content first.' });
            }
            logger_1.default.ai('Improving content', { sectionType: section.type, feedback });
            const improved = await ai_service_1.default.improveContent(section.type, currentContent, feedback, documentContext);
            // Store improved content as pending
            pendingContentStore.set(pendingKey, {
                sectionId,
                sectionType: section.type,
                content: improved.content,
                proposedAt: new Date()
            });
            // Save improvement request to chat history
            const existingHistory = await portfolio_chat_service_1.default.getChatHistory(portfolioId, userId, sectionId);
            const updatedHistory = [
                ...existingHistory,
                { role: 'user', content: feedback, timestamp: new Date() },
                { role: 'ai', content: improved.message || 'I\'ve made the changes! Review the updated content below.', timestamp: new Date() }
            ];
            await portfolio_chat_service_1.default.saveChatHistory(portfolioId, userId, sectionId, updatedHistory);
            logger_1.default.ai('Content improved', { sectionType: section.type });
            res.json({
                message: improved.message,
                proposedContent: improved.content,
                displayContent: improved.displayContent,
                action: 'proposal',
                requiresApproval: true
            });
        }
        catch (error) {
            logger_1.default.error('Improve content failed', error);
            next(error);
        }
    }
    /**
     * POST /api/wizard/:id/documents
     * Extract and store document context for onboarding generation
     */
    static async uploadDocument(req, res, next) {
        var _a, _b, _c, _d, _e;
        logger_1.default.divider('WIZARD: DOCUMENT EXTRACTION');
        logger_1.default.request('POST', `/wizard/${req.params.id}/documents`, {
            fileName: (_a = req.body) === null || _a === void 0 ? void 0 : _a.fileName,
            mimeType: (_b = req.body) === null || _b === void 0 ? void 0 : _b.mimeType,
            hasDataUrl: Boolean((_c = req.body) === null || _c === void 0 ? void 0 : _c.dataUrl),
        });
        try {
            const authReq = req;
            const userId = (_d = authReq.user) === null || _d === void 0 ? void 0 : _d.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const portfolioId = req.params.id;
            const { fileName, mimeType, dataUrl } = req.body || {};
            if (!fileName || !mimeType || !dataUrl) {
                return res.status(400).json({ error: 'fileName, mimeType, and dataUrl are required' });
            }
            if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
                return res.status(400).json({ error: 'Only base64 data URLs are supported for document upload' });
            }
            const portfolio = await portfolio_service_new_1.default.getById(portfolioId, userId);
            if (!portfolio) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }
            const extracted = await interfaze_service_1.default.extractDocumentText({
                fileName,
                mimeType,
                fileData: dataUrl,
            });
            const currentDocs = ((_e = portfolio.wizard_data) === null || _e === void 0 ? void 0 : _e.documentSources) || [];
            const nextDoc = WizardController.buildStoredDocument(fileName, mimeType, Buffer.byteLength(dataUrl, 'utf8'), extracted.extractedText, extracted.previewText);
            const mergedDocs = [...currentDocs, nextDoc].slice(-5);
            await portfolio_service_new_1.default.updateWizard(portfolioId, userId, portfolio.wizard_step, { documentSources: mergedDocs });
            return res.status(201).json({
                document: nextDoc,
                documents: mergedDocs,
                message: 'Document extracted and saved for onboarding support.',
            });
        }
        catch (error) {
            logger_1.default.error('Document extraction failed', error);
            next(error);
        }
    }
    /**
     * POST /api/wizard/:id/scrape-linkedin
     * Scrape a LinkedIn profile URL and store as document context
     */
    static async scrapeLinkedIn(req, res, next) {
        var _a, _b, _c;
        logger_1.default.divider('WIZARD: LINKEDIN SCRAPE');
        logger_1.default.request('POST', `/wizard/${req.params.id}/scrape-linkedin`, {
            url: (_a = req.body) === null || _a === void 0 ? void 0 : _a.url,
        });
        try {
            const authReq = req;
            const userId = (_b = authReq.user) === null || _b === void 0 ? void 0 : _b.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const portfolioId = req.params.id;
            const { url } = req.body || {};
            if (!url || typeof url !== 'string') {
                return res.status(400).json({ error: 'LinkedIn URL is required' });
            }
            // Validate it's a LinkedIn profile URL
            const trimmedUrl = url.trim();
            const linkedinPattern = /^https?:\/\/(www\.)?linkedin\.com\/in\//i;
            if (!linkedinPattern.test(trimmedUrl)) {
                return res.status(400).json({ error: 'Please provide a valid LinkedIn profile URL (e.g. https://linkedin.com/in/username)' });
            }
            const portfolio = await portfolio_service_new_1.default.getById(portfolioId, userId);
            if (!portfolio) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }
            const extracted = await interfaze_service_1.default.scrapeLinkedIn(trimmedUrl);
            const currentDocs = ((_c = portfolio.wizard_data) === null || _c === void 0 ? void 0 : _c.documentSources) || [];
            const nextDoc = WizardController.buildStoredDocument('LinkedIn Profile', 'text/html', Buffer.byteLength(extracted.extractedText, 'utf8'), extracted.extractedText, extracted.previewText);
            const mergedDocs = [...currentDocs, nextDoc].slice(-5);
            await portfolio_service_new_1.default.updateWizard(portfolioId, userId, portfolio.wizard_step, { documentSources: mergedDocs });
            return res.status(201).json({
                document: nextDoc,
                documents: mergedDocs,
                message: 'LinkedIn profile scraped and saved for onboarding support.',
            });
        }
        catch (error) {
            logger_1.default.error('LinkedIn scrape failed', error);
            next(error);
        }
    }
    /**
     * POST /api/wizard/:id/profile-draft
     * Draft Step 2 profile fields from uploaded supporting docs
     */
    static async draftProfileFromDocuments(req, res, next) {
        var _a, _b;
        logger_1.default.divider('WIZARD: DOCUMENT PROFILE DRAFT');
        logger_1.default.request('POST', `/wizard/${req.params.id}/profile-draft`);
        try {
            const authReq = req;
            const userId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const portfolioId = req.params.id;
            const portfolio = await portfolio_service_new_1.default.getById(portfolioId, userId);
            if (!portfolio) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }
            const documentSources = ((_b = portfolio.wizard_data) === null || _b === void 0 ? void 0 : _b.documentSources) || [];
            if (!documentSources.length) {
                return res.status(400).json({ error: 'Upload at least one supporting document first' });
            }
            const documentContext = (0, document_context_service_1.buildGeneralDocumentContext)(documentSources, {
                intro: 'SUPPORTING DOCUMENT CONTEXT FOR BASIC PROFILE DRAFT:',
                maxDocs: 3,
                maxCharsPerDoc: 3000,
            });
            const wizardData = portfolio.wizard_data || {};
            const draft = await ai_service_1.default.draftProfileFromDocuments(portfolio.portfolio_type, wizardData.name || portfolio.name || '', wizardData.profession || '', wizardData.description || '', documentContext);
            return res.json({ draft });
        }
        catch (error) {
            logger_1.default.error('Document profile draft failed', error);
            next(error);
        }
    }
    /**
     * POST /api/wizard/:id/publish
     * Step 7: Finalize and publish the portfolio
     */
    static async publishPortfolio(req, res, next) {
        var _a;
        logger_1.default.divider('WIZARD: PUBLISH');
        logger_1.default.request('POST', `/wizard/${req.params.id}/publish`, req.body);
        try {
            const authReq = req;
            const userId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const portfolioId = req.params.id;
            const { slug, hasAiManager = false } = req.body;
            if (!(slug === null || slug === void 0 ? void 0 : slug.trim())) {
                return res.status(400).json({ error: 'Slug is required' });
            }
            if (!/^[a-z0-9-]+$/.test(slug)) {
                return res.status(400).json({
                    error: 'Slug must contain only lowercase letters, numbers, and hyphens'
                });
            }
            logger_1.default.wizard(7, 'Publishing portfolio', { slug, hasAiManager });
            // Check slug availability
            const isAvailable = await portfolio_service_new_1.default.isSlugAvailable(slug, portfolioId);
            if (!isAvailable) {
                logger_1.default.warn('Slug is taken', { slug });
                return res.status(409).json({ error: 'This URL is already taken' });
            }
            // Check credits
            const cost = credits_service_1.default.getPortfolioCost(hasAiManager);
            const hasEnough = await credits_service_1.default.hasEnoughCredits(userId, cost);
            if (!hasEnough) {
                logger_1.default.warn('Insufficient credits', { required: cost });
                return res.status(403).json({ error: 'Insufficient credits', required: cost });
            }
            // Publish
            const portfolio = await portfolio_service_new_1.default.publish(portfolioId, userId, slug, hasAiManager);
            logger_1.default.db('UPDATE', 'portfolios', { id: portfolioId, status: 'published', slug });
            logger_1.default.wizard(7, 'Portfolio published!', { url: `/${slug}` });
            const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
            res.json({
                portfolioId: portfolio.id,
                slug: portfolio.slug,
                status: portfolio.status,
                creditsUsed: portfolio.credits_used,
                url: `${frontendUrl}/${slug}`,
                message: 'Portfolio published successfully!'
            });
        }
        catch (error) {
            logger_1.default.error('Publish portfolio failed', error);
            next(error);
        }
    }
    /**
     * POST /api/wizard/:id/slug-check
     */
    static async checkSlug(req, res, next) {
        var _a;
        try {
            const authReq = req;
            const userId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const portfolioId = req.params.id;
            const { slug } = req.body;
            if (!(slug === null || slug === void 0 ? void 0 : slug.trim())) {
                return res.status(400).json({ error: 'Slug is required' });
            }
            const isAvailable = await portfolio_service_new_1.default.isSlugAvailable(slug, portfolioId);
            res.json({
                slug,
                available: isAvailable,
                message: isAvailable ? 'URL is available' : 'URL is already taken'
            });
        }
        catch (error) {
            logger_1.default.error('Check slug failed', error);
            next(error);
        }
    }
    /**
     * GET /api/wizard/:id/slug-suggest
     */
    static async suggestSlug(req, res, next) {
        var _a;
        try {
            const authReq = req;
            const userId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const portfolioId = req.params.id;
            const portfolio = await portfolio_service_new_1.default.getById(portfolioId, userId);
            if (!portfolio) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }
            const name = portfolio.wizard_data.name || portfolio.name;
            let suggestion = portfolio_service_new_1.default.generateSlugSuggestion(name);
            let counter = 1;
            while (!(await portfolio_service_new_1.default.isSlugAvailable(suggestion, portfolioId))) {
                suggestion = `${portfolio_service_new_1.default.generateSlugSuggestion(name)}-${counter}`;
                counter++;
            }
            res.json({ suggestion, available: true });
        }
        catch (error) {
            logger_1.default.error('Suggest slug failed', error);
            next(error);
        }
    }
}
exports.WizardController = WizardController;
exports.default = WizardController;
