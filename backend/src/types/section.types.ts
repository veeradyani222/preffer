/**
 * Section Type System
 * Universal section types for portfolio rendering
 */

// Allowed section types - finite list, no custom types
export const ALLOWED_SECTION_TYPES = [
    'text_block',
    'tags',
    'card_grid',
    'timeline',
    'testimonials',
    'contact',
    'faq'
] as const;

export type SectionType = typeof ALLOWED_SECTION_TYPES[number];

// Portfolio Section Interface
export interface PortfolioSection {
    id: string;
    title: string;
    type: SectionType;
    content: any;
    order: number;
    visible: boolean;
}

/**
 * Infer section type from content shape
 * This is the core logic that maps content → type
 */
export function inferSectionType(content: any): SectionType {
    // Null/undefined → text_block
    if (content === null || content === undefined) {
        return 'text_block';
    }

    // String → text_block
    if (typeof content === 'string') {
        return 'text_block';
    }

    // Object with bio/text field → text_block
    if (content?.bio || content?.text || content?.description) {
        return 'text_block';
    }

    // Object with email/phone → contact
    if (content?.email || content?.phone || content?.address || content?.github || content?.linkedin || content?.twitter) {
        return 'contact';
    }

    // Array handling
    if (Array.isArray(content) && content.length > 0) {
        const first = content[0];

        // Array of strings
        if (typeof first === 'string') {
            return 'tags';
        }

        // Array of objects - check first object's shape
        if (typeof first === 'object' && first !== null) {
            // Testimonials: has quote and author
            if (first.quote && first.author) return 'testimonials';

            // FAQ: has question and answer
            if (first.question && first.answer) return 'faq';

            // Timeline: has date-related fields
            if (first.date || first.startDate || first.endDate || first.year) {
                return 'timeline';
            }

            // Card grid: has name/title with optional description
            if (first.name || first.title) {
                return 'card_grid';
            }
        }
    }

    // Fallback
    return 'text_block';
}

/**
 * Validate section type - returns valid type or fallback
 */
export function validateSectionType(type: string | undefined): SectionType {
    if (!type) return 'text_block';
    if (ALLOWED_SECTION_TYPES.includes(type as SectionType)) {
        return type as SectionType;
    }
    return 'text_block';
}
