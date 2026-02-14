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

function getTeamId(): string {
    const teamId = process.env.ARCHESTRA_TEAM_ID;
    if (!teamId) throw new Error('ARCHESTRA_TEAM_ID not configured');
    return teamId;
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
    const teamId = getTeamId();
    const llmApiKeyId = process.env.ARCHESTRA_LLM_API_KEY_ID || undefined;

    const systemPrompt = buildSystemPrompt(portfolio);

    const body: Record<string, any> = {
        name: `${portfolio.ai_manager_name} — Portfolio AI`,
        agentType: 'agent',
        systemPrompt,
        userPrompt: portfolio.ai_manager_custom_instructions || null,
        description: `AI manager for portfolio: ${portfolio.name}`,
        llmModel: 'gemini-2.0-flash',
        teams: [teamId],
        labels: [
            { key: 'source', value: 'portfolio-builder' },
            { key: 'portfolio-id', value: portfolioId },
        ],
        isDefault: false,
        isDemo: false,
    };

    if (llmApiKeyId) body.llmApiKeyId = llmApiKeyId;

    logger.ai('Creating Archestra agent', { name: body.name, portfolioId });

    const response = await fetch(`${baseUrl}/api/agents`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const err = await response.text().catch(() => '');
        throw new Error(`Failed to create Archestra agent (${response.status}): ${err}`);
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

    const response = await fetch(`${baseUrl}/api/agents/${agentId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const err = await response.text().catch(() => '');
        throw new Error(`Failed to update Archestra agent (${response.status}): ${err}`);
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
 * Send a visitor chat message through the Archestra A2A protocol.
 * Conversation history is embedded in the message text (A2A is stateless).
 */
export async function sendA2AMessage(
    agentId: string,
    message: string,
    history: { role: 'user' | 'assistant'; content: string }[] = [],
    aiManagerName: string = 'AI Manager'
): Promise<A2AResponse> {
    const baseUrl = getBaseUrl();
    const headers = getA2AHeaders();

    // Build full message with conversation context (A2A is stateless)
    let fullMessage = message;

    if (history.length > 0) {
        const historyStr = history
            .map((m) => `${m.role === 'user' ? 'Visitor' : aiManagerName}: ${m.content}`)
            .join('\n');
        fullMessage = `Previous conversation:\n${historyStr}\n\nVisitor's new message: ${message}`;
    }

    const body = {
        jsonrpc: '2.0',
        id: `msg-${Date.now()}`,
        method: 'message/send',
        params: {
            message: {
                parts: [{ kind: 'text', text: fullMessage }],
            },
        },
    };

    logger.ai('Sending A2A message', { agentId, messageLength: fullMessage.length });

    const response = await fetch(`${baseUrl}/v1/a2a/${agentId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const err = await response.text().catch(() => '');
        throw new Error(`A2A request failed (${response.status}): ${err}`);
    }

    const data = await response.json();

    if (data.error) {
        throw new Error(`A2A error: ${data.error.message || JSON.stringify(data.error)}`);
    }

    const result = data.result;
    const text = result.parts?.map((p: any) => p.text).join('') || '';

    logger.ai('A2A response received', { agentId, messageId: result.messageId });

    return {
        messageId: result.messageId,
        role: result.role,
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
        archestraConfig.apiKey &&
        process.env.ARCHESTRA_A2A_TOKEN &&
        process.env.ARCHESTRA_TEAM_ID
    );
}

export default {
    createAgent,
    createAgentOrFallback,
    updateAgent,
    deleteAgent,
    sendA2AMessage,
    buildSystemPrompt,
    isA2AEnabled,
};
