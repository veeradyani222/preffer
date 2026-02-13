"use strict";
/**
 * Wizard Routes (v2)
 * Routes for the 7-step portfolio creation wizard
 * Now with conversational AI and approval flow
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const wizard_controller_1 = __importDefault(require("../controllers/wizard.controller"));
const authenticate_1 = __importDefault(require("../middleware/authenticate"));
const router = express_1.default.Router();
// All wizard routes require authentication
router.use(authenticate_1.default);
/**
 * POST /api/wizard/start
 * Step 1: Create a new draft portfolio
 * Body: { portfolioType: 'individual' | 'company', name?: string }
 */
router.post('/start', wizard_controller_1.default.startWizard);
/**
 * GET /api/wizard/:id
 * Get current wizard state
 */
router.get('/:id', wizard_controller_1.default.getWizardState);
/**
 * PATCH /api/wizard/:id/step/:stepNum
 * Update wizard step data
 * Params: stepNum (1-7)
 * Body: { ...wizardData }
 */
router.patch('/:id/step/:stepNum', wizard_controller_1.default.updateWizardStep);
/**
 * POST /api/wizard/:id/recommend
 * Step 3: AI recommends sections
 * Body: { description: string }
 */
router.post('/:id/recommend', wizard_controller_1.default.recommendSections);
/**
 * POST /api/wizard/:id/sections
 * Step 3/4: Save selected sections
 * Body: { sections: SectionType[] }
 */
router.post('/:id/sections', wizard_controller_1.default.saveSections);
/**
 * POST /api/wizard/:id/chat
 * Conversational AI for section content
 * Body: { sectionId: string, message: string, conversationHistory?: [] }
 */
router.post('/:id/chat', wizard_controller_1.default.chat);
/**
 * GET /api/wizard/:id/history/:sectionId
 * Get chat history for a specific section
 */
router.get('/:id/history/:sectionId', wizard_controller_1.default.getChatHistory);
/**
 * POST /api/wizard/:id/generate
 * Auto-generate section content
 * Body: { sectionId: string, additionalInfo?: string }
 */
router.post('/:id/generate', wizard_controller_1.default.generateContent);
/**
 * POST /api/wizard/:id/approve
 * Approve and save proposed content
 * Body: { sectionId: string, content?: any }
 */
router.post('/:id/approve', wizard_controller_1.default.approveContent);
/**
 * POST /api/wizard/:id/improve
 * Improve existing section content with AI
 * Body: { sectionId: string, feedback: string }
 */
router.post('/:id/improve', wizard_controller_1.default.improveContent);
/**
 * POST /api/wizard/:id/publish
 * Step 7: Finalize and publish the portfolio
 * Body: { slug: string, hasAiManager?: boolean }
 */
router.post('/:id/publish', wizard_controller_1.default.publishPortfolio);
/**
 * POST /api/wizard/:id/slug-check
 * Check if a slug is available
 * Body: { slug: string }
 */
router.post('/:id/slug-check', wizard_controller_1.default.checkSlug);
/**
 * GET /api/wizard/:id/slug-suggest
 * Get slug suggestion based on portfolio name
 */
router.get('/:id/slug-suggest', wizard_controller_1.default.suggestSlug);
exports.default = router;
