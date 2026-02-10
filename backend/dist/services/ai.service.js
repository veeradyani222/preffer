"use strict";
/**
 * AI Service
 * Gemini-powered section recommendations and content generation
 * ALL recommendations come from AI — no hardcoded mappings
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = exports.SECTION_LABELS = void 0;
const generative_ai_1 = require("@google/generative-ai");
const credits_service_1 = require("./credits.service");
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
// ============================================
// AVAILABLE SECTIONS (for validation only)
// ============================================
exports.SECTION_LABELS = {
    hero: 'Hero / Header',
    about: 'About',
    services: 'Services',
    skills: 'Skills',
    experience: 'Experience',
    projects: 'Projects / Portfolio',
    testimonials: 'Testimonials',
    contact: 'Contact',
    gallery: 'Gallery',
    faq: 'FAQ',
    pricing: 'Pricing',
    team: 'Team',
    menu: 'Menu',
    achievements: 'Achievements',
    education: 'Education',
};
// ============================================
// AI SERVICE
// ============================================
class AIService {
    /**
     * Recommend sections using AI based on profession/business description
     * Pure AI — no hardcoded mappings
     */
    static async recommendSections(portfolioType, description, plan = 'free') {
        const maxSections = credits_service_1.PLAN_LIMITS[plan].maxSections;
        const availableSections = Object.keys(exports.SECTION_LABELS).join(', ');
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: {
                temperature: 0.4,
                maxOutputTokens: 500,
            }
        });
        const prompt = `You are an expert at recommending website sections for portfolios and business websites.

A user wants to create a ${portfolioType === 'individual' ? 'personal portfolio' : 'business website'}.

Their description: "${description}"

Available section types you can choose from:
${availableSections}

Rules:
1. Recommend EXACTLY ${maxSections} sections (this is their plan limit)
2. Always include "hero" as the first section and "contact" as the last
3. Choose sections that best showcase this specific profession/business
4. Be creative and specific to their needs

Return a JSON object with:
- sections: array of exactly ${maxSections} section type strings
- reasoning: a friendly 1-2 sentence explanation of why you chose these sections

Example response:
{"sections": ["hero", "about", "services", "testimonials", "contact"], "reasoning": "For your consulting business, I've picked sections that build trust with potential clients and make it easy to show your expertise."}

Return ONLY valid JSON, no markdown code blocks.`;
        try {
            const result = await model.generateContent(prompt);
            const text = result.response.text().trim();
            // Parse JSON (strip markdown if present)
            const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
            const parsed = JSON.parse(jsonStr);
            // Validate sections are from allowed list
            const validSections = parsed.sections
                .filter((s) => s in exports.SECTION_LABELS)
                .slice(0, maxSections);
            // Ensure we have enough sections (pad with defaults if AI returned invalid ones)
            if (validSections.length < maxSections) {
                const defaults = ['hero', 'about', 'services', 'experience', 'contact'];
                for (const def of defaults) {
                    if (!validSections.includes(def) && validSections.length < maxSections) {
                        validSections.push(def);
                    }
                }
            }
            return {
                sections: validSections,
                reasoning: parsed.reasoning || 'I picked these sections based on what works best for your profile.'
            };
        }
        catch (error) {
            console.error('AI section recommendation failed:', error);
            // Minimal fallback only if API completely fails
            const defaults = ['hero', 'about', 'services', 'experience', 'contact'];
            const fallback = defaults.slice(0, maxSections);
            return {
                sections: fallback,
                reasoning: 'Here are essential sections to get you started. You can customize these!'
            };
        }
    }
    /**
     * Generate content for a section based on user input
     */
    static async generateSectionContent(sectionType, sectionTitle, portfolioContext, userPrompt) {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1000,
            }
        });
        const contentStructures = {
            hero: '{"headline": "string", "subheadline": "string", "ctaText": "string"}',
            about: '{"text": "string (2-3 paragraphs)"}',
            services: '[{"name": "string", "description": "string", "icon": "string (optional)"}]',
            skills: '["skill1", "skill2", "skill3", ...]',
            experience: '[{"title": "string", "company": "string", "period": "string", "description": "string"}]',
            projects: '[{"name": "string", "description": "string", "link": "string (optional)"}]',
            testimonials: '[{"quote": "string", "author": "string", "role": "string"}]',
            contact: '{"email": "string", "phone": "string (optional)", "address": "string (optional)", "socials": {}}',
            gallery: '[{"src": "placeholder", "alt": "string", "caption": "string (optional)"}]',
            faq: '[{"question": "string", "answer": "string"}]',
            pricing: '[{"name": "string", "price": "string", "features": ["string"], "popular": boolean}]',
            team: '[{"name": "string", "role": "string", "bio": "string"}]',
            menu: '[{"name": "string", "description": "string (optional)", "price": "string", "category": "string (optional)"}]',
            achievements: '[{"title": "string", "description": "string", "year": "string (optional)"}]',
            education: '[{"degree": "string", "institution": "string", "year": "string", "description": "string (optional)"}]',
        };
        const prompt = `Generate content for a "${sectionTitle}" section on a portfolio website.

Portfolio: ${portfolioContext.name} (${portfolioContext.portfolioType})
Profession: ${portfolioContext.profession || 'Not specified'}
About: ${portfolioContext.description || 'Not specified'}

Section type: ${sectionType}
${userPrompt ? `User's input: "${userPrompt}"` : 'Generate sample content based on the context.'}

Return JSON matching this structure:
${contentStructures[sectionType]}

Also include a "suggestion" field with a friendly message about what you created.

Return ONLY valid JSON with a "content" field (the above structure) and "suggestion" field (string).`;
        try {
            const result = await model.generateContent(prompt);
            const text = result.response.text().trim();
            const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
            const parsed = JSON.parse(jsonStr);
            return {
                content: parsed.content,
                suggestion: parsed.suggestion || `I've created ${sectionTitle} content for you. Feel free to edit it!`
            };
        }
        catch (error) {
            console.error('AI content generation failed:', error);
            throw new Error('Failed to generate content. Please try again or enter your content manually.');
        }
    }
    /**
     * Improve/rewrite content based on user feedback
     */
    static async improveContent(currentContent, userFeedback, sectionType) {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1000,
            }
        });
        const prompt = `Improve this ${sectionType} section content based on user feedback.

Current content:
${JSON.stringify(currentContent, null, 2)}

User's feedback: "${userFeedback}"

Return the improved content in the SAME JSON structure, plus a "suggestion" field explaining changes.
Return ONLY valid JSON with "content" and "suggestion" fields.`;
        try {
            const result = await model.generateContent(prompt);
            const text = result.response.text().trim();
            const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
            const parsed = JSON.parse(jsonStr);
            return {
                content: parsed.content,
                suggestion: parsed.suggestion || "I've updated the content based on your feedback!"
            };
        }
        catch (error) {
            console.error('AI content improvement failed:', error);
            throw new Error('Failed to improve content. Please try again.');
        }
    }
}
exports.AIService = AIService;
exports.default = AIService;
