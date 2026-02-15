'use client';

import { useEffect, useState } from 'react';
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';
import { Theme } from '@/themes';

interface Props {
    theme: Theme;
}

export function MinimalSpotlight({ theme }: Props) {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    useEffect(() => {
        const handleMouseMove = ({ clientX, clientY }: MouseEvent) => {
            mouseX.set(clientX);
            mouseY.set(clientY);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [mouseX, mouseY]);

    return (
        <div
            className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none transition-colors duration-500"
            style={{ backgroundColor: theme.colors.lightest }}
        >
            {/* The Spotlight - a radial gradient that follows the mouse */}
            <motion.div
                className="absolute -inset-px opacity-50"
                style={{
                    background: useMotionTemplate`
                        radial-gradient(
                            600px circle at ${mouseX}px ${mouseY}px,
                            ${theme.colors.medium}15,
                            transparent 80%
                        )
                    `,
                }}
            />

            {/* Ambient Base - Very subtle center glow */}
            <div
                className="absolute inset-0 opacity-20"
                style={{
                    background: `radial-gradient(circle at 50% 50%, ${theme.colors.medium}10, transparent 70%)`
                }}
            />
        </div>
    );
}
