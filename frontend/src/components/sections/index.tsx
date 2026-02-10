'use client';

/**
 * Section Component Mapper
 * Maps section.type → Component
 * 
 * This is the single source of truth for type → component mapping.
 * Add new section types here.
 */

import { ReactElement } from 'react';
import { Theme } from '@/themes';
import { PortfolioSection, SectionType } from '@/types/section.types';
import { normalizeSection } from './normalizeSection';

// Import all section components
import { TextBlock } from './TextBlock';
import { TagsGrid } from './TagsGrid';
import { CardGrid } from './CardGrid';
import { Timeline } from './Timeline';
import { Testimonials } from './Testimonials';
import { ContactSection } from './ContactSection';
import { FaqSection } from './FaqSection';
import { FallbackSection } from './FallbackSection';
import { StructuredSection } from './StructuredSection';

// Export all components
export { TextBlock, TagsGrid, CardGrid, Timeline, Testimonials, ContactSection, FaqSection, FallbackSection };
export { StructuredSection };

// Props interface for all section components
export interface SectionProps {
    section: PortfolioSection;
    theme: Theme;
}

type SectionComponent = (props: SectionProps) => ReactElement | null;

/**
 * Type → Component mapping
 */
export const SECTION_COMPONENTS: Record<SectionType, SectionComponent> = {
    // Wizard v2 section types
    hero: StructuredSection,
    about: StructuredSection,
    services: StructuredSection,
    skills: StructuredSection,
    experience: StructuredSection,
    projects: StructuredSection,
    pricing: StructuredSection,
    team: StructuredSection,
    menu: StructuredSection,
    achievements: StructuredSection,
    education: StructuredSection,

    // Shared/legacy section types
    text_block: TextBlock,
    tags: TagsGrid,
    card_grid: CardGrid,
    timeline: Timeline,
    testimonials: Testimonials,
    contact: ContactSection,
    faq: FaqSection,
};

/**
 * Get component for a section type
 * Falls back to FallbackSection for unknown types
 */
export function getSectionComponent(type: string): SectionComponent {
    return SECTION_COMPONENTS[type as SectionType] || FallbackSection;
}

/**
 * Render a section with the appropriate component
 */
export function renderSection(section: PortfolioSection, theme: Theme): ReactElement | null {
    const Component = getSectionComponent(section.type);
    const normalized = normalizeSection(section);
    return <Component section={ normalized } theme = { theme } />;
}

/**
 * Check if a section has meaningful content
 */
export function sectionHasContent(section: PortfolioSection): boolean {
    const normalized = normalizeSection(section);
    const content = normalized.content;
    if (!content) return false;

    if (Array.isArray(content)) return content.length > 0;
    if (typeof content === 'object') {
        return Object.values(content).some(v => v && String(v).trim() !== '');
    }
    if (typeof content === 'string') return content.trim() !== '';
    return false;
}
