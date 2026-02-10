/**
 * Section Types - shared between frontend and backend
 */

export const ALLOWED_SECTION_TYPES = [
    // Wizard v2 section types
    'hero',
    'about',
    'services',
    'skills',
    'experience',
    'projects',
    'testimonials',
    'contact',
    'faq',
    'pricing',
    'team',
    'menu',
    'achievements',
    'education',

    // Legacy section types
    'text_block',
    'tags',
    'card_grid',
    'timeline',
    'testimonials',
    'contact',
    'faq',
] as const;

export type SectionType = typeof ALLOWED_SECTION_TYPES[number];

export interface PortfolioSection {
    id: string;
    title: string;
    type: SectionType;
    content: any;
    order: number;
    visible?: boolean;
}
