'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { renderSection, sectionHasContent } from '@/components/sections';
import { defaultTheme, Theme } from '@/themes';
import { PortfolioSection } from '@/types/section.types';

interface Portfolio {
    id: string;
    name: string;
    slug: string;
    portfolio_type: 'individual' | 'company';
    profession: string;
    sections: PortfolioSection[];
    social_links: any;
    theme: string;
}

export default function PublicPortfolioPage() {
    const params = useParams();
    const slug = params.slug as string;

    const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Theme - could be extended to support portfolio.theme selection
    const theme: Theme = defaultTheme;

    useEffect(() => {
        if (slug) fetchPortfolio();
    }, [slug]);

    const fetchPortfolio = async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/portfolio/slug/${slug}`);
            if (!response.ok) {
                setError(response.status === 404 ? 'Portfolio not found' : 'Failed to load portfolio');
                return;
            }
            const data = await response.json();
            setPortfolio(data);
            console.log('Portfolio Data:', data);
        } catch {
            setError('Failed to load portfolio');
        } finally {
            setLoading(false);
        }
    };

    // Get visible sections sorted by order
    const getVisibleSections = (): PortfolioSection[] => {
        if (!portfolio?.sections) return [];
        return portfolio.sections
            .filter(s => (s.visible !== false) && sectionHasContent(s))
            .sort((a, b) => a.order - b.order);
    };

    // Loading state
    if (loading) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ backgroundColor: theme.colors.background }}
            >
                <div
                    className="w-8 h-8 border-2 rounded-full animate-spin"
                    style={{
                        borderColor: theme.colors.border,
                        borderTopColor: theme.colors.text.primary,
                    }}
                />
            </div>
        );
    }

    // Error state
    if (error || !portfolio) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ backgroundColor: theme.colors.background }}
            >
                <div className="text-center">
                    <h1
                        className="text-4xl font-bold mb-2"
                        style={{ color: theme.colors.text.primary }}
                    >
                        404
                    </h1>
                    <p style={{ color: theme.colors.text.secondary }}>
                        {error || 'Portfolio not found'}
                    </p>
                </div>
            </div>
        );
    }

    const visibleSections = getVisibleSections();

    return (
        <div
            className="min-h-screen"
            style={{
                backgroundColor: theme.colors.background,
                fontFamily: theme.typography.fontFamily,
            }}
        >
            {/* NAVIGATION - Only if multiple sections */}
            {visibleSections.length > 1 && (
                <nav
                    className="sticky top-0 z-50 backdrop-blur-sm"
                    style={{
                        backgroundColor: `${theme.colors.background}cc`,
                        borderBottom: `1px solid ${theme.colors.border}`,
                    }}
                >
                    <div className="max-w-4xl mx-auto px-6">
                        <div className="flex gap-6 overflow-x-auto py-4">
                            {visibleSections.map(section => (
                                <button
                                    key={section.id}
                                    onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' })}
                                    className="font-medium whitespace-nowrap transition-colors hover:opacity-80"
                                    style={{
                                        color: theme.colors.text.muted,
                                        fontSize: theme.typography.small.size,
                                    }}
                                >
                                    {section.title}
                                </button>
                            ))}
                        </div>
                    </div>
                </nav>
            )}

            {/* MAIN CONTENT - Type-driven section rendering */}
            <main className="max-w-4xl mx-auto px-6 py-12">
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.section }}>
                    {visibleSections.map(section => (
                        <section key={section.id} id={section.id} className="scroll-mt-20">
                            {/* Section Header */}
                            {!(section.type === 'hero' && section.content?.headline) && (
                                <h2
                                    className="mb-6"
                                    style={{
                                        color: theme.colors.text.primary,
                                        fontSize: theme.typography.heading.size,
                                        fontWeight: theme.typography.heading.weight,
                                    }}
                                >
                                    {section.title}
                                </h2>
                            )}

                            {/* Section Content - rendered by type */}
                            {renderSection(section, theme)}
                        </section>
                    ))}
                </div>
            </main>

            {/* FOOTER */}
            <footer
                className="mt-20"
                style={{ borderTop: `1px solid ${theme.colors.border}` }}
            >
                <div className="max-w-4xl mx-auto px-6 py-8 text-center">
                    <p style={{
                        color: theme.colors.text.muted,
                        fontSize: theme.typography.small.size,
                    }}>
                        Built with{' '}
                        <a
                            href="/"
                            className="hover:underline transition-colors"
                            style={{ color: theme.colors.text.secondary }}
                        >
                            myportfolio
                        </a>
                    </p>
                </div>
            </footer>
        </div>
    );
}
