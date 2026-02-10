'use client';

import { Theme } from '@/themes';
import { PortfolioSection } from '@/types/section.types';

interface SectionProps {
    section: PortfolioSection;
    theme: Theme;
}

/**
 * TagsGrid - Renders array of strings as tags/badges
 * Used for: Skills, Specialties, Technologies
 */
export function TagsGrid({ section, theme }: SectionProps) {
    const content = section.content;

    // Content should be an array of strings
    if (!Array.isArray(content) || content.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2">
            {content.map((item: any, idx: number) => {
                const text = typeof item === 'string' ? item : item?.name || item?.label || '';
                if (!text) return null;

                return (
                    <span
                        key={idx}
                        className="px-4 py-2 font-medium transition-colors cursor-default"
                        style={{
                            backgroundColor: theme.colors.surface,
                            color: theme.colors.text.secondary,
                            borderRadius: theme.radius.large,
                            fontSize: theme.typography.small.size,
                            border: `1px solid ${theme.colors.border}`,
                        }}
                    >
                        {text}
                    </span>
                );
            })}
        </div>
    );
}
