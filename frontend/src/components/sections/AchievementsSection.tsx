'use client';

import ReactMarkdown from 'react-markdown';
import { Theme } from '@/themes';
import { PortfolioSection } from '@/types/section.types';
import * as Icons from 'react-icons/lu';

interface SectionProps {
    section: PortfolioSection;
    theme: Theme;
}

/**
 * AchievementsSection - Achievements/awards/milestones
 * Content format: { items: [{title, description, icon?}] }
 */
export function AchievementsSection({ section, theme }: SectionProps) {
    const content = section.content || {};
    const items = Array.isArray(content.items) ? content.items : [];

    if (items.length === 0) return null;

    // Helper to get icon component
    const getIcon = (iconName?: string) => {
        if (!iconName) return Icons.LuTrophy;

        // Convert to PascalCase for react-icons
        const IconName = `Lu${iconName.charAt(0).toUpperCase()}${iconName.slice(1)}` as keyof typeof Icons;
        const IconComponent = Icons[IconName];

        return IconComponent || Icons.LuTrophy;
    };

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {items.map((item: any, idx: number) => {
                const Icon = getIcon(item.icon);

                return (
                    <div
                        key={idx}
                        className="p-6"
                        style={{
                            backgroundColor: theme.colors.lightest,
                            borderRadius: theme.radius.medium,
                            border: `1px solid ${theme.colors.medium}`,
                        }}
                    >
                        <div className="flex items-start gap-4">
                            <Icon
                                className="w-8 h-8 flex-shrink-0"
                                style={{ color: theme.colors.darkest }}
                            />

                            <div className="flex-1">
                                {item.title && (
                                    <h3
                                        className="text-lg font-semibold mb-2"
                                        style={{ color: theme.colors.darkest }}
                                    >
                                        {item.title}
                                    </h3>
                                )}

                                {item.description && typeof item.description === 'string' && (
                                    <div
                                        className="prose prose-sm max-w-none"
                                        style={{ color: theme.colors.dark }}
                                    >
                                        <ReactMarkdown>{String(item.description)}</ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
