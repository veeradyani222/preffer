'use client';

import { Theme } from '@/themes';
import { PortfolioSection } from '@/types/section.types';
import { motion } from 'framer-motion';

interface Props {
    theme: Theme;
    sections: PortfolioSection[];
    activeSection?: string;
}

export function MinimalNav({ theme, sections }: Props) {
    const scrollToSection = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <nav className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
            <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="bg-white/80 backdrop-blur-md border shadow-lg rounded-full px-2 py-2 pointer-events-auto flex gap-1 overflow-x-auto max-w-full"
                style={{
                    backgroundColor: `${theme.colors.lightest}90`, // High transparency
                    borderColor: `${theme.colors.medium}40`,
                    boxShadow: theme.shadows.card,
                    borderRadius: theme.radius.full,
                }}
            >
                {sections.filter(s => s.type !== 'hero').map((section) => (
                    <motion.button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className="relative px-4 py-2 text-sm font-medium whitespace-nowrap rounded-full transition-colors"
                        style={{
                            color: theme.colors.darkest,
                            fontFamily: theme.typography.fontFamilyBody,
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <span className="relative z-10">{section.title}</span>

                        {/* Hover Background */}
                        <motion.div
                            className="absolute inset-0 rounded-full z-0"
                            initial={{ opacity: 0 }}
                            whileHover={{
                                opacity: 1,
                                backgroundColor: `${theme.colors.medium}20`
                            }}
                        />
                    </motion.button>
                ))}
            </motion.div>
        </nav>
    );
}
