"use strict";
/**
 * Archestra Agent Service
 *
 * Maps portfolio AI managers to Archestra agents via the Management API,
 * and routes visitor chat messages through the A2A protocol.
 *
 * Management API (CRUD): uses ARCHESTRA_API_KEY (Better Auth API key)
 * A2A chat endpoint:     uses ARCHESTRA_A2A_TOKEN (archestra_xxx bearer token)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSystemPrompt = buildSystemPrompt;
exports.createAgent = createAgent;
exports.createAgentOrFallback = createAgentOrFallback;
exports.updateAgent = updateAgent;
exports.deleteAgent = deleteAgent;
exports.sendA2AMessage = sendA2AMessage;
exports.isA2AEnabled = isA2AEnabled;
const archestra_1 = __importDefault(require("../config/archestra"));
const logger_1 = __importDefault(require("../utils/logger"));
// ============================================
// CONFIG HELPERS
// ============================================
function getManagementHeaders() {
    const apiKey = archestra_1.default.apiKey;
    if (!apiKey)
        throw new Error('ARCHESTRA_API_KEY not configured');
    return {
        'Content-Type': 'application/json',
        // Archestra Management API expects the API key directly (not Bearer).
        Authorization: apiKey,
    };
}
function getA2AHeaders() {
    const token = process.env.ARCHESTRA_A2A_TOKEN;
    if (!token)
        throw new Error('ARCHESTRA_A2A_TOKEN not configured');
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
    };
}
function getBaseUrl() {
    const url = archestra_1.default.baseUrl;
    if (!url)
        throw new Error('Archestra base URL not configured (set ARCHESTRA_LLM_PROXY_URL)');
    return url;
}
function getTeamId() {
    const teamId = process.env.ARCHESTRA_TEAM_ID;
    if (!teamId)
        throw new Error('ARCHESTRA_TEAM_ID not configured');
    return teamId;
}
// ============================================
// SYSTEM PROMPT BUILDER
// ============================================
function buildPortfolioContext(portfolio) {
    const lines = [];
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
        .filter((s) => (s === null || s === void 0 ? void 0 : s.content) && Object.keys(s.content).length > 0)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .forEach((section, idx) => {
        lines.push(`Section ${idx + 1} (${section.type} - ${section.title}): ${JSON.stringify(section.content)}`);
    });
    return lines.join('\n');
}
function buildSystemPrompt(portfolio) {
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
async function createAgent(portfolio, portfolioId) {
    const baseUrl = getBaseUrl();
    const headers = getManagementHeaders();
    const teamId = getTeamId();
    const llmApiKeyId = process.env.ARCHESTRA_LLM_API_KEY_ID || undefined;
    const systemPrompt = buildSystemPrompt(portfolio);
    const body = {
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
    if (llmApiKeyId)
        body.llmApiKeyId = llmApiKeyId;
    logger_1.default.ai('Creating Archestra agent', { name: body.name, portfolioId });
    const response = await fetch(`${baseUrl}/api/agents`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const err = await response.text().catch(() => '');
        throw new Error(`Failed to create Archestra agent (${response.status}): ${err}`);
    }
    const agent = await response.json();
    logger_1.default.ai('Archestra agent created', { agentId: agent.id, name: agent.name });
    return agent;
}
/**
 * Best-effort create: returns null on failure so callers can continue
 * with direct Gemini fallback (no linked Archestra agent).
 */
async function createAgentOrFallback(portfolio, portfolioId) {
    try {
        return await createAgent(portfolio, portfolioId);
    }
    catch (error) {
        logger_1.default.error('Archestra agent creation failed; continuing without linked agent', {
            portfolioId,
            error: (error === null || error === void 0 ? void 0 : error.message) || String(error),
        });
        return null;
    }
}
/**
 * Update an existing Archestra agent when portfolio content or AI manager settings change.
 */
async function updateAgent(agentId, portfolio) {
    const baseUrl = getBaseUrl();
    const headers = getManagementHeaders();
    const systemPrompt = buildSystemPrompt(portfolio);
    const body = {
        name: `${portfolio.ai_manager_name || 'AI Manager'} — Portfolio AI`,
        systemPrompt,
        userPrompt: portfolio.ai_manager_custom_instructions || null,
    };
    logger_1.default.ai('Updating Archestra agent', { agentId });
    const response = await fetch(`${baseUrl}/api/agents/${agentId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const err = await response.text().catch(() => '');
        throw new Error(`Failed to update Archestra agent (${response.status}): ${err}`);
    }
    const agent = await response.json();
    logger_1.default.ai('Archestra agent updated', { agentId: agent.id });
    return agent;
}
/**
 * Delete an Archestra agent (when AI manager is disabled or portfolio is deleted).
 */
async function deleteAgent(agentId) {
    const baseUrl = getBaseUrl();
    const headers = getManagementHeaders();
    logger_1.default.ai('Deleting Archestra agent', { agentId });
    const response = await fetch(`${baseUrl}/api/agents/${agentId}`, {
        method: 'DELETE',
        headers,
    });
    if (!response.ok) {
        const err = await response.text().catch(() => '');
        logger_1.default.error(`Failed to delete Archestra agent (${response.status}): ${err}`);
        // Don't throw — agent deletion is best-effort cleanup
    }
    else {
        logger_1.default.ai('Archestra agent deleted', { agentId });
    }
}
// ============================================
// A2A CHAT
// ============================================
/**
 * Send a visitor chat message through the Archestra A2A protocol.
 * Conversation history is embedded in the message text (A2A is stateless).
 */
async function sendA2AMessage(agentId, message, history = [], aiManagerName = 'AI Manager') {
    var _a;
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
    logger_1.default.ai('Sending A2A message', { agentId, messageLength: fullMessage.length });
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
    const text = ((_a = result.parts) === null || _a === void 0 ? void 0 : _a.map((p) => p.text).join('')) || '';
    logger_1.default.ai('A2A response received', { agentId, messageId: result.messageId });
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
function isA2AEnabled() {
    return !!(archestra_1.default.baseUrl &&
        archestra_1.default.apiKey &&
        process.env.ARCHESTRA_A2A_TOKEN &&
        process.env.ARCHESTRA_TEAM_ID);
}
exports.default = {
    createAgent,
    createAgentOrFallback,
    updateAgent,
    deleteAgent,
    sendA2AMessage,
    buildSystemPrompt,
    isA2AEnabled,
};
