'use client';

import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Theme } from '@/themes';

interface TiltCardProps {
    children: React.ReactNode;
    className?: string;
    theme: Theme;
    tiltMaxAngleX?: number;
    tiltMaxAngleY?: number;
    scaleOnHover?: number;
}

export function TiltCard({
    children,
    className = '',
    theme,
    tiltMaxAngleX = 10,
    tiltMaxAngleY = 10,
    scaleOnHover = 1.02
}: TiltCardProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseXSpring = useSpring(x);
    const mouseYSpring = useSpring(y);

    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [tiltMaxAngleX, -tiltMaxAngleX]);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-tiltMaxAngleY, tiltMaxAngleY]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;

        const rect = ref.current.getBoundingClientRect();

        const width = rect.width;
        const height = rect.height;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;

        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        x.set(0);
        y.set(0);
    };

    const handleMouseEnter = () => {
        setIsHovered(true);
    };

    // Minimal theme might prefer less aggressive or no 3D tilt, just scale
    if (theme.variant === 'minimal') {
        return (
            <motion.div
                className={className}
                whileHover={{ scale: scaleOnHover, y: -5 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
                {children}
            </motion.div>
        );
    }

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onMouseEnter={handleMouseEnter}
            style={{
                rotateY,
                rotateX,
                transformStyle: "preserve-3d",
            }}
            animate={{
                scale: isHovered ? scaleOnHover : 1,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={`perspective-1000 ${className}`}
        >
            <div style={{ transform: "translateZ(20px)" }}>
                {children}
            </div>
        </motion.div>
    );
}
