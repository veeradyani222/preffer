'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { renderSection, sectionHasContent } from '@/components/sections';
import { defaultTheme, Theme, getThemeForPortfolio, ColorScheme } from '@/themes';
import { PortfolioSection } from '@/types/section.types';
import { LuMenu, LuX } from 'react-icons/lu';

interface Portfolio {
    id: string;
    name: string;
    slug: string;
    portfolio_type: 'individual' | 'company';
    profession: string;
    sections: PortfolioSection[];
    social_links: any;
    theme: string;
    color_scheme?: ColorScheme;
    wizard_data?: any;
    has_ai_manager?: boolean;
    ai_manager_name?: string;
    ai_manager_finalized?: boolean;
}

export default function PublicPortfolioPage() {
    const params = useParams();
    const slug = params.slug as string;

    const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Generate theme based on portfolio settings
    const colorScheme = portfolio?.color_scheme || portfolio?.wizard_data?.colorScheme;
    const theme: Theme = portfolio
        ? getThemeForPortfolio(portfolio.theme || 'modern', colorScheme)
        : defaultTheme;

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

    // Get visible sections sorted by order, with Contact always last
    const getVisibleSections = (): PortfolioSection[] => {
        if (!portfolio?.sections) return [];

        const visible = portfolio.sections.filter(s => (s.visible !== false) && sectionHasContent(s));

        // Sort by order first
        visible.sort((a, b) => a.order - b.order);

        // Filter out contact to append it at the end
        const nonContact = visible.filter(s => s.type !== 'contact');
        const contact = visible.filter(s => s.type === 'contact');

        return [...nonContact, ...contact];
    };

    // Loading state
    if (loading) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ backgroundColor: theme.colors.lightest }}
            >
                <div
                    className="w-8 h-8 border-2 rounded-full animate-spin"
                    style={{
                        borderColor: theme.colors.medium,
                        borderTopColor: theme.colors.darkest,
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
                style={{ backgroundColor: theme.colors.lightest }}
            >
                <div className="text-center">
                    <h1
                        className="text-4xl font-bold mb-2"
                        style={{ color: theme.colors.darkest }}
                    >
                        404
                    </h1>
                    <p style={{ color: theme.colors.dark }}>
                        {error || 'Portfolio not found'}
                    </p>
                </div>
            </div>
        );
    }

    const visibleSections = getVisibleSections();
    const aiManagerSlug =
        portfolio.has_ai_manager &&
            portfolio.ai_manager_finalized &&
            portfolio.ai_manager_name
            ? portfolio.ai_manager_name
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
            : null;

    const aiManagerPath = aiManagerSlug ? `/${portfolio.slug}/${aiManagerSlug}` : null;

    return (
        <div
            className="min-h-screen"
            style={{
                backgroundColor: theme.colors.lightest,
                fontFamily: theme.typography.fontFamilyBody,
                color: theme.colors.dark,
            }}
        >
            {/* NAVIGATION - Responsive Wrapper */}
            {visibleSections.length > 1 && (
                <>
                    {/* MOBILE NAVBAR (Visible on small screens) */}
                    <div className="md:hidden fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between"
                        style={{
                            backgroundColor: `${theme.colors.lightest}ee`,
                            backdropFilter: 'blur(12px)',
                            borderBottom: `1px solid ${theme.colors.medium}30`
                        }}
                    >
                        <span
                            className="font-bold text-lg tracking-tight"
                            style={{
                                color: theme.colors.darkest,
                                fontFamily: theme.typography.fontFamilyHeading
                            }}
                        >
                            {portfolio?.name || 'Portfolio'}
                        </span>
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2 -mr-2"
                            style={{ color: theme.colors.darkest }}
                        >
                            <LuMenu size={24} />
                        </button>
                    </div>

                    {/* DESKTOP NAVBAR (Hidden on mobile) */}
                    <div className="hidden md:block">
                        {theme.variant === 'minimal' ? (
                            /* Modern Theme: Floating pill navbar with bloom hover */
                            <nav className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
                                <div
                                    className="bg-white/90 backdrop-blur-xl border shadow-lg rounded-full px-2 py-2 pointer-events-auto flex gap-2 overflow-x-auto max-w-full"
                                    style={{
                                        backgroundColor: `${theme.colors.lightest}ee`,
                                        borderColor: `${theme.colors.medium}40`,
                                        boxShadow: theme.shadows.card,
                                        borderRadius: theme.radius.full,
                                    }}
                                >
                                    {visibleSections.filter(s => s.type !== 'hero').map(section => (
                                        <button
                                            key={section.id}
                                            onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' })}
                                            className="px-4 py-2 text-sm font-medium whitespace-nowrap transition-all duration-300 rounded-full hover:scale-105"
                                            style={{
                                                color: theme.colors.darkest,
                                                fontFamily: theme.typography.fontFamilyBody,
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = `${theme.colors.medium}20`;
                                                e.currentTarget.style.color = theme.colors.darkest;
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                e.currentTarget.style.color = theme.colors.darkest;
                                            }}
                                        >
                                            {section.title}
                                        </button>
                                    ))}
                                </div>
                            </nav>
                        ) : (theme.variant === 'techie') ? (
                            /* Techie Theme: Technical, fixed top bar with brackets */
                            <nav
                                className="fixed top-0 z-50 w-full px-6 py-4 border-b bg-white"
                                style={{
                                    backgroundColor: theme.colors.lightest,
                                    borderBottom: `2px solid ${theme.colors.darkest}`,
                                }}
                            >
                                <style dangerouslySetInnerHTML={{
                                    __html: `
                                    .hide-scrollbar::-webkit-scrollbar { display: none; }
                                    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                                `}} />
                                <div className="max-w-4xl mx-auto flex items-center justify-between overflow-x-auto gap-8 hide-scrollbar">
                                    <button
                                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                                        className="font-bold text-lg hidden md:block tracking-tight hover:opacity-80 transition-opacity"
                                        style={{
                                            color: theme.colors.darkest,
                                            fontFamily: theme.typography.fontFamilyHeading,
                                        }}
                                    >
                                        {portfolio?.name || 'Portfolio'}
                                    </button>
                                    <div className="flex gap-1 md:gap-2">
                                        {visibleSections.filter(s => s.type !== 'hero').map(section => (
                                            <button
                                                key={section.id}
                                                onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' })}
                                                className="text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-all px-2 py-1 group relative"
                                                style={{
                                                    color: theme.colors.darkest,
                                                    fontFamily: theme.typography.fontFamilyBody
                                                }}
                                            >
                                                <span className="opacity-0 group-hover:opacity-100 transition-opacity mr-1 text-xs">[</span>
                                                {section.title}
                                                <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-xs">]</span>

                                                {/* Underline scanner effect */}
                                                <span
                                                    className="absolute bottom-0 left-0 w-full h-[2px] scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"
                                                    style={{ backgroundColor: theme.colors.darkest }}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </nav>
                        ) : (
                            /* Elegant Theme: Sophisticated, fixed top bar with Serif */
                            <nav
                                className="fixed top-0 z-50 w-full px-8 py-6 transition-all duration-300"
                                style={{
                                    backgroundColor: `${theme.colors.lightest}F0`, // Slight transparency
                                    backdropFilter: 'blur(12px)',
                                    borderBottom: `1px solid ${theme.colors.medium}30`
                                }}
                            >
                                <div className="max-w-6xl mx-auto flex items-center justify-between">
                                    {/* Portfolio Name / Logo */}
                                    <button
                                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                                        className="text-2xl font-serif italic tracking-tight hover:opacity-80 transition-opacity"
                                        style={{ color: theme.colors.darkest, fontFamily: theme.typography.fontFamilyHeading }}
                                    >
                                        {portfolio?.name || 'Portfolio'}
                                    </button>

                                    {/* Links */}
                                    <div className="hidden md:flex items-center gap-8">
                                        {visibleSections.filter(s => s.type !== 'hero').map(section => (
                                            <button
                                                key={section.id}
                                                onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' })}
                                                className="text-sm uppercase tracking-[0.2em] transition-all hover:-translate-y-0.5"
                                                style={{
                                                    color: theme.colors.darkest,
                                                    fontFamily: theme.typography.fontFamilyBody,
                                                    fontSize: '0.75rem'
                                                }}
                                            >
                                                {section.title}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </nav>
                        )}
                    </div>

                    {/* MOBILE SLIDE-OUT MENU (Common Logic, Themed Styles) */}
                    <div
                        className={`fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <div
                            className={`absolute top-0 left-0 bottom-0 w-[80%] max-w-sm bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
                            style={{ backgroundColor: theme.colors.lightest }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Menu Header */}
                            <div className="p-6 flex items-center justify-between border-b" style={{ borderColor: `${theme.colors.medium}30` }}>
                                <span
                                    className="font-bold text-xl"
                                    style={{
                                        color: theme.colors.darkest,
                                        fontFamily: theme.typography.fontFamilyHeading
                                    }}
                                >
                                    Menu
                                </span>
                                <button
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="p-2 -mr-2 rounded-full hover:bg-black/5 transition-colors"
                                    style={{ color: theme.colors.darkest }}
                                >
                                    <LuX size={24} />
                                </button>
                            </div>

                            {/* Menu Links */}
                            <div className="flex-1 overflow-y-auto py-8 px-6 flex flex-col gap-6">
                                {visibleSections.filter(s => s.type !== 'hero').map(section => (
                                    <button
                                        key={section.id}
                                        onClick={() => {
                                            setIsMobileMenuOpen(false);
                                            document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                        className="text-left text-2xl font-medium transition-colors"
                                        style={{
                                            color: theme.colors.darkest,
                                            fontFamily: theme.typography.fontFamilyBody, // Using body font for better readability on mobile lists often, or matching heading if preferred
                                        }}
                                    >
                                        {section.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* MAIN CONTENT - Type-driven section rendering */}
            <main className={`max-w-4xl mx-auto px-6 ${theme.variant === 'techie' ? 'pt-32 pb-12' : 'py-12'}`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.section }}>
                    {visibleSections.map(section => (
                        <section key={section.id} id={section.id} className="scroll-mt-24">
                            {/* Section Header */}
                            {!(section.type === 'hero' && section.content?.headline) && (
                                <h2
                                    className={`mb-8 ${theme.variant === 'techie' ? 'uppercase tracking-tighter' : ''}`}
                                    style={{
                                        color: theme.colors.darkest,
                                        fontFamily: theme.typography.fontFamilyHeading,
                                        fontSize: theme.typography.heading.size,
                                        fontWeight: theme.typography.heading.weight,
                                    }}
                                >
                                    {section.title}
                                </h2>
                            )}

                            {/* Section Content - rendered by type */}
                            {renderSection(section, theme, portfolio.ai_manager_name, aiManagerPath || undefined)}
                        </section>
                    ))}
                </div>
            </main>

            {aiManagerPath && (
                <a
                    href={aiManagerPath}
                    className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-full text-sm font-semibold transition-transform hover:scale-105"
                    style={{
                        backgroundColor: theme.colors.darkest,
                        color: theme.colors.lightest,
                        boxShadow: theme.shadows.card
                    }}
                >
                    Chat with {portfolio.ai_manager_name}
                </a>
            )}

            {/* FOOTER */}
            <footer
                className="mt-20 border-t"
                style={{
                    borderColor: theme.colors.medium,
                    backgroundColor: `${theme.colors.medium}10`
                }}
            >
                <div className="max-w-4xl mx-auto px-6 py-12 text-center">
                    <p style={{
                        color: theme.colors.dark,
                        fontSize: theme.typography.small.size,
                        fontFamily: theme.typography.fontFamilyBody,
                    }}>
                        Built with{' '}
                        <a
                            href="/"
                            className="font-bold hover:underline transition-colors"
                            style={{ color: theme.colors.darkest }}
                        >
                            myportfolio.app
                        </a>
                    </p>
                </div>
            </footer>
        </div>
    );
}
