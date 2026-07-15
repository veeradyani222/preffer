"use strict";
/**
 * Archestra Platform Configuration
 *
 * Used for agent Management API / A2A chat / outgoing email.
 * LLM calls always go directly to Google Gemini (no proxy).
 */
Object.defineProperty(exports, "__esModule", { value: true });
function resolveBaseUrl() {
    var _a, _b;
    const explicit = ((_a = process.env.ARCHESTRA_BASE_URL) === null || _a === void 0 ? void 0 : _a.replace(/\/+$/, '')) || null;
    if (explicit)
        return explicit;
    // Legacy: derive host from former LLM proxy URL so existing .env still works for A2A
    const legacyProxyUrl = ((_b = process.env.ARCHESTRA_LLM_PROXY_URL) === null || _b === void 0 ? void 0 : _b.replace(/\/+$/, '')) || null;
    if (!legacyProxyUrl)
        return null;
    try {
        const parsed = new URL(legacyProxyUrl);
        return `${parsed.protocol}//${parsed.host}`;
    }
    catch (_c) {
        return null;
    }
}
function loadConfig() {
    return {
        baseUrl: resolveBaseUrl(),
        apiKey: process.env.ARCHESTRA_API_KEY || null,
        a2aToken: process.env.ARCHESTRA_A2A_TOKEN || null,
        teamId: process.env.ARCHESTRA_TEAM_ID || null,
        llmApiKeyId: process.env.ARCHESTRA_LLM_API_KEY_ID || null,
    };
}
const archestraConfig = loadConfig();
exports.default = archestraConfig;
