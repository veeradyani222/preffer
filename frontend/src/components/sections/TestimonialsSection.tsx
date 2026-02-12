'use client';

import { Theme } from '@/themes';
import { PortfolioSection } from '@/types/section.types';

interface SectionProps {
    section: PortfolioSection;
    theme: Theme;
}

/**
 * TestimonialsSection - Customer reviews/testimonials
 * Content format: { items: [{quote, author, role?}] }
 */
export function TestimonialsSection({ section, theme }: SectionProps) {
    const content = section.content || {};

    // Handle nested structure: content might be {testimonials: {items: [...]}} or {items: [...]}
    const testimonialsData = content.testimonials || content;

    const items = Array.isArray(testimonialsData.items)
        ? testimonialsData.items
        : Array.isArray(testimonialsData)
            ? testimonialsData
            : Array.isArray(content)
                ? content
                : [];

    if (items.length === 0) return null;

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {items.map((item: any, idx: number) => (
                <div
                    key={idx}
                    className="p-6"
                    style={{
                        backgroundColor: theme.colors.lightest,
                        borderRadius: theme.radius.medium,
                        border: `1px solid ${theme.colors.medium}`,
                    }}
                >
                    {item.quote && (
                        <p
                            className="text-lg italic mb-4"
                            style={{ color: theme.colors.dark }}
                        >
                            "{item.quote}"
                        </p>
                    )}

                    <div>
                        {item.author && (
                            <p
                                className="font-semibold"
                                style={{ color: theme.colors.darkest }}
                            >
                                — {item.author}
                            </p>
                        )}
                        {item.role && (
                            <p
                                className="text-sm mt-1"
                                style={{ color: theme.colors.medium }}
                            >
                                {item.role}
                            </p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
