"use strict";
/**
 * Section Type System
 * Universal section types for portfolio rendering
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLOWED_SECTION_TYPES = void 0;
exports.inferSectionType = inferSectionType;
exports.validateSectionType = validateSectionType;
// Allowed section types - finite list, no custom types
exports.ALLOWED_SECTION_TYPES = [
    'text_block',
    'tags',
    'card_grid',
    'timeline',
    'gallery',
    'testimonials',
    'contact',
    'faq'
];
/**
 * Infer section type from content shape
 * This is the core logic that maps content → type
 */
function inferSectionType(content) {
    // Null/undefined → text_block
    if (content === null || content === undefined) {
        return 'text_block';
    }
    // String → text_block
    if (typeof content === 'string') {
        return 'text_block';
    }
    // Object with bio/text field → text_block
    if ((content === null || content === void 0 ? void 0 : content.bio) || (content === null || content === void 0 ? void 0 : content.text) || (content === null || content === void 0 ? void 0 : content.description)) {
        return 'text_block';
    }
    // Object with email/phone → contact
    if ((content === null || content === void 0 ? void 0 : content.email) || (content === null || content === void 0 ? void 0 : content.phone) || (content === null || content === void 0 ? void 0 : content.address) || (content === null || content === void 0 ? void 0 : content.github) || (content === null || content === void 0 ? void 0 : content.linkedin) || (content === null || content === void 0 ? void 0 : content.twitter)) {
        return 'contact';
    }
    // Array handling
    if (Array.isArray(content) && content.length > 0) {
        const first = content[0];
        // Array of strings
        if (typeof first === 'string') {
            // Check if images (has image extensions)
            const isImage = first.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)$/i);
            if (isImage)
                return 'gallery';
            return 'tags';
        }
        // Array of objects - check first object's shape
        if (typeof first === 'object' && first !== null) {
            // Testimonials: has quote and author
            if (first.quote && first.author)
                return 'testimonials';
            // FAQ: has question and answer
            if (first.question && first.answer)
                return 'faq';
            // Timeline: has date-related fields
            if (first.date || first.startDate || first.endDate || first.year) {
                return 'timeline';
            }
            // Gallery: has url/src with optional alt/caption
            if ((first.url || first.src) && (first.alt !== undefined || first.caption !== undefined || first.image)) {
                return 'gallery';
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
function validateSectionType(type) {
    if (!type)
        return 'text_block';
    if (exports.ALLOWED_SECTION_TYPES.includes(type)) {
        return type;
    }
    return 'text_block';
}
