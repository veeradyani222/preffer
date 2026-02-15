'use client';

import { ReactNode } from 'react';
import { motion, Variants } from 'framer-motion';
import { Theme } from '@/themes';

interface Props {
    children: ReactNode;
    theme: Theme;
    className?: string;
    id?: string;
}

export function SectionWrapper({ children, theme, className = '', id }: Props) {

    // Define variants based on theme
    const minimalVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } // Custom cubic-bezier for "springy" but smooth feel
        }
    };

    const techieVariants: Variants = {
        hidden: { opacity: 0, x: -20, scale: 0.98 },
        visible: {
            opacity: 1,
            x: 0,
            scale: 1,
            transition: {
                type: "spring",
                stiffness: 100,
                damping: 10,
                mass: 0.5
            }
        }
    };

    const elegantVariants: Variants = {
        hidden: { opacity: 0, scale: 0.98 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: { duration: 0.8, ease: "easeOut" }
        }
    };

    const getVariants = (): Variants => {
        switch (theme.variant) {
            case 'techie': return techieVariants;
            case 'elegant': return elegantVariants;
            case 'minimal':
            default: return minimalVariants;
        }
    };

    return (
        <motion.section
            id={id}
            className={className}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }} // Trigger slightly before element is fully in view
            variants={getVariants()}
        >
            {children}
        </motion.section>
    );
}
