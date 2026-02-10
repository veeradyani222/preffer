'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { useCredits } from '@/hooks/useCredits';
import {
    Plus,
    Clock,
    MoreHorizontal,
    FileText,
    Layout,
    Globe
} from 'lucide-react';

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
}

interface UnfinishedData {
    portfolios: Portfolio[];
    count: number;
    limit: number;
}

export default function DashboardPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { credits } = useCredits();

    const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
    const [unfinished, setUnfinished] = useState<UnfinishedData>({ portfolios: [], count: 0, limit: 5 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/');
        } else if (user) {
            fetchPortfolios();
        }
    }, [user, authLoading]);

    const fetchPortfolios = async () => {
        try {
            const [allData, unfinishedData] = await Promise.all([
                apiFetch('/portfolio/all'),
                apiFetch('/portfolio/unfinished')
            ]);
            setPortfolios(allData);
            setUnfinished(unfinishedData);
        } catch (err: any) {
            console.error('Failed to fetch portfolios:', err);
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
                                className="group bg-white border border-[#E9E9E7] rounded-lg overflow-hidden hover:shadow-md transition-shadow flex flex-col h-[180px]"
                            >
                                {/* Cover Preview */}
                                <div className="h-24 bg-[#F7F7F5] relative flex items-center justify-center border-b border-[#E9E9E7]">
                                    <Globe size={24} className="text-[#E3E2E0]" />
                                    {portfolio.slug && (
                                        <Link
                                            href={`/${portfolio.slug}`}
                                            target="_blank"
                                            className="absolute top-2 right-2 bg-white/80 p-1 rounded hover:bg-white text-[#37352f] opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="View Live"
                                        >
                                            <Globe size={14} />
                                        </Link>
                                    )}
                                </div>

                                <div className="p-3 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start">
                                        <Link href={`/user/wizard/${portfolio.id}`} className="font-medium text-[#37352f] truncate hover:underline flex-1">
                                            {portfolio.name || 'Untitled'}
                                        </Link>

                                        <div className="relative">
                                            <button
                                                onClick={(e) => handleDelete(portfolio.id, e)}
                                                className="text-[#9B9A97] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                            >
                                                <MoreHorizontal size={14} />
                                            </button>
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
