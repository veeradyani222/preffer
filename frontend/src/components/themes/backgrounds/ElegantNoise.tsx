'use client';

import { motion } from 'framer-motion';
import { Theme } from '@/themes';

interface Props {
    theme: Theme;
}

export function ElegantNoise({ theme }: Props) {
    return (
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none" style={{ backgroundColor: theme.colors.lightest }}>

            {/* Animated Gradient Orbs */}
            <motion.div
                className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-20"
                style={{ backgroundColor: theme.colors.medium }}
                animate={{
                    x: [0, 50, 0],
                    y: [0, 30, 0],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            <motion.div
                className="absolute -bottom-[10%] -right-[10%] w-[60%] h-[60%] rounded-full blur-[120px] opacity-15"
                style={{ backgroundColor: theme.colors.dark }}
                animate={{
                    x: [0, -40, 0],
                    y: [0, -60, 0],
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            {/* Generic Noise Overlay */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                    mixBlendMode: 'overlay'
                }}
            />
        </div>
    );
}
