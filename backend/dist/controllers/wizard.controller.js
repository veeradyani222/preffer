"use strict";
/**
 * Wizard Controller
 * Handles the 7-step portfolio creation wizard flow
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WizardController = void 0;
const portfolio_service_new_1 = __importDefault(require("../services/portfolio.service.new"));
const ai_service_1 = __importDefault(require("../services/ai.service"));
const credits_service_1 = __importDefault(require("../services/credits.service"));
// ============================================
// WIZARD CONTROLLER
// ============================================
class WizardController {
    /**
     * POST /api/wizard/start
     * Step 1: Create a new draft portfolio
     */
    static async startWizard(req, res, next) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const { portfolioType, name } = req.body;
            if (!portfolioType || !['individual', 'company'].includes(portfolioType)) {
                return res.status(400).json({ error: 'Invalid portfolio type' });
            }
            // Check if user can create more portfolios
            const userCredits = await credits_service_1.default.getUserCredits(userId);
            if (!userCredits.canCreatePortfolio) {
                return res.status(403).json({
                    error: 'Cannot create more portfolios',
                    reason: userCredits.credits < 100
                        ? 'Insufficient credits'
                        : 'Portfolio limit reached for your plan'
                });
            }
            // Create draft portfolio
            const portfolio = await portfolio_service_new_1.default.createDraft(userId, {
                portfolio_type: portfolioType,
                name: name || 'Untitled Portfolio'
            });
            res.status(201).json({
                portfolioId: portfolio.id,
                wizardStep: portfolio.wizard_step,
                portfolio
            });
        }
        catch (error) {
            console.error('Start wizard error:', error);
            next(error);
        }
    }
    /**
     * GET /api/wizard/:id
     * Get current wizard state
     */
    static async getWizardState(req, res, next) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const portfolioId = req.params.id;
            const portfolio = await portfolio_service_new_1.default.getById(portfolioId, userId);
            if (!portfolio) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }
            res.json({
                portfolioId: portfolio.id,
                wizardStep: portfolio.wizard_step,
                wizardData: portfolio.wizard_data,
                status: portfolio.status,
                sections: portfolio.sections,
                creditsUsed: portfolio.credits_used,
                portfolio
            });
        }
        catch (error) {
            console.error('Get wizard state error:', error);
            next(error);
        }
    }
    /**
     * PATCH /api/wizard/:id/step/:stepNum
     * Update wizard step data
     */
    static async updateWizardStep(req, res, next) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const portfolioId = req.params.id;
            const stepNum = req.params.stepNum;
            const step = parseInt(stepNum, 10);
            const wizardData = req.body;
            if (isNaN(step) || step < 1 || step > 7) {
                return res.status(400).json({ error: 'Invalid step number (must be 1-7)' });
            }
            const portfolio = await portfolio_service_new_1.default.updateWizard(portfolioId, userId, step, wizardData);
            res.json({
                portfolioId: portfolio.id,
                wizardStep: portfolio.wizard_step,
                wizardData: portfolio.wizard_data,
                portfolio
            });
        }
        catch (error) {
            console.error('Update wizard step error:', error);
            next(error);
        }
    }
    /**
     * POST /api/wizard/:id/recommend
     * Step 3: AI recommends sections based on description
     */
    static async recommendSections(req, res, next) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
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
                return res.status(400).json({ error: 'Description is required' });
            }
            // Get user's plan for max sections
            const userCredits = await credits_service_1.default.getUserCredits(userId);
            // AI recommendation
            const recommendation = await ai_service_1.default.recommendSections(portfolio.portfolio_type, description, userCredits.plan);
            // Update wizard data with recommendations
            await portfolio_service_new_1.default.updateWizard(portfolioId, userId, 3, {
                description,
                recommendedSections: recommendation.sections
            });
            res.json({
                sections: recommendation.sections,
                reasoning: recommendation.reasoning,
                maxSections: userCredits.maxSections
            });
        }
        catch (error) {
            console.error('Recommend sections error:', error);
            next(error);
        }
    }
    /**
     * POST /api/wizard/:id/sections
     * Step 3/4: Save selected sections
     */
    static async saveSections(req, res, next) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const portfolioId = req.params.id;
            const { sections: sectionTypes } = req.body;
            if (!Array.isArray(sectionTypes) || sectionTypes.length === 0) {
                return res.status(400).json({ error: 'Sections array is required' });
            }
            // Check plan limits
            const userCredits = await credits_service_1.default.getUserCredits(userId);
            if (sectionTypes.length > userCredits.maxSections) {
                return res.status(403).json({
                    error: `Maximum ${userCredits.maxSections} sections allowed for your plan`
                });
            }
            // Create section objects with empty content
            const sections = sectionTypes.map((type, index) => ({
                id: `section-${Date.now()}-${index}`,
                type,
                title: type.charAt(0).toUpperCase() + type.slice(1), // Capitalize
                content: {},
                order: index
            }));
            const portfolio = await portfolio_service_new_1.default.updateSections(portfolioId, userId, sections);
            // Also update wizard data
            await portfolio_service_new_1.default.updateWizard(portfolioId, userId, 4, {
                selectedSections: sectionTypes,
                currentSectionIndex: 0
            });
            res.json({
                portfolioId: portfolio.id,
                sections: portfolio.sections,
                message: 'Sections saved successfully'
            });
        }
        catch (error) {
            console.error('Save sections error:', error);
            next(error);
        }
    }
    /**
     * POST /api/wizard/:id/content
     * Step 4: Generate or save content for a section
     */
    static async generateContent(req, res, next) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const portfolioId = req.params.id;
            const { sectionId, userPrompt, manualContent } = req.body;
            const portfolio = await portfolio_service_new_1.default.getById(portfolioId, userId);
            if (!portfolio) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }
            // Find the section to update
            const sectionIndex = portfolio.sections.findIndex((s) => s.id === sectionId);
            if (sectionIndex === -1) {
                return res.status(404).json({ error: 'Section not found' });
            }
            const section = portfolio.sections[sectionIndex];
            let content;
            let suggestion = '';
            // If manual content provided, use it
            if (manualContent) {
                content = manualContent;
                suggestion = 'Content saved successfully';
            }
            else {
                // Generate with AI
                const portfolioContext = {
                    name: portfolio.wizard_data.name || portfolio.name,
                    profession: portfolio.wizard_data.profession,
                    description: portfolio.wizard_data.description,
                    portfolioType: portfolio.portfolio_type
                };
                const generated = await ai_service_1.default.generateSectionContent(section.type, section.title, portfolioContext, userPrompt);
                content = generated.content;
                suggestion = generated.suggestion;
            }
            // Update section content
            const updatedSections = [...portfolio.sections];
            updatedSections[sectionIndex] = {
                ...section,
                content
            };
            await portfolio_service_new_1.default.updateSections(portfolioId, userId, updatedSections);
            res.json({
                sectionId,
                content,
                suggestion,
                message: 'Content generated successfully'
            });
        }
        catch (error) {
            console.error('Generate content error:', error);
            next(error);
        }
    }
    /**
     * POST /api/wizard/:id/improve
     * Improve existing section content with AI
     */
    static async improveContent(req, res, next) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const portfolioId = req.params.id;
            const { sectionId, feedback } = req.body;
            if (!feedback || !feedback.trim()) {
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
            const improved = await ai_service_1.default.improveContent(section.content, feedback, section.type);
            // Update section content
            const updatedSections = [...portfolio.sections];
            updatedSections[sectionIndex] = {
                ...section,
                content: improved.content
            };
            await portfolio_service_new_1.default.updateSections(portfolioId, userId, updatedSections);
            res.json({
                sectionId,
                content: improved.content,
                suggestion: improved.suggestion,
                message: 'Content improved successfully'
            });
        }
        catch (error) {
            console.error('Improve content error:', error);
            next(error);
        }
    }
    /**
     * POST /api/wizard/:id/publish
     * Step 7: Finalize and publish the portfolio
     */
    static async publishPortfolio(req, res, next) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const portfolioId = req.params.id;
            const { slug, hasAiManager = false } = req.body;
            if (!slug || slug.trim().length === 0) {
                return res.status(400).json({ error: 'Slug is required' });
            }
            // Validate slug format (alphanumeric and hyphens only)
            if (!/^[a-z0-9-]+$/.test(slug)) {
                return res.status(400).json({
                    error: 'Slug must contain only lowercase letters, numbers, and hyphens'
                });
            }
            // Check if slug is available
            const isAvailable = await portfolio_service_new_1.default.isSlugAvailable(slug, portfolioId);
            if (!isAvailable) {
                return res.status(409).json({ error: 'This URL is already taken' });
            }
            // Check credits
            const cost = credits_service_1.default.getPortfolioCost(hasAiManager);
            const hasEnough = await credits_service_1.default.hasEnoughCredits(userId, cost);
            if (!hasEnough) {
                return res.status(403).json({
                    error: 'Insufficient credits',
                    required: cost
                });
            }
            // Publish portfolio (this also deducts credits)
            const portfolio = await portfolio_service_new_1.default.publish(portfolioId, userId, slug, hasAiManager);
            res.json({
                portfolioId: portfolio.id,
                slug: portfolio.slug,
                status: portfolio.status,
                creditsUsed: portfolio.credits_used,
                url: `http://localhost:3000/${slug}`, // TODO: use env var
                message: 'Portfolio published successfully!'
            });
        }
        catch (error) {
            console.error('Publish portfolio error:', error);
            next(error);
        }
    }
    /**
     * POST /api/wizard/:id/slug-check
     * Check if a slug is available
     */
    static async checkSlug(req, res, next) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const portfolioId = req.params.id;
            const { slug } = req.body;
            if (!slug || slug.trim().length === 0) {
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
            console.error('Check slug error:', error);
            next(error);
        }
    }
    /**
     * GET /api/wizard/:id/slug-suggest
     * Get slug suggestion based on portfolio name
     */
    static async suggestSlug(req, res, next) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
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
            // Find an available slug
            while (!(await portfolio_service_new_1.default.isSlugAvailable(suggestion, portfolioId))) {
                suggestion = `${portfolio_service_new_1.default.generateSlugSuggestion(name)}-${counter}`;
                counter++;
            }
            res.json({
                suggestion,
                available: true
            });
        }
        catch (error) {
            console.error('Suggest slug error:', error);
            next(error);
        }
    }
}
exports.WizardController = WizardController;
exports.default = WizardController;
