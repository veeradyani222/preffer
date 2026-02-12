/**
 * Section Types - shared between frontend and backend
 */

export const ALLOWED_SECTION_TYPES = [
    // All 14 wizard section types
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
