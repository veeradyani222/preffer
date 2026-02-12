'use client';

import ReactMarkdown from 'react-markdown';
import { Theme } from '@/themes';
import { PortfolioSection } from '@/types/section.types';

interface SectionProps {
    section: PortfolioSection;
    theme: Theme;
}

/**
 * TeamSection - Team members showcase
 * Content format: { items: [{name, role, bio?, socials?}] }
 */
export function TeamSection({ section, theme }: SectionProps) {
    const content = section.content || {};
    const items = Array.isArray(content.items) ? content.items : [];

    if (items.length === 0) return null;

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item: any, idx: number) => (
                <div
                    key={idx}
                    className="p-6 text-center"
                    style={{
                        backgroundColor: theme.colors.lightest,
                        borderRadius: theme.radius.medium,
                        border: `1px solid ${theme.colors.medium}`,
                    }}
                >
                    {item.name && (
                        <h3
                            className="text-lg font-semibold mb-1"
                            style={{ color: theme.colors.darkest }}
                        >
                            {item.name}
                        </h3>
                    )}

                    {item.role && (
                        <p
                            className="text-sm mb-3"
                            style={{ color: theme.colors.darkest }}
                        >
                            {item.role}
                        </p>
                    )}

                    {item.bio && typeof item.bio === 'string' && (
                        <div
                            className="prose prose-sm max-w-none mb-3 text-left"
                            style={{ color: theme.colors.dark }}
                        >
                            <ReactMarkdown>{String(item.bio)}</ReactMarkdown>
                        </div>
                    )}

                    {Array.isArray(item.socials) && item.socials.length > 0 && (
                        <div className="mt-3 text-sm">
                            {item.socials.map((social: string, sIdx: number) => (
                                <span
                                    key={sIdx}
                                    className="inline-block"
                                    style={{ color: theme.colors.medium }}
                                >
                                    {social}
                                    {sIdx < item.socials.length - 1 && ' • '}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
