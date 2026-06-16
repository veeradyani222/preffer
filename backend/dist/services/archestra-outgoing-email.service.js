"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendLeadFollowUpEmail = sendLeadFollowUpEmail;
const database_1 = __importDefault(require("../config/database"));
const archestra_1 = __importDefault(require("../config/archestra"));
const logger_1 = __importDefault(require("../utils/logger"));
function getArchestraBaseUrl() {
    // Local-only integration for current Prefer setup.
    return 'http://localhost:9000';
}
function isEnabled() {
    if (process.env.ARCHESTRA_ENABLE_OUTGOING_EMAIL === 'false')
        return false;
    return true;
}
async function getPortfolioEmailContext(portfolioId) {
    const result = await database_1.default.query(`SELECT name, ai_manager_name, archestra_agent_id
         FROM portfolios
         WHERE id = $1
         LIMIT 1`, [portfolioId]);
    if (!result.rows.length)
        return null;
    const row = result.rows[0];
    return {
        portfolioName: row.name || null,
        aiManagerName: row.ai_manager_name || null,
        archestraAgentId: row.archestra_agent_id || null,
    };
}
function buildFollowUpEmail(input) {
    var _a, _b, _c;
    const brand = input.portfolioName || 'the portfolio owner';
    const recipient = ((_a = input.recipientName) === null || _a === void 0 ? void 0 : _a.trim()) || 'there';
    const senderName = input.aiManagerName || `${brand} AI Manager`;
    const interestLine = ((_b = input.intentSummary) === null || _b === void 0 ? void 0 : _b.trim())
        ? `You showed interest: ${(_c = input.intentSummary) === null || _c === void 0 ? void 0 : _c.trim()}`
        : `You showed interest in the portfolio services.`;
    const subject = `Thanks for your interest in ${brand}`;
    const text = [
        `Hi ${recipient},`,
        ``,
        `Thank you for connecting with ${brand}.`,
        `This is a follow-up from preffer.me on behalf of ${brand}.`,
        `${interestLine}`,
        ``,
        `Someone from the team will contact you soon.`,
        ``,
        `preffer.me`,
        `Making everyone prefer you.`,
        ``,
        `Best regards,`,
        `${senderName}`,
    ].join('\n');
    return { subject, text, fromName: 'preffer.me' };
}
async function sendLeadFollowUpEmail(input) {
    try {
        if (!isEnabled())
            return;
        const baseUrl = getArchestraBaseUrl();
        const apiKey = archestra_1.default.apiKey;
        if (!baseUrl || !apiKey) {
            logger_1.default.warn('Skipping Archestra outgoing email: missing ARCHESTRA base URL or API key');
            return;
        }
        const context = await getPortfolioEmailContext(input.portfolioId);
        if (!(context === null || context === void 0 ? void 0 : context.archestraAgentId)) {
            logger_1.default.warn('Skipping Archestra outgoing email: portfolio has no linked archestra_agent_id', {
                portfolioId: input.portfolioId,
            });
            return;
        }
        const emailContent = buildFollowUpEmail({
            portfolioName: context.portfolioName,
            aiManagerName: context.aiManagerName,
            recipientName: input.recipientName,
            intentSummary: input.intentSummary,
        });
        const endpoint = `${baseUrl}/api/agents/${context.archestraAgentId}/outgoing-email`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: apiKey,
            },
            body: JSON.stringify({
                to: input.recipientEmail,
                subject: emailContent.subject,
                text: emailContent.text,
                fromName: emailContent.fromName,
            }),
            signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            logger_1.default.warn('Archestra outgoing email request failed', {
                portfolioId: input.portfolioId,
                agentId: context.archestraAgentId,
                status: response.status,
                error: errorText || response.statusText,
            });
            return;
        }
        const result = await response.json().catch(() => ({}));
        logger_1.default.ai('Sent outbound lead follow-up via Archestra', {
            portfolioId: input.portfolioId,
            agentId: context.archestraAgentId,
            to: input.recipientEmail,
            messageId: (result === null || result === void 0 ? void 0 : result.messageId) || null,
        });
    }
    catch (error) {
        logger_1.default.warn('Archestra outgoing email execution failed (non-blocking)', {
            portfolioId: input.portfolioId,
            error: (error === null || error === void 0 ? void 0 : error.message) || String(error),
        });
    }
}
exports.default = {
    sendLeadFollowUpEmail,
};
