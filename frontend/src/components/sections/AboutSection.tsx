'use client';

import ReactMarkdown from 'react-markdown';
import { Theme } from '@/themes';
import { PortfolioSection } from '@/types/section.types';

interface SectionProps {
    section: PortfolioSection;
    theme: Theme;
}

/**
 * AboutSection - About/bio section
 */
export function AboutSection({ section, theme }: SectionProps) {
    const content = section.content || {};

    // Extract text from various possible formats
    let text = typeof content === 'string'
        ? content
        : content.text || content.description || content.about || content.story || '';

    // Ensure text is a string (not an object)
    text = String(text || '');

    if (!text || text === '[object Object]') return null;

    // Modern Theme: Floating glass card
    if (theme.variant === 'minimal') {
        return (
            <div
                className="max-w-3xl mx-auto p-8 backdrop-blur-md transition-all duration-500 hover:scale-[1.01]"
                style={{
                    backgroundColor: `${theme.colors.lightest}cc`, // Higher opacity for legibility
                    borderRadius: theme.radius.large,
                    border: `1px solid ${theme.colors.medium}40`,
                    boxShadow: theme.shadows.card,
                }}
            >
                <div
                    className="prose prose-lg max-w-none"
                    style={{
                        color: theme.colors.dark,
                        fontFamily: theme.typography.fontFamilyBody
                    }}
                >
                    <ReactMarkdown>{text}</ReactMarkdown>
                </div>
            </div>
        );
    }

    // Elegant Theme: Editorial style with drop cap feel
    if (theme.variant === 'elegant') {
        return (
            <div className="max-w-3xl mx-auto py-12 px-8" style={{ backgroundColor: theme.colors.lightest, border: `1px solid ${theme.colors.medium}30` }}>
                <div
                    className="prose prose-lg max-w-none text-center"
                    style={{
                        color: theme.colors.darkest,
                        fontFamily: theme.typography.fontFamilyBody,
                        lineHeight: '2.0',
                    }}
                >
                    <ReactMarkdown>{text}</ReactMarkdown>
                </div>
            </div>
        );
    }



    // Sleek Theme: Sharp box with high contrast border & technical details
    return (
        <div
            className="p-8 max-w-4xl mx-auto relative group"
            style={{
                backgroundColor: theme.colors.lightest,
                border: `2px solid ${theme.colors.medium}`,
                boxShadow: `8px 8px 0 ${theme.colors.darkest}`,
            }}
        >
            {/* Tech decoration */}
            <div
                className="absolute top-0 left-0 px-2 py-1 text-xs font-bold uppercase tracking-widest"
                style={{
                    backgroundColor: theme.colors.darkest,
                    color: theme.colors.lightest,
                    fontFamily: theme.typography.fontFamilyBody
                }}
            >
                Readme.md
            </div>

            <div
                className="prose prose-lg max-w-none mt-4"
                style={{
                    color: theme.colors.darkest,
                    fontFamily: theme.typography.fontFamilyBody
                }}
            >
                <ReactMarkdown>{text}</ReactMarkdown>
            </div>
        </div>
    );
}
