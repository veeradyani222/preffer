/**
 * Archestra Platform Configuration
 *
 * Used for agent Management API / A2A chat / outgoing email.
 * LLM calls always go directly to Google Gemini (no proxy).
 */

export interface ArchestraConfig {
    /** Base URL of Archestra instance (e.g. http://localhost:9000) */
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

function resolveBaseUrl(): string | null {
    const explicit = process.env.ARCHESTRA_BASE_URL?.replace(/\/+$/, '') || null;
    if (explicit) return explicit;

    // Legacy: derive host from former LLM proxy URL so existing .env still works for A2A
    const legacyProxyUrl = process.env.ARCHESTRA_LLM_PROXY_URL?.replace(/\/+$/, '') || null;
    if (!legacyProxyUrl) return null;

    try {
        const parsed = new URL(legacyProxyUrl);
        return `${parsed.protocol}//${parsed.host}`;
    } catch {
        return null;
    }
}

function loadConfig(): ArchestraConfig {
    return {
        baseUrl: resolveBaseUrl(),
        apiKey: process.env.ARCHESTRA_API_KEY || null,
        a2aToken: process.env.ARCHESTRA_A2A_TOKEN || null,
        teamId: process.env.ARCHESTRA_TEAM_ID || null,
        llmApiKeyId: process.env.ARCHESTRA_LLM_API_KEY_ID || null,
    };
}

const archestraConfig = loadConfig();

export default archestraConfig;
