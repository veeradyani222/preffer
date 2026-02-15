'use client';

import { Theme } from '@/themes';
import { PortfolioSection } from '@/types/section.types';
import { LuMail, LuPhone, LuMapPin, LuGlobe } from 'react-icons/lu';
import { SiGithub, SiLinkedin, SiX, SiInstagram, SiDribbble, SiBehance } from 'react-icons/si';
import { IconType } from 'react-icons';

// Icon map for social links
const SOCIAL_ICONS: Record<string, IconType> = {
    GitHub: SiGithub,
    LinkedIn: SiLinkedin,
    Twitter: SiX,
    Instagram: SiInstagram,
    Dribbble: SiDribbble,
    Behance: SiBehance,
    Website: LuGlobe,
};

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

    // --- Parse "Key: Value, Key: Value" string format from content.links ---
    // The AI/schema stores contacts as: 'Email: foo@bar.com, Phone: 123, Instagram: handle'
    // We need to extract these into individual fields for the component to render.
    if (typeof content.links === 'string' && content.links.includes(':')) {
        const pairs = content.links.split(',').map((s: string) => s.trim());
        pairs.forEach((pair: string) => {
            const colonIdx = pair.indexOf(':');
            if (colonIdx === -1) return;
            const key = pair.substring(0, colonIdx).trim().toLowerCase();
            const value = pair.substring(colonIdx + 1).trim();
            if (!value) return;
            if (key === 'email' && !content.email) content.email = value;
            else if (key === 'phone' && !content.phone) content.phone = value;
            else if (key === 'instagram' && !content.instagram) content.instagram = value;
            else if (key === 'github' && !content.github) content.github = value;
            else if (key === 'linkedin' && !content.linkedin) content.linkedin = value;
            else if ((key === 'twitter' || key === 'x') && !content.twitter) content.twitter = value;
            else if (key === 'website' && !content.website) content.website = value;
            else if (key === 'address' && !content.address) content.address = value;
            else if (key === 'dribbble' && !content.dribbble) content.dribbble = value;
            else if (key === 'behance' && !content.behance) content.behance = value;
        });
    }

    const legacyEmail = content.email;
    const legacyPhone = content.phone;
    const legacyAddress = content.address;
    const legacyHours = content.hours;
    const legacyWebsite = content.website;
    const legacyGithub = content.github;
    const legacyLinkedin = content.linkedin;
    const legacyTwitter = content.twitter;
    const legacySocial = content.social;
    const legacyInstagram = content.instagram;
    const legacyDribbble = content.dribbble;
    const legacyBehance = content.behance;

    const linksArray: string[] = Array.isArray(content.links)
        ? content.links.filter((l: any) => typeof l === 'string')
        : []; // Don't re-split the string here; we already parsed it above

    // Normalize links array to handle both strings and objects
    const normalizedLinks = Array.isArray(content.links)
        ? content.links.filter(Boolean).map((item: any) => {
            if (typeof item === 'string') return null; // handled separately or skip
            return {
                label: item.label || item.name || item.type || 'Link',
                url: item.url || item.href || item.value || item.text
            };
        }).filter((item: any) => item && item.url)
        : [];

    const heading = content.heading || content.title;

    const hasLegacyContacts = legacyEmail || legacyPhone;
    const hasMetaInfo = legacyAddress || legacyHours;
    const hasLinks = normalizedLinks.length > 0 || legacyGithub || legacyLinkedin || legacyTwitter || legacyWebsite || legacyInstagram || legacyDribbble || legacyBehance;

    if (!heading && !hasLegacyContacts && !hasMetaInfo && !hasLinks) return null;

    // Modern Theme: Friendly, centered, with large icons
    if (theme.variant === 'minimal') {
        return (
            <div
                className="max-w-4xl mx-auto p-6 rounded-3xl text-center transition-all duration-300 hover:shadow-lg"
                style={{
                    backgroundColor: theme.colors.lightest,
                    border: `1px solid ${theme.colors.medium}20`,
                    boxShadow: theme.shadows.card
                }}
            >
                {heading && (
                    <h2
                        className="text-2xl font-bold mb-3 tracking-tight"
                        style={{
                            color: theme.colors.darkest,
                            fontFamily: theme.typography.fontFamilyHeading
                        }}
                    >
                        {heading}
                    </h2>
                )}

                {hasLegacyContacts && (
                    <div className="flex flex-wrap justify-center gap-4 mb-4">
                        {legacyEmail && (
                            <a
                                href={`mailto:${legacyEmail}`}
                                className="flex items-center gap-2 px-5 py-2.5 font-medium transition-all duration-300 hover:scale-105 hover:-translate-y-1 shadow-md hover:shadow-xl"
                                style={{
                                    backgroundColor: theme.colors.darkest,
                                    color: theme.colors.lightest,
                                    border: `1px solid ${theme.colors.darkest}`,
                                    borderRadius: '12px',
                                    fontFamily: theme.typography.fontFamilyBody
                                }}
                            >
                                <LuMail size={18} />
                                {legacyEmail}
                            </a>
                        )}
                        {legacyPhone && (
                            <a
                                href={`tel:${legacyPhone}`}
                                className="flex items-center gap-2 px-5 py-2.5 font-medium transition-all duration-300 hover:scale-105 hover:-translate-y-1 shadow-sm hover:shadow-md"
                                style={{
                                    backgroundColor: 'transparent',
                                    color: theme.colors.darkest,
                                    borderRadius: '12px',
                                    border: `1px solid ${theme.colors.medium}30`,
                                    fontFamily: theme.typography.fontFamilyBody
                                }}
                            >
                                <LuPhone size={18} />
                                {legacyPhone}
                            </a>
                        )}
                    </div>
                )}

                {hasMetaInfo && (
                    <div className="flex flex-wrap justify-center gap-3 text-sm opacity-80 mb-4">
                        {legacyAddress && (
                            <div
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                                style={{
                                    backgroundColor: `${theme.colors.medium}10`,
                                    color: theme.colors.dark,
                                    fontFamily: theme.typography.fontFamilyBody
                                }}
                            >
                                <LuMapPin size={14} />
                                {legacyAddress}
                            </div>
                        )}
                        {legacyHours && (
                            <div
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                                style={{
                                    backgroundColor: `${theme.colors.medium}10`,
                                    color: theme.colors.dark,
                                    fontFamily: theme.typography.fontFamilyBody
                                }}
                            >
                                <span className="font-medium">Hours:</span> {legacyHours}
                            </div>
                        )}
                    </div>
                )}

                {/* Additional Links Row */}
                {hasLinks && (
                    <div
                        className={`flex flex-wrap justify-center gap-3 ${hasLegacyContacts || hasMetaInfo ? 'mt-4 pt-4 border-t' : 'mt-2'}`}
                        style={{ borderColor: `${theme.colors.medium}20` }}
                    >
                        {/* Standard Legacy Links */}
                        {[
                            { link: legacyGithub, label: 'GitHub' },
                            { link: legacyLinkedin, label: 'LinkedIn' },
                            { link: legacyTwitter, label: 'Twitter' },
                            { link: legacyInstagram, label: 'Instagram' },
                            { link: legacyDribbble, label: 'Dribbble' },
                            { link: legacyBehance, label: 'Behance' },
                            { link: legacyWebsite, label: 'Website' }
                        ].map((item, i) => {
                            if (!item.link) return null;
                            const Icon = SOCIAL_ICONS[item.label];
                            return (
                                <a
                                    key={`std-link-${i}`}
                                    href={item.link.startsWith('http') ? item.link : `https://${item.link}`}
                                    className="flex items-center gap-2 px-4 py-1.5 text-sm rounded-full hover:bg-black hover:text-white transition-colors duration-300"
                                    style={{
                                        backgroundColor: `${theme.colors.medium}10`,
                                        color: theme.colors.darkest,
                                        border: `1px solid ${theme.colors.medium}20`,
                                        fontFamily: theme.typography.fontFamilyBody,
                                        fontWeight: 500
                                    }}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    {Icon && <Icon size={14} />}
                                    {item.label}
                                </a>
                            );
                        })}

                        {/* Normalized Object Links */}
                        {normalizedLinks.map((item: any, idx: number) => (
                            <a
                                key={`link-item-${idx}`}
                                href={item.url}
                                className="px-4 py-1.5 text-sm rounded-full hover:bg-black hover:text-white transition-colors duration-300"
                                style={{
                                    backgroundColor: `${theme.colors.medium}10`,
                                    color: theme.colors.darkest,
                                    border: `1px solid ${theme.colors.medium}20`,
                                    fontFamily: theme.typography.fontFamilyBody,
                                    fontWeight: 500
                                }}
                                target={item.url.startsWith('http') ? '_blank' : undefined}
                                rel={item.url.startsWith('http') ? 'noreferrer' : undefined}
                            >
                                {item.label}
                            </a>
                        ))}
                    </div>
                )}
            </div >
        );
    }

    // Elegant Theme: Minimalist typographical
    if (theme.variant === 'elegant') {
        return (
            <div
                className="max-w-3xl mx-auto py-8 px-8 text-center"
                style={{
                    border: `1px solid ${theme.colors.medium}40`,
                    backgroundColor: 'transparent' // No background on Elegant as requested
                }}
            >
                {heading && (
                    <h3
                        className="text-3xl md:text-4xl mb-6 font-serif italic"
                        style={{
                            color: theme.colors.darkest,
                            fontFamily: theme.typography.fontFamilyHeading
                        }}
                    >
                        {heading}
                    </h3>
                )}

                <div className="flex flex-wrap justify-center gap-8 mb-6">
                    {legacyEmail && (
                        <a
                            href={`mailto:${legacyEmail}`}
                            className="group flex flex-col items-center gap-2"
                        >
                            <span
                                className="p-3 rounded-full transition-colors group-hover:bg-stone-100"
                                style={{ backgroundColor: `${theme.colors.medium}10` }}
                            >
                                <LuMail className="w-5 h-5" style={{ color: theme.colors.darkest }} />
                            </span>
                            <span
                                className="text-base border-b border-transparent group-hover:border-current transition-all pb-0.5"
                                style={{ color: theme.colors.darkest, fontFamily: theme.typography.fontFamilyBody }}
                            >
                                {legacyEmail}
                            </span>
                        </a>
                    )}

                    {[
                        { link: legacyLinkedin, label: 'LinkedIn' },
                        { link: legacyTwitter, label: 'Twitter' },
                        { link: legacyInstagram, label: 'Instagram' },
                        { link: legacyGithub, label: 'GitHub' },
                        { link: legacyWebsite, label: 'Website' }
                    ].map((item, i) => {
                        if (!item.link) return null;
                        const Icon = SOCIAL_ICONS[item.label];
                        return (
                            <a
                                key={i}
                                href={item.link}
                                target="_blank"
                                rel="noopener"
                                className="group flex flex-col items-center gap-2"
                            >
                                <span
                                    className="p-3 rounded-full transition-colors group-hover:bg-stone-100"
                                    style={{ backgroundColor: `${theme.colors.medium}10` }}
                                >
                                    {Icon
                                        ? <Icon className="w-5 h-5" style={{ color: theme.colors.darkest }} />
                                        : <span className="w-5 h-5 flex items-center justify-center font-serif italic text-lg" style={{ color: theme.colors.darkest }}>{item.label[0]}</span>
                                    }
                                </span>
                                <span
                                    className="text-base border-b border-transparent group-hover:border-current transition-all pb-0.5"
                                    style={{ color: theme.colors.darkest, fontFamily: theme.typography.fontFamilyBody }}
                                >
                                    {item.label}
                                </span>
                            </a>
                        );
                    })}
                </div>

                {/* Additional Links Row for Elegant - Compact */}
                {hasLinks && (
                    <div className="flex flex-wrap justify-center gap-4 mt-4">
                        {normalizedLinks.map((item: any, idx: number) => (
                            <a
                                key={`link-item-${idx}`}
                                href={item.url}
                                className="text-sm border-b border-transparent hover:border-current transition-all pb-0.5"
                                style={{ color: theme.colors.darkest, fontFamily: theme.typography.fontFamilyBody }}
                                target={item.url.startsWith('http') ? '_blank' : undefined}
                                rel={item.url.startsWith('http') ? 'noreferrer' : undefined}
                            >
                                {item.label}
                            </a>
                        ))}
                    </div>
                )}

                {/* Simplified footer for elegant theme */}
                {hasMetaInfo && (
                    <div className="mt-6 text-xs opacity-50 tracking-widest uppercase font-serif" style={{ color: theme.colors.darkest }}>
                        {legacyAddress || 'Get in touch'}
                    </div>
                )}
            </div>
        );
    }

    // Techie Theme: Minimalist Action Grid
    return (
        <div
            className="p-6 border-2 relative"
            style={{
                borderColor: theme.colors.darkest,
                backgroundColor: theme.colors.lightest
            }}
        >
            {/* Terminal Window Title */}
            {heading && (
                <div
                    className="absolute -top-3 left-6 px-3 font-mono text-xs font-bold uppercase tracking-widest"
                    style={{
                        backgroundColor: theme.colors.darkest,
                        color: theme.colors.lightest
                    }}
                >
                    {heading}
                </div>
            )}

            <div className="flex flex-col md:flex-row items-start gap-4 pt-2">
                {/* Explicit Action Area */}
                <div className="flex flex-col gap-3 w-full">
                    <div className="flex flex-wrap gap-3 w-full">
                        {/* Primary Contact Actions */}
                        {legacyEmail && (
                            <a
                                href={`mailto:${legacyEmail}`}
                                className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border transition-all duration-200"
                                style={{
                                    borderColor: theme.colors.darkest,
                                    color: theme.colors.darkest,
                                    backgroundColor: 'transparent',
                                    fontFamily: theme.typography.fontFamilyBody,
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = theme.colors.darkest;
                                    e.currentTarget.style.color = theme.colors.lightest;
                                    e.currentTarget.style.boxShadow = `3px 3px 0px 0px ${theme.colors.darkest}`;
                                    e.currentTarget.style.transform = 'translate(-1px, -1px)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = theme.colors.darkest;
                                    e.currentTarget.style.boxShadow = 'none';
                                    e.currentTarget.style.transform = 'none';
                                }}
                            >
                                <span>Email_Me</span>
                                <LuMail size={14} />
                            </a>
                        )}
                        {legacyPhone && (
                            <a
                                href={`tel:${legacyPhone}`}
                                className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border transition-all duration-200"
                                style={{
                                    borderColor: theme.colors.darkest,
                                    color: theme.colors.darkest,
                                    backgroundColor: 'transparent',
                                    fontFamily: theme.typography.fontFamilyBody,
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = theme.colors.darkest;
                                    e.currentTarget.style.color = theme.colors.lightest;
                                    e.currentTarget.style.boxShadow = `3px 3px 0px 0px ${theme.colors.darkest}`;
                                    e.currentTarget.style.transform = 'translate(-1px, -1px)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = theme.colors.darkest;
                                    e.currentTarget.style.boxShadow = 'none';
                                    e.currentTarget.style.transform = 'none';
                                }}
                            >
                                <span>Call_Me</span>
                                <LuPhone size={14} />
                            </a>
                        )}

                        {/* Social & Other Links */}
                        {[
                            { link: legacyGithub, label: 'GitHub' },
                            { link: legacyLinkedin, label: 'LinkedIn' },
                            { link: legacyTwitter, label: 'Twitter' },
                            { link: legacyInstagram, label: 'Instagram' },
                            { link: legacyDribbble, label: 'Dribbble' },
                            { link: legacyBehance, label: 'Behance' },
                            { link: legacyWebsite, label: 'Website' }
                        ].map((item, i) => {
                            if (!item.link) return null;
                            const Icon = SOCIAL_ICONS[item.label];
                            return (
                                <a
                                    key={`std-link-${i}`}
                                    href={item.link.startsWith('http') ? item.link : `https://${item.link}`}
                                    className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border transition-all duration-200"
                                    style={{
                                        borderColor: theme.colors.darkest,
                                        color: theme.colors.darkest,
                                        backgroundColor: 'transparent',
                                        fontFamily: theme.typography.fontFamilyBody,
                                    }}
                                    target="_blank"
                                    rel="noreferrer"
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.backgroundColor = theme.colors.darkest;
                                        e.currentTarget.style.color = theme.colors.lightest;
                                        e.currentTarget.style.boxShadow = `3px 3px 0px 0px ${theme.colors.darkest}`;
                                        e.currentTarget.style.transform = 'translate(-1px, -1px)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.color = theme.colors.darkest;
                                        e.currentTarget.style.boxShadow = 'none';
                                        e.currentTarget.style.transform = 'none';
                                    }}
                                >
                                    {Icon && <Icon size={14} />}
                                    {item.label}
                                    <span className="text-[9px] opacity-70">↗</span>
                                </a>
                            );
                        })}

                        {/* Normalized Object Links */}
                        {normalizedLinks.map((item: any, idx: number) => (
                            <a
                                key={`link-item-${idx}`}
                                href={item.url}
                                className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border transition-all duration-200"
                                style={{
                                    borderColor: theme.colors.darkest,
                                    color: theme.colors.darkest,
                                    backgroundColor: 'transparent',
                                    fontFamily: theme.typography.fontFamilyBody,
                                }}
                                target={item.url.startsWith('http') ? '_blank' : undefined}
                                rel={item.url.startsWith('http') ? 'noreferrer' : undefined}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = theme.colors.darkest;
                                    e.currentTarget.style.color = theme.colors.lightest;
                                    e.currentTarget.style.boxShadow = `3px 3px 0px 0px ${theme.colors.darkest}`;
                                    e.currentTarget.style.transform = 'translate(-1px, -1px)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = theme.colors.darkest;
                                    e.currentTarget.style.boxShadow = 'none';
                                    e.currentTarget.style.transform = 'none';
                                }}
                            >
                                {item.label}
                                {item.url.startsWith('http') && <span className="text-[9px] opacity-70">↗</span>}
                            </a>
                        ))}
                    </div>
                </div>
            </div>

            {/* Meta Info (Location, etc) */}
            {hasMetaInfo && (
                <div className="flex flex-wrap gap-4 mt-4 text-[10px] font-mono uppercase opacity-60 border-t pt-2" style={{ borderColor: theme.colors.dark, color: theme.colors.dark }}>
                    {legacyAddress && <span>LOC: {legacyAddress}</span>}
                    {legacyHours && <span>HRS: {legacyHours}</span>}
                </div>
            )}
        </div>
    );
}
