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
exports.isAgentA2ACompatible = isAgentA2ACompatible;
const archestra_1 = __importDefault(require("../config/archestra"));
const logger_1 = __importDefault(require("../utils/logger"));
const ai_capabilities_1 = require("../constants/ai-capabilities");
let cachedLlmApiKeyId;
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
async function resolveLlmApiKeyId(baseUrl) {
    var _a;
    const configured = process.env.ARCHESTRA_LLM_API_KEY_ID || null;
    if (configured)
        return configured;
    if (cachedLlmApiKeyId !== undefined)
        return cachedLlmApiKeyId;
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
        const agents = Array.isArray(data === null || data === void 0 ? void 0 : data.data) ? data.data : Array.isArray(data) ? data : [];
        const discovered = ((_a = agents.find((a) => typeof (a === null || a === void 0 ? void 0 : a.llmApiKeyId) === 'string' && a.llmApiKeyId)) === null || _a === void 0 ? void 0 : _a.llmApiKeyId) || null;
        cachedLlmApiKeyId = discovered;
        return discovered;
    }
    catch (_b) {
        cachedLlmApiKeyId = null;
        return null;
    }
}
async function fetchArchestraWithRetry(url, init, label, retries = 2) {
    var _a;
    let lastErr;
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
        }
        catch (error) {
            lastErr = error;
            if (attempt <= retries) {
                await new Promise((r) => setTimeout(r, 400 * attempt));
                continue;
            }
        }
    }
    const reason = ((_a = lastErr === null || lastErr === void 0 ? void 0 : lastErr.cause) === null || _a === void 0 ? void 0 : _a.message) || (lastErr === null || lastErr === void 0 ? void 0 : lastErr.message) || String(lastErr);
    throw new Error(`${label} network error after retries: ${reason}`);
}
function getEnabledCapabilityKeys(portfolio) {
    var _a;
    const config = ((_a = portfolio === null || portfolio === void 0 ? void 0 : portfolio.wizard_data) === null || _a === void 0 ? void 0 : _a.aiCapabilities) || {};
    return ai_capabilities_1.AI_CAPABILITY_KEYS.filter((k) => { var _a; return Boolean((_a = config === null || config === void 0 ? void 0 : config[k]) === null || _a === void 0 ? void 0 : _a.enabled); });
}
// ============================================
// SYSTEM PROMPT BUILDER
// ============================================
function buildPortfolioContext(portfolio) {
    const lines = [];
    const wizardData = portfolio.wizard_data || {};
    lines.push(`Professional Page Name: ${wizardData.name || portfolio.name || 'Untitled'}`);
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
function buildCapabilityPolicy(portfolio) {
    var _a;
    const wizardData = portfolio.wizard_data || {};
    const capabilityConfig = wizardData.aiCapabilities || {};
    const enabledKeys = ai_capabilities_1.AI_CAPABILITY_KEYS.filter((k) => { var _a; return (_a = capabilityConfig === null || capabilityConfig === void 0 ? void 0 : capabilityConfig[k]) === null || _a === void 0 ? void 0 : _a.enabled; });
    if (enabledKeys.length === 0) {
        return 'No structured capability tools are enabled. Keep chat helpful and informational.';
    }
    const lines = [
        'Enabled structured capabilities:',
    ];
    const baseRules = [
        '- Ask for missing required details once, politely.',
        '- One contact method (email or phone) is enough when contact is needed.',
        '- For actionable requests, offer owner callback instead of asking the visitor to contact the owner first.',
        '- If the visitor declines contact info, continue helping without forcing.',
        '- Do NOT mention internal tools, tool names, or tool availability to visitors.',
        '- Infer visitor intent from natural language semantics, not exact keywords.',
        '- Capture/escalation is handled automatically by backend systems after each reply.',
        '- For actionable intents, summarize what will happen next in plain language.',
        '- If details are missing for an action, ask one concise follow-up question.',
        '- Never claim an external action was completed unless it was actually completed.',
    ];
    for (const key of enabledKeys) {
        lines.push(`- ${key}`);
        if (key === 'appointment_requests') {
            const settings = ((_a = capabilityConfig[key]) === null || _a === void 0 ? void 0 : _a.settings) || {};
            lines.push(`  appointment_settings: ${JSON.stringify(settings)}`);
        }
    }
    lines.push('Tool execution protocol (internal behavior rules):');
    lines.push('- Detect intent from context and phrasing, even when the visitor does not use explicit labels.');
    lines.push('- Gather minimal structured details naturally in conversation.');
    lines.push('- When details are sufficient, acknowledge that you have captured the request and proceed.');
    lines.push('- Keep acknowledgements specific (what was captured) but never expose internal tool details.');
    return `${lines.join('\n')}\n${baseRules.join('\n')}`;
}
function buildSystemPrompt(portfolio) {
    const name = portfolio.ai_manager_name || 'AI Representative';
    const personality = portfolio.ai_manager_personality || 'professional';
    const context = portfolio.ai_manager_has_portfolio_access
        ? buildPortfolioContext(portfolio)
        : '';
    let prompt = `You are ${name}, a ${personality} AI representative representing this professional page publicly.

Rules:
- Introduce yourself naturally as ${name} only on your first reply in a conversation.
- If prior conversation already includes your earlier replies, do not re-introduce yourself.
- Answer only based on the portfolio context below.
- Never just say unnecessary stuff based on the instructions, you have to reply based on the instructions, not just say them anywhere.
- If information is missing, say you don't have that specific detail yet and ask: "Would you like the owner to contact you?"
- When intent is actionable, ask for missing structured details naturally and confirm captured details.
- Do not ask visitors to initiate contact with the owner when callback can be offered.
- Keep responses concise, helpful, and according to your personality.
- Never reveal raw JSON.`;
    prompt += `\n\nCapability Policy:\n${buildCapabilityPolicy(portfolio)}`;
    if (context) {
        prompt += `\n\nProfessional Page Context:\n${context}`;
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
    const llmApiKeyId = (await resolveLlmApiKeyId(baseUrl)) || undefined;
    const enabledCapabilityKeys = getEnabledCapabilityKeys(portfolio);
    const systemPrompt = buildSystemPrompt(portfolio);
    const body = {
        name: `${portfolio.ai_manager_name} — Professional Page AI`,
        agentType: 'agent',
        systemPrompt,
        userPrompt: portfolio.ai_manager_custom_instructions || null,
        description: `AI representative for professional page: ${portfolio.name}`,
        llmModel: 'gemini-2.0-flash',
        // Archestra now validates teams as required; empty array keeps agent unrestricted.
        teams: [],
        labels: [
            { key: 'source', value: 'portfolio-builder' },
            { key: 'portfolio-id', value: portfolioId },
            { key: 'enabled-capabilities', value: enabledCapabilityKeys.join(',') || 'none' },
        ],
        isDefault: false,
        isDemo: false,
    };
    if (llmApiKeyId) {
        body.llmApiKeyId = llmApiKeyId;
    }
    else {
        logger_1.default.ai('No ARCHESTRA_LLM_API_KEY_ID available; agent may fail on A2A depending on provider config');
    }
    logger_1.default.ai('Creating Archestra agent', { name: body.name, portfolioId });
    const endpoint = `${baseUrl}/api/agents`;
    const response = await fetchArchestraWithRetry(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    }, 'createAgent');
    if (!response.ok) {
        const err = await response.text().catch(() => '');
        throw new Error(`Failed to create Archestra agent (${response.status}) at ${endpoint}: ${err}`);
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
    const enabledCapabilityKeys = getEnabledCapabilityKeys(portfolio);
    const systemPrompt = buildSystemPrompt(portfolio);
    const body = {
        name: `${portfolio.ai_manager_name || 'AI Representative'} — Professional Page AI`,
        systemPrompt,
        userPrompt: portfolio.ai_manager_custom_instructions || null,
        labels: [
            { key: 'enabled-capabilities', value: enabledCapabilityKeys.join(',') || 'none' },
        ],
    };
    logger_1.default.ai('Updating Archestra agent', { agentId });
    const endpoint = `${baseUrl}/api/agents/${agentId}`;
    const response = await fetchArchestraWithRetry(endpoint, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
    }, 'updateAgent');
    if (!response.ok) {
        const err = await response.text().catch(() => '');
        throw new Error(`Failed to update Archestra agent (${response.status}) at ${endpoint}: ${err}`);
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
 * Send a visitor chat message through Archestra's A2A JSON-RPC endpoint.
 * Endpoint: /v1/a2a/:agentId
 */
async function sendA2AMessage(agentId, message, history = [], aiManagerName = 'AI Representative', analyticsContext) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    const baseUrl = getBaseUrl();
    const headers = getA2AHeaders();
    const apiKey = archestra_1.default.apiKey;
    // Build full message with conversation context
    let fullMessage = message;
    const hasAssistantHistory = history.some((item) => item.role === 'assistant');
    if (history.length > 0) {
        const historyStr = history
            .map((m) => `${m.role === 'user' ? 'Visitor' : aiManagerName}: ${m.content}`)
            .join('\n');
        fullMessage = `Previous conversation:\n${historyStr}\n\nIntroduction state: ${hasAssistantHistory ? 'You have already replied earlier in this conversation. Do NOT re-introduce yourself.' : 'No assistant reply exists yet. You may include one brief introduction.'}\n\nVisitor's new message: ${message}`;
    }
    if (analyticsContext && analyticsContext.trim()) {
        fullMessage = `[Private analytics context]\n${analyticsContext}\n[/Private analytics context]\n\n${fullMessage}`;
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
    logger_1.default.ai('Sending message via Archestra A2A endpoint', {
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
    if (data === null || data === void 0 ? void 0 : data.error) {
        const errorMessage = data.error.message || JSON.stringify(data.error);
        const needsInteractionsApi = typeof errorMessage === 'string' &&
            errorMessage.toLowerCase().includes('supports interactions api');
        // If model requires Interactions API, try Archestra Direct Chat endpoint.
        if (needsInteractionsApi && apiKey) {
            const directHeaders = [
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
                logger_1.default.ai('A2A requires Interactions API; trying Archestra Direct Chat', {
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
                const directData = await directResp.json().catch(() => ({}));
                const directText = (directData === null || directData === void 0 ? void 0 : directData.text) ||
                    (directData === null || directData === void 0 ? void 0 : directData.response) ||
                    (directData === null || directData === void 0 ? void 0 : directData.message) ||
                    ((_b = (_a = directData === null || directData === void 0 ? void 0 : directData.result) === null || _a === void 0 ? void 0 : _a.parts) === null || _b === void 0 ? void 0 : _b.map((p) => p === null || p === void 0 ? void 0 : p.text).join('')) ||
                    ((_c = directData === null || directData === void 0 ? void 0 : directData.result) === null || _c === void 0 ? void 0 : _c.text) ||
                    '';
                if (directText && String(directText).trim()) {
                    const directMessageId = (directData === null || directData === void 0 ? void 0 : directData.messageId) || (directData === null || directData === void 0 ? void 0 : directData.id) || `chat-${Date.now()}`;
                    logger_1.default.ai('Archestra Direct Chat response received', { agentId, messageId: directMessageId });
                    return {
                        messageId: String(directMessageId),
                        role: (directData === null || directData === void 0 ? void 0 : directData.role) || 'assistant',
                        text: String(directText).trim(),
                    };
                }
            }
        }
        throw new Error(`Archestra A2A error: ${errorMessage}`);
    }
    const parts = ((_e = (_d = data === null || data === void 0 ? void 0 : data.result) === null || _d === void 0 ? void 0 : _d.message) === null || _e === void 0 ? void 0 : _e.parts) || ((_f = data === null || data === void 0 ? void 0 : data.result) === null || _f === void 0 ? void 0 : _f.parts) || [];
    const textFromParts = Array.isArray(parts)
        ? parts.map((p) => p === null || p === void 0 ? void 0 : p.text).filter(Boolean).join('')
        : '';
    const text = textFromParts ||
        ((_h = (_g = data === null || data === void 0 ? void 0 : data.result) === null || _g === void 0 ? void 0 : _g.message) === null || _h === void 0 ? void 0 : _h.text) ||
        ((_j = data === null || data === void 0 ? void 0 : data.result) === null || _j === void 0 ? void 0 : _j.text) ||
        (data === null || data === void 0 ? void 0 : data.message) ||
        (data === null || data === void 0 ? void 0 : data.text) ||
        '';
    const messageId = ((_l = (_k = data === null || data === void 0 ? void 0 : data.result) === null || _k === void 0 ? void 0 : _k.message) === null || _l === void 0 ? void 0 : _l.id) ||
        ((_m = data === null || data === void 0 ? void 0 : data.result) === null || _m === void 0 ? void 0 : _m.id) ||
        String((data === null || data === void 0 ? void 0 : data.id) || `a2a-${Date.now()}`);
    logger_1.default.ai('Archestra A2A response received', { agentId, messageId });
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
function isA2AEnabled() {
    return !!(archestra_1.default.baseUrl &&
        archestra_1.default.a2aToken);
}
function isAgentA2ACompatible(agentId) {
    return !!agentId;
}
exports.default = {
    createAgent,
    createAgentOrFallback,
    updateAgent,
    deleteAgent,
    sendA2AMessage,
    buildSystemPrompt,
    isA2AEnabled,
    isAgentA2ACompatible,
};
