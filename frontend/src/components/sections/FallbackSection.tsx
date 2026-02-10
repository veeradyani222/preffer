'use client';

import { Theme } from '@/themes';
import { PortfolioSection } from '@/types/section.types';

interface SectionProps {
    section: PortfolioSection;
    theme: Theme;
}

/**
 * FallbackSection - Renders unknown content types
 * Attempts to display content in a reasonable format
 */
export function FallbackSection({ section, theme }: SectionProps) {
    const content = section.content;

    if (!content) return null;

    // String content
    if (typeof content === 'string') {
        return (
            <p style={{ color: theme.colors.text.secondary }}>
                {content}
            </p>
        );
    }

    // Object with simple values
    if (typeof content === 'object' && !Array.isArray(content)) {
        const entries = Object.entries(content).filter(([_, v]) => v);
        if (entries.length === 0) return null;

        return (
            <div className="space-y-2">
                {entries.map(([key, value]) => (
                    <p key={key} style={{ color: theme.colors.text.secondary }}>
                        <span className="font-medium capitalize" style={{ color: theme.colors.text.primary }}>
                            {key.replace(/_/g, ' ')}:
                        </span>{' '}
                        {String(value)}
                    </p>
                ))}
            </div>
        );
    }

    // Array - list items
    if (Array.isArray(content)) {
        return (
            <ul className="space-y-2">
                {content.map((item, idx) => (
                    <li key={idx} style={{ color: theme.colors.text.secondary }}>
                        {typeof item === 'string' ? item : JSON.stringify(item)}
                    </li>
                ))}
            </ul>
        );
    }

    return null;
}
