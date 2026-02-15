'use client';

import { Theme } from '@/themes';
import { PortfolioSection } from '@/types/section.types';
import { motion, useScroll, useSpring } from 'framer-motion';

interface Props {
    theme: Theme;
    sections: PortfolioSection[];
    portfolioName: string;
}

export function ElegantNav({ theme, sections, portfolioName }: Props) {
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    const scrollToSection = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <nav
            className="fixed top-0 z-50 w-full transition-all duration-300"
            style={{
                backgroundColor: `${theme.colors.lightest}F5`, // Very slight transparency
                backdropFilter: 'blur(8px)',
                borderBottom: `1px solid ${theme.colors.medium}20` // Extremely subtle border
            }}
        >
            {/* Scroll Progress Bar */}
            <motion.div
                className="absolute top-0 left-0 right-0 h-[2px] origin-left"
                style={{
                    backgroundColor: theme.colors.darkest,
                    scaleX
                }}
            />

            <div className="max-w-6xl mx-auto px-8 py-6 flex items-center justify-between">
                {/* Logo */}
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="text-2xl font-serif italic tracking-tight hover:opacity-70 transition-opacity"
                    style={{
                        color: theme.colors.darkest,
                        fontFamily: theme.typography.fontFamilyHeading
                    }}
                >
                    {portfolioName || 'Professional Page'}
                </button>

                {/* Links */}
                <div className="hidden md:flex items-center gap-8">
                    {sections.filter(s => s.type !== 'hero').map((section) => (
                        <button
                            key={section.id}
                            onClick={() => scrollToSection(section.id)}
                            className="text-xs uppercase tracking-[0.25em] transition-all hover:opacity-100 opacity-60 hover:-translate-y-0.5"
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
        </nav>
    );
}
