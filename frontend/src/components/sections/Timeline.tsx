'use client';

import { Theme } from '@/themes';
import { PortfolioSection } from '@/types/section.types';

interface SectionProps {
    section: PortfolioSection;
    theme: Theme;
}

/**
 * Timeline - Renders date-based entries as a timeline
 * Content format: [{ date/startDate/year, title, description?, endDate? }]
 */
export function Timeline({ section, theme }: SectionProps) {
    const content = section.content;

    if (!Array.isArray(content) || content.length === 0) return null;

    return (
        <div className="space-y-6">
            {content.map((item: any, idx: number) => {
                const date = item.date || item.year || item.startDate || '';
                const endDate = item.endDate || '';
                const dateDisplay = endDate ? `${date} - ${endDate}` : date;

                return (
                    <div
                        key={idx}
                        className="flex gap-4"
                    >
                        {/* Timeline line */}
                        <div className="flex flex-col items-center">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: theme.colors.accent }}
                            />
                            {idx < content.length - 1 && (
                                <div
                                    className="w-0.5 flex-1 mt-2"
                                    style={{ backgroundColor: theme.colors.border }}
                                />
                            )}
                        </div>

                        {/* Content */}
                        <div className="pb-6">
                            {dateDisplay && (
                                <span
                                    className="text-sm font-medium"
                                    style={{ color: theme.colors.text.muted }}
                                >
                                    {dateDisplay}
                                </span>
                            )}
                            <h3
                                className="font-semibold mt-1"
                                style={{ color: theme.colors.text.primary }}
                            >
                                {item.title || item.role || item.degree}
                            </h3>
                            {(item.company || item.institution) && (
                                <p style={{ color: theme.colors.accent }}>
                                    {item.company || item.institution}
                                </p>
                            )}
                            {item.description && (
                                <p
                                    className="mt-2"
                                    style={{ color: theme.colors.text.secondary }}
                                >
                                    {item.description}
                                </p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
