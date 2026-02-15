'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { renderSection, sectionHasContent } from '@/components/sections';
import { defaultTheme, Theme, getThemeForPortfolio, ColorScheme, invertColorScheme } from '@/themes';
import { PortfolioSection } from '@/types/section.types';
import { LuMenu, LuX } from 'react-icons/lu';
import { Sun, Moon } from 'lucide-react';
import { ThemeWrapper } from '@/components/themes/ThemeWrapper';
import { ThemeNavigation } from '@/components/themes/ThemeNavigation';
import { ThemeCursor } from '@/components/themes/ui/ThemeCursor';
import { getSiteDisplayName } from '@/lib/publicUrls';

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
    const siteDisplayName = getSiteDisplayName();

    const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);

    // Generate theme based on portfolio settings
    const colorScheme = portfolio?.color_scheme || portfolio?.wizard_data?.colorScheme;

    const theme: Theme = useMemo(() => {
        if (!portfolio) return defaultTheme;
        let t = getThemeForPortfolio(portfolio.theme || 'modern', colorScheme);
        if (isDarkMode) {
            const invertedScheme = invertColorScheme(colorScheme || { name: 'Default', colors: ['#1a1a1a', '#4a4a4a', '#e5e5e5', '#ffffff'] });
            t = getThemeForPortfolio(portfolio.theme || 'modern', invertedScheme);
        }
        return t;
    }, [portfolio, colorScheme, isDarkMode]);


    useEffect(() => {
        if (slug) fetchPortfolio();
    }, [slug]);

    // Track page view (fire-and-forget)
    useEffect(() => {
        if (portfolio && slug) {
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/analytics/page-view`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug }),
            }).catch(() => { /* silent */ });
        }
    }, [portfolio, slug]);

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

    // --- PARSE SOCIAL LINKS FROM CONTACT SECTION ---
    // Always parse the 'Contact' section content and merge into socialLinks.
    // Expected format: "Email: foo@bar.com, Phone: 123456, Instagram: username"
    let socialLinks = portfolio.social_links || {};

    const contactSection = portfolio.sections.find(s => s.type === 'contact');
    if (contactSection && contactSection.content) {
        let linksStr = '';
        if (typeof contactSection.content.links === 'string') {
            linksStr = contactSection.content.links;
        } else if (typeof contactSection.content === 'string') {
            linksStr = contactSection.content;
        }

        if (linksStr) {
            // Parse "Key: Value, Key: Value"
            const pairs = linksStr.split(',').map(s => s.trim());
            pairs.forEach(pair => {
                const colonIdx = pair.indexOf(':');
                if (colonIdx === -1) return;
                const key = pair.substring(0, colonIdx).trim().toLowerCase();
                const value = pair.substring(colonIdx + 1).trim();
                if (!key || !value) return;
                // Only set if not already populated
                if (key === 'email' && !socialLinks.email) socialLinks.email = value;
                else if (key === 'phone' && !socialLinks.phone) socialLinks.phone = value;
                else if (key === 'instagram' && !socialLinks.instagram) socialLinks.instagram = value;
                else if (key === 'github' && !socialLinks.github) socialLinks.github = value;
                else if (key === 'linkedin' && !socialLinks.linkedin) socialLinks.linkedin = value;
                else if ((key === 'twitter' || key === 'x') && !socialLinks.twitter) socialLinks.twitter = value;
                else if (key === 'dribbble' && !socialLinks.dribbble) socialLinks.dribbble = value;
                else if (key === 'behance' && !socialLinks.behance) socialLinks.behance = value;
            });
        }
    }

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
        <ThemeWrapper theme={theme}>
            <ThemeCursor theme={theme} />
            <div
                className="min-h-screen"
                style={{
                    fontFamily: theme.typography.fontFamilyBody,
                    color: theme.colors.dark,
                    backgroundColor: theme.colors.lightest // Explicitly set background color for the page
                }}
            >
                {/* Mode Toggle - Absolute positioned top right */}
                {/* Adjusted z-index and position for mobile to not overlap with potential hamburger menu */}
                <div className="fixed top-4 right-16 md:top-6 md:right-6 z-[60]">
                    <button
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full transition-transform hover:scale-105 shadow-md"
                        style={{
                            backgroundColor: theme.colors.lightest,
                            color: theme.colors.darkest,
                            // Inverted border logic: Light border in dark mode (where theme.colors.dark is light), Dark border in light mode
                            border: `1px solid ${isDarkMode ? theme.colors.darkest : theme.colors.medium}40`
                        }}
                        title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    >
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                </div>

                {/* DYNAMIC NAVIGATION */}
                {visibleSections.length > 1 && (
                    <ThemeNavigation
                        theme={theme}
                        sections={visibleSections}
                        portfolioName={portfolio.name}
                    />
                )}

                {/* MAIN CONTENT */}
                <main className={`w-full max-w-[1800px] mx-auto px-6 md:px-12 ${theme.variant === 'techie' ? 'pt-32 pb-12' : 'py-12'}`}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.section }}>
                        {visibleSections.map(section => (
                            <section key={section.id} id={section.id} className="scroll-mt-24">
                                {/* Section Header — use content.heading if set, fallback to section.title */}
                                {/* Skip for hero (has its own headline) and contact (renders its own heading) */}
                                {!(section.type === 'hero' && section.content?.headline) && section.type !== 'contact' && (
                                    <h2
                                        className={`mb-8 ${theme.variant === 'techie' ? 'uppercase tracking-tighter' : ''} text-3xl md:text-[length:var(--heading-size)]`}
                                        style={{
                                            color: theme.colors.darkest,
                                            fontFamily: theme.typography.fontFamilyHeading,
                                            fontWeight: theme.typography.heading.weight,
                                            '--heading-size': theme.typography.heading.size
                                        } as React.CSSProperties}
                                    >
                                        {section.title}
                                    </h2>
                                )}

                                {/* Section Content - rendered by type (now wrapped in SectionWrapper) */}
                                {renderSection(section, theme, portfolio.ai_manager_name, aiManagerPath || undefined, socialLinks)}
                            </section>
                        ))}
                    </div>
                </main>

                {/* AI Manager Floating Button */}
                {aiManagerPath && (
                    <a
                        href={aiManagerPath}
                        className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-full text-sm font-semibold transition-transform hover:scale-105 shadow-lg"
                        style={{
                            backgroundColor: theme.colors.darkest,
                            color: theme.colors.lightest,
                        }}
                    >
                        Chat with {portfolio.ai_manager_name}
                    </a>
                )}

                {/* FOOTER */}
                <footer
                    className="mt-20 border-t backdrop-blur-sm"
                    style={{
                        borderColor: theme.colors.medium,
                        backgroundColor: `${theme.colors.medium}10`
                    }}
                >
                    <div className="w-full max-w-[1800px] mx-auto px-6 py-12 text-center">
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
                                {siteDisplayName}
                            </a>
                        </p>
                    </div>
                </footer>
            </div>
        </ThemeWrapper>
    );
}
