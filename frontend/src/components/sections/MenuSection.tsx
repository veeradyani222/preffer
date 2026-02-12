'use client';

import { Theme } from '@/themes';
import { PortfolioSection } from '@/types/section.types';

interface SectionProps {
    section: PortfolioSection;
    theme: Theme;
}

/**
 * MenuSection - Restaurant/cafe menu
 * Content format: { categories: [{name, items: [{name, description, price}]}] }
 */
export function MenuSection({ section, theme }: SectionProps) {
    const content = section.content || {};
    const categories = Array.isArray(content.categories) ? content.categories : [];

    if (categories.length === 0) return null;

    return (
        <div className="space-y-8">
            {categories.map((category: any, catIdx: number) => (
                <div key={catIdx}>
                    {category.name && (
                        <h3
                            className="text-2xl font-semibold mb-4 pb-2"
                            style={{
                                color: theme.colors.darkest,
                                borderBottom: `2px solid ${theme.colors.medium}`,
                            }}
                        >
                            {category.name}
                        </h3>
                    )}

                    <div className="space-y-4">
                        {Array.isArray(category.items) && category.items.map((item: any, itemIdx: number) => (
                            <div
                                key={itemIdx}
                                className="flex items-start justify-between gap-4 pb-3"
                                style={{ borderBottom: `1px solid ${theme.colors.medium}` }}
                            >
                                <div className="flex-1">
                                    {item.name && (
                                        <h4
                                            className="font-medium mb-1"
                                            style={{ color: theme.colors.darkest }}
                                        >
                                            {item.name}
                                        </h4>
                                    )}
                                    {item.description && (
                                        <p
                                            className="text-sm"
                                            style={{ color: theme.colors.dark }}
                                        >
                                            {item.description}
                                        </p>
                                    )}
                                </div>

                                {item.price && (
                                    <span
                                        className="font-semibold flex-shrink-0"
                                        style={{ color: theme.colors.darkest }}
                                    >
                                        {item.price}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
