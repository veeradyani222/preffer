/**
 * Wizard Controller (v2)
 * Handles the portfolio creation wizard with conversational AI
 * Now with approval flow and verbose logging
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authenticate';
import PortfolioService, { PortfolioType, Section, SectionType } from '../services/portfolio.service.new';
import AIService, { ConversationMessage, PortfolioContext } from '../services/ai.service';
import CreditsService from '../services/credits.service';
import PortfolioChatService, { ChatMessage } from '../services/portfolio-chat.service';
import logger from '../utils/logger';

// ============================================
// TYPES
// ============================================

interface PendingContent {
    sectionId: string;
    sectionType: SectionType;
    content: any;
    proposedAt: Date;
}

// In-memory store for pending content (in production, use Redis)
const pendingContentStore = new Map<string, PendingContent>();

// ============================================
// WIZARD CONTROLLER
// ============================================

export class WizardController {
    private static tryParseJsonString(value: any): any {
        if (typeof value !== 'string') return value;
        const trimmed = value.trim();
        if (!trimmed.startsWith('{') && !trimmed.startsWith('[') && !trimmed.startsWith('"')) return value;
        try {
            const first = JSON.parse(trimmed);
            if (typeof first === 'string') {
                const inner = first.trim();
                if (inner.startsWith('{') || inner.startsWith('[')) {
                    try {
                        return JSON.parse(inner);
                    } catch {
                        return first;
                    }
                }
            }
            return first;
        } catch {
            return value;
        }
    }

    /**
     * POST /api/wizard/start
     * Step 1: Create a new draft portfolio
     */
    static async startWizard(req: Request, res: Response, next: NextFunction) {
        logger.divider('WIZARD: START');
        logger.request('POST', '/wizard/start', req.body);

        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.userId;
            if (!userId) {
                logger.error('Unauthorized request');
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { portfolioType, name } = req.body;
            logger.wizard(1, 'Creating portfolio', { portfolioType, name, userId });

            if (!portfolioType || !['individual', 'company'].includes(portfolioType)) {
                logger.error('Invalid portfolio type', { portfolioType });
                return res.status(400).json({ error: 'Invalid portfolio type' });
            }

            // Check credits
            const userCredits = await CreditsService.getUserCredits(userId);
            logger.info('User credits check', userCredits);

            if (!userCredits.canCreatePortfolio) {
                // Check if it's unfinished limit or portfolio limit
                const unfinishedCount = await PortfolioChatService.getUnfinishedCount(userId);

                if (unfinishedCount >= 5) {
                    logger.warn('Cannot create portfolio - 5 unfinished portfolio limit reached');
                    return res.status(403).json({
                        error: 'Unfinished portfolio limit reached',
                        message: `You have 5 unfinished portfolios. Please complete or delete one before creating a new portfolio.`,
                        unfinishedCount
                    });
                }

                const maxPortfolios = userCredits.plan === 'free' ? 3 : userCredits.plan === 'pro' ? 10 : 'unlimited';
                logger.warn('Cannot create portfolio - portfolio limit reached');
                return res.status(403).json({
                    error: 'Portfolio limit reached',
                    message: `Your ${userCredits.plan} plan allows ${maxPortfolios} portfolios. You currently have ${userCredits.portfolioCount}.`
                });
            }

            // Create draft portfolio
            const portfolio = await PortfolioService.createDraft(userId, {
                portfolio_type: portfolioType as PortfolioType,
                name: name || 'Untitled Portfolio'
            });

            logger.db('INSERT', 'portfolios', { id: portfolio.id });
            logger.wizard(1, 'Portfolio created successfully', { portfolioId: portfolio.id });

            const response = {
                portfolioId: portfolio.id,
                wizardStep: portfolio.wizard_step,
                portfolio
            };

            logger.response(201, response);
            res.status(201).json(response);

        } catch (error) {
            logger.error('Start wizard failed', error);
            next(error);
        }
    }

    /**
     * GET /api/wizard/:id
     * Get current wizard state
     */
    static async getWizardState(req: Request, res: Response, next: NextFunction) {
        logger.request('GET', `/wizard/${req.params.id}`);

        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const portfolioId = req.params.id as string;
            const portfolio = await PortfolioService.getById(portfolioId, userId);

            if (!portfolio) {
                logger.warn('Portfolio not found', { portfolioId, userId });
                return res.status(404).json({ error: 'Portfolio not found' });
            }

            logger.wizard(portfolio.wizard_step, 'Retrieved wizard state', {
                sections: portfolio.sections?.length || 0,
                status: portfolio.status
            });

            const response = {
                portfolioId: portfolio.id,
                wizardStep: portfolio.wizard_step,
                wizardData: portfolio.wizard_data,
                status: portfolio.status,
                sections: portfolio.sections,
                creditsUsed: portfolio.credits_used,
                portfolio
            };

            logger.response(200, { portfolioId: portfolio.id, step: portfolio.wizard_step });
            res.json(response);

        } catch (error) {
            logger.error('Get wizard state failed', error);
            next(error);
        }
    }

    /**
     * PATCH /api/wizard/:id/step/:stepNum
     * Update wizard step data
     */
    static async updateWizardStep(req: Request, res: Response, next: NextFunction) {
        const stepNum = req.params.stepNum as string;
        logger.request('PATCH', `/wizard/${req.params.id}/step/${stepNum}`, req.body);

        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const portfolioId = req.params.id as string;
            const step = parseInt(stepNum, 10);
            const wizardData = req.body;

            if (isNaN(step) || step < 1 || step > 7) {
                logger.error('Invalid step number', { step });
                return res.status(400).json({ error: 'Invalid step number (must be 1-7)' });
            }

            logger.wizard(step, 'Updating wizard data', wizardData);

            const portfolio = await PortfolioService.updateWizard(
                portfolioId,
                userId,
                step,
                wizardData
            );

            logger.db('UPDATE', 'portfolios', { id: portfolioId, step });

            res.json({
                portfolioId: portfolio.id,
                wizardStep: portfolio.wizard_step,
                wizardData: portfolio.wizard_data,
                portfolio
            });

        } catch (error) {
            logger.error('Update wizard step failed', error);
            next(error);
        }
    }

    /**
     * POST /api/wizard/:id/recommend
     * Step 3: AI recommends sections based on description
     */
    static async recommendSections(req: Request, res: Response, next: NextFunction) {
        logger.divider('AI: RECOMMEND SECTIONS');
        logger.request('POST', `/wizard/${req.params.id}/recommend`, req.body);

        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const portfolioId = req.params.id as string;
            const portfolio = await PortfolioService.getById(portfolioId, userId);

            if (!portfolio) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }

            const { description } = req.body;
            if (!description || description.trim().length === 0) {
                logger.error('Description is required');
                return res.status(400).json({ error: 'Description is required' });
            }

            logger.ai('Starting section recommendation', {
                portfolioType: portfolio.portfolio_type,
                descriptionLength: description.length
            });

            const userCredits = await CreditsService.getUserCredits(userId);
            logger.info('User plan', { plan: userCredits.plan, maxSections: userCredits.maxSections });

            // Get AI recommendations
            const recommendation = await AIService.recommendSections(
                portfolio.portfolio_type,
                portfolio.wizard_data?.profession || '',
                description,
                userCredits.plan
            );

            logger.ai('Sections recommended', recommendation);

            // Update wizard data
            await PortfolioService.updateWizard(portfolioId, userId, 3, {
                description,
                recommendedSections: recommendation.sections
            });

            const response = {
                sections: recommendation.sections,
                reasoning: recommendation.reasoning,
                maxSections: userCredits.maxSections + 2 // +2 for mandatory hero and contact
            };

            logger.response(200, response);
            res.json(response);

        } catch (error) {
            logger.error('Recommend sections failed', error);
            next(error);
        }
    }

    /**
     * POST /api/wizard/:id/sections
     * Step 3/4: Save selected sections (with empty content initially)
     */
    static async saveSections(req: Request, res: Response, next: NextFunction) {
        logger.divider('WIZARD: SAVE SECTIONS');
        logger.request('POST', `/wizard/${req.params.id}/sections`, req.body);

        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const portfolioId = req.params.id as string;
            const { sections: sectionTypes } = req.body;

            if (!Array.isArray(sectionTypes) || sectionTypes.length === 0) {
                logger.error('Sections array is required');
                return res.status(400).json({ error: 'Sections array is required' });
            }

            // Ensure hero and contact are always included (mandatory sections)
            if (!sectionTypes.includes('hero') || !sectionTypes.includes('contact')) {
                logger.error('Hero and Contact sections are mandatory');
                return res.status(400).json({ 
                    error: 'Hero and Contact sections are required for every portfolio' 
                });
            }

            logger.section('CREATE', sectionTypes.join(', '), { count: sectionTypes.length });

            // Check plan limits (maxSections is for custom sections, +2 for hero and contact)
            const userCredits = await CreditsService.getUserCredits(userId);
            const maxTotalSections = userCredits.maxSections + 2; // +2 for mandatory hero and contact
            if (sectionTypes.length > maxTotalSections) {
                logger.warn('Section limit exceeded', { selected: sectionTypes.length, max: maxTotalSections });
                return res.status(403).json({
                    error: `Maximum ${userCredits.maxSections} custom sections allowed (plus Hero and Contact) for your plan`
                });
            }

            // Create section objects with empty content
            const sections: Section[] = sectionTypes.map((type: SectionType, index: number) => ({
                id: `section-${Date.now()}-${index}`,
                type,
                title: type.charAt(0).toUpperCase() + type.slice(1),
                content: {},  // Empty initially - will be filled via chat
                order: index
            }));

            logger.db('UPDATE', 'portfolios.sections', { sectionCount: sections.length });

            const portfolio = await PortfolioService.updateSections(portfolioId, userId, sections);

            // Update wizard data
            await PortfolioService.updateWizard(portfolioId, userId, 4, {
                selectedSections: sectionTypes,
                currentSectionIndex: 0
            });

            logger.wizard(4, 'Sections saved', { sections: sectionTypes });

            res.json({
                portfolioId: portfolio.id,
                sections: portfolio.sections,
                message: 'Sections saved successfully'
            });

        } catch (error) {
            logger.error('Save sections failed', error);
            next(error);
        }
    }

    /**
     * GET /api/wizard/:id/history/:sectionId
     * Get chat history for a specific section
     */
    static async getChatHistory(req: Request, res: Response, next: NextFunction) {
        logger.divider('WIZARD: GET CHAT HISTORY');
        logger.request('GET', `/wizard/${req.params.id}/history/${req.params.sectionId}`);

        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const portfolioId = req.params.id as string;
            const sectionId = req.params.sectionId as string;

            const portfolio = await PortfolioService.getById(portfolioId, userId);
            if (!portfolio) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }

            // Get chat history from database
            const history = await PortfolioChatService.getChatHistory(portfolioId, userId, sectionId);

            logger.info('Chat history retrieved', { sectionId, messageCount: history.length });

            res.json({
                history,
                sectionId
            });

        } catch (error) {
            logger.error('Get chat history failed', error);
            next(error);
        }
    }



    /**
     * POST /api/wizard/:id/chat
     * Conversational AI for building section content
     * This is the main chat endpoint
     */
    static async chat(req: Request, res: Response, next: NextFunction) {
        logger.divider('AI: CHAT');
        logger.request('POST', `/wizard/${req.params.id}/chat`, req.body);

        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const portfolioId = req.params.id as string;
            const { sectionId, message, conversationHistory = [] } = req.body;

            if (!sectionId || !message) {
                logger.error('Missing required fields', { sectionId: !!sectionId, message: !!message });
                return res.status(400).json({ error: 'sectionId and message are required' });
            }

            const portfolio = await PortfolioService.getById(portfolioId, userId);
            if (!portfolio) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }

            // Find the section
            const section = portfolio.sections.find((s: Section) => s.id === sectionId);
            if (!section) {
                logger.error('Section not found', { sectionId });
                return res.status(404).json({ error: 'Section not found' });
            }

            logger.conversation('Processing chat', {
                sectionType: section.type,
                messageLength: message.length,
                historyLength: conversationHistory.length
            });

            // Load existing chat history from DB
            const savedHistory = await PortfolioChatService.getChatHistory(portfolioId, userId, sectionId);
            const fullHistory = savedHistory.length > 0 ? savedHistory : conversationHistory;

            // Build portfolio context
            const wizardData = portfolio.wizard_data || {};
            const context: PortfolioContext = {
                name: wizardData.name || portfolio.name,
                profession: wizardData.profession,
                description: wizardData.description,
                portfolioType: portfolio.portfolio_type,
                existingSections: portfolio.sections.reduce((acc: Record<string, any>, s: Section) => {
                    if (s.content && Object.keys(s.content).length > 0) {
                        acc[s.type] = s.content;
                    }
                    return acc;
                }, {})
            };

            logger.info('Portfolio context', {
                name: context.name,
                profession: context.profession,
                existingSections: Object.keys(context.existingSections || {})
            });

            // Get AI response
            const aiResponse = await AIService.chat(
                section.type,
                message,
                context,
                fullHistory as ConversationMessage[]
            );

            logger.ai('Chat response', {
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
            await PortfolioChatService.saveChatHistory(portfolioId, userId, sectionId, updatedHistory);

            // If AI proposed content, store it as pending
            if (aiResponse.proposedContent) {
                const pendingKey = `${portfolioId}-${sectionId}`;
                pendingContentStore.set(pendingKey, {
                    sectionId,
                    sectionType: section.type,
                    content: aiResponse.proposedContent,
                    proposedAt: new Date()
                });
                logger.info('Content stored as pending', { key: pendingKey });
            }

            const response = {
                message: aiResponse.message,
                action: aiResponse.action,
                proposedContent: aiResponse.proposedContent,
                displayContent: aiResponse.displayContent,
                isComplete: aiResponse.isComplete,
                sectionType: section.type
            };

            logger.response(200, { action: aiResponse.action, isComplete: aiResponse.isComplete });
            res.json(response);

        } catch (error) {
            logger.error('Chat failed', error);
            next(error);
        }
    }

    /**
     * POST /api/wizard/:id/generate
     * Direct content generation (when user wants auto-generate)
     */
    static async generateContent(req: Request, res: Response, next: NextFunction) {
        logger.divider('AI: GENERATE CONTENT');
        logger.request('POST', `/wizard/${req.params.id}/generate`, req.body);

        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const portfolioId = req.params.id as string;
            const { sectionId, additionalInfo } = req.body;

            const portfolio = await PortfolioService.getById(portfolioId, userId);
            if (!portfolio) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }

            const section = portfolio.sections.find((s: Section) => s.id === sectionId);
            if (!section) {
                return res.status(404).json({ error: 'Section not found' });
            }

            logger.ai('Generating content', { sectionType: section.type, hasAdditionalInfo: !!additionalInfo });

            // Build context
            const wizardData = portfolio.wizard_data || {};
            const context: PortfolioContext = {
                name: wizardData.name || portfolio.name,
                profession: wizardData.profession,
                description: wizardData.description,
                portfolioType: portfolio.portfolio_type,
                existingSections: portfolio.sections.reduce((acc: Record<string, any>, s: Section) => {
                    if (s.content && Object.keys(s.content).length > 0) {
                        acc[s.type] = s.content;
                    }
                    return acc;
                }, {})
            };

            try {
                // Generate content
                const result = await AIService.generateSectionContent(
                    section.type,
                    context,
                    additionalInfo
                );

                logger.ai('Content generated', { sectionType: section.type, contentKeys: Object.keys(result.content || {}) });

                // Store as pending (don't save to DB yet)
                const pendingKey = `${portfolioId}-${sectionId}`;
                pendingContentStore.set(pendingKey, {
                    sectionId,
                    sectionType: section.type,
                    content: result.content,
                    proposedAt: new Date()
                });

                // Save generation event to chat history
                const existingHistory = await PortfolioChatService.getChatHistory(portfolioId, userId, sectionId);
                const updatedHistory: ChatMessage[] = [
                    ...existingHistory,
                    { role: 'user' as const, content: 'Auto content generation selected', timestamp: new Date() },
                    { role: 'ai' as const, content: result.message || 'I\'ve generated content for this section. Review it below!', timestamp: new Date() }
                ];
                await PortfolioChatService.saveChatHistory(portfolioId, userId, sectionId, updatedHistory);

                logger.info('Content stored as pending for approval', { key: pendingKey });

                const response = {
                    message: result.message,
                    proposedContent: result.content,
                    displayContent: result.displayContent,
                    action: 'proposal' as const,
                    sectionType: section.type,
                    requiresApproval: true
                };

                logger.response(200, { sectionType: section.type, requiresApproval: true });
                res.json(response);
            } catch (error: any) {
                // Handle errors gracefully - don't refuse, just ask for more info
                logger.warn('Content generation issue', { reason: error.message });
                return res.status(200).json({
                    message: error.message || "I'd love to help! Could you tell me a bit more about what you'd like for this section?",
                    action: 'continue',
                    sectionType: section.type
                });
            }

        } catch (error) {
            logger.error('Generate content failed', error);
            next(error);
        }
    }

    /**
     * POST /api/wizard/:id/approve
     * Approve and save proposed content to portfolio
     */
    static async approveContent(req: Request, res: Response, next: NextFunction) {
        logger.divider('WIZARD: APPROVE CONTENT');
        logger.request('POST', `/wizard/${req.params.id}/approve`, req.body);

        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const portfolioId = req.params.id as string;
            const { sectionId, content } = req.body;

            if (!sectionId) {
                return res.status(400).json({ error: 'sectionId is required' });
            }

            const portfolio = await PortfolioService.getById(portfolioId, userId);
            if (!portfolio) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }

            // Find section
            const sectionIndex = portfolio.sections.findIndex((s: Section) => s.id === sectionId);
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
                    logger.error('No pending content found', { pendingKey });
                    return res.status(400).json({ error: 'No pending content to approve. Generate content first.' });
                }
                contentToSave = pending.content;
                pendingContentStore.delete(pendingKey);
                logger.info('Using pending content', { key: pendingKey });
            }
            contentToSave = WizardController.tryParseJsonString(contentToSave);

            logger.section('SAVE', section.type, { contentKeys: Object.keys(contentToSave || {}) });

            // Update section content
            const updatedSections = [...portfolio.sections];
            updatedSections[sectionIndex] = {
                ...section,
                content: contentToSave
            };

            await PortfolioService.updateSections(portfolioId, userId, updatedSections);

            // Save approval event to chat history
            const existingHistory = await PortfolioChatService.getChatHistory(portfolioId, userId, sectionId);
            const updatedHistory: ChatMessage[] = [
                ...existingHistory,
                { role: 'ai' as const, content: `✅ **${section.type.charAt(0).toUpperCase() + section.type.slice(1)} section approved and saved!**`, timestamp: new Date() }
            ];
            await PortfolioChatService.saveChatHistory(portfolioId, userId, sectionId, updatedHistory);

            logger.db('UPDATE', 'portfolios.sections', { sectionId, sectionType: section.type });
            logger.wizard(4, 'Content approved and saved', { sectionType: section.type });

            res.json({
                message: `${section.type.charAt(0).toUpperCase() + section.type.slice(1)} section saved successfully!`,
                sectionId,
                content: contentToSave,
                saved: true
            });

        } catch (error) {
            logger.error('Approve content failed', error);
            next(error);
        }
    }

    /**
     * POST /api/wizard/:id/improve
     * Improve existing section content with AI
     */
    static async improveContent(req: Request, res: Response, next: NextFunction) {
        logger.divider('AI: IMPROVE CONTENT');
        logger.request('POST', `/wizard/${req.params.id}/improve`, req.body);

        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const portfolioId = req.params.id as string;
            const { sectionId, feedback } = req.body;

            if (!feedback?.trim()) {
                return res.status(400).json({ error: 'Feedback is required' });
            }

            const portfolio = await PortfolioService.getById(portfolioId, userId);
            if (!portfolio) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }

            const sectionIndex = portfolio.sections.findIndex((s: Section) => s.id === sectionId);
            if (sectionIndex === -1) {
                return res.status(404).json({ error: 'Section not found' });
            }

            const section = portfolio.sections[sectionIndex];

            // Get current content - either from pending or from saved
            const pendingKey = `${portfolioId}-${sectionId}`;
            const pending = pendingContentStore.get(pendingKey);
            const currentContent = pending?.content || section.content;

            if (!currentContent || Object.keys(currentContent).length === 0) {
                return res.status(400).json({ error: 'No content to improve. Generate content first.' });
            }

            logger.ai('Improving content', { sectionType: section.type, feedback });

            const improved = await AIService.improveContent(
                section.type,
                currentContent,
                feedback
            );

            // Store improved content as pending
            pendingContentStore.set(pendingKey, {
                sectionId,
                sectionType: section.type,
                content: improved.content,
                proposedAt: new Date()
            });

            // Save improvement request to chat history
            const existingHistory = await PortfolioChatService.getChatHistory(portfolioId, userId, sectionId);
            const updatedHistory: ChatMessage[] = [
                ...existingHistory,
                { role: 'user' as const, content: feedback, timestamp: new Date() },
                { role: 'ai' as const, content: improved.message || 'I\'ve made the changes! Review the updated content below.', timestamp: new Date() }
            ];
            await PortfolioChatService.saveChatHistory(portfolioId, userId, sectionId, updatedHistory);

            logger.ai('Content improved', { sectionType: section.type });

            res.json({
                message: improved.message,
                proposedContent: improved.content,
                displayContent: improved.displayContent,
                action: 'proposal',
                requiresApproval: true
            });

        } catch (error) {
            logger.error('Improve content failed', error);
            next(error);
        }
    }

    /**
     * POST /api/wizard/:id/publish
     * Step 7: Finalize and publish the portfolio
     */
    static async publishPortfolio(req: Request, res: Response, next: NextFunction) {
        logger.divider('WIZARD: PUBLISH');
        logger.request('POST', `/wizard/${req.params.id}/publish`, req.body);

        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const portfolioId = req.params.id as string;
            const { slug, hasAiManager = false } = req.body;

            if (!slug?.trim()) {
                return res.status(400).json({ error: 'Slug is required' });
            }

            if (!/^[a-z0-9-]+$/.test(slug)) {
                return res.status(400).json({
                    error: 'Slug must contain only lowercase letters, numbers, and hyphens'
                });
            }

            logger.wizard(7, 'Publishing portfolio', { slug, hasAiManager });

            // Check slug availability
            const isAvailable = await PortfolioService.isSlugAvailable(slug, portfolioId);
            if (!isAvailable) {
                logger.warn('Slug is taken', { slug });
                return res.status(409).json({ error: 'This URL is already taken' });
            }

            // Check credits
            const cost = CreditsService.getPortfolioCost(hasAiManager);
            const hasEnough = await CreditsService.hasEnoughCredits(userId, cost);
            if (!hasEnough) {
                logger.warn('Insufficient credits', { required: cost });
                return res.status(403).json({ error: 'Insufficient credits', required: cost });
            }

            // Publish
            const portfolio = await PortfolioService.publish(portfolioId, userId, slug, hasAiManager);

            logger.db('UPDATE', 'portfolios', { id: portfolioId, status: 'published', slug });
            logger.wizard(7, 'Portfolio published!', { url: `/${slug}` });

            res.json({
                portfolioId: portfolio.id,
                slug: portfolio.slug,
                status: portfolio.status,
                creditsUsed: portfolio.credits_used,
                url: `http://localhost:3000/${slug}`,
                message: 'Portfolio published successfully!'
            });

        } catch (error) {
            logger.error('Publish portfolio failed', error);
            next(error);
        }
    }

    /**
     * POST /api/wizard/:id/slug-check
     */
    static async checkSlug(req: Request, res: Response, next: NextFunction) {
        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const portfolioId = req.params.id as string;
            const { slug } = req.body;

            if (!slug?.trim()) {
                return res.status(400).json({ error: 'Slug is required' });
            }

            const isAvailable = await PortfolioService.isSlugAvailable(slug, portfolioId);

            res.json({
                slug,
                available: isAvailable,
                message: isAvailable ? 'URL is available' : 'URL is already taken'
            });

        } catch (error) {
            logger.error('Check slug failed', error);
            next(error);
        }
    }

    /**
     * GET /api/wizard/:id/slug-suggest
     */
    static async suggestSlug(req: Request, res: Response, next: NextFunction) {
        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const portfolioId = req.params.id as string;
            const portfolio = await PortfolioService.getById(portfolioId, userId);

            if (!portfolio) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }

            const name = portfolio.wizard_data.name || portfolio.name;
            let suggestion = PortfolioService.generateSlugSuggestion(name);
            let counter = 1;

            while (!(await PortfolioService.isSlugAvailable(suggestion, portfolioId))) {
                suggestion = `${PortfolioService.generateSlugSuggestion(name)}-${counter}`;
                counter++;
            }

            res.json({ suggestion, available: true });

        } catch (error) {
            logger.error('Suggest slug failed', error);
            next(error);
        }
    }
}

export default WizardController;
