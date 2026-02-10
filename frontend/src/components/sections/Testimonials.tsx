'use client';

import { Theme } from '@/themes';
import { PortfolioSection } from '@/types/section.types';
import { LuQuote } from 'react-icons/lu';

interface SectionProps {
    section: PortfolioSection;
    theme: Theme;
}

/**
 * Testimonials - Renders testimonial quotes with authors
 * Content format: [{ quote: string, author: string, role?: string }]
 */
export function Testimonials({ section, theme }: SectionProps) {
    const content = section.content;
    const items = Array.isArray(content)
        ? content
        : Array.isArray(content?.items)
            ? content.items
            : [];

    if (items.length === 0) return null;

    return (
        <div className="grid md:grid-cols-2 gap-6">
            {items.map((item: any, idx: number) => (
                <div
                    key={idx}
                    className="p-6"
                    style={{
                        backgroundColor: theme.colors.surface,
                        borderRadius: theme.radius.large,
                        border: `1px solid ${theme.colors.border}`,
                    }}
                >
                    <LuQuote
                        className="mb-3"
                        size={24}
                        style={{ color: theme.colors.border }}
                    />
                    <p
                        className="italic mb-4"
                        style={{ color: theme.colors.text.secondary }}
                    >
                        "{item.quote}"
                    </p>
                    <p
                        className="font-medium"
                        style={{ color: theme.colors.text.primary }}
                    >
                        — {item.author}
                    </p>
                    {item.role && (
                        <p
                            className="text-sm"
                            style={{ color: theme.colors.text.muted }}
                        >
                            {item.role}
                        </p>
                    )}
                </div>
            ))}
        </div>
    );
}
