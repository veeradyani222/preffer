'use client';

import { Theme } from '@/themes';
import { PortfolioSection } from '@/types/section.types';

interface SectionProps {
    section: PortfolioSection;
    theme: Theme;
    aiManagerName?: string;
    aiManagerUrl?: string;
}

/**
 * HeroSection - First impression section
 * Content format: { headline: string, subheadline: string }
 */
export function HeroSection({ section, theme, aiManagerName, aiManagerUrl }: SectionProps) {
    const content = section.content || {};
    const headline = content.headline || content.title || '';
    const subheadline = content.subheadline || content.subtitle || content.text || '';

    if (!headline && !subheadline) return null;

    const AiButton = () => {
        if (!aiManagerName || !aiManagerUrl) return null;

        // Helper to get raw slug from window if needed, but we can't rely on window in SSR? 
        // This component is client-side ('use client'), so window is safe in event handlers or useEffect, 
        // but for href generation during render it creates hydration mismatches if not careful.
        // However, `page.tsx` is client side too.

        // Let's try to grab the current path from window in a safe way or just use a relative link "./slug"?
        // "./manager-slug" relative to "/portfolio-slug" works!

        return (
            <a
                href={aiManagerUrl}
                className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-full font-medium transition-all hover:scale-105"
                style={{
                    backgroundColor: theme.colors.darkest,
                    color: theme.colors.lightest,
                    boxShadow: theme.shadows.card
                }}
            >
                <span>Talk to {aiManagerName}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
            </a>
        );
    }


    // Modern Theme: Centered, gradient text, soft and airy
    if (theme.variant === 'minimal') {
        return (
            <div className="text-center max-w-3xl mx-auto pt-32 pb-12">
                {headline && (
                    <h1
                        className="text-4xl md:text-6xl font-bold mb-8 tracking-tight"
                        style={{
                            fontFamily: theme.typography.fontFamilyHeading,
                            background: `linear-gradient(135deg, ${theme.colors.darkest} 0%, ${theme.colors.dark} 100%)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}
                    >
                        {headline}
                    </h1>
                )}
                {subheadline && (
                    <p
                        className="text-xl md:text-2xl leading-relaxed opacity-90"
                        style={{
                            color: theme.colors.dark,
                            fontFamily: theme.typography.fontFamilyBody,
                        }}
                    >
                        {subheadline}
                    </p>
                )}

                {/* Decorative Element using Medium color */}
                <div
                    className="w-24 h-1 mx-auto mt-12 rounded-full"
                    style={{ backgroundColor: theme.colors.medium, opacity: 0.3 }}
                />

                <div className="mt-4">
                    <AiButton />
                </div>
            </div>
        );
    }

    // Techie Theme: Minimalist, bold typography, mono font details
    if (theme.variant === 'techie') {
        return (
            <div
                className="py-20 md:py-32 border-b-2"
                style={{
                    borderColor: theme.colors.darkest,
                    backgroundColor: theme.colors.lightest
                }}
            >
                <div className="max-w-4xl mx-auto px-4">
                    {headline && (
                        <h1
                            className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight tracking-tighter"
                            style={{
                                color: theme.colors.darkest,
                                fontFamily: theme.typography.fontFamilyHeading,
                            }}
                        >
                            {headline}
                        </h1>
                    )}
                    {subheadline && (
                        <p
                            className="text-xl md:text-2xl leading-relaxed max-w-2xl"
                            style={{
                                color: theme.colors.dark,
                                fontFamily: theme.typography.fontFamilyBody,
                            }}
                        >
                            {subheadline}
                        </p>
                    )}
                    {/* Subtle tech-inspired line */}
                    <div
                        className="w-full h-px mt-12 mb-8"
                        style={{
                            backgroundColor: theme.colors.medium,
                            opacity: 0.2,
                        }}
                    />
                    <AiButton />
                </div>
            </div>
        )
    }

    // Elegant Theme: Sophisticated, timeless, centered with serif
    if (theme.variant === 'elegant') {
        return (
            <div className="py-24 text-center">
                <div className="max-w-3xl mx-auto px-6">
                    {headline && (
                        <h1
                            className="text-5xl md:text-6xl mb-6 tracking-tight"
                            style={{
                                fontFamily: theme.typography.fontFamilyHeading,
                                color: theme.colors.darkest,
                                fontWeight: theme.typography.heading.weight,
                            }}
                        >
                            {headline}
                        </h1>
                    )}

                    {/* Elegant Divider */}
                    <div className="flex items-center justify-center my-8">
                        <div className="h-px w-16" style={{ backgroundColor: theme.colors.medium }} />
                        <div className="h-1.5 w-1.5 rounded-full mx-4" style={{ backgroundColor: theme.colors.darkest }} />
                        <div className="h-px w-16" style={{ backgroundColor: theme.colors.medium }} />
                    </div>

                    {subheadline && (
                        <p
                            className="text-xl md:text-2xl italic leading-relaxed"
                            style={{
                                fontFamily: theme.typography.fontFamilyBody,
                                color: theme.colors.dark,
                            }}
                        >
                            {subheadline}
                        </p>
                    )}

                    <div className="mt-8">
                        <AiButton />
                    </div>
                </div>
            </div>
        );
    }

    // Default/Fallback Theme (Sleek Theme content moved here as a fallback if no other theme matches)
    return (
        <div
            className="py-12 relative"
            style={{
                borderLeft: `8px solid ${theme.colors.darkest}`,
                paddingLeft: '2.5rem',
                marginLeft: '1rem' // Visual offset
            }}
        >
            {headline && (
                <h1
                    className="text-4xl md:text-3xl font-black mb-8 leading-none tracking-tighter uppercase"
                    style={{
                        color: theme.colors.darkest,
                        fontFamily: theme.typography.fontFamilyHeading
                    }}
                >
                    {headline}
                </h1>
            )}
            {subheadline && (
                <div
                    className="max-w-2xl p-6 relative"
                    style={{
                        backgroundColor: theme.colors.lightest,
                        border: `2px solid ${theme.colors.medium}`, // Use medium for frame
                    }}
                >
                    {/* Tech accent corner */}
                    <div
                        className="absolute -top-1 -right-1 w-3 h-3"
                        style={{ backgroundColor: theme.colors.darkest }}
                    />

                    <p
                        className="text-lg md:text-xl font-medium"
                        style={{
                            color: theme.colors.darkest,
                            fontFamily: theme.typography.fontFamilyBody
                        }}
                    >
                        {subheadline}
                    </p>
                </div>
            )}

            <div className="mt-8 pl-6">
                <AiButton />
            </div>
        </div>
    );
}
