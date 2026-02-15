'use client';

import { motion } from 'framer-motion';
import { Theme } from '@/themes';

interface Props {
    theme: Theme;
}

export function TechieGrid({ theme }: Props) {
    return (
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none" style={{ backgroundColor: theme.colors.lightest }}>
            {/* Base Grid */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(${theme.colors.darkest} 1px, transparent 1px), linear-gradient(90deg, ${theme.colors.darkest} 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                }}
            />

            {/* Secondary Larger Grid */}
            <div
                className="absolute inset-0 opacity-[0.02]"
                style={{
                    backgroundImage: `linear-gradient(${theme.colors.darkest} 1px, transparent 1px), linear-gradient(90deg, ${theme.colors.darkest} 1px, transparent 1px)`,
                    backgroundSize: '200px 200px'
                }}
            />

            {/* Scanning Line Animation */}
            <motion.div
                className="absolute inset-0 w-full h-[2px] opacity-20"
                style={{
                    background: `linear-gradient(90deg, transparent, ${theme.colors.medium}, transparent)`,
                    boxShadow: `0 0 10px ${theme.colors.medium}`
                }}
                animate={{
                    top: ['0%', '100%'],
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "linear"
                }}
            />

            {/* Glowing Orbs / Data Points (Subtle) */}
            <motion.div
                className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-[100px] opacity-5"
                style={{ backgroundColor: theme.colors.medium }}
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.05, 0.08, 0.05],
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
        </div>
    );
}
