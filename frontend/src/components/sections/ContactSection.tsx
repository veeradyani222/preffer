'use client';

import { Theme } from '@/themes';
import { PortfolioSection } from '@/types/section.types';
import { LuMail, LuPhone, LuMapPin } from 'react-icons/lu';

interface SectionProps {
    section: PortfolioSection;
    theme: Theme;
}

/**
 * ContactSection - Renders contact information with action buttons
 * Content format: { email?: string, phone?: string, address?: string }
 */
export function ContactSection({ section, theme }: SectionProps) {
    const content = section.content || {};

    const legacyEmail = content.email;
    const legacyPhone = content.phone;
    const legacyAddress = content.address;
    const legacyHours = content.hours;
    const legacyWebsite = content.website;
    const legacyGithub = content.github;
    const legacyLinkedin = content.linkedin;
    const legacyTwitter = content.twitter;
    const legacySocial = content.social;

    const linksArray: string[] = Array.isArray(content.links)
        ? content.links.filter((l: any) => typeof l === 'string')
        : typeof content.links === 'string'
            ? content.links.split(',').map((s: string) => s.trim()).filter(Boolean)
            : [];
    const linksObject: Record<string, string> =
        content.links && typeof content.links === 'object' && !Array.isArray(content.links)
            ? content.links
            : {};
    const linksItems: Array<{ label?: string; value?: string; href?: string; url?: string; name?: string; type?: string }> =
        Array.isArray(content.links) && content.links.length > 0 && typeof content.links[0] === 'object'
            ? content.links
            : [];
    const heading = content.heading || content.title;

    const hasLegacyContent =
        legacyEmail ||
        legacyPhone ||
        legacyAddress ||
        legacyHours ||
        legacyWebsite ||
        legacyGithub ||
        legacyLinkedin ||
        legacyTwitter ||
        legacySocial;
    const hasLinksContent =
        linksArray.length > 0 ||
        Object.keys(linksObject).length > 0 ||
        linksItems.length > 0;
    const rawStringContent = typeof content === 'string' ? content : '';
    const hasContent = hasLegacyContent || hasLinksContent || !!rawStringContent;
    if (!hasContent) return null;

    return (
        <div className="space-y-4">
            {heading && (
                <p className="font-medium" style={{ color: theme.colors.text.primary }}>
                    {heading}
                </p>
            )}
            <div className="flex flex-col sm:flex-row flex-wrap gap-4">
            {legacyEmail && (
                <a
                    href={`mailto:${legacyEmail}`}
                    className="inline-flex items-center gap-2 px-6 py-3 font-medium transition-colors"
                    style={{
                        backgroundColor: theme.colors.text.primary,
                        color: theme.colors.background,
                        borderRadius: theme.radius.medium,
                    }}
                >
                    <LuMail size={18} />
                    {legacyEmail}
                </a>
            )}
            {legacyPhone && (
                <a
                    href={`tel:${legacyPhone}`}
                    className="inline-flex items-center gap-2 px-6 py-3 font-medium transition-colors"
                    style={{
                        backgroundColor: theme.colors.surface,
                        color: theme.colors.text.primary,
                        borderRadius: theme.radius.medium,
                        border: `1px solid ${theme.colors.border}`,
                    }}
                >
                    <LuPhone size={18} />
                    {legacyPhone}
                </a>
            )}
            {legacyAddress && (
                <div
                    className="inline-flex items-center gap-2 px-6 py-3"
                    style={{ color: theme.colors.text.secondary }}
                >
                    <LuMapPin size={18} />
                    {legacyAddress}
                </div>
            )}
            {legacyHours && (
                <span
                    className="px-4 py-2 rounded-md text-sm"
                    style={{
                        backgroundColor: theme.colors.surface,
                        border: `1px solid ${theme.colors.border}`,
                        color: theme.colors.text.secondary,
                    }}
                >
                    <span className="font-medium" style={{ color: theme.colors.text.primary }}>
                        Hours:
                    </span>{' '}
                    {legacyHours}
                </span>
            )}
            {legacyWebsite && (
                <a
                    href={legacyWebsite}
                    className="px-4 py-2 rounded-md text-sm underline"
                    style={{
                        backgroundColor: theme.colors.surface,
                        border: `1px solid ${theme.colors.border}`,
                        color: theme.colors.text.secondary,
                    }}
                    target="_blank"
                    rel="noreferrer"
                >
                    Website
                </a>
            )}
            {legacyGithub && (
                <a
                    href={legacyGithub.startsWith('http') ? legacyGithub : `https://${legacyGithub}`}
                    className="px-4 py-2 rounded-md text-sm underline"
                    style={{
                        backgroundColor: theme.colors.surface,
                        border: `1px solid ${theme.colors.border}`,
                        color: theme.colors.text.secondary,
                    }}
                    target="_blank"
                    rel="noreferrer"
                >
                    GitHub
                </a>
            )}
            {legacyLinkedin && (
                <a
                    href={legacyLinkedin.startsWith('http') ? legacyLinkedin : `https://${legacyLinkedin}`}
                    className="px-4 py-2 rounded-md text-sm underline"
                    style={{
                        backgroundColor: theme.colors.surface,
                        border: `1px solid ${theme.colors.border}`,
                        color: theme.colors.text.secondary,
                    }}
                    target="_blank"
                    rel="noreferrer"
                >
                    LinkedIn
                </a>
            )}
            {legacyTwitter && (
                <a
                    href={legacyTwitter.startsWith('http') ? legacyTwitter : `https://twitter.com/${legacyTwitter.replace('@', '')}`}
                    className="px-4 py-2 rounded-md text-sm underline"
                    style={{
                        backgroundColor: theme.colors.surface,
                        border: `1px solid ${theme.colors.border}`,
                        color: theme.colors.text.secondary,
                    }}
                    target="_blank"
                    rel="noreferrer"
                >
                    Twitter/X
                </a>
            )}
            {legacySocial && (
                <span
                    className="px-4 py-2 rounded-md text-sm"
                    style={{
                        backgroundColor: theme.colors.surface,
                        border: `1px solid ${theme.colors.border}`,
                        color: theme.colors.text.secondary,
                    }}
                >
                    <span className="font-medium" style={{ color: theme.colors.text.primary }}>
                        Social:
                    </span>{' '}
                    {legacySocial}
                </span>
            )}

            {linksArray.map((link, idx) => (
                <span
                    key={`link-${idx}`}
                    className="px-4 py-2 rounded-md text-sm"
                    style={{
                        backgroundColor: theme.colors.surface,
                        border: `1px solid ${theme.colors.border}`,
                        color: theme.colors.text.secondary,
                    }}
                >
                    {link}
                </span>
            ))}
            {Object.entries(linksObject).map(([label, value]) => (
                <span
                    key={label}
                    className="px-4 py-2 rounded-md text-sm"
                    style={{
                        backgroundColor: theme.colors.surface,
                        border: `1px solid ${theme.colors.border}`,
                        color: theme.colors.text.secondary,
                    }}
                >
                    <span className="font-medium" style={{ color: theme.colors.text.primary }}>
                        {label}:
                    </span>{' '}
                    {value}
                </span>
            ))}
            {linksItems.map((item, idx) => (
                <span
                    key={`link-item-${idx}`}
                    className="px-4 py-2 rounded-md text-sm"
                    style={{
                        backgroundColor: theme.colors.surface,
                        border: `1px solid ${theme.colors.border}`,
                        color: theme.colors.text.secondary,
                    }}
                >
                    <span className="font-medium" style={{ color: theme.colors.text.primary }}>
                        {item.label || item.name || item.type || 'Link'}:
                    </span>{' '}
                    {item.value || item.href || item.url || ''}
                </span>
            ))}
            {rawStringContent && (
                <span
                    className="px-4 py-2 rounded-md text-sm"
                    style={{
                        backgroundColor: theme.colors.surface,
                        border: `1px solid ${theme.colors.border}`,
                        color: theme.colors.text.secondary,
                    }}
                >
                    {rawStringContent}
                </span>
            )}
            </div>
        </div>
    );
}
