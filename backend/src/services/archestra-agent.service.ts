/**
 * Archestra Agent Service
 *
 * Maps portfolio AI managers to Archestra agents via the Management API,
 * and routes visitor chat messages through the A2A protocol.
 *
 * Management API (CRUD): uses ARCHESTRA_API_KEY (Better Auth API key)
 * A2A chat endpoint:     uses ARCHESTRA_A2A_TOKEN (archestra_xxx bearer token)
 */

import archestraConfig from '../config/archestra';
import logger from '../utils/logger';

// ============================================
// TYPES
// ============================================

export interface ArchestraAgent {
    id: string;
    name: string;
    agentType: string;
    systemPrompt: string;
    userPrompt: string | null;
    description: string | null;
    llmModel: string | null;
    teams: { id: string; name: string }[];
    createdAt: string;
    updatedAt: string;
}

export interface A2AResponse {
    messageId: string;
    role: string;
    text: string;
}

interface PortfolioForPrompt {
    name: string;
    profession?: string | null;
    description?: string | null;
    sections?: any[];
    ai_manager_name: string | null;
    ai_manager_personality: string | null;
    ai_manager_has_portfolio_access: boolean;
    ai_manager_custom_instructions?: string | null;
    wizard_data?: any;
}

let cachedLlmApiKeyId: string | null | undefined;

// ============================================
// CONFIG HELPERS
// ============================================

function getManagementHeaders(): Record<string, string> {
    const apiKey = archestraConfig.apiKey;
    if (!apiKey) throw new Error('ARCHESTRA_API_KEY not configured');
    return {
        'Content-Type': 'application/json',
        // Archestra Management API expects the API key directly (not Bearer).
        Authorization: apiKey,
    };
}

function getA2AHeaders(): Record<string, string> {
    const token = process.env.ARCHESTRA_A2A_TOKEN;
    if (!token) throw new Error('ARCHESTRA_A2A_TOKEN not configured');
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
    };
}

function getBaseUrl(): string {
    const url = archestraConfig.baseUrl;
    if (!url) throw new Error('Archestra base URL not configured (set ARCHESTRA_LLM_PROXY_URL)');
    return url;
}

async function resolveLlmApiKeyId(baseUrl: string): Promise<string | null> {
    const configured = process.env.ARCHESTRA_LLM_API_KEY_ID || null;
    if (configured) return configured;
    if (cachedLlmApiKeyId !== undefined) return cachedLlmApiKeyId;

    try {
        const response = await fetch(`${baseUrl}/api/agents`, {
            method: 'GET',
            headers: getManagementHeaders(),
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            cachedLlmApiKeyId = null;
            return null;
        }

        const data = await response.json();
        const agents = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        const discovered = agents.find((a: any) => typeof a?.llmApiKeyId === 'string' && a.llmApiKeyId)?.llmApiKeyId || null;
        cachedLlmApiKeyId = discovered;
        return discovered;
    } catch {
        cachedLlmApiKeyId = null;
        return null;
    }
}

async function fetchArchestraWithRetry(
    url: string,
    init: RequestInit,
    label: string,
    retries: number = 2
): Promise<Response> {
    let lastErr: any;

    for (let attempt = 1; attempt <= retries + 1; attempt++) {
        try {
            const response = await fetch(url, {
                ...init,
                // Avoid hanging sockets on unstable networks.
                signal: AbortSignal.timeout(15000),
            });

            // Retry only on transient server failures.
            if (response.status >= 500 && attempt <= retries) {
                await new Promise((r) => setTimeout(r, 400 * attempt));
                continue;
            }

            return response;
        } catch (error: any) {
            lastErr = error;
            if (attempt <= retries) {
                await new Promise((r) => setTimeout(r, 400 * attempt));
                continue;
            }
        }
    }

    const reason = lastErr?.cause?.message || lastErr?.message || String(lastErr);
    throw new Error(`${label} network error after retries: ${reason}`);
}

// ============================================
// SYSTEM PROMPT BUILDER
// ============================================

function buildPortfolioContext(portfolio: PortfolioForPrompt): string {
    const lines: string[] = [];
    const wizardData = portfolio.wizard_data || {};

    lines.push(`Portfolio Name: ${wizardData.name || portfolio.name || 'Untitled'}`);
    if (wizardData.profession || portfolio.profession) {
        lines.push(`Profession/Industry: ${wizardData.profession || portfolio.profession}`);
    }
    if (wizardData.description || portfolio.description) {
        lines.push(`Description: ${wizardData.description || portfolio.description}`);
    }

    const sections = Array.isArray(portfolio.sections) ? portfolio.sections : [];
    sections
        .filter((s: any) => s?.content && Object.keys(s.content).length > 0)
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
        .forEach((section: any, idx: number) => {
            lines.push(
                `Section ${idx + 1} (${section.type} - ${section.title}): ${JSON.stringify(section.content)}`
            );
        });

    return lines.join('\n');
}

export function buildSystemPrompt(portfolio: PortfolioForPrompt): string {
    const name = portfolio.ai_manager_name || 'AI Manager';
    const personality = portfolio.ai_manager_personality || 'professional';
    const context = portfolio.ai_manager_has_portfolio_access
        ? buildPortfolioContext(portfolio)
        : '';

    let prompt = `You are ${name}, a ${personality} AI manager representing this portfolio publicly.

Rules:
- Always introduce yourself naturally as ${name} when appropriate.
- Answer only based on the portfolio context below.
- Never just say unnecessary stuff based on the instructions, you have to reply based on the instructions, not just say them anywhere.
- If information is missing, say you don't have that specific detail yet and invite the visitor to contact the owner.
- Keep responses concise, helpful, and professional.
- Never reveal raw JSON.`;

    if (context) {
        prompt += `\n\nPortfolio Context:\n${context}`;
    }

    return prompt;
}

// ============================================
// AGENT CRUD (Management API)
// ============================================

/**
 * Create an Archestra agent mapped to a portfolio's AI manager.
 * Returns the created agent (with id to store in portfolios.archestra_agent_id).
 */
export async function createAgent(portfolio: PortfolioForPrompt, portfolioId: string): Promise<ArchestraAgent> {
    const baseUrl = getBaseUrl();
    const headers = getManagementHeaders();
    const llmApiKeyId = (await resolveLlmApiKeyId(baseUrl)) || undefined;

    const systemPrompt = buildSystemPrompt(portfolio);

    const body: Record<string, any> = {
        name: `${portfolio.ai_manager_name} — Portfolio AI`,
        agentType: 'agent',
        systemPrompt,
        userPrompt: portfolio.ai_manager_custom_instructions || null,
        description: `AI manager for portfolio: ${portfolio.name}`,
        llmModel: 'gemini-2.0-flash',
        // Archestra now validates teams as required; empty array keeps agent unrestricted.
        teams: [],
        labels: [
            { key: 'source', value: 'portfolio-builder' },
            { key: 'portfolio-id', value: portfolioId },
        ],
        isDefault: false,
        isDemo: false,
    };

    if (llmApiKeyId) {
        body.llmApiKeyId = llmApiKeyId;
    } else {
        logger.ai('No ARCHESTRA_LLM_API_KEY_ID available; agent may fail on A2A depending on provider config');
    }

    logger.ai('Creating Archestra agent', { name: body.name, portfolioId });

    const endpoint = `${baseUrl}/api/agents`;
    const response = await fetchArchestraWithRetry(
        endpoint,
        {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        },
        'createAgent'
    );

    if (!response.ok) {
        const err = await response.text().catch(() => '');
        throw new Error(`Failed to create Archestra agent (${response.status}) at ${endpoint}: ${err}`);
    }

    const agent: ArchestraAgent = await response.json();
    logger.ai('Archestra agent created', { agentId: agent.id, name: agent.name });
    return agent;
}

/**
 * Best-effort create: returns null on failure so callers can continue
 * with direct Gemini fallback (no linked Archestra agent).
 */
export async function createAgentOrFallback(
    portfolio: PortfolioForPrompt,
    portfolioId: string
): Promise<ArchestraAgent | null> {
    try {
        return await createAgent(portfolio, portfolioId);
    } catch (error: any) {
        logger.error('Archestra agent creation failed; continuing without linked agent', {
            portfolioId,
            error: error?.message || String(error),
        });
        return null;
    }
}

/**
 * Update an existing Archestra agent when portfolio content or AI manager settings change.
 */
export async function updateAgent(agentId: string, portfolio: PortfolioForPrompt): Promise<ArchestraAgent> {
    const baseUrl = getBaseUrl();
    const headers = getManagementHeaders();

    const systemPrompt = buildSystemPrompt(portfolio);

    const body: Record<string, any> = {
        name: `${portfolio.ai_manager_name || 'AI Manager'} — Portfolio AI`,
        systemPrompt,
        userPrompt: portfolio.ai_manager_custom_instructions || null,
    };

    logger.ai('Updating Archestra agent', { agentId });

    const endpoint = `${baseUrl}/api/agents/${agentId}`;
    const response = await fetchArchestraWithRetry(
        endpoint,
        {
            method: 'PUT',
            headers,
            body: JSON.stringify(body),
        },
        'updateAgent'
    );

    if (!response.ok) {
        const err = await response.text().catch(() => '');
        throw new Error(`Failed to update Archestra agent (${response.status}) at ${endpoint}: ${err}`);
    }

    const agent: ArchestraAgent = await response.json();
    logger.ai('Archestra agent updated', { agentId: agent.id });
    return agent;
}

/**
 * Delete an Archestra agent (when AI manager is disabled or portfolio is deleted).
 */
export async function deleteAgent(agentId: string): Promise<void> {
    const baseUrl = getBaseUrl();
    const headers = getManagementHeaders();

    logger.ai('Deleting Archestra agent', { agentId });

    const response = await fetch(`${baseUrl}/api/agents/${agentId}`, {
        method: 'DELETE',
        headers,
    });

    if (!response.ok) {
        const err = await response.text().catch(() => '');
        logger.error(`Failed to delete Archestra agent (${response.status}): ${err}`);
        // Don't throw — agent deletion is best-effort cleanup
    } else {
        logger.ai('Archestra agent deleted', { agentId });
    }
}

// ============================================
// A2A CHAT
// ============================================

/**
 * Send a visitor chat message through Archestra's A2A JSON-RPC endpoint.
 * Endpoint: /v1/a2a/:agentId
 */
export async function sendA2AMessage(
    agentId: string,
    message: string,
    history: { role: 'user' | 'assistant'; content: string }[] = [],
    aiManagerName: string = 'AI Manager'
): Promise<A2AResponse> {
    const baseUrl = getBaseUrl();
    const headers = getA2AHeaders();
    const apiKey = archestraConfig.apiKey;

    // Build full message with conversation context
    let fullMessage = message;

    if (history.length > 0) {
        const historyStr = history
            .map((m) => `${m.role === 'user' ? 'Visitor' : aiManagerName}: ${m.content}`)
            .join('\n');
        fullMessage = `Previous conversation:\n${historyStr}\n\nVisitor's new message: ${message}`;
    }

    const body = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'message/send',
        params: {
            message: {
                parts: [{ kind: 'text', text: fullMessage }],
            },
        },
    };

    logger.ai('Sending message via Archestra A2A endpoint', {
        agentId,
        messageLength: fullMessage.length,
        endpoint: `${baseUrl}/v1/a2a/${agentId}`,
    });

    const response = await fetch(`${baseUrl}/v1/a2a/${agentId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const err = await response.text().catch(() => '');
        throw new Error(`Archestra A2A request failed (${response.status}): ${err}`);
    }

    const data = await response.json();
    if (data?.error) {
        const errorMessage = data.error.message || JSON.stringify(data.error);
        const needsInteractionsApi =
            typeof errorMessage === 'string' &&
            errorMessage.toLowerCase().includes('supports interactions api');

        // If model requires Interactions API, try Archestra Direct Chat endpoint.
        if (needsInteractionsApi && apiKey) {
            const directHeaders: Array<Record<string, string>> = [
                {
                    'Content-Type': 'application/json',
                    Authorization: apiKey,
                },
                {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
            ];

            const orgId = process.env.ARCHESTRA_ORG_ID;
            if (orgId) {
                directHeaders.forEach((h) => {
                    h['x-organization-id'] = orgId;
                });
            }

            for (const [idx, h] of directHeaders.entries()) {
                logger.ai('A2A requires Interactions API; trying Archestra Direct Chat', {
                    agentId,
                    authMode: idx === 0 ? 'raw' : 'bearer',
                    endpoint: `${baseUrl}/api/chat/${agentId}`,
                    hasOrgId: !!orgId,
                });

                const directResp = await fetch(`${baseUrl}/api/chat/${agentId}`, {
                    method: 'POST',
                    headers: h,
                    body: JSON.stringify({ message: fullMessage }),
                });

                if (!directResp.ok) {
                    continue;
                }

                const directData = await directResp.json().catch(() => ({} as any));
                const directText =
                    directData?.text ||
                    directData?.response ||
                    directData?.message ||
                    directData?.result?.parts?.map((p: any) => p?.text).join('') ||
                    directData?.result?.text ||
                    '';

                if (directText && String(directText).trim()) {
                    const directMessageId = directData?.messageId || directData?.id || `chat-${Date.now()}`;
                    logger.ai('Archestra Direct Chat response received', { agentId, messageId: directMessageId });
                    return {
                        messageId: String(directMessageId),
                        role: directData?.role || 'assistant',
                        text: String(directText).trim(),
                    };
                }
            }
        }

        throw new Error(`Archestra A2A error: ${errorMessage}`);
    }

    const parts = data?.result?.message?.parts || data?.result?.parts || [];
    const textFromParts = Array.isArray(parts)
        ? parts.map((p: any) => p?.text).filter(Boolean).join('')
        : '';

    const text =
        textFromParts ||
        data?.result?.message?.text ||
        data?.result?.text ||
        data?.message ||
        data?.text ||
        '';

    const messageId =
        data?.result?.message?.id ||
        data?.result?.id ||
        String(data?.id || `a2a-${Date.now()}`);

    logger.ai('Archestra A2A response received', { agentId, messageId });

    return {
        messageId,
        role: 'assistant',
        text,
    };
}

// ============================================
// INTEGRATION HELPERS
// ============================================

/**
 * Check if A2A integration is available (all required env vars are set).
 */
export function isA2AEnabled(): boolean {
    return !!(
        archestraConfig.baseUrl &&
        archestraConfig.a2aToken
    );
}

export function isAgentA2ACompatible(agentId: string | null | undefined): boolean {
    return !!agentId;
}

export default {
    createAgent,
    createAgentOrFallback,
    updateAgent,
    deleteAgent,
    sendA2AMessage,
    buildSystemPrompt,
    isA2AEnabled,
    isAgentA2ACompatible,
};

