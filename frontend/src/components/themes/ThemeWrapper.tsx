'use client';

import { ReactNode } from 'react';
import { Theme } from '@/themes';
import { TechieGrid } from './backgrounds/TechieGrid';
import { ElegantNoise } from './backgrounds/ElegantNoise';
import { MinimalSpotlight } from './backgrounds/MinimalSpotlight';

interface Props {
    theme: Theme;
    children: ReactNode;
}

export function ThemeWrapper({ theme, children }: Props) {
    return (
        <div className="relative min-h-screen">
            {/* Background Layer */}
            {theme.variant === 'techie' && <TechieGrid theme={theme} />}
            {theme.variant === 'elegant' && <ElegantNoise theme={theme} />}
            {theme.variant === 'minimal' && <MinimalSpotlight theme={theme} />}

            {/* Content Layer */}
            <div className="relative z-0">
                {children}
            </div>
        </div>
    );
}
