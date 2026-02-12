'use client';

import { Theme } from '@/themes';
import { PortfolioSection } from '@/types/section.types';

interface SectionProps {
    section: PortfolioSection;
    theme: Theme;
}

/**
 * SkillsSection - Skills/technologies display
 * Content format: { skills: string[] } or { heading?, skills: string[] }
 */
export function SkillsSection({ section, theme }: SectionProps) {
    const content = section.content || {};
    const skills = Array.isArray(content.skills) ? content.skills : [];

    if (skills.length === 0) return null;

    // Modern Theme: Floating Cloud
    if (theme.variant === 'minimal') {
        return (
            <div className="flex flex-wrap justify-center gap-3 py-4">
                {skills.map((skill: string, idx: number) => (
                    <span
                        key={idx}
                        className="px-6 py-3 text-sm font-medium rounded-full transition-all duration-300 hover:scale-110 hover:-translate-y-1"
                        style={{
                            backgroundColor: theme.colors.lightest,
                            border: `1px solid ${theme.colors.medium}60`, // Softer border
                            boxShadow: theme.shadows.card,
                            color: theme.colors.darkest,
                            fontFamily: theme.typography.fontFamilyBody
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.boxShadow = theme.shadows.hover;
                            e.currentTarget.style.borderColor = theme.colors.medium;
                            e.currentTarget.style.backgroundColor = theme.colors.lightest; // Ensure contrast
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.boxShadow = theme.shadows.card;
                            e.currentTarget.style.borderColor = `${theme.colors.medium}60`;
                        }}
                    >
                        {skill}
                    </span>
                ))}
            </div>
        );
    }

    // Elegant Theme: Clean refined text list
    if (theme.variant === 'elegant') {
        return (
            <div className="max-w-4xl mx-auto text-center py-12">
                <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 leading-relaxed">
                    {skills.map((skill: string, idx: number) => (
                        <span
                            key={idx}
                            className="text-lg relative"
                            style={{
                                color: theme.colors.darkest,
                                fontFamily: theme.typography.fontFamilyHeading,
                            }}
                        >
                            {skill}
                            {idx !== skills.length - 1 && (
                                <span className="mx-4 opacity-30 select-none" style={{ color: theme.colors.medium }}>•</span>
                            )}
                        </span>
                    ))}
                </div>
            </div>
        );
    }

    // Techie Theme: Technical badges
    if (theme.variant === 'techie') {
        const heading = section.title;
        return (
            <div className="py-20 border-b" style={{ borderColor: theme.colors.medium }}>
                <div className="grid md:grid-cols-[200px_1fr] gap-8">
                    <div>
                        {heading && (
                            <h2
                                className="text-xl font-bold uppercase tracking-tight sticky top-24"
                                style={{
                                    color: theme.colors.darkest,
                                    fontFamily: theme.typography.fontFamilyHeading
                                }}
                            >
                                {heading}
                            </h2>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {skills.map((skill: string, idx: number) => (
                            <div
                                key={idx}
                                className="px-4 py-2 border text-sm font-mono font-bold uppercase transition-all duration-200 cursor-default"
                                style={{
                                    borderColor: theme.colors.darkest,
                                    color: theme.colors.darkest,
                                    backgroundColor: theme.colors.lightest
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = theme.colors.darkest;
                                    e.currentTarget.style.color = theme.colors.lightest;
                                    e.currentTarget.style.boxShadow = `4px 4px 0px 0px ${theme.colors.darkest}`;
                                    e.currentTarget.style.transform = 'translate(-2px, -2px)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = theme.colors.lightest;
                                    e.currentTarget.style.color = theme.colors.darkest;
                                    e.currentTarget.style.boxShadow = 'none';
                                    e.currentTarget.style.transform = 'none';
                                }}
                            >
                                {skill}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Default/Sleek Theme: Technical Skill Grid (kept for backward compatibility or as a fallback)
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {skills.map((skill: string, idx: number) => (
                <div
                    key={idx}
                    className="px-4 py-3 text-sm font-bold uppercase tracking-wider text-center transition-colors duration-200 cursor-default"
                    style={{
                        backgroundColor: theme.colors.lightest,
                        border: `1px solid ${theme.colors.darkest}`,
                        color: theme.colors.darkest,
                        fontFamily: theme.typography.fontFamilyBody // Mono
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = theme.colors.darkest;
                        e.currentTarget.style.color = theme.colors.lightest;
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = theme.colors.lightest;
                        e.currentTarget.style.color = theme.colors.darkest;
                    }}
                >
                    {skill}
                </div>
            ))}
        </div>
    );
}
