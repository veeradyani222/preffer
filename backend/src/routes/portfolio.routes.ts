import express from 'express';
import PortfolioController from '../controllers/portfolio.controller';
import authenticate from '../middleware/authenticate';

const router = express.Router();

// ============================================
// PUBLIC ROUTES (No auth required)
// ============================================

// Get portfolio by slug (for public pages)
router.get('/slug/:slug', PortfolioController.getBySlug);

// Public AI manager metadata and chat by slug + manager name
router.get('/slug/:slug/ai-manager/:aiManagerName', PortfolioController.getPublicAiManager);
router.post('/slug/:slug/ai-manager/:aiManagerName/chat', PortfolioController.chatWithPublicAiManager);

// Check if slug is available
router.get('/check-slug/:slug', PortfolioController.checkSlug);

// Legacy: Get public portfolio by username
router.get('/public/:username', PortfolioController.getPublicPortfolio);

// ============================================
// PROTECTED ROUTES (Auth required)
// ============================================

// Get all user's portfolios
router.get('/all', authenticate, PortfolioController.getAllPortfolios);

// Get unfinished/draft portfolios
router.get('/unfinished', authenticate, PortfolioController.getUnfinishedPortfolios);

// Create new portfolio
router.post('/', authenticate, PortfolioController.createPortfolio);

// Suggest a unique slug
router.post('/suggest-slug', authenticate, PortfolioController.suggestSlug);

// Get single portfolio by ID
router.get('/:id', authenticate, PortfolioController.getPortfolioById);
router.get('/:id/ai-capabilities', authenticate, PortfolioController.getAICapabilities);
router.put('/:id/ai-capabilities', authenticate, PortfolioController.upsertAICapabilities);
router.get('/:id/ai-capabilities/:capability/records', authenticate, PortfolioController.listAICapabilityRecords);
router.patch('/:id/ai-capabilities/:capability/records/:recordId/status', authenticate, PortfolioController.updateAICapabilityRecordStatus);
router.get('/:id/ai-tool-events', authenticate, PortfolioController.getAIToolEvents);

// Update portfolio by ID
router.put('/:id', authenticate, PortfolioController.updatePortfolioById);

// Delete portfolio
router.delete('/:id', authenticate, PortfolioController.deletePortfolio);

// Publish portfolio with slug
router.post('/:id/publish', authenticate, PortfolioController.publishWithSlug);

// ============================================
// LEGACY ROUTES (Backwards compatibility)
// ============================================

// Get/create default portfolio (legacy)
router.get('/', authenticate, PortfolioController.getPortfolio);

// Update default portfolio (legacy)
router.put('/', authenticate, PortfolioController.updatePortfolio);

// Publish default portfolio (legacy)
router.post('/publish', authenticate, PortfolioController.publishPortfolio);

export default router;
