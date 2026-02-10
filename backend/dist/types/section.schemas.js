"use strict";
/**
 * Section Schemas
 * Defines the expected content structure for each section type
 * Used by Content Writer agent for intelligent data transformation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SECTION_SCHEMAS = void 0;
exports.getSchema = getSchema;
exports.getSchemasForPrompt = getSchemasForPrompt;
// All section schemas - Content Writer uses these
exports.SECTION_SCHEMAS = {
    text_block: {
        type: 'text_block',
        structure: 'string',
        fields: [
            { name: 'content', description: 'The text content - can be a string or {bio/text/description}', required: true }
        ],
        example: "We are a family-owned bakery serving fresh goods since 2019...",
        mergeHint: "Put all descriptive information into the text content"
    },
    tags: {
        type: 'tags',
        structure: 'array_of_strings',
        fields: [
            { name: 'items', description: 'Array of short string tags', required: true }
        ],
        example: ["React", "Node.js", "TypeScript", "AWS"],
        mergeHint: "Keep tags short - move longer descriptions to a text_block"
    },
    card_grid: {
        type: 'card_grid',
        structure: 'array',
        fields: [
            { name: 'name', description: 'Item name/title', required: true },
            { name: 'description', description: 'Full description - include price, features, all details', required: false }
        ],
        example: [
            { name: "Chocolate Cake", description: "Rich dark chocolate layers with ganache - ₹450" },
            { name: "Sourdough Bread", description: "24-hour fermented, crusty perfection - ₹180" }
        ],
        mergeHint: "Put all details (price, features, availability) into description"
    },
    timeline: {
        type: 'timeline',
        structure: 'array',
        fields: [
            { name: 'title', description: 'Role, position, or event name', required: true },
            { name: 'date', description: 'Date or date range (e.g., "2020-2024" or "March 2020")', required: true },
            { name: 'description', description: 'Full description - include company, achievements, context', required: false }
        ],
        example: [
            { title: "Senior Engineer", date: "2020-2024", description: "Led search ranking team at Google. Improved latency by 40%." }
        ],
        mergeHint: "Company name can go in title (e.g., 'Senior Engineer at Google') or description"
    },
    gallery: {
        type: 'gallery',
        structure: 'array',
        fields: [
            { name: 'url', description: 'Image URL or path', required: true },
            { name: 'caption', description: 'Image caption/description', required: false }
        ],
        example: [
            { url: "/images/cake1.jpg", caption: "Wedding cake for the Sharma family" }
        ],
        mergeHint: "Put context and details into caption"
    },
    testimonials: {
        type: 'testimonials',
        structure: 'array',
        fields: [
            { name: 'quote', description: 'The testimonial text - include ratings, context, everything', required: true },
            { name: 'author', description: 'Name of the person', required: true }
        ],
        example: [
            { quote: "Best bakery in Mumbai! Their chocolate cake is heavenly. 5 stars! - Been a customer for 3 years.", author: "Riya Sharma" }
        ],
        mergeHint: "Put ratings, visit frequency, context INTO the quote - don't lose any info"
    },
    contact: {
        type: 'contact',
        structure: 'object',
        fields: [
            { name: 'email', description: 'Email address', required: false },
            { name: 'phone', description: 'Phone number', required: false },
            { name: 'address', description: 'Physical address', required: false },
            { name: 'hours', description: 'Business hours', required: false },
            { name: 'website', description: 'Website URL', required: false },
            { name: 'github', description: 'GitHub profile/username', required: false },
            { name: 'linkedin', description: 'LinkedIn profile', required: false },
            { name: 'twitter', description: 'Twitter/X handle', required: false },
            { name: 'social', description: 'Other social media handles', required: false }
        ],
        example: {
            email: "hello@bakery.com",
            phone: "+91 98765 43210",
            address: "22 Hill Road, Bandra, Mumbai",
            github: "github.com/username",
            linkedin: "linkedin.com/in/username",
            twitter: "@username"
        },
        mergeHint: "Each field is optional - only include what user provides. Any contact-related field is acceptable."
    },
    faq: {
        type: 'faq',
        structure: 'array',
        fields: [
            { name: 'question', description: 'The question', required: true },
            { name: 'answer', description: 'The full answer', required: true }
        ],
        example: [
            { question: "Do you offer eggless cakes?", answer: "Yes! All our cakes are available in eggless versions at no extra cost." }
        ],
        mergeHint: "Keep questions concise, put all detail in answers"
    }
};
/**
 * Get schema for a section type
 */
function getSchema(type) {
    return exports.SECTION_SCHEMAS[type];
}
/**
 * Get all schemas as formatted string for AI prompt
 */
function getSchemasForPrompt() {
    return Object.values(exports.SECTION_SCHEMAS)
        .map(schema => {
        const fieldsStr = schema.fields
            .map(f => `  - ${f.name}${f.required ? ' (required)' : ''}: ${f.description}`)
            .join('\n');
        return `### ${schema.type.toUpperCase()}
Structure: ${schema.structure}
Fields:
${fieldsStr}
Example: ${JSON.stringify(schema.example, null, 2)}
Merge Hint: ${schema.mergeHint}`;
    })
        .join('\n\n');
}
