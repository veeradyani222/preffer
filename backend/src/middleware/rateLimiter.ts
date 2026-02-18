import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

type JwtPayload = { userId?: string };

function getUserIdFromJwt(req: any): string | null {
    try {
        const authHeader = req.headers?.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
        const token = authHeader.substring(7).trim();
        if (!token || !process.env.JWT_SECRET) return null;
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
        return decoded?.userId || null;
    } catch {
        return null;
    }
}

function getApiKeyFromHeader(req: any): string | null {
    const authHeader = req.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const key = authHeader.substring(7).trim();
    return key || null;
}

const redisUrl = process.env.REDIS_URL;
let redisStore: RedisStore | undefined;

if (redisUrl) {
    const client = createClient({ url: redisUrl });
    client.on('error', (err) => {
        console.error('[rateLimiter] Redis error:', err);
    });
    client.connect().catch((err) => {
        console.error('[rateLimiter] Redis connect failed:', err);
    });
    redisStore = new RedisStore({
        sendCommand: (...args: string[]) => client.sendCommand(args),
    });
}

// General API rate limiter
export const apiLimiter = rateLimit({
    windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS || '100'),
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    store: redisStore,
    keyGenerator: (req) => {
        const userId = getUserIdFromJwt(req);
        return userId || req.ip || 'unknown';
    },
});

// Strict rate limiter for auth endpoints
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Only 5 login attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later',
    skipSuccessfulRequests: true,
    store: redisStore,
    keyGenerator: (req) => req.ip || 'unknown',
});

// MCP rate limiter (key by API key)
export const mcpLimiter = rateLimit({
    windowMs: parseInt(process.env.MCP_RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
    max: parseInt(process.env.MCP_RATE_LIMIT_MAX_REQUESTS || '60'),
    message: 'Too many MCP requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    store: redisStore,
    keyGenerator: (req) => {
        const apiKey = getApiKeyFromHeader(req);
        return apiKey || req.ip || 'unknown';
    },
});
