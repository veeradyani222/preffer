'use client';

import { Theme } from '@/themes';
import { PortfolioSection } from '@/types/section.types';
import { LuCheck } from 'react-icons/lu';

interface SectionProps {
    section: PortfolioSection;
    theme: Theme;
}

/**
 * PricingSection - Pricing plans/packages
 * Content format: { items: [{price, condition, features}] }
 */
export function PricingSection({ section, theme }: SectionProps) {
    const content = section.content || {};
    const items = Array.isArray(content.items) ? content.items : [];

    if (items.length === 0) return null;

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item: any, idx: number) => (
                <div
                    key={idx}
                    className="p-6 transition-shadow hover:shadow-lg"
                    style={{
                        backgroundColor: theme.colors.lightest,
                        borderRadius: theme.radius.medium,
                        border: `1px solid ${theme.colors.medium}`,
                    }}
                >
                    {item.price && (
                        <div className="mb-4">
                            <p
                                className="text-3xl font-bold"
                                style={{ color: theme.colors.darkest }}
                            >
                                {item.price}
                            </p>
                            {item.condition && (
                                <p
                                    className="text-sm mt-1"
                                    style={{ color: theme.colors.dark }}
                                >
                                    {item.condition}
                                </p>
                            )}
                        </div>
                    )}

                    {Array.isArray(item.features) && item.features.length > 0 && (
                        <ul className="space-y-2">
                            {item.features.map((feature: string, fIdx: number) => (
                                <li
                                    key={fIdx}
                                    className="flex items-start gap-2"
                                    style={{ color: theme.colors.dark }}
                                >
                                    <LuCheck
                                        className="w-5 h-5 flex-shrink-0 mt-0.5"
                                        style={{ color: theme.colors.darkest }}
                                    />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ))}
        </div>
    );
}
