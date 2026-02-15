'use client';

import { motion } from 'framer-motion';
import { Theme } from '@/themes';

interface TextRevealProps {
    text: string;
    theme: Theme;
    className?: string;
    as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
}

export function TextReveal({ text, theme, className = '', as: Component = 'h2' }: TextRevealProps) {
    // Split text into words/characters based on theme
    const words = text.split(' ');

    // --- MINIMAL THEME: Smooth Word Stagger ---
    if (theme.variant === 'minimal') {
        const container: any = {
            hidden: { opacity: 0 },
            visible: {
                opacity: 1,
                transition: { staggerChildren: 0.1, delayChildren: 0.2 }
            }
        };

        const child: any = {
            hidden: { opacity: 0, y: 20 },
            visible: {
                opacity: 1,
                y: 0,
                transition: { type: "spring", damping: 12, stiffness: 100 }
            }
        };

        return (
            <motion.div
                className={className}
                variants={container}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25em' }}
            >
                {words.map((word, index) => (
                    <motion.span key={index} variants={child} style={{ display: 'inline-block' }}>
                        {word}
                    </motion.span>
                ))}
            </motion.div>
        );
    }

    // --- TECHIE THEME: Glitchy Character Decode ---
    if (theme.variant === 'techie') {
        const characters = text.split('');

        const container: any = {
            hidden: { opacity: 1 },
            visible: {
                opacity: 1,
                transition: { staggerChildren: 0.03 }
            }
        };

        const child: any = {
            hidden: { opacity: 0, x: -10, filter: 'blur(4px)' },
            visible: {
                opacity: 1,
                x: 0,
                filter: 'blur(0px)',
                transition: { type: "tween", ease: "circOut" }
            }
        };

        return (
            <Component className={className} style={{ position: 'relative' }}>
                <motion.span
                    variants={container}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                >
                    {characters.map((char, index) => (
                        <motion.span key={index} variants={child} style={{ display: 'inline-block' }}>
                            {char === ' ' ? '\u00A0' : char}
                        </motion.span>
                    ))}
                </motion.span>
            </Component>
        );
    }

    // --- ELEGANT THEME: Slow, Graceful Fade ---
    const elegantContainer: any = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.08, delayChildren: 0.3 }
        }
    };

    const elegantChild: any = {
        hidden: { opacity: 0, filter: 'blur(10px)', scale: 0.95 },
        visible: {
            opacity: 1,
            filter: 'blur(0px)',
            scale: 1,
            transition: { duration: 0.8, ease: [0.32, 0.72, 0, 1] } // Custom easing
        }
    };

    return (
        <motion.div
            className={className}
            variants={elegantContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25em' }}
        >
            {words.map((word, index) => (
                <motion.span key={index} variants={elegantChild} style={{ display: 'inline-block' }}>
                    {word}
                </motion.span>
            ))}
        </motion.div>
    );
}
