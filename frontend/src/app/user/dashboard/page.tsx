'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { buildPortfolioUrl } from '@/lib/publicUrls';
import Link from 'next/link';
import { useCredits } from '@/hooks/useCredits';
import {
    Plus,
    Clock,
    MoreHorizontal,
    FileText,
    Layout,
    Globe,
    Eye,
    Users,
    MessageSquare,
    MessagesSquare,
    TrendingUp,
    TrendingDown,
    ArrowRight,
} from 'lucide-react';

const COLOR_SCHEMES: Record<string, string[]> = {
    'warm': ['#2D1810', '#8D6E63', '#D7CCC8', '#FFFCF9'],
    'forest': ['#052010', '#1B4D3E', '#5D8C7B', '#F4FBF7'],
    'ocean': ['#0B1120', '#1E3A8A', '#93C5FD', '#F8FAFC'],
    'luxury': ['#1E1B2E', '#5B21B6', '#DDD6FE', '#FAF9FE'],
    'berry': ['#2A0A18', '#BE185D', '#FBCFE8', '#FFF5F7'],
    'terra': ['#2C1810', '#9A3412', '#FED7AA', '#FFF7ED'],
    'teal': ['#042F2E', '#0D9488', '#99F6E4', '#F0FDFA'],
    'slate': ['#0F172A', '#475569', '#CBD5E1', '#F8FAFC'],
    'monochrome': ['#000000', '#404040', '#A3A3A3', '#FAFAFA']
};

interface Portfolio {
    id: string;
    name: string;
    slug?: string;
    status: string;
    portfolio_type: string;
    profession?: string;
    theme?: string;
    created_at: string;
    updated_at: string;
    wizard_step?: number;
    color_scheme?: {
        name: string;
        colors: string[];
    };
    wizard_data?: any;
}

interface UnfinishedData {
    portfolios: Portfolio[];
    count: number;
    limit: number;
}

interface DashboardStats {
    total_views: number;
    unique_visitors: number;
    total_sessions: number;
    total_messages: number;
    views_5d: number;
    sessions_5d: number;
}

export default function DashboardPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { credits } = useCredits();

    const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
    const [unfinished, setUnfinished] = useState<UnfinishedData>({ portfolios: [], count: 0, limit: 5 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [analyticsStats, setAnalyticsStats] = useState<DashboardStats | null>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/');
        } else if (user) {
            fetchPortfolios();
        }
    }, [user, authLoading]);

    const fetchPortfolios = async () => {
        try {
            const [allData, unfinishedData, analyticsData] = await Promise.all([
                apiFetch('/portfolio/all'),
                apiFetch('/portfolio/unfinished'),
                apiFetch('/analytics/dashboard').catch(() => null),
            ]);
            setPortfolios(allData);
            setUnfinished(unfinishedData);
            if (analyticsData?.stats) setAnalyticsStats(analyticsData.stats);
        } catch (err: any) {
            setError(err.message || 'Failed to load portfolios');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this portfolio?')) return;

        try {
            await apiFetch(`/portfolio/${id}`, { method: 'DELETE' });
            setPortfolios(portfolios.filter(p => p.id !== id));
            setUnfinished(prev => ({
                ...prev,
                portfolios: prev.portfolios.filter(p => p.id !== id),
                count: Math.max(0, prev.count - 1)
            }));
        } catch (err: any) {
            alert(err.message || 'Failed to delete portfolio');
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#37352f]"></div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="space-y-12">
            {/* Header / Greeting */}
            <div className="space-y-1">
                <h1 className="text-3xl font-bold text-[#37352f]">
                    {getGreeting()}, {user.displayName || user.username}
                </h1>
                {credits && (
                    <p className="text-[#9B9A97] text-sm">
                        You have {credits.credits} credits available.
                    </p>
                )}
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm">
                    {error}
                </div>
            )}

            {/* Quick Analytics Summary */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-[#9B9A97]">Analytics Overview</h2>
                    <Link href="/dashboard/analytics" className="text-xs text-[#37352f] hover:underline font-medium">
                        View Details →
                    </Link>
                </div>

                {analyticsStats ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                                { label: 'Total Views', value: analyticsStats.total_views, icon: Eye, trend: analyticsStats.views_5d, trendLabel: 'last 5 days' },
                                { label: 'Unique Visitors', value: analyticsStats.unique_visitors, icon: Users },
                                { label: 'Chat Sessions', value: analyticsStats.total_sessions, icon: MessagesSquare, trend: analyticsStats.sessions_5d, trendLabel: 'last 5 days' },
                                { label: 'Messages', value: analyticsStats.total_messages, icon: MessageSquare },
                            ].map((card) => (
                                <div key={card.label} className="bg-white border border-[#E9E9E7] rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-[#9B9A97] font-medium">{card.label}</span>
                                        <card.icon size={14} className="text-[#9B9A97]" />
                                    </div>
                                    <div className="text-2xl font-bold text-[#37352f]">{card.value.toLocaleString()}</div>
                                    {card.trend !== undefined && (
                                        <div className="flex items-center gap-1 mt-1">
                                            {card.trend > 0 ? (
                                                <TrendingUp size={12} className="text-green-600" />
                                            ) : (
                                                <TrendingDown size={12} className="text-[#9B9A97]" />
                                            )}
                                            <span className={`text-[11px] ${card.trend > 0 ? 'text-green-600' : 'text-[#9B9A97]'}`}>
                                                {card.trend} {card.trendLabel}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <Link
                            href="/dashboard/analytics"
                            className="flex items-center justify-between border border-[#E9E9E7] rounded-lg px-4 py-3 hover:bg-[#FAFAF9] transition-colors group"
                        >
                            <p className="text-sm text-[#9B9A97]">View AI-powered insights, sentiment analysis, and visitor conversations</p>
                            <ArrowRight size={16} className="text-[#9B9A97] group-hover:text-[#37352f] transition-colors shrink-0 ml-3" />
                        </Link>
                    </div>
                ) : (
                    <Link href="/dashboard/analytics" className="block border border-[#E9E9E7] rounded-lg p-5 hover:bg-[#FAFAF9] transition-colors">
                        <p className="text-sm text-[#9B9A97] mb-1">See detailed analytics, AI-powered insights, sentiment analysis, and all visitor conversations.</p>
                        <span className="text-xs text-[#37352f] font-medium">Open Analytics Dashboard →</span>
                    </Link>
                )}
            </section>

            {/* Recently Visited / Unfinished */}
            {unfinished.count > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-3 text-[#9B9A97]">
                        <Clock size={14} />
                        <h2 className="text-xs font-semibold uppercase tracking-wider">Recently Worked On</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {unfinished.portfolios.map((portfolio) => (
                            <Link
                                href={`/user/wizard/${portfolio.id}`}
                                key={portfolio.id}
                                className="group block bg-white border border-[#E9E9E7] rounded-lg p-4 hover:bg-[#F7F7F5] transition-colors shadow-sm hover:shadow-md"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="bg-[#EFEFED] p-2 rounded text-[#37352f]">
                                        <FileText size={20} />
                                    </div>
                                    <button
                                        onClick={(e) => handleDelete(portfolio.id, e)}
                                        className="text-[#9B9A97] opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                                    >
                                        <MoreHorizontal size={16} />
                                    </button>
                                </div>
                                <h3 className="font-medium text-[#37352f] truncate mb-1">
                                    {portfolio.name || 'Untitled'}
                                </h3>
                                <p className="text-xs text-[#9B9A97]">
                                    Edited {new Date(portfolio.updated_at).toLocaleDateString()}
                                </p>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* All Projects */}
            <section>
                <div className="flex items-center justify-between mb-3 border-b border-[#E9E9E7] pb-2">
                    <div className="flex items-center gap-2 text-[#9B9A97]">
                        <Layout size={14} />
                        <h2 className="text-xs font-semibold uppercase tracking-wider">Your Websites</h2>
                    </div>
                    <Link
                        href="/user/wizard/new"
                        className="text-xs text-[#9B9A97] hover:text-[#37352f] flex items-center gap-1 transition-colors"
                    >
                        <Plus size={14} />
                        New
                    </Link>
                </div>

                {portfolios.length === 0 && unfinished.count === 0 ? (
                    <div className="text-center py-12">
                        <div className="inline-block p-4 bg-[#F7F7F5] rounded-full mb-4">
                            <Layout size={32} className="text-[#9B9A97]" />
                        </div>
                        <h3 className="text-[#37352f] font-medium mb-1">No websites yet</h3>
                        <p className="text-[#9B9A97] text-sm mb-4">Create your first portfolio to get started.</p>
                        <Link
                            href="/user/wizard/new"
                            className="inline-flex items-center gap-2 bg-[#37352f] text-white px-4 py-2 rounded hover:bg-black transition-colors text-sm font-medium"
                        >
                            Create Website
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Create New Card */}
                        <Link
                            href="/user/wizard/new"
                            className="flex flex-col items-center justify-center h-[180px] border border-dashed border-[#E9E9E7] rounded-lg hover:bg-[#F7F7F5] transition-colors text-[#9B9A97] hover:text-[#37352f] gap-2"
                        >
                            <Plus size={24} />
                            <span className="text-sm font-medium">Create New</span>
                        </Link>

                        {/* Portfolio Cards */}
                        {portfolios.map((portfolio) => (
                            <div
                                key={portfolio.id}
                                className="group bg-white border border-[#E9E9E7] rounded-lg hover:shadow-md transition-shadow flex flex-col h-[180px] relative"
                            >
                                {/* Cover Preview */}
                                <div className="h-24 bg-[#F7F7F5] relative flex items-center justify-center border-b border-[#E9E9E7] rounded-t-lg overflow-hidden shrink-0">
                                    {(portfolio.color_scheme?.colors || (portfolio.color_scheme as any)?.name) ? (
                                        <div className="w-full h-full flex flex-col">
                                            {(portfolio.color_scheme?.colors || COLOR_SCHEMES[(portfolio.color_scheme as any)?.name?.toLowerCase()] || []).map((color, idx) => (
                                                <div key={idx} className="flex-1" style={{ backgroundColor: color }} />
                                            ))}
                                        </div>
                                    ) : (
                                        <Globe size={24} className="text-[#E3E2E0]" />
                                    )}

                                    {portfolio.status !== 'published' && (
                                        <div className="absolute top-2 left-2 bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                                            Refining
                                        </div>
                                    )}

                                    {portfolio.slug && portfolio.status === 'published' && (
                                        <a
                                            href={buildPortfolioUrl(portfolio.slug)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="absolute top-2 right-2 bg-white/80 p-1 rounded hover:bg-white text-[#37352f] opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                            title="View Live"
                                        >
                                            <Globe size={14} />
                                        </a>
                                    )}
                                </div>

                                <div className="p-3 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start">
                                        <Link href={`/user/wizard/${portfolio.id}`} className="font-medium text-[#37352f] truncate hover:underline flex-1">
                                            {portfolio.name || 'Untitled'}
                                        </Link>

                                        <div className="relative group/menu ml-2">
                                            <button
                                                className="text-[#9B9A97] hover:text-[#37352f] p-1 rounded hover:bg-[#F7F7F5] transition-all"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    // Toggle logic would go here if we weren't using group-hover for simplicity or a library
                                                }}
                                            >
                                                <MoreHorizontal size={16} />
                                            </button>

                                            {/* Dropdown Menu */}
                                            <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-[#E9E9E7] rounded shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-50 py-1">
                                                <Link
                                                    href={`/user/chat?portfolioId=${portfolio.id}`}
                                                    className="block w-full text-left px-3 py-1.5 text-xs text-[#37352f] hover:bg-[#F7F7F5]"
                                                >
                                                    Update (Chat)
                                                </Link>
                                                <button
                                                    onClick={(e) => handleDelete(portfolio.id, e)}
                                                    className="block w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-auto flex items-center justify-between text-xs text-[#9B9A97]">
                                        <span>{portfolio.status === 'published' ? 'Published' : 'Draft'}</span>
                                        <span>{new Date(portfolio.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
