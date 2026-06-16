"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mcpLimiter = exports.authLimiter = exports.apiLimiter = void 0;
const express_rate_limit_1 = __importStar(require("express-rate-limit"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const rate_limit_redis_1 = __importDefault(require("rate-limit-redis"));
const redis_1 = require("redis");
function getUserIdFromJwt(req) {
    var _a;
    try {
        const authHeader = (_a = req.headers) === null || _a === void 0 ? void 0 : _a.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer '))
            return null;
        const token = authHeader.substring(7).trim();
        if (!token || !process.env.JWT_SECRET)
            return null;
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        return (decoded === null || decoded === void 0 ? void 0 : decoded.userId) || null;
    }
    catch (_b) {
        return null;
    }
}
function getApiKeyFromHeader(req) {
    var _a;
    const authHeader = (_a = req.headers) === null || _a === void 0 ? void 0 : _a.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
        return null;
    const key = authHeader.substring(7).trim();
    return key || null;
}
const redisUrl = process.env.REDIS_URL;
let redisStore;
if (redisUrl) {
    const client = (0, redis_1.createClient)({ url: redisUrl });
    client.on('error', (err) => {
        console.error('[rateLimiter] Redis error:', err);
    });
    client.connect().catch((err) => {
        console.error('[rateLimiter] Redis connect failed:', err);
    });
    redisStore = new rate_limit_redis_1.default({
        sendCommand: (...args) => client.sendCommand(args),
    });
}
// General API rate limiter
exports.apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS || '100'),
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    store: redisStore,
    keyGenerator: (req) => {
        const userId = getUserIdFromJwt(req);
        if (userId)
            return userId;
        return req.ip ? (0, express_rate_limit_1.ipKeyGenerator)(req.ip) : 'unknown';
    },
    validate: { ip: false },
});
// Strict rate limiter for auth endpoints
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Only 5 login attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later',
    skipSuccessfulRequests: true,
    store: redisStore,
    keyGenerator: (req) => req.ip ? (0, express_rate_limit_1.ipKeyGenerator)(req.ip) : 'unknown',
    validate: { ip: false },
});
// MCP rate limiter (key by API key)
exports.mcpLimiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.MCP_RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
    max: parseInt(process.env.MCP_RATE_LIMIT_MAX_REQUESTS || '60'),
    message: 'Too many MCP requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    store: redisStore,
    keyGenerator: (req) => {
        const apiKey = getApiKeyFromHeader(req);
        if (apiKey)
            return apiKey;
        return req.ip ? (0, express_rate_limit_1.ipKeyGenerator)(req.ip) : 'unknown';
    },
    validate: { ip: false },
});
