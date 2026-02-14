"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const analytics_controller_1 = __importDefault(require("../controllers/analytics.controller"));
const authenticate_1 = __importDefault(require("../middleware/authenticate"));
const router = express_1.default.Router();
// ============================================
// PUBLIC ROUTES
// ============================================
// Record a page view (called from public portfolio page)
router.post('/page-view', analytics_controller_1.default.recordPageView);
// ============================================
// PROTECTED ROUTES
// ============================================
// Get aggregated dashboard analytics
router.get('/dashboard', authenticate_1.default, analytics_controller_1.default.getDashboard);
// Get recent AI manager conversations
router.get('/conversations', authenticate_1.default, analytics_controller_1.default.getConversations);
// Get AI-driven analytics insights
router.get('/insights', authenticate_1.default, analytics_controller_1.default.getInsights);
exports.default = router;
