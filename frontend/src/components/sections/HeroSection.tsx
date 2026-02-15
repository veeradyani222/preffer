'use client';

import { Theme } from '@/themes';
import { PortfolioSection } from '@/types/section.types';
import { TextReveal } from '@/components/themes/ui/TextReveal';
import * as Icons from 'react-icons/lu';
import { SiGithub, SiLinkedin, SiX, SiInstagram, SiDribbble, SiBehance } from 'react-icons/si';

interface SectionProps {
    section: PortfolioSection;
    theme: Theme;
    aiManagerName?: string;
    aiManagerUrl?: string;
    socialLinks?: any;
}

/**
 * HeroSection - First impression section
 * Content format: { headline: string, subheadline: string }
 */
export function HeroSection({ section, theme, aiManagerName, aiManagerUrl, socialLinks }: SectionProps) {
    const content = section.content || {};
    const headline = content.headline || content.title || '';
    const subheadline = content.subheadline || content.subtitle || content.text || '';

    if (!headline && !subheadline) return null;

    // Helper for Social Links — just icons, no card wrapper
    const renderSocialLinks = () => {
        if (!socialLinks) return null;

        const links = [];
        if (socialLinks.github) links.push({ icon: SiGithub, url: socialLinks.github, label: 'GitHub' });
        if (socialLinks.linkedin) links.push({ icon: SiLinkedin, url: socialLinks.linkedin, label: 'LinkedIn' });
        if (socialLinks.twitter) links.push({ icon: SiX, url: socialLinks.twitter, label: 'Twitter' });
        if (socialLinks.instagram) links.push({ icon: SiInstagram, url: socialLinks.instagram, label: 'Instagram' });
        if (socialLinks.dribbble) links.push({ icon: SiDribbble, url: socialLinks.dribbble, label: 'Dribbble' });
        if (socialLinks.behance) links.push({ icon: SiBehance, url: socialLinks.behance, label: 'Behance' });
        if (socialLinks.email) links.push({ icon: Icons.LuMail, url: `mailto:${socialLinks.email}`, label: 'Email' });
        if (socialLinks.phone) links.push({ icon: Icons.LuPhone, url: `tel:${socialLinks.phone}`, label: 'Phone' });

        if (links.length === 0) return null;

        return (
            <div className="flex flex-wrap gap-3">
                {links.map((link, idx) => {
                    const Icon = link.icon;
                    return (
                        <a
                            key={idx}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 rounded-lg transition-all hover:scale-110 hover:opacity-80"
                            aria-label={link.label}
                            style={{
                                color: theme.colors.darkest,
                            }}
                        >
                            <Icon className="w-5 h-5" />
                        </a>
                    );
                })}
            </div>
        );
    };

    const AiButton = () => {
        if (!aiManagerName || !aiManagerUrl) return null;
        return (
            <a
                href={aiManagerUrl}
                className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-full font-medium transition-all hover:scale-105"
                style={{
                    backgroundColor: theme.colors.darkest,
                    color: theme.colors.lightest,
                    boxShadow: theme.shadows.card
                }}
            >
                <span>Talk to {aiManagerName}</span>
                <Icons.LuMessageSquare className="w-4 h-4" />
            </a>
        );
    }

    // --- UNIFIED 2-COLUMN LAYOUT ---
    // Heading + icons on the same row at the top, subheadline + AI button below

    // Modern/Minimal Theme
    if (theme.variant === 'minimal') {
        return (
            <div className="min-h-[50vh] flex items-center pt-24 pb-12 max-w-7xl mx-auto">
                <div className="w-full">
                    {headline && (
                        <TextReveal
                            as="h1"
                            text={headline}
                            theme={theme}
                            className="text-3xl md:text-5xl font-bold tracking-tight mb-4"
                        />
                    )}
                    {/* Subheadline + Icons row */}
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                        {subheadline && (
                            <p
                                className="text-base md:text-lg leading-relaxed opacity-90 max-w-2xl"
                                style={{
                                    color: theme.colors.dark,
                                    fontFamily: theme.typography.fontFamilyBody,
                                }}
                            >
                                {subheadline}
                            </p>
                        )}
                        {renderSocialLinks()}
                    </div>
                    <AiButton />
                </div>
            </div>
        );
    }

    // Techie Theme
    if (theme.variant === 'techie') {
        return (
            <div
                className="py-16 md:py-24 border-b-2"
                style={{
                    borderColor: theme.colors.darkest,
                    backgroundColor: theme.colors.lightest
                }}
            >
                <div className="w-full max-w-7xl mx-auto px-4">
                    {headline && (
                        <TextReveal
                            as="h1"
                            text={headline}
                            theme={theme}
                            className="text-3xl md:text-5xl font-extrabold leading-tight tracking-tighter uppercase mb-4"
                        />
                    )}
                    {/* Tech deco line */}
                    <div className="w-16 h-1 mb-4" style={{ backgroundColor: theme.colors.darkest }} />
                    {/* Subheadline + Icons row */}
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                        {subheadline && (
                            <p
                                className="text-base md:text-xl leading-relaxed max-w-2xl font-mono"
                                style={{
                                    color: theme.colors.dark,
                                    fontFamily: theme.typography.fontFamilyBody,
                                }}
                            >
                                {subheadline}
                            </p>
                        )}
                        {renderSocialLinks()}
                    </div>
                    <AiButton />
                </div>
            </div>
        )
    }

    // Elegant Theme
    if (theme.variant === 'elegant') {
        return (
            <div className="py-20 min-h-[50vh] flex items-center max-w-7xl mx-auto">
                <div className="w-full px-4">
                    {headline && (
                        <TextReveal
                            as="h1"
                            text={headline}
                            theme={theme}
                            className="text-3xl md:text-6xl tracking-tight mb-6"
                        />
                    )}
                    {/* Subheadline + Icons row */}
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                        {subheadline && (
                            <p
                                className="text-lg md:text-xl italic leading-relaxed pl-6 border-l-2 max-w-2xl"
                                style={{
                                    fontFamily: theme.typography.fontFamilyBody,
                                    color: theme.colors.dark,
                                    borderColor: theme.colors.medium
                                }}
                            >
                                {subheadline}
                            </p>
                        )}
                        {renderSocialLinks()}
                    </div>
                    <div className="mt-8">
                        <AiButton />
                    </div>
                </div>
            </div>
        );
    }

    // Default/Fallback Theme
    return (
        <div className="py-16 min-h-[40vh] flex items-center max-w-7xl mx-auto">
            <div className="w-full">
                {headline && (
                    <TextReveal
                        as="h1"
                        text={headline}
                        theme={theme}
                        className="text-3xl md:text-5xl font-bold tracking-tight mb-4"
                    />
                )}
                {/* Subheadline + Icons row */}
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                    {subheadline && (
                        <p
                            className="text-base md:text-lg leading-relaxed opacity-90 max-w-2xl"
                            style={{
                                color: theme.colors.dark,
                                fontFamily: theme.typography.fontFamilyBody,
                            }}
                        >
                            {subheadline}
                        </p>
                    )}
                    {renderSocialLinks()}
                </div>
                <AiButton />
            </div>
        </div>
    );
}
