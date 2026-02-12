'use client';

import { Theme } from '@/themes';
import { PortfolioSection } from '@/types/section.types';

interface SectionProps {
    section: PortfolioSection;
    theme: Theme;
}

/**
 * FallbackSection - Displays for unknown section types
 */
export function FallbackSection({ section, theme }: SectionProps) {
    return (
        <div
            className="p-6 text-center"
            style={{
                backgroundColor: theme.colors.lightest,
                borderRadius: theme.radius.medium,
                border: `1px solid ${theme.colors.medium}`,
            }}
        >
            <p style={{ color: theme.colors.dark }}>
                Unsupported section type: <code>{section.type}</code>
            </p>
        </div>
    );
}
