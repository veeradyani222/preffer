/**
 * Wizard Routes (v2)
 * Routes for the 7-step portfolio creation wizard
 * Now with conversational AI and approval flow
 */

import express from 'express';
import WizardController from '../controllers/wizard.controller';
import authenticate from '../middleware/authenticate';

const router = express.Router();

// All wizard routes require authentication
router.use(authenticate);

/**
 * POST /api/wizard/start
 * Step 1: Create a new draft portfolio
 * Body: { portfolioType: 'individual' | 'company', name?: string }
 */
router.post('/start', WizardController.startWizard);

/**
 * GET /api/wizard/:id
 * Get current wizard state
 */
router.get('/:id', WizardController.getWizardState);

/**
 * PATCH /api/wizard/:id/step/:stepNum
 * Update wizard step data
 * Params: stepNum (1-7)
 * Body: { ...wizardData }
 */
router.patch('/:id/step/:stepNum', WizardController.updateWizardStep);

/**
 * POST /api/wizard/:id/recommend
 * Step 3: AI recommends sections
 * Body: { description: string }
 */
router.post('/:id/recommend', WizardController.recommendSections);

/**
 * POST /api/wizard/:id/sections
 * Step 3/4: Save selected sections
 * Body: { sections: SectionType[] }
 */
router.post('/:id/sections', WizardController.saveSections);

/**
 * POST /api/wizard/:id/chat
 * Conversational AI for section content
 * Body: { sectionId: string, message: string, conversationHistory?: [] }
 */
router.post('/:id/chat', WizardController.chat);

/**
 * GET /api/wizard/:id/history/:sectionId
 * Get chat history for a specific section
 */
router.get('/:id/history/:sectionId', WizardController.getChatHistory);

/**
 * POST /api/wizard/:id/generate
 * Auto-generate section content
 * Body: { sectionId: string, additionalInfo?: string }
 */
router.post('/:id/generate', WizardController.generateContent);

/**
 * POST /api/wizard/:id/approve
 * Approve and save proposed content
 * Body: { sectionId: string, content?: any }
 */
router.post('/:id/approve', WizardController.approveContent);

/**
 * POST /api/wizard/:id/improve
 * Improve existing section content with AI
 * Body: { sectionId: string, feedback: string }
 */
router.post('/:id/improve', WizardController.improveContent);

/**
 * POST /api/wizard/:id/publish
 * Step 7: Finalize and publish the portfolio
 * Body: { slug: string, hasAiManager?: boolean }
 */
router.post('/:id/publish', WizardController.publishPortfolio);

/**
 * POST /api/wizard/:id/slug-check
 * Check if a slug is available
 * Body: { slug: string }
 */
router.post('/:id/slug-check', WizardController.checkSlug);

/**
 * GET /api/wizard/:id/slug-suggest
 * Get slug suggestion based on portfolio name
 */
router.get('/:id/slug-suggest', WizardController.suggestSlug);

export default router;
