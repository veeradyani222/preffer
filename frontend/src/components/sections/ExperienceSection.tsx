'use client';

import ReactMarkdown from 'react-markdown';
import { Theme } from '@/themes';
import { PortfolioSection } from '@/types/section.types';

interface SectionProps {
    section: PortfolioSection;
    theme: Theme;
}

/**
 * ExperienceSection - Work experience timeline
 * Content format: { items: [{role, company, period, description}] }
 */
export function ExperienceSection({ section, theme }: SectionProps) {
    const content = section.content || {};
    const items = Array.isArray(content.items) ? content.items : [];

    if (items.length === 0) return null;

    // Modern Theme: Distinct Timeline
    if (theme.variant === 'minimal') {
        return (
            <div className="space-y-8">
                {items.map((item: any, idx: number) => (
                    <div
                        key={idx}
                        className="relative pl-8 border-l-2 transition-all duration-300 hover:pl-10 group"
                        style={{ borderColor: `${theme.colors.medium}60` }}
                    >
                        <div
                            className="absolute -left-[9px] top-1 w-4 h-4 rounded-full transition-all duration-300 group-hover:scale-125 group-hover:bg-opacity-100"
                            style={{
                                backgroundColor: theme.colors.darkest,
                                border: `4px solid ${theme.colors.lightest}`,
                                boxShadow: theme.shadows.card
                            }}
                        />
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 mb-2">
                            {item.role && (
                                <h3
                                    className="text-xl font-bold"
                                    style={{
                                        color: theme.colors.darkest,
                                        fontFamily: theme.typography.fontFamilyHeading
                                    }}
                                >
                                    {item.role}
                                </h3>
                            )}
                            {item.company && (
                                <span
                                    className="text-lg font-medium opacity-80"
                                    style={{
                                        color: theme.colors.dark,
                                        fontFamily: theme.typography.fontFamilyBody
                                    }}
                                >
                                    @ {item.company}
                                </span>
                            )}
                        </div>
                        {item.period && (
                            <p
                                className="text-sm font-medium uppercase tracking-wide mb-3"
                                style={{
                                    color: `${theme.colors.darkest}80`,
                                    fontFamily: theme.typography.fontFamilyBody
                                }}
                            >
                                {item.period}
                            </p>
                        )}
                        {item.description && typeof item.description === 'string' && (
                            <div
                                className="prose prose-sm max-w-none"
                                style={{
                                    color: theme.colors.dark,
                                    fontFamily: theme.typography.fontFamilyBody
                                }}
                            >
                                <ReactMarkdown>{String(item.description)}</ReactMarkdown>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    // Elegant Theme: Vertical line with centered nodes
    if (theme.variant === 'elegant') {
        return (
            <div className="max-w-3xl mx-auto space-y-12">
                {items.map((item: any, idx: number) => (
                    <div key={idx} className="flex flex-col items-center text-center">
                        <div className="mb-4">
                            {item.period && (
                                <span
                                    className="text-xs uppercase tracking-[0.2em] mb-2 block"
                                    style={{ color: theme.colors.medium, fontFamily: theme.typography.fontFamilyBody }}
                                >
                                    {item.period}
                                </span>
                            )}
                            {item.role && (
                                <h3
                                    className="text-2xl font-normal"
                                    style={{ color: theme.colors.darkest, fontFamily: theme.typography.fontFamilyHeading }}
                                >
                                    {item.role}
                                </h3>
                            )}
                            {item.company && (
                                <span
                                    className="text-lg italic mt-1 block"
                                    style={{ color: theme.colors.dark, fontFamily: theme.typography.fontFamilyBody }}
                                >
                                    {item.company}
                                </span>
                            )}
                        </div>

                        {/* Decorative separator */}
                        <div className="w-px h-8 mb-4 bg-gray-200" style={{ backgroundColor: `${theme.colors.medium}40` }}></div>

                        {item.description && typeof item.description === 'string' && (
                            <div
                                className="prose prose-sm max-w-lg opacity-80"
                                style={{ fontFamily: theme.typography.fontFamilyBody, color: theme.colors.dark }}
                            >
                                <ReactMarkdown>{String(item.description)}</ReactMarkdown>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    // Techie Theme: Timeline with technical details
    if (theme.variant === 'techie') {
        const experiences = items;

        return (
            <div className="py-20 border-b" style={{ borderColor: theme.colors.medium }}>
                <div className="space-y-0">
                    <div className="space-y-0">
                        {experiences.map((exp: any, idx: number) => (
                            <div
                                key={idx}
                                className="relative pl-8 pb-12 border-l last:pb-0 -ml-4"
                                style={{ borderColor: theme.colors.darkest }}
                            >
                                {/* Timeline Dot */}
                                <div
                                    className="absolute -left-[5px] top-6 w-2.5 h-2.5 bg-white border-2 z-10"
                                    style={{ borderColor: theme.colors.darkest }}
                                />

                                <div
                                    className="p-4 transition-all duration-200 border border-transparent"
                                    style={{
                                        backgroundColor: 'transparent',
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.borderColor = theme.colors.darkest;
                                        e.currentTarget.style.backgroundColor = theme.colors.lightest;
                                        e.currentTarget.style.boxShadow = `4px 4px 0px 0px ${theme.colors.darkest}`;
                                        e.currentTarget.style.transform = 'translate(-2px, -2px)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.borderColor = 'transparent';
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.boxShadow = 'none';
                                        e.currentTarget.style.transform = 'none';
                                    }}
                                >
                                    <div className="flex flex-col md:flex-row md:items-baseline justify-between mb-2">
                                        <h3
                                            className="text-lg font-bold uppercase"
                                            style={{ fontFamily: theme.typography.fontFamilyHeading, color: theme.colors.darkest }}
                                        >
                                            {exp.role}
                                        </h3>
                                        <span
                                            className="font-mono text-xs px-2 py-1 bg-black text-white"
                                            style={{ fontFamily: theme.typography.fontFamilyBody }}
                                        >
                                            {exp.period}
                                        </span>
                                    </div>

                                    <div
                                        className="text-sm font-medium mb-3 uppercase tracking-wide opacity-80"
                                        style={{ color: theme.colors.dark }}
                                    >
                                        {exp.company}
                                    </div>

                                    <p
                                        className="text-sm leading-relaxed max-w-2xl"
                                        style={{ fontFamily: theme.typography.fontFamilyBody, color: theme.colors.dark }}
                                    >
                                        {exp.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Default Theme (Sleek Theme: Minimalist List with hover reveal - now default if not modern or techie)
    return (
        <div className="divide-y" style={{ borderColor: theme.colors.medium }}>
            {items.map((item: any, idx: number) => (
                <div
                    key={idx}
                    className="py-8 first:pt-0 last:pb-0 grid md:grid-cols-[1fr_2fr] gap-6 group transition-all hover:bg-black/5 hover:px-4 -mx-4 px-4 rounded-lg"
                >
                    <div className="flex flex-col justify-between">
                        <div>
                            {item.period && (
                                <div
                                    className="font-mono text-sm mb-2 opacity-60"
                                    style={{
                                        color: theme.colors.darkest,
                                        fontFamily: theme.typography.fontFamilyBody
                                    }}
                                >
                                    {item.period}
                                </div>
                            )}
                            {item.company && (
                                <div
                                    className="font-bold text-lg"
                                    style={{
                                        color: theme.colors.darkest,
                                        fontFamily: theme.typography.fontFamilyHeading
                                    }}
                                >
                                    {item.company}
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        {item.role && (
                            <h3
                                className="text-xl font-bold mb-3"
                                style={{
                                    color: theme.colors.darkest,
                                    fontFamily: theme.typography.fontFamilyHeading
                                }}
                            >
                                {item.role}
                            </h3>
                        )}
                        {item.description && typeof item.description === 'string' && (
                            <div
                                className="prose prose-sm max-w-none opacity-90"
                                style={{
                                    color: theme.colors.dark,
                                    fontFamily: theme.typography.fontFamilyBody
                                }}
                            >
                                <ReactMarkdown>{String(item.description)}</ReactMarkdown>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );

}
