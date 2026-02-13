"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const passport_1 = __importDefault(require("./config/passport"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const portfolio_routes_1 = __importDefault(require("./routes/portfolio.routes"));
const wizard_routes_1 = __importDefault(require("./routes/wizard.routes"));
const assistant_routes_1 = __importDefault(require("./routes/assistant.routes"));
const errorHandler_1 = __importDefault(require("./middleware/errorHandler"));
const rateLimiter_1 = require("./middleware/rateLimiter");
const app = (0, express_1.default)();
// ============================================
// SECURITY MIDDLEWARE (apply first)
// ============================================
app.use((0, helmet_1.default)()); // Security headers
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));
// ============================================
// PARSING MIDDLEWARE
// ============================================
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// ============================================
// AUTHENTICATION SETUP
// ============================================
app.use(passport_1.default.initialize());
// ============================================
// RATE LIMITING
// ============================================
app.use('/api/', rateLimiter_1.apiLimiter);
app.use('/api/auth/', rateLimiter_1.authLimiter);
// ============================================
// ROUTES
// ============================================
// Log all incoming requests
app.use((req, res, next) => {
    console.log(`[REQ] ${req.method} ${req.path}`);
    next();
});
app.use('/api/auth', auth_routes_1.default);
app.use('/api/portfolio', portfolio_routes_1.default);
app.use('/api/wizard', wizard_routes_1.default);
app.use('/api/assistant', assistant_routes_1.default);
// Root endpoint (quick deployment check)
app.get('/', (req, res) => {
    res.json({
        message: 'Backend is running',
        timestamp: new Date().toISOString()
    });
});
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// ============================================
// ERROR HANDLING (must be last)
// ============================================
app.use(errorHandler_1.default);
exports.default = app;
