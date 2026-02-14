"use strict";
/**
 * Archestra Platform Configuration
 *
 * LLM Proxy: In development, all Gemini calls are routed through Archestra's
 * LLM proxy for security, monitoring, and cost tracking.
 * In production, direct Gemini API calls are used (existing behavior).
 *
 * Set ARCHESTRA_LLM_PROXY_URL in .env to enable.
 * Example: ARCHESTRA_LLM_PROXY_URL=http://localhost:9000/v1/gemini/8f7597d8-a7b6-4704-adc5-07df4e470d8c
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isArchestraEnabled = isArchestraEnabled;
function loadConfig() {
    var _a;
    const isDev = process.env.NODE_ENV !== 'production';
    const llmProxyUrl = ((_a = process.env.ARCHESTRA_LLM_PROXY_URL) === null || _a === void 0 ? void 0 : _a.replace(/\/+$/, '')) || null;
    const profileId = process.env.ARCHESTRA_PROFILE_ID || null;
    const apiKey = process.env.ARCHESTRA_API_KEY || null;
    const a2aToken = process.env.ARCHESTRA_A2A_TOKEN || null;
    const teamId = process.env.ARCHESTRA_TEAM_ID || null;
    const llmApiKeyId = process.env.ARCHESTRA_LLM_API_KEY_ID || null;
    // Derive base URL from proxy URL (e.g. http://localhost:9000)
    let baseUrl = null;
    if (llmProxyUrl) {
        try {
            const parsed = new URL(llmProxyUrl);
            baseUrl = `${parsed.protocol}//${parsed.host}`;
        }
        catch ( /* ignore invalid URL */_b) { /* ignore invalid URL */ }
    }
    return {
        llmProxyUrl,
        profileId,
        useLlmProxy: isDev && !!llmProxyUrl,
        baseUrl,
        apiKey,
        a2aToken,
        teamId,
        llmApiKeyId,
    };
}
const archestraConfig = loadConfig();
function isArchestraEnabled() {
    return archestraConfig.useLlmProxy;
}
exports.default = archestraConfig;
