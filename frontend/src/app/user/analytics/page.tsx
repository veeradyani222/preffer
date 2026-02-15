'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import {
    Eye,
    Users,
    MessageSquare,
    MessagesSquare,
    TrendingUp,
    TrendingDown,
    ChevronDown,
    ChevronRight,
    Globe,
    Sparkles,
    Lightbulb,
    HelpCircle,
    RefreshCw,
    Smile,
    Meh,
    Frown,
    BarChart3,
    Zap,
} from 'lucide-react';

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
    messages_5d?: number;
    avg_messages_per_session?: number;
    visitor_to_chat_rate?: number;
}

interface DailyViews { date: string; views: number; }
interface DailyMessages { date: string; messages: number; }

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

interface SessionMessage {
    id: string;
    role: 'visitor' | 'ai';
    content: string;
    created_at: string;
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
// CHARTS
// ============================================

function DualLineChart({ viewsData, messagesData }: { viewsData: DailyViews[]; messagesData: DailyMessages[] }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || viewsData.length === 0) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const W = rect.width, H = rect.height;
        const pad = { top: 20, right: 12, bottom: 32, left: 40 };
        const plotW = W - pad.left - pad.right;
        const plotH = H - pad.top - pad.bottom;

        ctx.clearRect(0, 0, W, H);

        const views = viewsData.map(d => d.views);
        const msgs = messagesData.map(d => d.messages);
        const maxVal = Math.max(...views, ...msgs, 1);

        // Grid
        ctx.strokeStyle = '#E9E9E7'; ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = pad.top + (plotH / 4) * i;
            ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
            ctx.fillStyle = '#9B9A97'; ctx.font = '11px system-ui'; ctx.textAlign = 'right';
            ctx.fillText(Math.round(maxVal - (maxVal / 4) * i).toString(), pad.left - 6, y + 4);
        }

        const drawLine = (data: number[], color: string) => {
            ctx.beginPath();
            data.forEach((v, i) => {
                const x = pad.left + (plotW / Math.max(data.length - 1, 1)) * i;
                const y = pad.top + plotH - (v / maxVal) * plotH;
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            });
            ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
            data.forEach((v, i) => {
                const x = pad.left + (plotW / Math.max(data.length - 1, 1)) * i;
                const y = pad.top + plotH - (v / maxVal) * plotH;
                ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fillStyle = color; ctx.fill();
            });
        };

        drawLine(views, '#37352f');
        drawLine(msgs, '#3B82F6');

        // X labels
        ctx.fillStyle = '#9B9A97'; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
        viewsData.forEach((d, i) => {
            const x = pad.left + (plotW / Math.max(viewsData.length - 1, 1)) * i;
            const dateObj = new Date(d.date);
            ctx.fillText(`${dateObj.getMonth() + 1}/${dateObj.getDate()}`, x, H - pad.bottom + 16);
        });

        // Legend
        ctx.font = '11px system-ui';
        ctx.fillStyle = '#37352f'; ctx.fillText('● Views', W - 120, 14);
        ctx.fillStyle = '#3B82F6'; ctx.fillText('● Messages', W - 55, 14);
    }, [viewsData, messagesData]);

    return <canvas ref={canvasRef} className="w-full" style={{ height: 180 }} />;
}

function SentimentDonut({ sentiment }: { sentiment: { positive: number; neutral: number; negative: number } }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const total = sentiment.positive + sentiment.neutral + sentiment.negative;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || total === 0) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = 120 * dpr; canvas.height = 120 * dpr;
        ctx.scale(dpr, dpr);

        const cx = 60, cy = 60, r = 45, inner = 28;
        let startAngle = -Math.PI / 2;

        const segments = [
            { value: sentiment.positive, color: '#22C55E' },
            { value: sentiment.neutral, color: '#9B9A97' },
            { value: sentiment.negative, color: '#EF4444' },
        ];

        segments.forEach(seg => {
            if (seg.value === 0) return;
            const sweep = (seg.value / total) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(cx, cy, r, startAngle, startAngle + sweep);
            ctx.arc(cx, cy, inner, startAngle + sweep, startAngle, true);
            ctx.closePath();
            ctx.fillStyle = seg.color;
            ctx.fill();
            startAngle += sweep;
        });
    }, [sentiment, total]);

    if (total === 0) {
        return (
            <div className="flex items-center justify-center h-[120px] text-xs text-[#9B9A97]">
                No sentiment data yet
            </div>
        );
    }

    return (
        <div className="flex items-center gap-4">
            <canvas ref={canvasRef} width={120} height={120} style={{ width: 120, height: 120 }} />
            <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                    <Smile size={14} className="text-green-500" />
                    <span className="text-[#37352f]">{sentiment.positive} positive</span>
                </div>
                <div className="flex items-center gap-2">
                    <Meh size={14} className="text-[#9B9A97]" />
                    <span className="text-[#37352f]">{sentiment.neutral} neutral</span>
                </div>
                <div className="flex items-center gap-2">
                    <Frown size={14} className="text-red-500" />
                    <span className="text-[#37352f]">{sentiment.negative} negative</span>
                </div>
            </div>
        </div>
    );
}

// ============================================
// CONVERSATION ITEM
// ============================================

function ConversationItem({ session }: { session: ConversationSession }) {
    const [expanded, setExpanded] = useState(false);
    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    return (
        <div className="border border-[#E9E9E7] rounded-lg overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F7F7F5] transition-colors text-left"
            >
                {expanded
                    ? <ChevronDown size={14} className="text-[#9B9A97] shrink-0" />
                    : <ChevronRight size={14} className="text-[#9B9A97] shrink-0" />}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#37352f] truncate">{session.portfolio_name}</span>
                        <span className="text-xs text-[#9B9A97] bg-[#F7F7F5] px-1.5 py-0.5 rounded">{session.message_count} msgs</span>
                    </div>
                    <p className="text-xs text-[#9B9A97] mt-0.5 truncate">
                        {session.messages.find(m => m.role === 'visitor')?.content || 'No visitor messages'}
                    </p>
                </div>
                <span className="text-xs text-[#9B9A97] whitespace-nowrap shrink-0">{timeAgo(session.last_message_at)}</span>
            </button>
            {expanded && session.messages.length > 0 && (
                <div className="border-t border-[#E9E9E7] bg-[#FAFAF9] px-4 py-3 space-y-3 max-h-80 overflow-y-auto">
                    {session.messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'visitor' ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${msg.role === 'visitor'
                                ? 'bg-white border border-[#E9E9E7] text-[#37352f]'
                                : 'bg-[#37352f] text-white'
                                }`}>
                                <p className="text-xs font-medium mb-1 opacity-60">{msg.role === 'visitor' ? '👤 Visitor' : '🤖 AI'}</p>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================
// PER-PORTFOLIO ANALYTICS SECTION
// ============================================

function PortfolioAnalyticsSection({ portfolio }: { portfolio: PortfolioStats }) {
    const [expanded, setExpanded] = useState(false);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [viewsPerDay, setViewsPerDay] = useState<DailyViews[]>([]);
    const [messagesPerDay, setMessagesPerDay] = useState<DailyMessages[]>([]);
    const [conversations, setConversations] = useState<ConversationSession[]>([]);
    const [insights, setInsights] = useState<EnhancedInsights | null>(null);
    const [loading, setLoading] = useState(false);
    const [insightsLoading, setInsightsLoading] = useState(false);
    const [fetched, setFetched] = useState(false);

    const potentialColor: Record<string, string> = { high: 'text-green-600 bg-green-50 border-green-200', medium: 'text-amber-600 bg-amber-50 border-amber-200', low: 'text-[#9B9A97] bg-[#F7F7F5] border-[#E9E9E7]' };

    // Fetch data only when expanded for the first time
    useEffect(() => {
        if (!expanded || fetched) return;
        let cancelled = false;
        const fetchData = async () => {
            setLoading(true);
            try {
                const [dashData, convData] = await Promise.all([
                    apiFetch(`/analytics/dashboard?portfolioId=${portfolio.portfolio_id}`),
                    apiFetch(`/analytics/conversations?limit=50&portfolioId=${portfolio.portfolio_id}`),
                ]);
                if (cancelled) return;
                setStats(dashData.stats);
                setViewsPerDay(dashData.viewsPerDay || []);
                setMessagesPerDay(dashData.messagesPerDay || []);
                setConversations(convData.conversations || []);
                setFetched(true);
            } catch (err) {
                console.error(`Failed to fetch analytics for ${portfolio.name}:`, err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchData();
        return () => { cancelled = true; };
    }, [expanded, fetched, portfolio.portfolio_id, portfolio.name]);

    // Fetch insights only when expanded and after stats loaded
    useEffect(() => {
        if (!expanded || !fetched || !portfolio.has_ai_manager || insights) return;
        let cancelled = false;
        setInsightsLoading(true);
        const fetchInsights = async () => {
            try {
                const data = await apiFetch(`/analytics/insights?portfolioId=${portfolio.portfolio_id}`);
                if (cancelled) return;
                setInsights(data.insights || null);
            } catch (err) {
                console.error(`Failed to fetch insights for ${portfolio.name}:`, err);
            } finally {
                if (!cancelled) setInsightsLoading(false);
            }
        };
        fetchInsights();
        return () => { cancelled = true; };
    }, [expanded, fetched, portfolio.has_ai_manager, portfolio.portfolio_id, portfolio.name, insights]);

    const refreshInsights = useCallback(async () => {
        setInsightsLoading(true);
        try {
            const data = await apiFetch(`/analytics/insights?portfolioId=${portfolio.portfolio_id}`);
            setInsights(data.insights || null);
        } catch (err) {
            console.error(`Failed to refresh insights for ${portfolio.name}:`, err);
        } finally {
            setInsightsLoading(false);
        }
    }, [portfolio.portfolio_id, portfolio.name]);

    return (
        <div className="border border-[#E9E9E7] rounded-lg overflow-hidden bg-white">
            {/* Portfolio Header — always visible */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#FAFAF9] transition-colors text-left"
            >
                {expanded
                    ? <ChevronDown size={16} className="text-[#9B9A97] shrink-0" />
                    : <ChevronRight size={16} className="text-[#9B9A97] shrink-0" />}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#37352f]">{portfolio.name || 'Untitled'}</span>
                        <span className="text-xs text-[#9B9A97]">/{portfolio.slug}</span>
                        {portfolio.has_ai_manager && (
                            <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-medium">AI</span>
                        )}
                    </div>
                </div>
                {/* Quick stats in collapsed view */}
                <div className="flex items-center gap-4 text-xs text-[#9B9A97] shrink-0">
                    <span className="flex items-center gap-1"><Eye size={12} /> {portfolio.views}</span>
                    <span className="flex items-center gap-1"><Users size={12} /> {portfolio.unique_visitors}</span>
                    {portfolio.has_ai_manager && (
                        <>
                            <span className="flex items-center gap-1"><MessageSquare size={12} /> {portfolio.sessions}</span>
                            <span className="flex items-center gap-1"><MessagesSquare size={12} /> {portfolio.messages}</span>
                        </>
                    )}
                </div>
            </button>

            {/* Expanded Content */}
            {expanded && (
                <div className="border-t border-[#E9E9E7] p-4 space-y-4 bg-[#FAFAF9]">
                    {loading ? (
                        <div className="flex items-center justify-center py-10">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#37352f]" />
                        </div>
                    ) : stats ? (
                        <>
                            {/* Portfolio Stat Cards */}
                            <div className={`grid gap-3 ${portfolio.has_ai_manager ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2'}`}>
                                <div className="bg-white border border-[#E9E9E7] rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <Eye size={14} className="text-[#9B9A97]" />
                                        {stats.views_5d > 0 ? <TrendingUp size={11} className="text-green-500" /> : <TrendingDown size={11} className="text-[#E3E2E0]" />}
                                    </div>
                                    <p className="text-xl font-bold text-[#37352f]">{stats.total_views}</p>
                                    <p className="text-[10px] text-[#9B9A97]">Views ({stats.views_5d} last 5d)</p>
                                </div>
                                <div className="bg-white border border-[#E9E9E7] rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <Users size={14} className="text-[#9B9A97]" />
                                        {stats.unique_visitors > 0 ? <TrendingUp size={11} className="text-green-500" /> : <TrendingDown size={11} className="text-[#E3E2E0]" />}
                                    </div>
                                    <p className="text-xl font-bold text-[#37352f]">{stats.unique_visitors}</p>
                                    <p className="text-[10px] text-[#9B9A97]">Unique Visitors</p>
                                </div>
                                {portfolio.has_ai_manager && (
                                    <>
                                        <div className="bg-white border border-[#E9E9E7] rounded-lg p-3">
                                            <div className="flex items-center justify-between mb-1">
                                                <MessageSquare size={14} className="text-[#9B9A97]" />
                                                {stats.sessions_5d > 0 ? <TrendingUp size={11} className="text-green-500" /> : <TrendingDown size={11} className="text-[#E3E2E0]" />}
                                            </div>
                                            <p className="text-xl font-bold text-[#37352f]">{stats.total_sessions}</p>
                                            <p className="text-[10px] text-[#9B9A97]">
                                                AI Sessions ({stats.sessions_5d} last 5d){' '}
                                                {typeof stats.visitor_to_chat_rate === 'number' ? `• ${stats.visitor_to_chat_rate}% visitor→chat` : ''}
                                            </p>
                                        </div>
                                        <div className="bg-white border border-[#E9E9E7] rounded-lg p-3">
                                            <div className="flex items-center justify-between mb-1">
                                                <MessagesSquare size={14} className="text-[#9B9A97]" />
                                                {stats.total_messages > 0 ? <TrendingUp size={11} className="text-green-500" /> : <TrendingDown size={11} className="text-[#E3E2E0]" />}
                                            </div>
                                            <p className="text-xl font-bold text-[#37352f]">{stats.total_messages}</p>
                                            <p className="text-[10px] text-[#9B9A97]">
                                                AI Messages
                                                {typeof stats.messages_5d === 'number' ? ` (${stats.messages_5d} last 5d)` : ''}
                                                {typeof stats.avg_messages_per_session === 'number' ? ` • ${stats.avg_messages_per_session}/session` : ''}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Chart */}
                            {viewsPerDay.length > 0 && (
                                <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
                                    <h4 className="text-[10px] font-semibold text-[#9B9A97] uppercase tracking-wider mb-2">Views & Messages — Last 5 Days</h4>
                                    <DualLineChart viewsData={viewsPerDay} messagesData={messagesPerDay} />
                                </div>
                            )}

                            {/* AI Insights (only if has_ai_manager) */}
                            {portfolio.has_ai_manager && (
                                <>
                                    {/* Summary + Sentiment */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="md:col-span-2 bg-white border border-[#E9E9E7] rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Sparkles size={13} className="text-amber-500" />
                                                    <h4 className="text-[10px] font-semibold text-[#9B9A97] uppercase tracking-wider">AI Summary</h4>
                                                </div>
                                                <button onClick={refreshInsights} className="text-[#9B9A97] hover:text-[#37352f] p-1 rounded hover:bg-[#F7F7F5]" title="Refresh">
                                                    <RefreshCw size={12} className={insightsLoading ? 'animate-spin' : ''} />
                                                </button>
                                            </div>
                                            {insightsLoading ? (
                                                <div className="space-y-2">
                                                    <div className="h-3 bg-[#E9E9E7] rounded animate-pulse w-3/4" />
                                                    <div className="h-3 bg-[#E9E9E7] rounded animate-pulse w-full" />
                                                </div>
                                            ) : (
                                                <p className="text-sm text-[#37352f] leading-relaxed">{insights?.executive_summary || 'Generating insights...'}</p>
                                            )}
                                        </div>
                                        <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
                                            <h4 className="text-[10px] font-semibold text-[#9B9A97] uppercase tracking-wider mb-2">Sentiment</h4>
                                            {insights ? <SentimentDonut sentiment={insights.sentiment} /> : (
                                                <div className="h-28 flex items-center justify-center text-xs text-[#9B9A97]">Loading...</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Interest Areas + Questions */}
                                    {insights && (insights.interest_areas.length > 0 || insights.top_questions.length > 0) && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {insights.interest_areas.length > 0 && (
                                                <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
                                                    <h4 className="text-[10px] font-semibold text-[#9B9A97] uppercase tracking-wider mb-2">What Visitors Are Interested In</h4>
                                                    <div className="space-y-2">
                                                        {insights.interest_areas.map((area, i) => (
                                                            <div key={i}>
                                                                <div className="flex items-center justify-between text-sm mb-1">
                                                                    <span className="text-[#37352f] truncate">{area.topic}</span>
                                                                    <span className="text-xs text-[#9B9A97] shrink-0 ml-2">{area.percentage}%</span>
                                                                </div>
                                                                <div className="w-full bg-[#F7F7F5] rounded-full h-1.5">
                                                                    <div className="bg-[#37352f] h-1.5 rounded-full" style={{ width: `${area.percentage}%` }} />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {insights.top_questions.length > 0 && (
                                                <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
                                                    <h4 className="text-[10px] font-semibold text-[#9B9A97] uppercase tracking-wider mb-2">Top Visitor Questions</h4>
                                                    <div className="space-y-2">
                                                        {insights.top_questions.map((q, i) => (
                                                            <div key={i} className="flex items-start gap-2 text-sm text-[#37352f]">
                                                                <HelpCircle size={13} className="text-blue-400 mt-0.5 shrink-0" />
                                                                <span>{q}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Conversion Opportunities */}
                                    {insights && insights.conversion_opportunities.length > 0 && (
                                        <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
                                            <h4 className="text-[10px] font-semibold text-[#9B9A97] uppercase tracking-wider mb-2">Conversion Opportunities</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {insights.conversion_opportunities.map((opp, i) => (
                                                    <div key={i} className={`border rounded-lg p-3 ${potentialColor[opp.potential]}`}>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Zap size={13} />
                                                            <span className="text-[10px] font-semibold uppercase">{opp.potential} potential</span>
                                                        </div>
                                                        <p className="text-sm font-medium mb-1">{opp.description}</p>
                                                        <p className="text-xs opacity-80">→ {opp.action}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Recommendations */}
                                    {insights && insights.recommendations.length > 0 && (
                                        <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
                                            <h4 className="text-[10px] font-semibold text-[#9B9A97] uppercase tracking-wider mb-2">Recommendations</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {insights.recommendations.map((rec, i) => (
                                                    <div key={i} className="flex items-start gap-2 bg-[#FAFAF9] border border-[#E9E9E7] rounded-md px-3 py-2">
                                                        <Lightbulb size={13} className="text-amber-500 mt-0.5 shrink-0" />
                                                        <span className="text-sm text-[#37352f]">{rec}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Conversations */}
                                    <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
                                        <h4 className="text-[10px] font-semibold text-[#9B9A97] uppercase tracking-wider mb-2">
                                            AI Conversations {conversations.length > 0 && `(${conversations.length})`}
                                        </h4>
                                        {conversations.length === 0 ? (
                                            <div className="text-center py-6">
                                                <MessageSquare size={18} className="mx-auto text-[#E3E2E0] mb-1" />
                                                <p className="text-xs text-[#9B9A97]">No conversations yet</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                                {conversations.map((session) => (
                                                    <ConversationItem key={session.id} session={session} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        <p className="text-sm text-[#9B9A97] text-center py-6">No data available</p>
                    )}
                </div>
            )}
        </div>
    );
}

// ============================================
// MAIN ANALYTICS PAGE
// ============================================

export default function AnalyticsPage() {
    const [overallStats, setOverallStats] = useState<DashboardStats | null>(null);
    const [overallViewsPerDay, setOverallViewsPerDay] = useState<DailyViews[]>([]);
    const [overallMessagesPerDay, setOverallMessagesPerDay] = useState<DailyMessages[]>([]);
    const [portfolios, setPortfolios] = useState<PortfolioStats[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch overall analytics once on mount
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await apiFetch('/analytics/dashboard');
                if (cancelled) return;
                setOverallStats(data.stats);
                setOverallViewsPerDay(data.viewsPerDay || []);
                setOverallMessagesPerDay(data.messagesPerDay || []);
                setPortfolios(data.topPortfolios || []);
            } catch (err) {
                console.error('Failed to fetch overall analytics:', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    if (loading) {
        return (
            <div className="space-y-6">
                <h1 className="text-lg font-semibold text-[#37352f]">Analytics</h1>
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#37352f]"></div>
                </div>
            </div>
        );
    }

    if (!overallStats) return null;

    const hasAnyAI = portfolios.some(p => p.has_ai_manager);
    const hasData = overallStats.total_views > 0 || overallStats.total_sessions > 0;

    const overallCards = [
        { label: 'Total Views', value: overallStats.total_views, sub: `${overallStats.views_5d} last 5d`, icon: Eye, trend: overallStats.views_5d > 0 },
        { label: 'Unique Visitors', value: overallStats.unique_visitors, sub: 'all time', icon: Users, trend: overallStats.unique_visitors > 0 },
        ...(hasAnyAI ? [
            { label: 'AI Sessions', value: overallStats.total_sessions, sub: `${overallStats.sessions_5d} last 5d`, icon: MessageSquare, trend: overallStats.sessions_5d > 0 },
            {
                label: 'AI Messages',
                value: overallStats.total_messages,
                sub: `${overallStats.messages_5d || 0} last 5d • ${overallStats.avg_messages_per_session || 0}/session`,
                icon: MessagesSquare,
                trend: overallStats.total_messages > 0
            },
            {
                label: 'Visitor→Chat Rate',
                value: `${overallStats.visitor_to_chat_rate || 0}%`,
                sub: 'sessions per unique visitor',
                icon: TrendingUp,
                trend: (overallStats.visitor_to_chat_rate || 0) > 0
            },
        ] : []),
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-[#37352f]" />
                <h1 className="text-lg font-semibold text-[#37352f]">Analytics</h1>
            </div>

            {!hasData ? (
                <div className="text-center py-16 bg-[#F7F7F5] rounded-lg border border-[#E9E9E7]">
                    <Globe size={32} className="mx-auto text-[#E3E2E0] mb-3" />
                    <p className="text-[#37352f] font-medium text-sm">No analytics yet</p>
                    <p className="text-[#9B9A97] text-xs mt-1">Share your portfolio links to start gaining insights.</p>
                </div>
            ) : (
                <>
                    {/* Overall Stat Cards */}
                    <div className={`grid gap-3 ${hasAnyAI ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-2'}`}>
                        {overallCards.map((card) => (
                            <div key={card.label} className="bg-white border border-[#E9E9E7] rounded-lg p-4 hover:shadow-sm transition-shadow">
                                <div className="flex items-center justify-between mb-2">
                                    <card.icon size={16} className="text-[#9B9A97]" />
                                    {card.trend ? <TrendingUp size={12} className="text-green-500" /> : <TrendingDown size={12} className="text-[#E3E2E0]" />}
                                </div>
                                <p className="text-2xl font-bold text-[#37352f]">{card.value.toLocaleString()}</p>
                                <p className="text-xs text-[#9B9A97] mt-1">{card.label}</p>
                                <p className="text-[10px] text-[#C4C4C0] mt-0.5">{card.sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* Overall Chart */}
                    {overallViewsPerDay.length > 0 && (
                        <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
                            <h3 className="text-xs font-semibold text-[#9B9A97] uppercase tracking-wider mb-3">Overall Views & Messages — Last 5 Days</h3>
                            <DualLineChart viewsData={overallViewsPerDay} messagesData={overallMessagesPerDay} />
                        </div>
                    )}
                </>
            )}

            {/* Per-Portfolio Sections */}
            {portfolios.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-xs font-semibold text-[#9B9A97] uppercase tracking-wider">Portfolio Analytics</h2>
                    <div className="space-y-2">
                        {portfolios.map((p) => (
                            <PortfolioAnalyticsSection key={p.portfolio_id} portfolio={p} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
