'use client';

import { useState } from 'react';
import { Theme } from '@/themes';
import { PortfolioSection } from '@/types/section.types';
import { LuChevronDown } from 'react-icons/lu';

interface SectionProps {
    section: PortfolioSection;
    theme: Theme;
}

/**
 * FaqSection - Renders collapsible FAQ items
 * Content format: [{ question, answer }]
 */
export function FaqSection({ section, theme }: SectionProps) {
    const content = section.content;
    const items = Array.isArray(content)
        ? content
        : Array.isArray(content?.items)
            ? content.items
            : [];
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    if (items.length === 0) return null;

    return (
        <div className="space-y-3">
            {items.map((item: any, idx: number) => (
                <div
                    key={idx}
                    className="overflow-hidden"
                    style={{
                        borderRadius: theme.radius.medium,
                        border: `1px solid ${theme.colors.border}`,
                    }}
                >
                    <button
                        onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                        className="w-full flex items-center justify-between p-4 text-left font-medium transition-colors"
                        style={{
                            backgroundColor: openIndex === idx ? theme.colors.surface : theme.colors.background,
                            color: theme.colors.text.primary,
                        }}
                    >
                        {item.question}
                        <LuChevronDown
                            className={`transition-transform ${openIndex === idx ? 'rotate-180' : ''}`}
                            style={{ color: theme.colors.text.muted }}
                        />
                    </button>
                    {openIndex === idx && (
                        <div
                            className="p-4 pt-0"
                            style={{
                                backgroundColor: theme.colors.surface,
                                color: theme.colors.text.secondary,
                            }}
                        >
                            {item.answer}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
