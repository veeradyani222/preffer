'use client';

import { Theme } from '@/themes';
import { PortfolioSection } from '@/types/section.types';
import * as Icons from 'react-icons/lu';

interface SectionProps {
    section: PortfolioSection;
    theme: Theme;
}

/**
 * ServicesSection - Services/offerings grid
 * Content format: { items: [{name, description, icon?}] }
 */
export function ServicesSection({ section, theme }: SectionProps) {
    const content = section.content || {};
    const items = Array.isArray(content.items) ? content.items : [];

    if (items.length === 0) return null;

    // Helper to get icon component
    const getIcon = (iconName?: string) => {
        if (!iconName) return Icons.LuBox;

        // Convert to PascalCase for react-icons (e.g., "briefcase" -> "LuBriefcase")
        const IconName = `Lu${iconName.charAt(0).toUpperCase()}${iconName.slice(1)}` as keyof typeof Icons;
        const IconComponent = Icons[IconName];

        return IconComponent || Icons.LuBox;
    };

    // Modern Theme: Clean, airy grid with large icons (No Cards)
    if (theme.variant === 'minimal') {
        return (
            <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-3">
                {items.map((item: any, idx: number) => {
                    const Icon = getIcon(item.icon);

                    return (
                        <div
                            key={idx}
                            className="group transition-all duration-300 hover:-translate-y-1"
                        >
                            <div
                                className="w-14 h-14 mb-6 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-opacity-30"
                                style={{
                                    backgroundColor: `${theme.colors.medium}20`,
                                    borderRadius: theme.radius.medium,
                                    color: theme.colors.darkest,
                                }}
                            >
                                <Icon className="w-7 h-7" />
                            </div>

                            {item.name && (
                                <h3
                                    className="text-xl font-bold mb-3 transition-colors duration-300 group-hover:opacity-70"
                                    style={{
                                        color: theme.colors.darkest,
                                        fontFamily: theme.typography.fontFamilyHeading
                                    }}
                                >
                                    {item.name}
                                </h3>
                            )}

                            {item.description && (
                                <p
                                    className="leading-relaxed opacity-80"
                                    style={{
                                        color: theme.colors.dark,
                                        fontFamily: theme.typography.fontFamilyBody
                                    }}
                                >
                                    {item.description}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

    // Elegant Theme: Editorial List with Dividers (No Cards)
    if (theme.variant === 'elegant') {
        return (
            <div className="max-w-4xl mx-auto flex flex-col gap-0">
                {items.map((item: any, idx: number) => {
                    const Icon = getIcon(item.icon);
                    return (
                        <div
                            key={idx}
                            className="py-12 px-6 -mx-6 flex flex-col md:flex-row gap-8 items-start group transition-colors duration-500 hover:bg-opacity-50"
                            style={{
                                borderBottom: idx !== items.length - 1 ? `1px solid ${theme.colors.medium}30` : 'none',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = `${theme.colors.medium}10`;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        >
                            <div className="shrink-0 mt-1">
                                <Icon
                                    className="w-10 h-10 transition-transform duration-500 group-hover:rotate-12"
                                    style={{ color: theme.colors.darkest }}
                                />
                            </div>

                            <div className="flex-1">
                                {item.name && (
                                    <h3
                                        className="text-2xl mb-4 italic transition-all duration-500 group-hover:tracking-wider"
                                        style={{
                                            color: theme.colors.darkest,
                                            fontFamily: theme.typography.fontFamilyHeading,
                                            fontWeight: '400'
                                        }}
                                    >
                                        {item.name}
                                    </h3>
                                )}

                                {item.description && (
                                    <p
                                        className="text-lg leading-relaxed opacity-80"
                                        style={{
                                            color: theme.colors.dark,
                                            fontFamily: theme.typography.fontFamilyBody,
                                            maxWidth: '40ch'
                                        }}
                                    >
                                        {item.description}
                                    </p>
                                )}
                            </div>

                            {/* Decorative number */}
                            <div
                                className="hidden md:block text-4xl font-serif opacity-10 transition-opacity duration-500 group-hover:opacity-30"
                                style={{ color: theme.colors.darkest, fontFamily: theme.typography.fontFamilyHeading }}
                            >
                                {(idx + 1).toString().padStart(2, '0')}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    // Techie Theme: Grid with mono accents
    if (theme.variant === 'techie') {
        const heading = section.title;
        return (
            <div className="py-20 border-b" style={{ borderColor: theme.colors.medium }}>
                <div className="grid gap-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {items.map((item: any, idx: number) => {
                            const Icon = getIcon(item.icon);
                            return (
                                <div
                                    key={idx}
                                    className="p-6 border transition-all duration-200 hover:bg-black hover:text-white group relative"
                                    style={{
                                        borderColor: theme.colors.darkest,
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
                                    <div className="absolute top-4 right-4 opacity-50 font-mono text-xs">
                                        {(idx + 1).toString().padStart(2, '0')}
                                    </div>
                                    <div className="mb-4 text-3xl group-hover:text-white transition-colors" style={{ color: theme.colors.darkest }}>
                                        <Icon />
                                    </div>
                                    <h3
                                        className="text-lg font-bold mb-2 uppercase group-hover:text-white transition-colors"
                                        style={{ fontFamily: theme.typography.fontFamilyHeading }}
                                    >
                                        {item.name}
                                    </h3>
                                    <p
                                        className="text-sm opacity-80 group-hover:text-white transition-colors"
                                        style={{ fontFamily: theme.typography.fontFamilyBody }}
                                    >
                                        {item.description}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // Default/Fallback Theme (Sleek was removed, this is the new default if no other theme matches)
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item: any, idx: number) => {
                const Icon = getIcon(item.icon);

                return (
                    <div
                        key={idx}
                        className="p-8 transition-all duration-200 group relative overflow-hidden"
                        style={{
                            backgroundColor: theme.colors.lightest,
                            border: `2px solid ${theme.colors.medium}`, // Softer default border
                            // No rounded corners for sleek
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.borderColor = theme.colors.darkest;
                            e.currentTarget.style.backgroundColor = theme.colors.darkest;
                            // Titles and text handled via group-hover or direct selector in CSS if possible, 
                            // but here we use the inline style override pattern or class based override
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.borderColor = theme.colors.medium;
                            e.currentTarget.style.backgroundColor = theme.colors.lightest;
                        }}
                    >
                        {/* Hover overlay content handled by group-hover classes where possible, or inline styles via state if complex.
                            Here we rely on `group-hover` for color switching which is cleaner if we can use it.
                         */}

                        <div className="flex flex-col items-start gap-4 z-10 relative">
                            <Icon
                                className="w-10 h-10 transition-colors duration-200 group-hover:text-white"
                                style={{ color: theme.colors.darkest }}
                            />
                            <div>
                                {item.name && (
                                    <h3
                                        className="text-xl font-bold mb-3 transition-colors duration-200 group-hover:text-white"
                                        style={{
                                            color: theme.colors.darkest,
                                            fontFamily: theme.typography.fontFamilyHeading
                                        }}
                                    >
                                        {item.name}
                                    </h3>
                                )}

                                {item.description && (
                                    <p
                                        className="transition-colors duration-200 group-hover:text-white/90"
                                        style={{
                                            color: theme.colors.dark,
                                            fontSize: '0.95rem',
                                            fontFamily: theme.typography.fontFamilyBody
                                        }}
                                    >
                                        {item.description}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
