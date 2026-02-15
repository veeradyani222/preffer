"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const portfolio_controller_1 = __importDefault(require("../controllers/portfolio.controller"));
const authenticate_1 = __importDefault(require("../middleware/authenticate"));
const router = express_1.default.Router();
// ============================================
// PUBLIC ROUTES (No auth required)
// ============================================
// Get portfolio by slug (for public pages)
router.get('/slug/:slug', portfolio_controller_1.default.getBySlug);
// Public AI manager metadata and chat by slug + manager name
router.get('/slug/:slug/ai-manager/:aiManagerName', portfolio_controller_1.default.getPublicAiManager);
router.post('/slug/:slug/ai-manager/:aiManagerName/chat', portfolio_controller_1.default.chatWithPublicAiManager);
// Check if slug is available
router.get('/check-slug/:slug', portfolio_controller_1.default.checkSlug);
// Legacy: Get public portfolio by username
router.get('/public/:username', portfolio_controller_1.default.getPublicPortfolio);
// ============================================
// PROTECTED ROUTES (Auth required)
// ============================================
// Get all user's portfolios
router.get('/all', authenticate_1.default, portfolio_controller_1.default.getAllPortfolios);
// Get unfinished/draft portfolios
router.get('/unfinished', authenticate_1.default, portfolio_controller_1.default.getUnfinishedPortfolios);
// Create new portfolio
router.post('/', authenticate_1.default, portfolio_controller_1.default.createPortfolio);
// Suggest a unique slug
router.post('/suggest-slug', authenticate_1.default, portfolio_controller_1.default.suggestSlug);
// Get single portfolio by ID
router.get('/:id', authenticate_1.default, portfolio_controller_1.default.getPortfolioById);
router.get('/:id/ai-capabilities', authenticate_1.default, portfolio_controller_1.default.getAICapabilities);
router.put('/:id/ai-capabilities', authenticate_1.default, portfolio_controller_1.default.upsertAICapabilities);
router.get('/:id/ai-capabilities/:capability/records', authenticate_1.default, portfolio_controller_1.default.listAICapabilityRecords);
router.patch('/:id/ai-capabilities/:capability/records/:recordId/status', authenticate_1.default, portfolio_controller_1.default.updateAICapabilityRecordStatus);
router.get('/:id/ai-tool-events', authenticate_1.default, portfolio_controller_1.default.getAIToolEvents);
// Update portfolio by ID
router.put('/:id', authenticate_1.default, portfolio_controller_1.default.updatePortfolioById);
// Delete portfolio
router.delete('/:id', authenticate_1.default, portfolio_controller_1.default.deletePortfolio);
// Publish portfolio with slug
router.post('/:id/publish', authenticate_1.default, portfolio_controller_1.default.publishWithSlug);
// ============================================
// LEGACY ROUTES (Backwards compatibility)
// ============================================
// Get/create default portfolio (legacy)
router.get('/', authenticate_1.default, portfolio_controller_1.default.getPortfolio);
// Update default portfolio (legacy)
router.put('/', authenticate_1.default, portfolio_controller_1.default.updatePortfolio);
// Publish default portfolio (legacy)
router.post('/publish', authenticate_1.default, portfolio_controller_1.default.publishPortfolio);
exports.default = router;
