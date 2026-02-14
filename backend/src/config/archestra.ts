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

export interface ArchestraConfig {
    /** Full LLM proxy URL (e.g. http://localhost:9000/v1/gemini/chat/completions) */
    llmProxyUrl: string | null;
    /** Profile ID for the LLM proxy */
    profileId: string | null;
    /** Whether to route LLM calls through Archestra (true in dev when URL is set) */
    useLlmProxy: boolean;
    /** Base URL of Archestra instance (derived from proxy URL) */
    baseUrl: string | null;
    /** API key for Management API (agent CRUD) */
    apiKey: string | null;
    /** A2A bearer token (archestra_xxx) for chat messages */
    a2aToken: string | null;
    /** Team ID to assign new agents to */
    teamId: string | null;
    /** LLM API key ID registered in Archestra (optional, for per-agent model routing) */
    llmApiKeyId: string | null;
}

function loadConfig(): ArchestraConfig {
    const isDev = process.env.NODE_ENV !== 'production';
    const llmProxyUrl = process.env.ARCHESTRA_LLM_PROXY_URL?.replace(/\/+$/, '') || null;
    const profileId = process.env.ARCHESTRA_PROFILE_ID || null;
    const apiKey = process.env.ARCHESTRA_API_KEY || null;
    const a2aToken = process.env.ARCHESTRA_A2A_TOKEN || null;
    const teamId = process.env.ARCHESTRA_TEAM_ID || null;
    const llmApiKeyId = process.env.ARCHESTRA_LLM_API_KEY_ID || null;

    // Derive base URL from proxy URL (e.g. http://localhost:9000)
    let baseUrl: string | null = null;
    if (llmProxyUrl) {
        try {
            const parsed = new URL(llmProxyUrl);
            baseUrl = `${parsed.protocol}//${parsed.host}`;
        } catch { /* ignore invalid URL */ }
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

export function isArchestraEnabled(): boolean {
    return archestraConfig.useLlmProxy;
}

export default archestraConfig;
