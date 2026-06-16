"use strict";
/**
 * Portfolio Routes (v2)
 * Routes for viewing and managing portfolios
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const portfolio_controller_new_1 = __importDefault(require("../controllers/portfolio.controller.new"));
const authenticate_1 = __importDefault(require("../middleware/authenticate"));
const router = express_1.default.Router();
/**
 * GET /api/portfolios
 * Get all portfolios for the authenticated user
 */
router.get('/', authenticate_1.default, portfolio_controller_new_1.default.getUserPortfolios);
/**
 * GET /api/portfolios/:slug
 * Get a published portfolio by slug (public)
 */
router.get('/:slug', portfolio_controller_new_1.default.getBySlug);
/**
 * DELETE /api/portfolios/:id
 * Delete a portfolio
 */
router.delete('/:id', authenticate_1.default, portfolio_controller_new_1.default.deletePortfolio);
exports.default = router;
