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
    Clock,
    Sparkles,
    Lightbulb,
    HelpCircle,
    Target,
    Activity,
    RefreshCw,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface DashboardStats {
    total_views: number;
    unique_visitors: number;
    total_sessions: number;
    total_messages: number;
    views_30d: number;
    sessions_30d: number;
}

interface DailyViews {
    date: string;
    views: number;
}

interface PortfolioStats {
    portfolio_id: string;
    name: string;
    slug: string;
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

interface AnalyticsData {
    stats: DashboardStats;
    viewsPerDay: DailyViews[];
    topPortfolios: PortfolioStats[];
}

interface AnalyticsInsight {
    summary: string;
    highlights: string[];
    visitor_behavior: string;
    common_questions: string[];
    recommendations: string[];
}

// ============================================
// MINI CHART (vanilla canvas)
// ============================================

function ViewsChart({ data }: { data: DailyViews[] }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || data.length === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const W = rect.width;
        const H = rect.height;
        const pad = { top: 20, right: 12, bottom: 32, left: 40 };
        const plotW = W - pad.left - pad.right;
        const plotH = H - pad.top - pad.bottom;

        ctx.clearRect(0, 0, W, H);

        const values = data.map(d => d.views);
        const maxVal = Math.max(...values, 1);

        // Grid lines
        ctx.strokeStyle = '#E9E9E7';
        ctx.lineWidth = 1;
        const gridLines = 4;
        for (let i = 0; i <= gridLines; i++) {
            const y = pad.top + (plotH / gridLines) * i;
            ctx.beginPath();
            ctx.moveTo(pad.left, y);
            ctx.lineTo(W - pad.right, y);
            ctx.stroke();

            const val = Math.round(maxVal - (maxVal / gridLines) * i);
            ctx.fillStyle = '#9B9A97';
            ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(val.toString(), pad.left - 6, y + 4);
        }

        // Area gradient
        const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
        gradient.addColorStop(0, 'rgba(55, 53, 47, 0.08)');
        gradient.addColorStop(1, 'rgba(55, 53, 47, 0)');

        ctx.beginPath();
        data.forEach((d, i) => {
            const x = pad.left + (plotW / Math.max(data.length - 1, 1)) * i;
            const y = pad.top + plotH - (d.views / maxVal) * plotH;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.lineTo(pad.left + plotW, pad.top + plotH);
        ctx.lineTo(pad.left, pad.top + plotH);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Line
        ctx.beginPath();
        data.forEach((d, i) => {
            const x = pad.left + (plotW / Math.max(data.length - 1, 1)) * i;
            const y = pad.top + plotH - (d.views / maxVal) * plotH;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = '#37352f';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Dots
        data.forEach((d, i) => {
            const x = pad.left + (plotW / Math.max(data.length - 1, 1)) * i;
            const y = pad.top + plotH - (d.views / maxVal) * plotH;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#37352f';
            ctx.fill();
        });

        // X labels
        ctx.fillStyle = '#9B9A97';
        ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        data.forEach((d, i) => {
            if (i % 7 === 0 || i === data.length - 1) {
                const x = pad.left + (plotW / Math.max(data.length - 1, 1)) * i;
                const dateObj = new Date(d.date);
                const label = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
                ctx.fillText(label, x, H - pad.bottom + 16);
            }
        });
    }, [data]);

    return (
        <canvas
            ref={canvasRef}
            className="w-full"
            style={{ height: 200 }}
        />
    );
}

// ============================================
// AI INSIGHTS PANEL
// ============================================

function InsightsPanel({ insights, loading, onRefresh }: {
    insights: AnalyticsInsight | null;
    loading: boolean;
    onRefresh: () => void;
}) {
    if (loading) {
        return (
            <div className="bg-gradient-to-br from-[#FAFAF9] to-[#F0EFED] border border-[#E9E9E7] rounded-lg p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={16} className="text-amber-500 animate-pulse" />
                    <h3 className="text-xs font-semibold text-[#9B9A97] uppercase tracking-wider">AI Insights</h3>
                </div>
                <div className="space-y-3">
                    <div className="h-4 bg-[#E9E9E7] rounded animate-pulse w-3/4"></div>
                    <div className="h-4 bg-[#E9E9E7] rounded animate-pulse w-full"></div>
                    <div className="h-4 bg-[#E9E9E7] rounded animate-pulse w-2/3"></div>
                </div>
            </div>
        );
    }

    if (!insights) return null;

    return (
        <div className="bg-gradient-to-br from-[#FAFAF9] to-[#F0EFED] border border-[#E9E9E7] rounded-lg p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-500" />
                    <h3 className="text-xs font-semibold text-[#9B9A97] uppercase tracking-wider">AI Insights</h3>
                </div>
                <button
                    onClick={onRefresh}
                    className="text-[#9B9A97] hover:text-[#37352f] transition-colors p-1 rounded hover:bg-white/60"
                    title="Refresh insights"
                >
                    <RefreshCw size={13} />
                </button>
            </div>

            {/* Summary */}
            <p className="text-sm text-[#37352f] leading-relaxed">{insights.summary}</p>

            {/* Highlights */}
            {insights.highlights.length > 0 && (
                <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[#9B9A97]">
                        <Activity size={12} />
                        <span className="text-[10px] font-semibold uppercase tracking-wider">Key Highlights</span>
                    </div>
                    {insights.highlights.map((h, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-[#37352f]">
                            <span className="text-amber-500 mt-0.5 shrink-0">•</span>
                            <span>{h}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Visitor Behavior */}
            {insights.visitor_behavior && (
                <div className="bg-white/60 rounded-md px-3 py-2.5 border border-[#E9E9E7]/50">
                    <div className="flex items-center gap-1.5 text-[#9B9A97] mb-1">
                        <Users size={12} />
                        <span className="text-[10px] font-semibold uppercase tracking-wider">Visitor Behavior</span>
                    </div>
                    <p className="text-sm text-[#37352f]">{insights.visitor_behavior}</p>
                </div>
            )}

            {/* Common Questions */}
            {insights.common_questions.length > 0 && (
                <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[#9B9A97]">
                        <HelpCircle size={12} />
                        <span className="text-[10px] font-semibold uppercase tracking-wider">What Visitors Ask</span>
                    </div>
                    {insights.common_questions.map((q, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-[#37352f]">
                            <span className="text-blue-400 mt-0.5 shrink-0">?</span>
                            <span>{q}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Recommendations */}
            {insights.recommendations.length > 0 && (
                <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[#9B9A97]">
                        <Lightbulb size={12} />
                        <span className="text-[10px] font-semibold uppercase tracking-wider">Recommendations</span>
                    </div>
                    {insights.recommendations.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-[#37352f]">
                            <Target size={11} className="text-emerald-500 mt-0.5 shrink-0" />
                            <span>{r}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================
// CONVERSATION ITEM (expandable)
// ============================================

function ConversationItem({ session }: { session: ConversationSession }) {
    const [expanded, setExpanded] = useState(false);

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
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
                        <span className="text-sm font-medium text-[#37352f] truncate">
                            {session.portfolio_name}
                        </span>
                        <span className="text-xs text-[#9B9A97] bg-[#F7F7F5] px-1.5 py-0.5 rounded">
                            {session.message_count} msgs
                        </span>
                    </div>
                    <p className="text-xs text-[#9B9A97] mt-0.5 truncate">
                        {session.messages[0]?.content || 'No messages'}
                    </p>
                </div>
                <span className="text-xs text-[#9B9A97] whitespace-nowrap shrink-0">
                    {timeAgo(session.last_message_at)}
                </span>
            </button>

            {expanded && session.messages.length > 0 && (
                <div className="border-t border-[#E9E9E7] bg-[#FAFAF9] px-4 py-3 space-y-3 max-h-80 overflow-y-auto">
                    {session.messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'visitor' ? 'justify-start' : 'justify-end'}`}>
                            <div
                                className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${msg.role === 'visitor'
                                        ? 'bg-white border border-[#E9E9E7] text-[#37352f]'
                                        : 'bg-[#37352f] text-white'
                                    }`}
                            >
                                <p className="text-xs font-medium mb-1 opacity-60">
                                    {msg.role === 'visitor' ? '👤 Visitor' : '🤖 AI'}
                                </p>
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
// MAIN ANALYTICS SECTION
// ============================================

export default function AnalyticsSection() {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [conversations, setConversations] = useState<ConversationSession[]>([]);
    const [insights, setInsights] = useState<AnalyticsInsight | null>(null);
    const [loading, setLoading] = useState(true);
    const [insightsLoading, setInsightsLoading] = useState(false);
    const [showConversations, setShowConversations] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [dashboardData, convData] = await Promise.all([
                apiFetch('/analytics/dashboard'),
                apiFetch('/analytics/conversations?limit=10'),
            ]);
            setAnalytics(dashboardData);
            setConversations(convData.conversations || []);
        } catch (err) {
            console.error('Failed to fetch analytics:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchInsights = useCallback(async () => {
        setInsightsLoading(true);
        try {
            const data = await apiFetch('/analytics/insights');
            setInsights(data.insights || null);
        } catch (err) {
            console.error('Failed to fetch insights:', err);
        } finally {
            setInsightsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Fetch AI insights after main data loads
    useEffect(() => {
        if (analytics) {
            fetchInsights();
        }
    }, [analytics, fetchInsights]);

    if (loading) {
        return (
            <section id="analytics" className="space-y-4">
                <div className="flex items-center gap-2 text-[#9B9A97]">
                    <TrendingUp size={14} />
                    <h2 className="text-xs font-semibold uppercase tracking-wider">Analytics</h2>
                </div>
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#37352f]"></div>
                </div>
            </section>
        );
    }

    if (!analytics) return null;

    const { stats, viewsPerDay, topPortfolios } = analytics;
    const hasData = stats.total_views > 0 || stats.total_sessions > 0;

    const statCards = [
        {
            label: 'Total Views',
            value: stats.total_views,
            sub: `${stats.views_30d} last 30d`,
            icon: Eye,
            trend: stats.views_30d > 0,
        },
        {
            label: 'Unique Visitors',
            value: stats.unique_visitors,
            sub: 'all time',
            icon: Users,
            trend: stats.unique_visitors > 0,
        },
        {
            label: 'AI Sessions',
            value: stats.total_sessions,
            sub: `${stats.sessions_30d} last 30d`,
            icon: MessageSquare,
            trend: stats.sessions_30d > 0,
        },
        {
            label: 'AI Messages',
            value: stats.total_messages,
            sub: 'total exchanged',
            icon: MessagesSquare,
            trend: stats.total_messages > 0,
        },
    ];

    return (
        <section id="analytics" className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-2 text-[#9B9A97]">
                <TrendingUp size={14} />
                <h2 className="text-xs font-semibold uppercase tracking-wider">Analytics</h2>
            </div>

            {!hasData ? (
                <div className="text-center py-10 bg-[#F7F7F5] rounded-lg border border-[#E9E9E7]">
                    <Globe size={32} className="mx-auto text-[#E3E2E0] mb-3" />
                    <p className="text-[#37352f] font-medium text-sm">No analytics yet</p>
                    <p className="text-[#9B9A97] text-xs mt-1">
                        Visit counts and AI conversations will appear here once visitors start arriving.
                    </p>

                    {/* Show AI insights even when no data (provides recommendations) */}
                    <div className="mt-6 max-w-lg mx-auto text-left">
                        <InsightsPanel insights={insights} loading={insightsLoading} onRefresh={fetchInsights} />
                    </div>
                </div>
            ) : (
                <>
                    {/* Stat Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {statCards.map((card) => (
                            <div
                                key={card.label}
                                className="bg-white border border-[#E9E9E7] rounded-lg p-4 hover:shadow-sm transition-shadow"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <card.icon size={16} className="text-[#9B9A97]" />
                                    {card.trend ? (
                                        <TrendingUp size={12} className="text-green-500" />
                                    ) : (
                                        <TrendingDown size={12} className="text-[#E3E2E0]" />
                                    )}
                                </div>
                                <p className="text-2xl font-bold text-[#37352f]">
                                    {card.value.toLocaleString()}
                                </p>
                                <p className="text-xs text-[#9B9A97] mt-1">{card.label}</p>
                                <p className="text-[10px] text-[#C4C4C0] mt-0.5">{card.sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* AI Insights Panel */}
                    <InsightsPanel insights={insights} loading={insightsLoading} onRefresh={fetchInsights} />

                    {/* Views Chart */}
                    {viewsPerDay.length > 0 && (
                        <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
                            <h3 className="text-xs font-semibold text-[#9B9A97] uppercase tracking-wider mb-3">
                                Page Views — Last 30 Days
                            </h3>
                            <ViewsChart data={viewsPerDay} />
                        </div>
                    )}

                    {/* Two-column: Top Portfolios + Recent Conversations */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Per-Portfolio Analytics Breakdown */}
                        {topPortfolios.length > 0 && (
                            <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
                                <h3 className="text-xs font-semibold text-[#9B9A97] uppercase tracking-wider mb-3">
                                    Portfolio Analytics
                                </h3>
                                <div className="space-y-3">
                                    {topPortfolios.map((p, idx) => (
                                        <div key={p.portfolio_id} className="border border-[#E9E9E7] rounded-md p-3 hover:bg-[#FAFAF9] transition-colors">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs font-bold text-[#C4C4C0] w-5 text-right">
                                                    {idx + 1}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-[#37352f] font-medium truncate">
                                                        {p.name || 'Untitled'}
                                                    </p>
                                                    <p className="text-xs text-[#9B9A97]">/{p.slug}</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-4 gap-2 ml-7">
                                                <div className="text-center">
                                                    <p className="text-sm font-semibold text-[#37352f]">{p.views}</p>
                                                    <p className="text-[10px] text-[#9B9A97]">views</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-sm font-semibold text-[#37352f]">{p.unique_visitors}</p>
                                                    <p className="text-[10px] text-[#9B9A97]">unique</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-sm font-semibold text-[#37352f]">{p.sessions}</p>
                                                    <p className="text-[10px] text-[#9B9A97]">sessions</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-sm font-semibold text-[#37352f]">{p.messages}</p>
                                                    <p className="text-[10px] text-[#9B9A97]">msgs</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recent AI Conversations */}
                        <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-semibold text-[#9B9A97] uppercase tracking-wider">
                                    Recent AI Conversations
                                </h3>
                                {conversations.length > 3 && (
                                    <button
                                        onClick={() => setShowConversations(!showConversations)}
                                        className="text-xs text-[#9B9A97] hover:text-[#37352f] transition-colors"
                                    >
                                        {showConversations ? 'Show less' : 'Show all'}
                                    </button>
                                )}
                            </div>

                            {conversations.length === 0 ? (
                                <div className="text-center py-6">
                                    <Clock size={20} className="mx-auto text-[#E3E2E0] mb-2" />
                                    <p className="text-xs text-[#9B9A97]">No AI conversations yet</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {(showConversations ? conversations : conversations.slice(0, 3)).map((session) => (
                                        <ConversationItem key={session.id} session={session} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </section>
    );
}
