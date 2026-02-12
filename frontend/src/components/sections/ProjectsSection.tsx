'use client';

import ReactMarkdown from 'react-markdown';
import { Theme } from '@/themes';
import { PortfolioSection } from '@/types/section.types';
import { LuExternalLink } from 'react-icons/lu';

interface SectionProps {
    section: PortfolioSection;
    theme: Theme;
}

/**
 * ProjectsSection - Portfolio/projects showcase
 */
export function ProjectsSection({ section, theme }: SectionProps) {
    const content = section.content || {};
    const items = Array.isArray(content.items) ? content.items : [];

    if (items.length === 0) return null;

    // Modern Theme: Clean Showcase Grid (No Cards)
    if (theme.variant === 'minimal') {
        return (
            <div className="grid gap-16 md:grid-cols-2">
                {items.map((item: any, idx: number) => (
                    <div
                        key={idx}
                        className="group transition-all duration-500 hover:-translate-y-2"
                    >
                        <div
                            className="flex items-baseline justify-between mb-4 border-b pb-4 relative"
                            style={{ borderColor: `${theme.colors.medium}40` }}
                        >
                            {/* Animated bottom border */}
                            <div
                                className="absolute bottom-0 left-0 h-[1px] w-0 group-hover:w-full transition-all duration-700 ease-out"
                                style={{ backgroundColor: theme.colors.darkest }}
                            />

                            {item.name && (
                                <h3
                                    className="text-2xl md:text-3xl font-bold tracking-tight transition-colors duration-300 group-hover:opacity-70"
                                    style={{
                                        color: theme.colors.darkest,
                                        fontFamily: theme.typography.fontFamilyHeading
                                    }}
                                >
                                    {item.name}
                                </h3>
                            )}
                            {item.link && (
                                <a
                                    href={item.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-3 rounded-full transition-all hover:bg-black hover:text-white"
                                    style={{
                                        color: theme.colors.darkest,
                                    }}
                                >
                                    <LuExternalLink className="w-6 h-6" />
                                </a>
                            )}
                        </div>

                        {item.description && typeof item.description === 'string' && (
                            <div
                                className="prose prose-lg max-w-none mb-6 opacity-80"
                                style={{
                                    color: theme.colors.dark,
                                    fontFamily: theme.typography.fontFamilyBody
                                }}
                            >
                                <ReactMarkdown>{String(item.description)}</ReactMarkdown>
                            </div>
                        )}

                        {Array.isArray(item.tags) && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-auto">
                                {item.tags.map((tag: string, tagIdx: number) => (
                                    <span
                                        key={tagIdx}
                                        className="text-sm font-medium opacity-60"
                                        style={{
                                            color: theme.colors.darkest,
                                            fontFamily: theme.typography.fontFamilyBody
                                        }}
                                    >
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        )
    }

    // Elegant Theme: Clean, image-focused (if images existed) or strong typography
    if (theme.variant === 'elegant') {
        return (
            <div className="space-y-16">
                {items.map((item: any, idx: number) => (
                    <div
                        key={idx}
                        className="group flex flex-col md:flex-row gap-8 items-start md:items-center py-8 border-b last:border-0"
                        style={{ borderColor: `${theme.colors.medium}30` }}
                    >
                        <div className="flex-1">
                            <div className="flex items-baseline gap-4 mb-3">
                                <span
                                    className="text-xs font-serif italic opacity-60"
                                    style={{ color: theme.colors.darkest, fontFamily: theme.typography.fontFamilyBody }}
                                >
                                    0{idx + 1}
                                </span>
                                {item.name && (
                                    <h3
                                        className="text-2xl md:text-3xl font-medium tracking-tight"
                                        style={{ color: theme.colors.darkest, fontFamily: theme.typography.fontFamilyHeading }}
                                    >
                                        {item.name}
                                    </h3>
                                )}
                            </div>

                            {item.description && typeof item.description === 'string' && (
                                <div
                                    className="prose prose-lg max-w-xl opacity-80 pl-8"
                                    style={{ color: theme.colors.dark, fontFamily: theme.typography.fontFamilyBody }}
                                >
                                    <ReactMarkdown>{String(item.description)}</ReactMarkdown>
                                </div>
                            )}

                            {Array.isArray(item.tags) && item.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-4 pl-8">
                                    {item.tags.map((tag: string, tagIdx: number) => (
                                        <span
                                            key={tagIdx}
                                            className="text-xs uppercase tracking-widest opacity-60"
                                            style={{ color: theme.colors.dark, fontFamily: theme.typography.fontFamilyBody }}
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {item.link && (
                            <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-6 py-3 rounded-full text-sm transition-all hover:bg-black hover:text-white self-start md:self-center shrink-0"
                                style={{
                                    border: `1px solid ${theme.colors.darkest}`,
                                    color: theme.colors.darkest,
                                    fontFamily: theme.typography.fontFamilyBody
                                }}
                            >
                                View Project
                            </a>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    // Sleek Theme: Technical Grid with mono typography
    return (
        <div className="grid gap-6 md:grid-cols-2">
            {items.map((item: any, idx: number) => (
                <div
                    key={idx}
                    className="flex flex-col h-full relative group transition-all duration-300"
                    style={{
                        backgroundColor: theme.colors.lightest,
                        border: `1px solid ${theme.colors.medium}`,
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.borderColor = theme.colors.darkest;
                        e.currentTarget.style.boxShadow = `8px 8px 0 ${theme.colors.darkest}`;
                        e.currentTarget.style.transform = 'translate(-4px, -4px)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.borderColor = theme.colors.medium;
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'none';
                    }}
                >
                    {/* Header bar */}
                    <div
                        className="px-4 py-2 border-b flex justify-between items-center bg-opacity-50"
                        style={{
                            borderColor: theme.colors.medium, // Default border
                            backgroundColor: `${theme.colors.medium}10`
                        }}
                    >
                        <span
                            className="font-mono text-xs uppercase tracking-wider"
                            style={{
                                color: theme.colors.darkest,
                                fontFamily: theme.typography.fontFamilyBody
                            }}
                        >
                            PRJ-{String(idx + 1).padStart(3, '0')}
                        </span>
                        {item.link && (
                            <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:bg-black hover:text-white transition-colors px-2 py-0.5 text-xs font-bold uppercase flex items-center gap-1"
                                style={{
                                    color: theme.colors.darkest,
                                    fontFamily: theme.typography.fontFamilyBody
                                }}
                            >
                                Open <LuExternalLink className="w-3 h-3" />
                            </a>
                        )}
                    </div>

                    <div className="p-6 flex-grow flex flex-col">
                        {item.name && (
                            <h3
                                className="text-xl font-bold mb-4 uppercase tracking-tight"
                                style={{
                                    color: theme.colors.darkest,
                                    fontFamily: theme.typography.fontFamilyHeading
                                }}
                            >
                                {item.name}
                            </h3>
                        )}

                        {item.description && typeof item.description === 'string' && (
                            <div
                                className="prose prose-sm max-w-none mb-6 flex-grow opacity-80"
                                style={{
                                    color: theme.colors.dark,
                                    fontFamily: theme.typography.fontFamilyBody
                                }}
                            >
                                <ReactMarkdown>{String(item.description)}</ReactMarkdown>
                            </div>
                        )}

                        {Array.isArray(item.tags) && item.tags.length > 0 && (
                            <div className="pt-4 border-t border-dashed" style={{ borderColor: theme.colors.medium }}>
                                <div className="flex flex-wrap gap-x-4 gap-y-2">
                                    {item.tags.map((tag: string, tagIdx: number) => (
                                        <span
                                            key={tagIdx}
                                            className="text-xs font-mono"
                                            style={{
                                                color: theme.colors.darkest,
                                                fontFamily: theme.typography.fontFamilyBody
                                            }}
                                        >
                                            //{tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );

}
