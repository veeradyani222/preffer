'use client';

import ReactMarkdown from 'react-markdown';
import { Theme } from '@/themes';
import { PortfolioSection } from '@/types/section.types';

interface SectionProps {
    section: PortfolioSection;
    theme: Theme;
}

/**
 * EducationSection - Educational background
 * Content format: { items: [{title, description}] }
 */
export function EducationSection({ section, theme }: SectionProps) {
    const content = section.content || {};
    const items = Array.isArray(content.items) ? content.items : [];
    const heading = section.title; // Using title as heading

    if (items.length === 0) return null;

    // Modern Theme: Vertical Timeline with dots and lines
    if (theme.variant === 'minimal') {
        return (
            <div className="relative border-l-2 ml-3 space-y-8 pl-8 py-2" style={{ borderColor: `${theme.colors.medium}80` }}>
                {items.map((item: any, idx: number) => (
                    <div key={idx} className="relative group">
                        {/* Timeline Dot */}
                        <div
                            className="absolute -left-[39px] top-6 w-5 h-5 rounded-full border-4 bg-white transition-all duration-300 group-hover:scale-125 group-hover:border-theme-darkest"
                            style={{
                                borderColor: theme.colors.darkest,
                            }}
                        />

                        <div
                            className="p-8 transition-all duration-300 hover:translate-x-2"
                            style={{
                                backgroundColor: theme.colors.lightest,
                                borderRadius: theme.radius.medium,
                                boxShadow: theme.shadows.card,
                                border: `1px solid ${theme.colors.medium}20`
                            }}
                        >
                            {item.title && (
                                <h3
                                    className="text-lg font-bold mb-2"
                                    style={{
                                        color: theme.colors.darkest,
                                        fontFamily: theme.typography.fontFamilyHeading
                                    }}
                                >
                                    {item.title}
                                </h3>
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
                    </div>
                ))}
            </div>
        );
    }

    // Techie Theme: Minimal list with mono details
    if (theme.variant === 'techie') {
        return (
            <div className="py-20 border-b" style={{ borderColor: theme.colors.medium }}>
                <div className="grid md:grid-cols-[200px_1fr] gap-8">
                    <div>
                        {heading && (
                            <h2
                                className="text-xl font-bold uppercase tracking-tight sticky top-24"
                                style={{
                                    color: theme.colors.darkest,
                                    fontFamily: theme.typography.fontFamilyHeading
                                }}
                            >
                                {heading}
                            </h2>
                        )}
                    </div>
                    <div className="grid gap-6">
                        {items.map((item: any, idx: number) => (
                            <div
                                key={idx}
                                className="flex flex-col md:flex-row md:items-center justify-between p-6 border transition-all hover:bg-black hover:text-white group"
                                style={{ borderColor: theme.colors.medium }}
                            >
                                <div>
                                    <h3
                                        className="text-lg font-bold uppercase mb-1"
                                        style={{ fontFamily: theme.typography.fontFamilyHeading }}
                                    >
                                        {item.title}
                                    </h3>
                                    <div className="flex items-center gap-2 opacity-80">
                                        <span className="text-sm">{item.institution}</span>
                                        {item.score && (
                                            <>
                                                <span className="w-1 h-1 bg-current rounded-full" />
                                                <span className="font-mono text-xs">{item.score}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div
                                    className="font-mono text-sm mt-4 md:mt-0 opacity-60 group-hover:opacity-100"
                                    style={{ fontFamily: theme.typography.fontFamilyBody }}
                                >
                                    {item.year}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Default Theme: Strong Grid Layout with Hard Shadow Shift
    return (
        <div className="grid gap-6 md:grid-cols-2">
            {items.map((item: any, idx: number) => (
                <div
                    key={idx}
                    className="p-6 flex flex-col justify-between h-full transition-all duration-200 hover:-translate-y-1 hover:-translate-x-1"
                    style={{
                        backgroundColor: theme.colors.lightest,
                        border: `2px solid ${theme.colors.medium}`,
                        borderTop: `6px solid ${theme.colors.darkest}`,
                        boxShadow: `4px 4px 0 ${theme.colors.darkest}40`
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.boxShadow = `8px 8px 0 ${theme.colors.darkest}`;
                        e.currentTarget.style.borderColor = theme.colors.darkest;
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.boxShadow = `4px 4px 0 ${theme.colors.darkest}40`;
                        e.currentTarget.style.borderColor = theme.colors.medium;
                    }}
                >
                    <div>
                        {item.title && (
                            <h3
                                className="text-xl font-bold mb-4"
                                style={{
                                    color: theme.colors.darkest,
                                    fontFamily: theme.typography.fontFamilyHeading
                                }}
                            >
                                {item.title}
                            </h3>
                        )}

                        {item.description && typeof item.description === 'string' && (
                            <div
                                className="prose prose-sm max-w-none"
                                style={{
                                    color: theme.colors.darkest,
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
