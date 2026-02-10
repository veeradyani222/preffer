'use client';

import { Theme } from '@/themes';
import { PortfolioSection } from '@/types/section.types';

interface SectionProps {
    section: PortfolioSection;
    theme: Theme;
}

/**
 * CardGrid - Renders array of objects as cards
 * Used for: Projects, Services, Products
 */
export function CardGrid({ section, theme }: SectionProps) {
    const content = section.content;

    if (!Array.isArray(content) || content.length === 0) return null;

    return (
        <div className="grid md:grid-cols-2 gap-6">
            {content.map((item: any, idx: number) => (
                <div
                    key={idx}
                    className="p-6 transition-shadow hover:shadow-md"
                    style={{
                        backgroundColor: theme.colors.background,
                        borderRadius: theme.radius.large,
                        border: `1px solid ${theme.colors.border}`,
                        boxShadow: theme.shadows.card,
                    }}
                >
                    <h3
                        className="font-semibold mb-2"
                        style={{
                            color: theme.colors.text.primary,
                            fontSize: '1.125rem',
                        }}
                    >
                        {item.name || item.title}
                    </h3>
                    {item.description && (
                        <p style={{ color: theme.colors.text.secondary }}>
                            {item.description}
                        </p>
                    )}
                    {item.url && (
                        <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-3 text-sm font-medium hover:underline"
                            style={{ color: theme.colors.accent }}
                        >
                            View →
                        </a>
                    )}
                </div>
            ))}
        </div>
    );
}
