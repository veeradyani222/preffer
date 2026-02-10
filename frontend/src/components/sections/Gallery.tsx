'use client';

import { Theme } from '@/themes';
import { PortfolioSection } from '@/types/section.types';

interface SectionProps {
    section: PortfolioSection;
    theme: Theme;
}

/**
 * Gallery - Renders image grid
 * Content format: string[] (URLs) or [{ url/src, alt?, caption? }]
 */
export function Gallery({ section, theme }: SectionProps) {
    const content = section.content;

    if (!Array.isArray(content) || content.length === 0) return null;

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {content.map((item: any, idx: number) => {
                const src = typeof item === 'string' ? item : (item.url || item.src);
                const alt = typeof item === 'object' ? (item.alt || item.caption || '') : '';

                return (
                    <div
                        key={idx}
                        className="aspect-square overflow-hidden"
                        style={{
                            borderRadius: theme.radius.medium,
                            border: `1px solid ${theme.colors.border}`,
                        }}
                    >
                        <img
                            src={src}
                            alt={alt}
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                    </div>
                );
            })}
        </div>
    );
}
