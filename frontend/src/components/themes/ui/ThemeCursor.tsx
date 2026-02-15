'use client';

import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { Theme } from '@/themes';

export function ThemeCursor({ theme }: { theme: Theme }) {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isHoveringLink, setIsHoveringLink] = useState(false);

    const cursorX = useMotionValue(-100);
    const cursorY = useMotionValue(-100);

    const springConfig = { damping: 25, stiffness: 700 };
    const cursorXSpring = useSpring(cursorX, springConfig);
    const cursorYSpring = useSpring(cursorY, springConfig);

    useEffect(() => {
        const moveCursor = (e: MouseEvent) => {
            cursorX.set(e.clientX);
            cursorY.set(e.clientY);
            setMousePosition({ x: e.clientX, y: e.clientY });
        };

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (
                target.tagName === 'A' ||
                target.tagName === 'BUTTON' ||
                target.closest('a') ||
                target.closest('button') ||
                target.classList.contains('cursor-hover')
            ) {
                setIsHoveringLink(true);
            } else {
                setIsHoveringLink(false);
            }
        };

        window.addEventListener('mousemove', moveCursor);
        window.addEventListener('mouseover', handleMouseOver);

        return () => {
            window.removeEventListener('mousemove', moveCursor);
            window.removeEventListener('mouseover', handleMouseOver);
        };
    }, []);

    // Don't render on touch devices (approximate check)
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) {
        return null;
    }

    if (theme.variant === 'techie') {
        return (
            <motion.div
                className="fixed top-0 left-0 pointer-events-none z-[9999] mix-blend-difference"
                style={{
                    x: cursorXSpring,
                    y: cursorYSpring,
                    translateX: '-50%',
                    translateY: '-50%'
                }}
            >
                <div className={`relative transition-all duration-200 ${isHoveringLink ? 'scale-150' : 'scale-100'}`}>
                    {/* Crosshair */}
                    <div className="absolute w-[40px] h-[1px] bg-green-500/50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute w-[1px] h-[40px] bg-green-500/50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    {/* Center Box */}
                    <div className={`w-4 h-4 border border-green-500 bg-transparent flex items-center justify-center ${isHoveringLink ? 'rotate-45' : ''} transition-transform`}>
                        <div className="w-0.5 h-0.5 bg-green-500 rounded-full" />
                    </div>
                </div>
            </motion.div>
        );
    }

    if (theme.variant === 'minimal' || theme.variant === 'elegant') {
        return null;
    }

    // Default Fallback (no cursor)
    return null;
}
