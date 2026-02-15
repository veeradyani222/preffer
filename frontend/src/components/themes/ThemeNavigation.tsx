'use client';

import { Theme } from '@/themes';
import { PortfolioSection } from '@/types/section.types';
import { MinimalNav } from './navigation/MinimalNav';
import { TechieNav } from './navigation/TechieNav';
import { ElegantNav } from './navigation/ElegantNav';
import { LuMenu, LuX } from 'react-icons/lu'; // Icons for mobile fallback
import { useState } from 'react';

interface Props {
    theme: Theme;
    sections: PortfolioSection[];
    portfolioName: string;
}

export function ThemeNavigation({ theme, sections, portfolioName }: Props) {
    // Mobile menu state (common logic for all themes interaction)
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Desktop Navigation based on Theme
    const renderDesktopNav = () => {
        switch (theme.variant) {
            case 'techie':
                return <TechieNav theme={theme} sections={sections} portfolioName={portfolioName} />;
            case 'elegant':
                return <ElegantNav theme={theme} sections={sections} portfolioName={portfolioName} />;
            case 'minimal':
            default:
                return <MinimalNav theme={theme} sections={sections} />;
        }
    };

    const scrollToSection = (id: string) => {
        setIsMobileOpen(false);
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <>
            {/* Desktop Nav (Hidden on mobile) */}
            <div className="hidden md:block">
                {renderDesktopNav()}
            </div>

            {/* Mobile Nav (Always visible on mobile) */}
            <div className="md:hidden">
                <div
                    className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between backdrop-blur-md border-b"
                    style={{
                        backgroundColor: `${theme.colors.lightest}ee`,
                        borderColor: `${theme.colors.medium}30`
                    }}
                >
                    <span
                        className="font-bold text-lg tracking-tight"
                        style={{
                            color: theme.colors.darkest,
                            fontFamily: theme.typography.fontFamilyHeading
                        }}
                    >
                        {portfolioName || 'Professional Page'}
                    </span>
                    <button
                        onClick={() => setIsMobileOpen(true)}
                        className="p-2 -mr-2"
                        style={{ color: theme.colors.darkest }}
                    >
                        <LuMenu size={24} />
                    </button>
                </div>

                {/* Mobile Fullscreen Menu Overlay */}
                <div
                    className={`fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                    onClick={() => setIsMobileOpen(false)}
                >
                    <div
                        className={`absolute top-0 right-0 bottom-0 w-[80%] max-w-xs shadow-2xl transition-transform duration-300 ease-out flex flex-col ${isMobileOpen ? 'translate-x-0' : 'translate-x-full'}`}
                        style={{ backgroundColor: theme.colors.lightest }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 flex items-center justify-between border-b" style={{ borderColor: `${theme.colors.medium}30` }}>
                            <span
                                className="font-bold text-xl"
                                style={{
                                    color: theme.colors.darkest,
                                    fontFamily: theme.typography.fontFamilyHeading
                                }}
                            >
                                Menu
                            </span>
                            <button
                                onClick={() => setIsMobileOpen(false)}
                                className="p-2 -mr-2 rounded-full hover:bg-black/5 transition-colors"
                                style={{ color: theme.colors.darkest }}
                            >
                                <LuX size={24} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto py-8 px-6 flex flex-col gap-6">
                            {sections.filter(s => s.type !== 'hero').map(section => (
                                <button
                                    key={section.id}
                                    onClick={() => scrollToSection(section.id)}
                                    className="text-left text-xl font-medium transition-colors"
                                    style={{
                                        color: theme.colors.darkest,
                                        fontFamily: theme.typography.fontFamilyBody,
                                    }}
                                >
                                    {section.title}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
