"use strict";
/**
 * Gemini Service - Reusable Gemini API wrapper with automatic model fallback
 *
 * In development: routes all calls through Archestra LLM Proxy for monitoring & safety.
 * In production: uses direct Google Gemini API with model fallback on rate limits.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWithFallback = generateWithFallback;
exports.getCurrentModel = getCurrentModel;
exports.getAvailableModels = getAvailableModels;
exports.getExhaustedModelCount = getExhaustedModelCount;
const generative_ai_1 = require("@google/generative-ai");
const archestra_1 = __importDefault(require("../config/archestra"));
const logger_1 = __importDefault(require("../utils/logger"));
// Initialize Gemini AI client
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
// ============================================
// MODEL CONFIGURATION
// ============================================
// List of models to cycle through when rate limits are hit
const GEMINI_MODELS = [
    'gemini-2.0-flash',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash-lite',
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-2.5-pro',
    'gemini-pro-latest',
    'gemini-3-flash-preview',
    'gemini-3-pro-preview',
    'gemini-exp-1206',
];
// Track current model index - starts at 0, cycles through on rate limit
let currentModelIndex = 0;
// Track exhausted models with timestamps (model -> exhausted until timestamp)
const exhaustedModels = new Map();
// How long to consider a model exhausted (5 minutes)
const MODEL_EXHAUSTION_DURATION_MS = 5 * 60 * 1000;
// ============================================
// HELPER FUNCTIONS
// ============================================
/**
 * Get the next available model, skipping recently exhausted ones
 */
function getNextAvailableModel() {
    const now = Date.now();
    // Clean up expired exhaustions
    for (const [model, exhaustedUntil] of exhaustedModels.entries()) {
        if (now > exhaustedUntil) {
            exhaustedModels.delete(model);
            logger_1.default.ai('Model cooldown expired', { model });
        }
    }
    // Find next available model
    let attempts = 0;
    while (attempts < GEMINI_MODELS.length) {
        const model = GEMINI_MODELS[currentModelIndex];
        if (!exhaustedModels.has(model)) {
            return model;
        }
        // Move to next model
        currentModelIndex = (currentModelIndex + 1) % GEMINI_MODELS.length;
        attempts++;
    }
    // All models exhausted - clear oldest and return first available
    logger_1.default.ai('All models exhausted, clearing oldest exhaustion');
    const oldestModel = [...exhaustedModels.entries()].sort((a, b) => a[1] - b[1])[0];
    if (oldestModel) {
        exhaustedModels.delete(oldestModel[0]);
        return oldestModel[0];
    }
    return GEMINI_MODELS[0];
}
/**
 * Mark a model as exhausted and move to next
 */
function markModelExhausted(model) {
    const exhaustedUntil = Date.now() + MODEL_EXHAUSTION_DURATION_MS;
    exhaustedModels.set(model, exhaustedUntil);
    currentModelIndex = (currentModelIndex + 1) % GEMINI_MODELS.length;
    logger_1.default.ai('Model marked as exhausted', { model, cooldownMinutes: MODEL_EXHAUSTION_DURATION_MS / 60000 });
}
/**
 * Check if an error is a rate limit error (429)
 */
function isRateLimitError(error) {
    const errorMessage = (error === null || error === void 0 ? void 0 : error.message) || (error === null || error === void 0 ? void 0 : error.toString()) || '';
    return errorMessage.includes('429') ||
        errorMessage.includes('Too Many Requests') ||
        errorMessage.includes('Resource exhausted') ||
        errorMessage.includes('RESOURCE_EXHAUSTED');
}
// ============================================
// ARCHESTRA LLM PROXY (development only)
// ============================================
/**
 * Generate content via Archestra LLM Proxy.
 * Uses OpenAI-compatible chat/completions format that Archestra expects.
 */
async function generateViaProxy(config, prompt) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    const configuredEndpoint = archestra_1.default.llmProxyUrl;
    const normalizedEndpoint = configuredEndpoint.replace(/\/+$/, '');
    const modelName = GEMINI_MODELS[currentModelIndex] || 'gemini-2.0-flash';
    const isOpenAiStyleEndpoint = /\/chat\/completions$/i.test(normalizedEndpoint);
    let endpoint = normalizedEndpoint;
    let headers = { 'Content-Type': 'application/json' };
    let body;
    if (isOpenAiStyleEndpoint) {
        // OpenAI-compatible proxy endpoint
        headers.Authorization = `Bearer ${archestra_1.default.apiKey || process.env.GEMINI_API_KEY || ''}`;
        body = {
            model: modelName,
            messages: [{ role: 'user', content: prompt }],
            temperature: (_a = config.temperature) !== null && _a !== void 0 ? _a : 0.7,
            max_tokens: (_b = config.maxOutputTokens) !== null && _b !== void 0 ? _b : 2000,
            ...(config.responseMimeType === 'application/json' && {
                response_format: { type: 'json_object' }
            })
        };
    }
    else {
        // Gemini-native proxy endpoint:
        // - either ARCHESTRA_LLM_PROXY_URL already includes /v1/gemini/{profile}
        // - or derive full endpoint from baseUrl + profileId
        if (normalizedEndpoint.includes('/v1/gemini/')) {
            endpoint = `${normalizedEndpoint}/v1beta/models/${modelName}:generateContent`;
        }
        else {
            if (!archestra_1.default.profileId) {
                throw new Error('Invalid Archestra Gemini proxy config. Provide ARCHESTRA_PROFILE_ID when ARCHESTRA_LLM_PROXY_URL is a base URL.');
            }
            endpoint = `${normalizedEndpoint}/v1/gemini/${archestra_1.default.profileId}/v1beta/models/${modelName}:generateContent`;
        }
        headers['x-goog-api-key'] = process.env.GEMINI_API_KEY || '';
        body = {
            contents: [
                {
                    role: 'user',
                    parts: [{ text: prompt }]
                }
            ],
            generationConfig: {
                temperature: (_c = config.temperature) !== null && _c !== void 0 ? _c : 0.7,
                maxOutputTokens: (_d = config.maxOutputTokens) !== null && _d !== void 0 ? _d : 2000,
                ...(config.responseMimeType && { responseMimeType: config.responseMimeType })
            }
        };
    }
    logger_1.default.ai('Routing through Archestra LLM Proxy', { endpoint });
    const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    });
    if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        const errMsg = `Archestra proxy error ${response.status}: ${errorBody}`;
        logger_1.default.error(errMsg);
        throw new Error(errMsg);
    }
    const data = await response.json();
    // OpenAI-compatible + Gemini-native response formats
    const geminiText = (_j = (_h = (_g = (_f = (_e = data === null || data === void 0 ? void 0 : data.candidates) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.content) === null || _g === void 0 ? void 0 : _g.parts) === null || _h === void 0 ? void 0 : _h.map((part) => (part === null || part === void 0 ? void 0 : part.text) || '').join('')) === null || _j === void 0 ? void 0 : _j.trim();
    const text = geminiText
        || ((_m = (_l = (_k = data === null || data === void 0 ? void 0 : data.choices) === null || _k === void 0 ? void 0 : _k[0]) === null || _l === void 0 ? void 0 : _l.message) === null || _m === void 0 ? void 0 : _m.content)
        || ((_p = (_o = data === null || data === void 0 ? void 0 : data.choices) === null || _o === void 0 ? void 0 : _o[0]) === null || _p === void 0 ? void 0 : _p.text)
        || (data === null || data === void 0 ? void 0 : data.response)
        || '';
    if (!text) {
        throw new Error('Empty response from Archestra LLM Proxy');
    }
    logger_1.default.ai('Archestra proxy generation successful');
    return text.trim();
}
// ============================================
// MAIN EXPORT
// ============================================
/**
 * Generate content with automatic model fallback on rate limits
 *
 * @param config - Gemini generation config (temperature, maxOutputTokens, etc.)
 * @param prompt - The prompt to send to the model
 * @param maxRetries - Maximum number of retry attempts (default: 5)
 * @returns The generated text response
 *
 * @example
 * const response = await generateWithFallback(
 *     { temperature: 0.7, maxOutputTokens: 2000, responseMimeType: 'application/json' },
 *     'Your prompt here'
 * );
 */
async function generateWithFallback(config, prompt, maxRetries = 5) {
    // ── Dev mode: route through Archestra LLM Proxy ──
    if (archestra_1.default.useLlmProxy) {
        try {
            return await generateViaProxy(config, prompt);
        }
        catch (proxyError) {
            logger_1.default.ai('Archestra proxy failed, falling back to direct Gemini', {
                error: proxyError.message
            });
            // Fall through to direct Gemini calls below
        }
    }
    // ── Production / fallback: direct Gemini API with model cycling ──
    let lastError;
    let attempts = 0;
    while (attempts < maxRetries) {
        const modelName = getNextAvailableModel();
        try {
            logger_1.default.ai('Attempting generation', { model: modelName, attempt: attempts + 1 });
            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: config
            });
            const result = await model.generateContent(prompt);
            const text = result.response.text().trim();
            logger_1.default.ai('Generation successful', { model: modelName });
            return text;
        }
        catch (error) {
            lastError = error;
            if (isRateLimitError(error)) {
                logger_1.default.ai('Rate limit hit, switching model', {
                    exhaustedModel: modelName,
                    attempt: attempts + 1
                });
                markModelExhausted(modelName);
                attempts++;
                // Small delay before retry to be nice to the API
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            else {
                // Non-rate-limit error, throw immediately
                logger_1.default.error('Gemini API error (non-rate-limit)', error);
                throw error;
            }
        }
    }
    // All retries exhausted
    logger_1.default.error('All model fallback attempts exhausted', lastError);
    throw lastError;
}
/**
 * Get the current model being used (for debugging/logging)
 */
function getCurrentModel() {
    return GEMINI_MODELS[currentModelIndex];
}
/**
 * Get list of all available models
 */
function getAvailableModels() {
    return [...GEMINI_MODELS];
}
/**
 * Get count of currently exhausted models
 */
function getExhaustedModelCount() {
    const now = Date.now();
    let count = 0;
    for (const [_, exhaustedUntil] of exhaustedModels.entries()) {
        if (now <= exhaustedUntil)
            count++;
    }
    return count;
}
