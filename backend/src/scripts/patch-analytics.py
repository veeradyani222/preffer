"""Patch analytics.service.ts to add AI insights generation."""
import os

filepath = os.path.join(os.path.dirname(__file__), '..', 'services', 'analytics.service.ts')
filepath = os.path.normpath(filepath)

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import for generateWithFallback
old_import = "import pool from '../config/database';"
new_import = "import pool from '../config/database';\nimport { generateWithFallback } from './gemini.service';"
if 'generateWithFallback' not in content:
    content = content.replace(old_import, new_import, 1)
    print('Added generateWithFallback import')
else:
    print('Import already exists')

# 2. Add AnalyticsInsight interface
if 'AnalyticsInsight' not in content:
    marker = "// ============================================\n// ANALYTICS SERVICE"
    if marker not in content:
        marker = "// ============================================\r\n// ANALYTICS SERVICE"
    
    insight_interface = """interface AnalyticsInsight {
    summary: string;
    highlights: string[];
    visitor_behavior: string;
    common_questions: string[];
    recommendations: string[];
}

"""
    content = content.replace(marker, insight_interface + marker, 1)
    print('Added AnalyticsInsight interface')
else:
    print('Interface already exists')

# 3. Add generateInsights method before class closing
insights_method = """
    // ------------------------------------------
    // AI-DRIVEN INSIGHTS
    // ------------------------------------------

    /**
     * Generate AI-driven insights from analytics data.
     * Feeds stats, top portfolios, and recent conversations to Gemini
     * to produce actionable summaries and recommendations.
     */
    static async generateInsights(userId: string): Promise<AnalyticsInsight> {
        const [stats, topPortfolios, recentConversations] = await Promise.all([
            this.getDashboardStats(userId),
            this.getTopPortfolios(userId),
            this.getRecentConversations(userId, 15),
        ]);

        const conversationSummaries = recentConversations.slice(0, 10).map((session, idx) => {
            const visitorMsgs = session.messages
                .filter(m => m.role === 'visitor')
                .map(m => m.content)
                .join(' | ');
            return `Session ${idx + 1} (${session.portfolio_name}): ${visitorMsgs || 'No visitor messages'}`;
        });

        const portfolioSummary = topPortfolios.map(p =>
            `"${p.name}" (/${p.slug}): ${p.views} views, ${p.unique_visitors} unique visitors, ${p.sessions} AI chat sessions, ${p.messages} messages`
        ).join('\\n');

        if (stats.total_views === 0 && stats.total_sessions === 0) {
            return {
                summary: 'Your portfolios are freshly set up! Once visitors start viewing your pages and chatting with your AI managers, insights and recommendations will appear here.',
                highlights: ['No visitor data yet — share your portfolio links to start gaining insights.'],
                visitor_behavior: 'No visitor activity detected yet.',
                common_questions: [],
                recommendations: [
                    'Share your portfolio link on social media to drive traffic.',
                    'Enable AI managers on your portfolios to engage visitors.',
                    'Add more sections to make your portfolio more complete.',
                ],
            };
        }

        const prompt = `You are an analytics expert analyzing a user's portfolio performance data.
Based on the data below, provide actionable insights in JSON format.

## Overall Stats
- Total page views: ${stats.total_views} (${stats.views_30d} in last 30 days)
- Unique visitors: ${stats.unique_visitors}
- AI chat sessions: ${stats.total_sessions} (${stats.sessions_30d} in last 30 days)
- Total AI messages exchanged: ${stats.total_messages}

## Portfolio Performance
${portfolioSummary || 'No published portfolios with data yet.'}

## Recent Visitor Conversations (what visitors asked the AI)
${conversationSummaries.length > 0 ? conversationSummaries.join('\\n') : 'No conversations yet.'}

Return ONLY valid JSON in this exact shape:
{
  "summary": "A 2-3 sentence executive summary of overall performance and trends",
  "highlights": ["Key highlight 1", "Key highlight 2", "Key highlight 3"],
  "visitor_behavior": "A sentence describing how visitors interact with the portfolios and AI",
  "common_questions": ["Most common question or topic visitors ask about", "Second topic"],
  "recommendations": ["Actionable recommendation 1", "Actionable recommendation 2", "Actionable recommendation 3"]
}

Rules:
- Be specific and data-driven, reference actual numbers
- Keep each item concise (1-2 sentences max)
- Focus on actionable insights, not generic advice
- If AI chat data exists, analyze what visitors are asking about
- Highlights should be the most interesting/notable findings`;

        try {
            const text = await generateWithFallback(
                { temperature: 0.4, maxOutputTokens: 1000, responseMimeType: 'application/json' },
                prompt
            );

            const parsed = JSON.parse(text);
            return {
                summary: parsed.summary || 'Unable to generate summary.',
                highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
                visitor_behavior: parsed.visitor_behavior || '',
                common_questions: Array.isArray(parsed.common_questions) ? parsed.common_questions : [],
                recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
            };
        } catch (error) {
            console.error('Failed to generate AI insights:', error);
            return {
                summary: `Your portfolios have received ${stats.total_views} total page views and ${stats.total_sessions} AI chat sessions.`,
                highlights: [
                    `${stats.views_30d} views in the last 30 days`,
                    `${stats.unique_visitors} unique visitors all time`,
                    `${stats.total_messages} AI messages exchanged`,
                ],
                visitor_behavior: stats.total_sessions > 0
                    ? `Visitors have initiated ${stats.total_sessions} conversations with your AI managers.`
                    : 'No AI chat interactions yet.',
                common_questions: [],
                recommendations: [
                    'Share your portfolio links to increase visibility.',
                    'Review AI chat sessions to understand what visitors want.',
                ],
            };
        }
    }
"""

if 'generateInsights' not in content:
    # Find the last closing brace of the class + export
    # Pattern: the class ends with "}\r\n\r\nexport" or "}\n\nexport"
    import re
    # Find the position of "export default AnalyticsService"
    export_idx = content.index('export default AnalyticsService')
    # Find the closing brace of the class just before that
    brace_idx = content.rindex('}', 0, export_idx)
    
    content = content[:brace_idx] + insights_method + content[brace_idx:]
    print('Added generateInsights method')
else:
    print('generateInsights already exists')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('DONE: analytics.service.ts patched successfully')
