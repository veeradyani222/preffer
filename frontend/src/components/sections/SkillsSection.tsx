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
import { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue, useVelocity, useAnimationFrame } from 'framer-motion';

/**
 * Marquee Component for infinite scrolling
 */
const Marquee = ({ children, direction = 1, speed = 20, className = "" }: { children: React.ReactNode, direction?: number, speed?: number, className?: string }) => {
    // We duplicate children to ensure seamless loop
    return (
        <div className={`flex overflow-hidden whitespace-nowrap ${className}`} style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
            <motion.div
                className="flex gap-8 pr-8"
                animate={{
                    x: direction === 1 ? [0, -1000] : [-1000, 0],
                }}
                transition={{
                    x: {
                        repeat: Infinity,
                        repeatType: "loop",
                        duration: 50, // Slow base speed, adjusted by logic if needed, but fixed is smoother 
                        ease: "linear",
                    },
                }}
            >
                {/* Render children multiple times for loop content */}
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex gap-8 shrink-0 items-center">
                        {children}
                    </div>
                ))}
            </motion.div>
        </div>
    );
};


/**
 * SkillsSection - Skills/technologies display
 */
export function SkillsSection({ section, theme }: SectionProps) {
    const content = section.content || {};
    const skills = Array.isArray(content.skills) ? content.skills : [];

    if (skills.length === 0) return null;

    // Helper to render skill item based on theme
    const renderSkillItem = (skill: string, idx: number) => {
        if (theme.variant === 'techie') {
            return (
                <div
                    key={idx}
                    className="px-4 py-2 border text-sm font-mono font-bold uppercase transition-all duration-200"
                    style={{
                        borderColor: theme.colors.medium,
                        color: theme.colors.darkest,
                        backgroundColor: theme.colors.lightest
                    }}
                >
                    {skill}
                </div>
            );
        }

        if (theme.variant === 'elegant') {
            return (
                <span
                    key={idx}
                    className="text-2xl italic tracking-tight"
                    style={{
                        color: theme.colors.darkest,
                        fontFamily: theme.typography.fontFamilyHeading,
                    }}
                >
                    {skill}
                </span>
            );
        }

        // Minimal / Default
        return (
            <span
                key={idx}
                className="px-6 py-3 text-lg font-medium rounded-full"
                style={{
                    backgroundColor: theme.colors.lightest,
                    border: `1px solid ${theme.colors.medium}40`,
                    color: theme.colors.darkest,
                    fontFamily: theme.typography.fontFamilyBody,
                    boxShadow: theme.shadows.card
                }}
            >
                {skill}
            </span>
        );
    }

    // Split skills into rows if there are many
    const chunkStats = (arr: any[], size: number) => {
        return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
            arr.slice(i * size, i * size + size)
        );
    }

    // Default to 1 row, but if > 8 skills, maybe 2 rows?
    // Let's just do 2 rows opposing directions for dynamic feel if > 6 skills
    const rows = skills.length > 6 ? chunkStats(skills, Math.ceil(skills.length / 2)) : [skills];


    return (
        <div className="py-20 overflow-hidden">
            <div className="flex flex-col gap-8">
                {rows.map((row, i) => (
                    <Marquee key={i} direction={i % 2 === 0 ? 1 : -1} speed={30}>
                        {row.map((skill: string, idx: number) => renderSkillItem(skill, idx))}
                    </Marquee>
                ))}
            </div>
        </div>
    );
}
