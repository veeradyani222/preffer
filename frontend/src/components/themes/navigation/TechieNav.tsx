'use client';

import { Theme } from '@/themes';
import { PortfolioSection } from '@/types/section.types';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface Props {
    theme: Theme;
    sections: PortfolioSection[];
    portfolioName: string;
}

export function TechieNav({ theme, sections, portfolioName }: Props) {
    const [time, setTime] = useState('');

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setTime(now.toLocaleTimeString([], { hour12: false }));
        };
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    const scrollToSection = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <nav
            className="fixed top-0 z-50 w-full border-b"
            style={{
                backgroundColor: `${theme.colors.lightest}`,
                borderBottom: `1px solid ${theme.colors.medium}`,
            }}
        >
            <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
                {/* Left: Brand / System Status */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="font-bold text-lg tracking-tight uppercase"
                        style={{
                            color: theme.colors.darkest,
                            fontFamily: theme.typography.fontFamilyHeading,
                        }}
                    >
                        {portfolioName || 'SYSTEM'}
                    </button>

                    <div className="hidden md:flex items-center gap-2 text-xs font-mono" style={{ color: theme.colors.dark }}>
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span>ONLINE // {time}</span>
                    </div>
                </div>

                {/* Right: Navigation Links */}
                <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
                    {sections.filter(s => s.type !== 'hero').map((section) => (
                        <button
                            key={section.id}
                            onClick={() => scrollToSection(section.id)}
                            className="group relative px-3 py-1 text-xs font-bold uppercase tracking-wider whitespace-nowrap font-mono transition-all"
                            style={{
                                color: theme.colors.darkest,
                                fontFamily: theme.typography.fontFamilyBody // Monospace for techie
                            }}
                        >
                            <span className="opacity-50 group-hover:opacity-100 transition-opacity mr-1">[</span>
                            {section.title}
                            <span className="opacity-50 group-hover:opacity-100 transition-opacity ml-1">]</span>

                            {/* Glitch/Scanline Underline */}
                            <span
                                className="absolute bottom-0 left-0 w-full h-[2px] scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-200"
                                style={{ backgroundColor: theme.colors.darkest }}
                            />
                        </button>
                    ))}
                </div>
            </div>

            {/* Decorative bottom line with running progress */}
            <motion.div
                className="absolute bottom-0 left-0 h-[1px] bg-red-500 z-50 w-full origin-left"
                style={{ backgroundColor: theme.colors.darkest }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1.5, ease: "circOut" }}
            />
        </nav>
    );
}
