import pool from '../config/database';
import { generateWithFallback } from './gemini.service';

/**
 * Attempt to fix truncated/malformed JSON from Gemini.
 */
function attemptJsonFix(json: string): string | null {
    try {
        let fixed = json.trim();

        if (fixed.match(/:\s*"[^"]*$/)) {
            const lastCompleteMatch = fixed.match(/(.*"[^"]*"[,\s\]}]*)/);
            if (lastCompleteMatch) {
                fixed = lastCompleteMatch[1];
            }
        }

        let braceCount = 0;
        let bracketCount = 0;
        let inString = false;
        let escapeNext = false;

        for (let i = 0; i < fixed.length; i++) {
            const char = fixed[i];
            if (escapeNext) { escapeNext = false; continue; }
            if (char === '\\') { escapeNext = true; continue; }
            if (char === '"') { inString = !inString; continue; }
            if (!inString) {
                if (char === '{') braceCount++;
                if (char === '}') braceCount--;
                if (char === '[') bracketCount++;
                if (char === ']') bracketCount--;
            }
        }

        fixed = fixed.replace(/,\s*$/, '');
        while (bracketCount > 0) { fixed += ']'; bracketCount--; }
        while (braceCount > 0) { fixed += '}'; braceCount--; }

        JSON.parse(fixed);
        return fixed;
    } catch {
        return null;
    }
}

/**
 * Safely extract JSON from Gemini output.
 * Handles: direct JSON, code-fenced JSON, truncated JSON.
 */
function safeParseJson(text: string): any {
    // Try direct parse
    try { return JSON.parse(text); } catch { /* continue */ }

    // Try code block extraction
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
        try { return JSON.parse(codeBlockMatch[1].trim()); } catch { /* continue */ }
    }

    // Try extracting first JSON object
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try { return JSON.parse(jsonMatch[0]); } catch {
            const fixed = attemptJsonFix(jsonMatch[0]);
            if (fixed) {
                try { return JSON.parse(fixed); } catch { /* continue */ }
            }
        }
    }

    console.error('safeParseJson: all strategies failed, raw:', text.substring(0, 200));
    return null;
}

// ============================================
// TYPES
// ============================================

interface DashboardStats {
    total_views: number;
    unique_visitors: number;
    total_sessions: number;
    total_messages: number;
    views_5d: number;
    sessions_5d: number;
    messages_5d: number;
    avg_messages_per_session: number;
    visitor_to_chat_rate: number;
}

interface DailyViews {
    date: string;
    views: number;
}

interface DailyMessages {
    date: string;
    messages: number;
}

interface PortfolioStats {
    portfolio_id: string;
    name: string;
    slug: string;
    has_ai_manager: boolean;
    views: number;
    unique_visitors: number;
    sessions: number;
    messages: number;
}

interface ConversationSession {
    id: string;
    portfolio_id: string;
    portfolio_name: string;
    portfolio_slug: string;
    visitor_ip: string;
    started_at: string;
    last_message_at: string;
    message_count: number;
    messages: SessionMessage[];
}

interface SessionMessage {
    id: string;
    role: 'visitor' | 'ai';
    content: string;
    created_at: string;
}

interface InterestArea {
    topic: string;
    count: number;
    percentage: number;
}

interface ConversionOpportunity {
    description: string;
    potential: 'high' | 'medium' | 'low';
    action: string;
}

interface EnhancedInsights {
    executive_summary: string;
    sentiment: { positive: number; neutral: number; negative: number };
    interest_areas: InterestArea[];
    top_questions: string[];
    conversion_opportunities: ConversionOpportunity[];
    recommendations: string[];
    conversation_summaries: string[];
}

// ============================================
// ANALYTICS SERVICE
// ============================================

class AnalyticsService {

    // ------------------------------------------
    // RECORDING (fire-and-forget)
    // ------------------------------------------

    static async recordPageView(
        portfolioId: string,
        visitorIp?: string,
        userAgent?: string,
        referrer?: string
    ): Promise<void> {
        try {
            await pool.query(
                `INSERT INTO portfolio_page_views (portfolio_id, visitor_ip, user_agent, referrer)
                 VALUES ($1, $2, $3, $4)`,
                [portfolioId, visitorIp || null, userAgent || null, referrer || null]
            );
        } catch (error) {
            console.error('Failed to record page view:', error);
        }
    }

    static async recordChatMessage(
        portfolioId: string,
        visitorIp: string | undefined,
        role: 'visitor' | 'ai',
        content: string,
        sessionKey?: string | null
    ): Promise<string | null> {
        try {
            const ip = visitorIp || 'unknown';

            let sessionResult;
            if (sessionKey) {
                sessionResult = await pool.query(
                    `SELECT id FROM ai_manager_sessions
                     WHERE portfolio_id = $1 AND session_key = $2
                     ORDER BY last_message_at DESC LIMIT 1`,
                    [portfolioId, sessionKey]
                );
            } else {
                sessionResult = await pool.query(
                    `SELECT id FROM ai_manager_sessions
                     WHERE portfolio_id = $1 AND visitor_ip = $2
                       AND last_message_at > NOW() - INTERVAL '30 minutes'
                     ORDER BY last_message_at DESC LIMIT 1`,
                    [portfolioId, ip]
                );
            }

            let sessionId: string;

            if (sessionResult.rows.length > 0) {
                sessionId = sessionResult.rows[0].id;
            } else {
                const newSession = sessionKey
                    ? await pool.query(
                        `INSERT INTO ai_manager_sessions (portfolio_id, visitor_ip, session_key)
                         VALUES ($1, $2, $3) RETURNING id`,
                        [portfolioId, ip, sessionKey]
                    )
                    : await pool.query(
                        `INSERT INTO ai_manager_sessions (portfolio_id, visitor_ip)
                         VALUES ($1, $2) RETURNING id`,
                        [portfolioId, ip]
                    );
                sessionId = newSession.rows[0].id;
            }

            if (sessionKey) {
                await pool.query(
                    `UPDATE ai_manager_sessions
                     SET session_key = $1
                     WHERE id = $2`,
                    [sessionKey, sessionId]
                );
            }

            await pool.query(
                `INSERT INTO ai_manager_messages (session_id, portfolio_id, role, content)
                 VALUES ($1, $2, $3, $4)`,
                [sessionId, portfolioId, role, content]
            );

            await pool.query(
                `UPDATE ai_manager_sessions
                 SET last_message_at = NOW(), message_count = message_count + 1
                 WHERE id = $1`,
                [sessionId]
            );

            return sessionId;
        } catch (error) {
            console.error('Failed to record chat message:', error);
            return null;
        }
    }

    static async getSessionHistory(
        portfolioId: string,
        sessionKey: string,
        limit: number = 12
    ): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
        try {
            const sessionResult = await pool.query(
                `SELECT id FROM ai_manager_sessions
                 WHERE portfolio_id = $1 AND session_key = $2
                 ORDER BY last_message_at DESC LIMIT 1`,
                [portfolioId, sessionKey]
            );

            if (sessionResult.rows.length === 0) return [];

            const sessionId = sessionResult.rows[0].id;
            const messagesResult = await pool.query(
                `SELECT role, content
                 FROM ai_manager_messages
                 WHERE session_id = $1
                 ORDER BY created_at DESC
                 LIMIT $2`,
                [sessionId, limit]
            );

            const chronological = messagesResult.rows.reverse();
            return chronological.map((m) => ({
                role: m.role === 'visitor' ? 'user' : 'assistant',
                content: m.content
            }));
        } catch (error) {
            console.error('Failed to load session history:', error);
            return [];
        }
    }

    // ------------------------------------------
    // AGGREGATION (with optional portfolio filter)
    // ------------------------------------------

    static async getDashboardStats(userId: string, portfolioId?: string): Promise<DashboardStats> {
        const portfolioFilter = portfolioId ? ' AND p.id = $2::uuid' : '';
        const params: string[] = [userId];
        if (portfolioId) params.push(portfolioId);

        const query = `
            SELECT
                COALESCE(SUM(pv.total), 0)::int          AS total_views,
                COALESCE(SUM(pv.uniq), 0)::int            AS unique_visitors,
                COALESCE(SUM(s.total), 0)::int             AS total_sessions,
                COALESCE(SUM(m.total), 0)::int             AS total_messages,
                COALESCE(SUM(pv.recent), 0)::int           AS views_5d,
                COALESCE(SUM(s.recent), 0)::int            AS sessions_5d,
                COALESCE(SUM(m.recent), 0)::int            AS messages_5d
            FROM portfolios p
            LEFT JOIN LATERAL (
                SELECT
                    COUNT(*)::int AS total,
                    COUNT(DISTINCT visitor_ip)::int AS uniq,
                    COUNT(*) FILTER (WHERE pv2.created_at > NOW() - INTERVAL '5 days')::int AS recent
                FROM portfolio_page_views pv2
                WHERE pv2.portfolio_id = p.id
            ) pv ON true
            LEFT JOIN LATERAL (
                SELECT
                    COUNT(*)::int AS total,
                    COUNT(*) FILTER (WHERE s2.started_at > NOW() - INTERVAL '5 days')::int AS recent
                FROM ai_manager_sessions s2
                WHERE s2.portfolio_id = p.id
            ) s ON true
            LEFT JOIN LATERAL (
                SELECT
                    COUNT(*)::int AS total,
                    COUNT(*) FILTER (WHERE m2.created_at > NOW() - INTERVAL '5 days')::int AS recent
                FROM ai_manager_messages m2
                WHERE m2.portfolio_id = p.id
            ) m ON true
            WHERE p.user_id = $1::uuid${portfolioFilter}
        `;

        const result = await pool.query(query, params);
        const row = result.rows[0] || {};

        return {
            total_views: row.total_views || 0,
            unique_visitors: row.unique_visitors || 0,
            total_sessions: row.total_sessions || 0,
            total_messages: row.total_messages || 0,
            views_5d: row.views_5d || 0,
            sessions_5d: row.sessions_5d || 0,
            messages_5d: row.messages_5d || 0,
            avg_messages_per_session:
                row.total_sessions > 0 ? Number((row.total_messages / row.total_sessions).toFixed(2)) : 0,
            visitor_to_chat_rate:
                row.unique_visitors > 0 ? Number(((row.total_sessions / row.unique_visitors) * 100).toFixed(1)) : 0,
        };
    }

    static async getAgentChatContext(portfolioId: string): Promise<string> {
        const statsQuery = `
            SELECT
                COUNT(*)::int AS total_views,
                COUNT(DISTINCT visitor_ip)::int AS unique_visitors
            FROM portfolio_page_views
            WHERE portfolio_id = $1
        `;
        const sessionsQuery = `
            SELECT
                COUNT(*)::int AS total_sessions
            FROM ai_manager_sessions
            WHERE portfolio_id = $1
        `;
        const messagesQuery = `
            SELECT
                COUNT(*)::int AS total_messages
            FROM ai_manager_messages
            WHERE portfolio_id = $1
        `;
        const topQuestionsQuery = `
            SELECT content
            FROM ai_manager_messages
            WHERE portfolio_id = $1
              AND role = 'visitor'
              AND length(content) > 0
            ORDER BY created_at DESC
            LIMIT 3
        `;

        const [statsRes, sessionsRes, messagesRes, questionsRes] = await Promise.all([
            pool.query(statsQuery, [portfolioId]),
            pool.query(sessionsQuery, [portfolioId]),
            pool.query(messagesQuery, [portfolioId]),
            pool.query(topQuestionsQuery, [portfolioId]),
        ]);

        const totalViews = Number(statsRes.rows[0]?.total_views || 0);
        const uniqueVisitors = Number(statsRes.rows[0]?.unique_visitors || 0);
        const totalSessions = Number(sessionsRes.rows[0]?.total_sessions || 0);
        const totalMessages = Number(messagesRes.rows[0]?.total_messages || 0);
        const avgMessagesPerSession =
            totalSessions > 0 ? Number((totalMessages / totalSessions).toFixed(2)) : 0;
        const visitorToChatRate =
            uniqueVisitors > 0 ? Number(((totalSessions / uniqueVisitors) * 100).toFixed(1)) : 0;
        const recentQuestions = questionsRes.rows.map((r) => r.content).filter(Boolean);

        const lines = [
            `Views: ${totalViews}`,
            `Unique Visitors: ${uniqueVisitors}`,
            `Chat Sessions: ${totalSessions}`,
            `Messages: ${totalMessages}`,
            `Avg Messages/Session: ${avgMessagesPerSession}`,
            `Visitor->Chat Rate: ${visitorToChatRate}%`,
        ];

        if (recentQuestions.length > 0) {
            lines.push(`Recent Visitor Questions: ${recentQuestions.join(' | ')}`);
        }

        return lines.join('\n');
    }

    static async getViewsPerDay(userId: string, days: number = 5, portfolioId?: string): Promise<DailyViews[]> {
        const portfolioFilter = portfolioId
            ? 'AND pv.portfolio_id = $2::uuid'
            : `AND pv.portfolio_id IN (SELECT id FROM portfolios WHERE user_id = $2::uuid)`;
        const params: (string | number)[] = portfolioId ? [days, portfolioId] : [days, userId];

        const query = `
            WITH date_series AS (
                SELECT generate_series(
                    (CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day')::date,
                    CURRENT_DATE::date,
                    '1 day'::interval
                )::date AS day
            )
            SELECT
                ds.day::text AS date,
                COUNT(pv.id)::int AS views
            FROM date_series ds
            LEFT JOIN portfolio_page_views pv
                ON pv.created_at::date = ds.day
                ${portfolioFilter}
            GROUP BY ds.day
            ORDER BY ds.day ASC
        `;

        const result = await pool.query(query, params);
        return result.rows;
    }

    static async getMessagesPerDay(userId: string, days: number = 5, portfolioId?: string): Promise<DailyMessages[]> {
        const portfolioFilter = portfolioId
            ? 'AND m.portfolio_id = $2::uuid'
            : `AND m.portfolio_id IN (SELECT id FROM portfolios WHERE user_id = $2::uuid)`;
        const params: (string | number)[] = portfolioId ? [days, portfolioId] : [days, userId];

        const query = `
            WITH date_series AS (
                SELECT generate_series(
                    (CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day')::date,
                    CURRENT_DATE::date,
                    '1 day'::interval
                )::date AS day
            )
            SELECT
                ds.day::text AS date,
                COUNT(m.id)::int AS messages
            FROM date_series ds
            LEFT JOIN ai_manager_messages m
                ON m.created_at::date = ds.day
                ${portfolioFilter}
            GROUP BY ds.day
            ORDER BY ds.day ASC
        `;

        const result = await pool.query(query, params);
        return result.rows;
    }

    static async getTopPortfolios(userId: string, portfolioId?: string): Promise<PortfolioStats[]> {
        const portfolioFilter = portfolioId ? ' AND p.id = $2::uuid' : '';
        const params: string[] = [userId];
        if (portfolioId) params.push(portfolioId);

        const query = `
            SELECT
                p.id AS portfolio_id,
                p.name,
                p.slug,
                p.has_ai_manager,
                COALESCE(pv.cnt, 0)::int AS views,
                COALESCE(pv.uniq, 0)::int AS unique_visitors,
                COALESCE(s.cnt, 0)::int AS sessions,
                COALESCE(m.cnt, 0)::int AS messages
            FROM portfolios p
            LEFT JOIN LATERAL (
                SELECT COUNT(*)::int AS cnt, COUNT(DISTINCT visitor_ip)::int AS uniq
                FROM portfolio_page_views WHERE portfolio_id = p.id
            ) pv ON true
            LEFT JOIN LATERAL (
                SELECT COUNT(*)::int AS cnt
                FROM ai_manager_sessions WHERE portfolio_id = p.id
            ) s ON true
            LEFT JOIN LATERAL (
                SELECT COUNT(*)::int AS cnt
                FROM ai_manager_messages WHERE portfolio_id = p.id
            ) m ON true
            WHERE p.user_id = $1::uuid AND p.status = 'published'${portfolioFilter}
            ORDER BY views DESC
            LIMIT 10
        `;

        const result = await pool.query(query, params);
        return result.rows;
    }

    static async getRecentConversations(userId: string, limit: number = 50, portfolioId?: string): Promise<ConversationSession[]> {
        const portfolioFilter = portfolioId ? ' AND s.portfolio_id = $3::uuid' : '';
        const params: (string | number)[] = [userId, limit];
        if (portfolioId) params.push(portfolioId);

        const sessionsQuery = `
            SELECT
                s.id, s.portfolio_id, s.visitor_ip, s.started_at, s.last_message_at, s.message_count,
                p.name AS portfolio_name, p.slug AS portfolio_slug
            FROM ai_manager_sessions s
            JOIN portfolios p ON p.id = s.portfolio_id
            WHERE p.user_id = $1::uuid${portfolioFilter}
            ORDER BY s.last_message_at DESC
            LIMIT $2
        `;

        const sessionsResult = await pool.query(sessionsQuery, params);

        if (sessionsResult.rows.length === 0) return [];

        const sessionIds = sessionsResult.rows.map(s => s.id);
        const messagesQuery = `
            SELECT id, session_id, role, content, created_at
            FROM ai_manager_messages
            WHERE session_id = ANY($1)
            ORDER BY created_at ASC
        `;

        const messagesResult = await pool.query(messagesQuery, [sessionIds]);

        const messagesBySession: Record<string, SessionMessage[]> = {};
        for (const msg of messagesResult.rows) {
            if (!messagesBySession[msg.session_id]) messagesBySession[msg.session_id] = [];
            messagesBySession[msg.session_id].push({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                created_at: msg.created_at,
            });
        }

        return sessionsResult.rows.map(s => ({
            id: s.id,
            portfolio_id: s.portfolio_id,
            portfolio_name: s.portfolio_name,
            portfolio_slug: s.portfolio_slug,
            visitor_ip: s.visitor_ip,
            started_at: s.started_at,
            last_message_at: s.last_message_at,
            message_count: s.message_count,
            messages: messagesBySession[s.id] || [],
        }));
    }

    // ------------------------------------------
    // TWO-PHASE AI-DRIVEN INSIGHTS
    // ------------------------------------------

    /**
     * Phase 1: Batch-summarize conversations with Gemini.
     * Groups conversations into batches of 10, summarizes each batch.
     */
    private static async summarizeConversationBatch(conversations: ConversationSession[]): Promise<string[]> {
        if (conversations.length === 0) return [];

        const batchSize = 10;
        const batches: ConversationSession[][] = [];
        for (let i = 0; i < conversations.length; i += batchSize) {
            batches.push(conversations.slice(i, i + batchSize));
        }

        const summaries: string[] = [];

        for (const batch of batches) {
            const conversationTexts = batch.map((session, idx) => {
                const msgs = session.messages
                    .map(m => `${m.role === 'visitor' ? 'Visitor' : 'AI'}: ${m.content}`)
                    .join('\n');
                return `--- Conversation ${idx + 1} (Portfolio: "${session.portfolio_name}") ---\n${msgs || 'No messages'}`;
            }).join('\n\n');

            const prompt = `Analyze these ${batch.length} AI representative conversations and provide a structured summary.

${conversationTexts}

Return ONLY valid JSON:
{
  "batch_summary": "2-sentence overview of what this batch of conversations was about",
  "topics_discussed": ["topic1", "topic2"],
  "visitor_intents": ["hiring", "collaboration", "info-seeking", "pricing", "other"],
  "sentiments": { "positive": 0, "neutral": 0, "negative": 0 },
  "conversion_signals": ["Any signal where visitor showed buying/hiring/collaboration intent"],
  "key_questions": ["Specific questions visitors asked"]
}

Rules:
- Count sentiments based on visitor tone across all conversations
- Be specific about topics (e.g. "React experience" not just "skills")
- Identify conversion signals where visitors seem ready to engage/hire
- Extract actual questions, not generic ones`;

            try {
                const text = await generateWithFallback(
                    { temperature: 0.3, maxOutputTokens: 800, responseMimeType: 'application/json' },
                    prompt
                );
                summaries.push(text);
            } catch (error) {
                console.error('Failed to summarize conversation batch:', error);
                // Fallback: create a basic summary
                const topics = batch.map(s => s.portfolio_name).filter((v, i, a) => a.indexOf(v) === i);
                summaries.push(JSON.stringify({
                    batch_summary: `${batch.length} conversations across portfolios: ${topics.join(', ')}`,
                    topics_discussed: topics,
                    visitor_intents: ['info-seeking'],
                    sentiments: { positive: 0, neutral: batch.length, negative: 0 },
                    conversion_signals: [],
                    key_questions: [],
                }));
            }
        }

        return summaries;
    }

    /**
     * Phase 2: Generate business intelligence from batch summaries + stats.
     */
    static async generateInsights(userId: string, portfolioId?: string): Promise<EnhancedInsights> {
        const [stats, topPortfolios, recentConversations] = await Promise.all([
            this.getDashboardStats(userId, portfolioId),
            this.getTopPortfolios(userId, portfolioId),
            this.getRecentConversations(userId, 50, portfolioId),
        ]);

        // Default response for no data
        if (stats.total_views === 0 && stats.total_sessions === 0) {
            return {
                executive_summary: 'No visitor data yet. Share your professional page links to start gaining insights!',
                sentiment: { positive: 0, neutral: 0, negative: 0 },
                interest_areas: [],
                top_questions: [],
                conversion_opportunities: [],
                recommendations: [
                    'Share your professional page link on social media to drive traffic.',
                    'Enable AI representatives on your professional pages to engage visitors.',
                    'Add detailed project sections to showcase your work.',
                ],
                conversation_summaries: [],
            };
        }

        // Phase 1: Batch-summarize conversations
        const batchSummaryTexts = await this.summarizeConversationBatch(recentConversations);

        // Parse batch summaries
        const parsedBatches = batchSummaryTexts.map(text => {
            return safeParseJson(text);
        }).filter(Boolean);

        // Aggregate batch data for Phase 2
        const allTopics = parsedBatches.flatMap(b => b.topics_discussed || []);
        const allQuestions = parsedBatches.flatMap(b => b.key_questions || []);
        const allConversionSignals = parsedBatches.flatMap(b => b.conversion_signals || []);
        const totalSentiment = parsedBatches.reduce((acc, b) => {
            const s = b.sentiments || {};
            return {
                positive: acc.positive + (s.positive || 0),
                neutral: acc.neutral + (s.neutral || 0),
                negative: acc.negative + (s.negative || 0),
            };
        }, { positive: 0, neutral: 0, negative: 0 });

        const batchSummaries = parsedBatches.map(b => b.batch_summary || '').filter(Boolean);

        const portfolioSummary = topPortfolios.map(p =>
            `"${p.name}" (/${p.slug}): ${p.views} views, ${p.unique_visitors} unique, ${p.sessions} sessions, ${p.messages} msgs`
        ).join('\n');

        // Phase 2: Business Intelligence
        const biPrompt = `You are a business analytics expert. Analyze this portfolio data and provide actionable business intelligence.

## Stats (last 5 days)
- Page views: ${stats.total_views} total (${stats.views_5d} in 5 days)
- Unique visitors: ${stats.unique_visitors}
- AI chat sessions: ${stats.total_sessions} (${stats.sessions_5d} in 5 days)
- Total messages: ${stats.total_messages}

## Portfolio Performance
${portfolioSummary || 'No data yet'}

## Conversation Analysis (from ${recentConversations.length} conversations)
Batch summaries: ${batchSummaries.join(' | ') || 'None'}
Topics discussed: ${allTopics.join(', ') || 'None'}
Questions asked: ${allQuestions.join('; ') || 'None'}
Conversion signals: ${allConversionSignals.join('; ') || 'None'}
Sentiment: ${totalSentiment.positive} positive, ${totalSentiment.neutral} neutral, ${totalSentiment.negative} negative

Return ONLY valid JSON. Do NOT use markdown code blocks or any other formatting. Just the raw JSON string:
{
  "executive_summary": "1-2 sentence business-focused summary with numbers",
  "interest_areas": [
    { "topic": "specific topic name", "count": 5, "percentage": 50 }
  ],
  "top_questions": ["actual question visitors asked", "second question"],
  "conversion_opportunities": [
    { "description": "what the opportunity is", "potential": "high", "action": "what to do about it" }
  ],
  "recommendations": ["actionable step 1", "actionable step 2", "actionable step 3"]
}

Rules:
- interest_areas: max 6, ranked by frequency, percentages must sum to ~100
- conversion_opportunities: identify WHERE visitors showed hire/buy/collab intent and what the owner should do
- recommendations: specific, actionable, data-driven (not generic)
- top_questions: actual questions from conversations, max 5
- Keep everything concise — card-friendly text, no long paragraphs`;

        try {
            const biText = await generateWithFallback(
                { temperature: 0.3, maxOutputTokens: 7000, responseMimeType: 'application/json' },
                biPrompt
            );

            const bi = safeParseJson(biText);
            if (!bi) throw new Error('Failed to parse BI response');

            return {
                executive_summary: bi.executive_summary || `${stats.total_views} views, ${stats.total_sessions} AI sessions.`,
                sentiment: totalSentiment,
                interest_areas: Array.isArray(bi.interest_areas) ? bi.interest_areas.slice(0, 6) : [],
                top_questions: Array.isArray(bi.top_questions) ? bi.top_questions.slice(0, 5) : [],
                conversion_opportunities: Array.isArray(bi.conversion_opportunities) ? bi.conversion_opportunities.slice(0, 4) : [],
                recommendations: Array.isArray(bi.recommendations) ? bi.recommendations.slice(0, 5) : [],
                conversation_summaries: batchSummaries,
            };
        } catch (error) {
            console.error('Failed to generate business intelligence:', error);
            return {
                executive_summary: `${stats.total_views} total views and ${stats.total_sessions} AI chat sessions recorded.`,
                sentiment: totalSentiment,
                interest_areas: allTopics.slice(0, 5).map((t, i) => ({
                    topic: t, count: 1, percentage: Math.round(100 / Math.min(allTopics.length, 5))
                })),
                top_questions: allQuestions.slice(0, 5),
                conversion_opportunities: allConversionSignals.slice(0, 3).map(s => ({
                    description: s, potential: 'medium' as const, action: 'Follow up with visitor'
                })),
                recommendations: [
                    'Share your professional page links to increase visibility.',
                    'Review AI chat sessions to understand visitor needs.',
                    'Add case studies to showcase your best work.',
                ],
                conversation_summaries: batchSummaries,
            };
        }
    }
}

export default AnalyticsService;
