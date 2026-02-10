import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import passport from './config/passport';
import authRoutes from './routes/auth.routes';
import portfolioRoutes from './routes/portfolio.routes';
import wizardRoutes from './routes/wizard.routes';
import errorHandler from './middleware/errorHandler';
import { apiLimiter, authLimiter } from './middleware/rateLimiter';

const app = express();

// ============================================
// SECURITY MIDDLEWARE (apply first)
// ============================================
app.use(helmet()); // Security headers
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));

// ============================================
// PARSING MIDDLEWARE
// ============================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// AUTHENTICATION SETUP
// ============================================
app.use(passport.initialize());

// ============================================
// RATE LIMITING
// ============================================
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// ============================================
// ROUTES
// ============================================

// Log all incoming requests
app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.path}`);
    next();
});

app.use('/api/auth', authRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/wizard', wizardRoutes);

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
app.use(errorHandler);

export default app;
