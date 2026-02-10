'use client';

import { Theme } from '@/themes';
import { PortfolioSection } from '@/types/section.types';

interface SectionProps {
    section: PortfolioSection;
    theme: Theme;
}

/**
 * TextBlock - Renders text/paragraph content
 * Used for: About, Bio, Descriptions
 */
export function TextBlock({ section, theme }: SectionProps) {
    const content = section.content;

    // Extract text from various content shapes
    let text = '';
    if (typeof content === 'string') {
        text = content;
    } else if (content?.bio) {
        text = content.bio;
    } else if (content?.text) {
        text = content.text;
    } else if (content?.description) {
        text = content.description;
    }

    if (!text) return null;

    return (
        <div
            className="rounded-lg p-6"
            style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.large,
            }}
        >
            <p
                className="whitespace-pre-wrap"
                style={{
                    color: theme.colors.text.secondary,
                    fontSize: theme.typography.body.size,
                    lineHeight: theme.typography.body.lineHeight,
                }}
            >
                {text}
            </p>
        </div>
    );
}
