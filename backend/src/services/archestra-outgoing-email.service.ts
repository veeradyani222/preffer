import pool from '../config/database';
import archestraConfig from '../config/archestra';
import logger from '../utils/logger';

interface PortfolioEmailContext {
    portfolioName: string | null;
    aiManagerName: string | null;
    archestraAgentId: string | null;
}

interface SendLeadFollowUpInput {
    portfolioId: string;
    recipientEmail: string;
    recipientName?: string | null;
    intentSummary?: string | null;
}

function getArchestraBaseUrl(): string | null {
    // Local-only integration for current Prefer setup.
    return 'http://localhost:9000';
}

function isEnabled(): boolean {
    if (process.env.ARCHESTRA_ENABLE_OUTGOING_EMAIL === 'false') return false;
    return true;
}

async function getPortfolioEmailContext(portfolioId: string): Promise<PortfolioEmailContext | null> {
    const result = await pool.query(
        `SELECT name, ai_manager_name, archestra_agent_id
         FROM portfolios
         WHERE id = $1
         LIMIT 1`,
        [portfolioId]
    );

    if (!result.rows.length) return null;
    const row = result.rows[0];
    return {
        portfolioName: row.name || null,
        aiManagerName: row.ai_manager_name || null,
        archestraAgentId: row.archestra_agent_id || null,
    };
}

function buildFollowUpEmail(input: {
    portfolioName: string | null;
    aiManagerName: string | null;
    recipientName?: string | null;
    intentSummary?: string | null;
}): { subject: string; text: string; fromName: string } {
    const brand = input.portfolioName || 'the portfolio owner';
    const recipient = input.recipientName?.trim() || 'there';
    const senderName = input.aiManagerName || `${brand} AI Manager`;
    const interestLine = input.intentSummary?.trim()
        ? `You showed interest: ${input.intentSummary?.trim()}`
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

export async function sendLeadFollowUpEmail(input: SendLeadFollowUpInput): Promise<void> {
    try {
        if (!isEnabled()) return;

        const baseUrl = getArchestraBaseUrl();
        const apiKey = archestraConfig.apiKey;
        if (!baseUrl || !apiKey) {
            logger.warn('Skipping Archestra outgoing email: missing ARCHESTRA base URL or API key');
            return;
        }

        const context = await getPortfolioEmailContext(input.portfolioId);
        if (!context?.archestraAgentId) {
            logger.warn('Skipping Archestra outgoing email: portfolio has no linked archestra_agent_id', {
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
            logger.warn('Archestra outgoing email request failed', {
                portfolioId: input.portfolioId,
                agentId: context.archestraAgentId,
                status: response.status,
                error: errorText || response.statusText,
            });
            return;
        }

        const result = await response.json().catch(() => ({} as any));
        logger.ai('Sent outbound lead follow-up via Archestra', {
            portfolioId: input.portfolioId,
            agentId: context.archestraAgentId,
            to: input.recipientEmail,
            messageId: result?.messageId || null,
        });
    } catch (error: any) {
        logger.warn('Archestra outgoing email execution failed (non-blocking)', {
            portfolioId: input.portfolioId,
            error: error?.message || String(error),
        });
    }
}

export default {
    sendLeadFollowUpEmail,
};
