"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIService = void 0;
const openai_1 = __importDefault(require("openai"));
const portfolio_service_1 = __importDefault(require("./portfolio.service"));
const section_types_1 = require("../types/section.types");
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 60000, // 60 second timeout for slow connections
    maxRetries: 2, // Retry twice on failure
});
// No default sections - portfolios start empty, sections are created dynamically
// ============================================
// AI TOOLS DEFINITION
// ============================================
const portfolioTools = [
    // Architect Flow Tools
    {
        type: 'function',
        function: {
            name: 'set_portfolio_type',
            description: 'Set whether the portfolio is for an individual or a company',
            parameters: {
                type: 'object',
                properties: {
                    type: {
                        type: 'string',
                        enum: ['individual', 'company'],
                        description: 'The type of portfolio'
                    }
                },
                required: ['type']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'set_profession',
            description: 'Set the profession/industry for the portfolio and generate recommended sections',
            parameters: {
                type: 'object',
                properties: {
                    profession: {
                        type: 'string',
                        description: 'The profession or industry (e.g., "Software Developer", "Lawyer", "Designer")'
                    }
                },
                required: ['profession']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'set_name',
            description: 'Set the portfolio name (business name or person name). Call this when user provides their name or business name.',
            parameters: {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        description: 'The name for the portfolio (e.g., "Star Bakery", "John Smith Photography")'
                    }
                },
                required: ['name']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'start_fresh',
            description: 'Clear all existing portfolio sections and start building from scratch. Call this when user wants to create a NEW portfolio or rebuild their portfolio.',
            parameters: {
                type: 'object',
                properties: {},
                required: []
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'update_sections',
            description: 'Update the portfolio sections (add, remove, or modify sections)',
            parameters: {
                type: 'object',
                properties: {
                    sections: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                title: { type: 'string' },
                                type: { type: 'string', enum: section_types_1.ALLOWED_SECTION_TYPES },
                                content: { type: 'object' },
                                order: { type: 'number' },
                                visible: { type: 'boolean' }
                            }
                        },
                        description: 'The complete list of sections'
                    }
                },
                required: ['sections']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'update_section_content',
            description: 'Update the content of a specific section. MUST be called for each section with actual user data.',
            parameters: {
                type: 'object',
                properties: {
                    sectionId: {
                        type: 'string',
                        description: 'The ID of the section to update (e.g., "about", "skills", "experience", "testimonials", "contact")'
                    },
                    content: {
                        // No type restriction - accepts objects, arrays, or strings
                        description: 'The content for the section. Use object for About/Contact (e.g., {bio: "..."}), array for Skills/Testimonials (e.g., ["skill1", "skill2"] or [{quote: "...", author: "..."}])'
                    }
                },
                required: ['sectionId', 'content']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'check_slug_availability',
            description: 'Check if a slug (URL) is available for the portfolio',
            parameters: {
                type: 'object',
                properties: {
                    slug: {
                        type: 'string',
                        description: 'The slug to check (e.g., "john-doe")'
                    }
                },
                required: ['slug']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'suggest_slug',
            description: 'Generate a unique slug suggestion based on a name',
            parameters: {
                type: 'object',
                properties: {
                    baseName: {
                        type: 'string',
                        description: 'The base name to generate slug from (e.g., "John Doe")'
                    }
                },
                required: ['baseName']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'publish_portfolio',
            description: 'Publish the portfolio with the given slug, making it publicly accessible',
            parameters: {
                type: 'object',
                properties: {
                    slug: {
                        type: 'string',
                        description: 'The slug for the public URL'
                    }
                },
                required: ['slug']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_portfolio',
            description: 'Get the current state of the portfolio',
            parameters: {
                type: 'object',
                properties: {},
                required: []
            }
        }
    },
    // Legacy tools for backwards compatibility
    {
        type: 'function',
        function: {
            name: 'update_headline',
            description: 'Update the portfolio headline/tagline',
            parameters: {
                type: 'object',
                properties: {
                    headline: { type: 'string', description: 'The new headline' }
                },
                required: ['headline']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'update_bio',
            description: 'Update the portfolio bio/about section',
            parameters: {
                type: 'object',
                properties: {
                    bio: { type: 'string', description: 'The bio text' }
                },
                required: ['bio']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'update_skills',
            description: 'Set the complete list of skills',
            parameters: {
                type: 'object',
                properties: {
                    skills: { type: 'array', items: { type: 'string' }, description: 'Array of skill names' }
                },
                required: ['skills']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'add_project',
            description: 'Add a project to the portfolio',
            parameters: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    technologies: { type: 'array', items: { type: 'string' } },
                    url: { type: 'string' }
                },
                required: ['name', 'description', 'technologies']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'add_experience',
            description: 'Add work experience',
            parameters: {
                type: 'object',
                properties: {
                    company: { type: 'string' },
                    role: { type: 'string' },
                    startDate: { type: 'string' },
                    endDate: { type: 'string' },
                    description: { type: 'string' }
                },
                required: ['company', 'role', 'startDate', 'description']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'add_education',
            description: 'Add education',
            parameters: {
                type: 'object',
                properties: {
                    institution: { type: 'string' },
                    degree: { type: 'string' },
                    field: { type: 'string' },
                    startDate: { type: 'string' },
                    endDate: { type: 'string' }
                },
                required: ['institution', 'degree', 'field', 'startDate']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'update_social_links',
            description: 'Update social media and contact links',
            parameters: {
                type: 'object',
                properties: {
                    github: { type: 'string' },
                    linkedin: { type: 'string' },
                    twitter: { type: 'string' },
                    website: { type: 'string' },
                    email: { type: 'string' }
                },
                required: []
            }
        }
    }
];
// ============================================
// SYSTEM PROMPT (Smart Portfolio Architect)
// ============================================
const SYSTEM_PROMPT = `You are a Portfolio Architect AI. You help users create stunning professional portfolios through natural, friendly conversation.

## YOUR INTELLIGENCE

**DUAL MODE - Adapt to the user:**
1. If user is new/uncertain → GUIDE them with open questions
2. If user provides lots of info at once → EXTRACT immediately, don't ask what they already said

**PORTFOLIO STRUCTURE:**
Every great portfolio has these key elements:
- **Hero Section**: Name, profession/tagline, and a powerful CTA (call-to-action) like "Book a consultation" or "View my work"
- **About**: Who they are, their story, what makes them special
- **Showcase**: The main content - varies by profession (projects, gallery, menu, cases, etc.)
- **Social Proof**: Testimonials, clients, awards, press
- **Contact**: How to reach them

**PROFESSION AWARENESS - USE YOUR KNOWLEDGE:**
You know what great portfolios look like for different professions. Use that knowledge!
When someone tells you their profession, think: "What do the BEST portfolios in this field showcase?"

Examples (use your knowledge to go beyond these):
- Lawyer: Practice Areas, Notable Cases, Client Results, Bar Admissions, Publications
- Artist/Photographer: Stunning Gallery, Exhibitions, Awards, Press Coverage, Commission Process
- Bakery/Restaurant: Origin Story, Signature Dishes, Rave Reviews, Location/Hours, Instagram-worthy Menu
- Developer: Impressive Projects, Tech Stack, GitHub/Open Source, Blog, Speaking
- Designer: Beautiful Case Studies, Design Process, Happy Clients, Tools Mastery
- Doctor/Dentist: Specializations, Credentials, Modern Clinic Photos, Patient Testimonials
- Consultant/Coach: Transformation Stories, Methodology, Client Results, Book a Call CTA
- Real Estate Agent: Listings, Sold Properties, Neighborhood Expertise, Testimonials

Think about what makes someone say "Wow, this looks professional!" for that specific industry.
Then SUGGEST those elements conversationally - but let the USER decide what to include.

## AVAILABLE TOOLS (USE THEM!)

**set_portfolio_type**: Call when user says if it's for themselves or a company
**set_profession**: Call when user mentions their profession/industry

**update_section_content**: Your MAIN tool - call for EVERY piece of content
The section will be created automatically. Content formats:
- Hero: { sectionId: "hero", content: { name: "...", tagline: "...", cta: "Book Now" } }
- Text/Bio: { sectionId: "about", content: "..." } or { sectionId: "about", content: { bio: "..." } }
- List: { sectionId: "skills", content: ["item1", "item2"] }
- Testimonials: { sectionId: "testimonials", content: [{ quote: "...", author: "..." }] }
- Cards: { sectionId: "services", content: [{ name: "...", description: "..." }] }
- Contact: { sectionId: "contact", content: { email: "...", phone: "..." } }

The sectionId can be ANYTHING: "menu", "gallery", "cases", "pricing" - whatever fits!

**check_slug_availability** / **suggest_slug**: For URL handling
**publish_portfolio**: Call ONLY after explicit confirmation

## CONVERSATION STYLE

**Be conversational, NOT formal:**
❌ DON'T: "Please provide the following: 1. About Section 2. Testimonials 3. Menu..."
✅ DO: "Awesome, a bakery! 🍞 Tell me about it - what's the story? What do customers love most about your place?"

**When user mentions their profession:**
1. Call set_portfolio_type and set_profession
2. Respond warmly and suggest what might work CONVERSATIONALLY:
   "Nice! For a bakery, we could showcase your signature items, share some customer reviews, and make sure people know where to find you. What would you like to start with?"

**When gathering content:**
- Ask open questions, not checklists
- Let them share naturally
- After they share something, save it immediately with update_section_content
- Then ask: "Love it! What else makes your [business/work] special?"

**Hero & CTA are important:**
Early in the conversation, ask about their name/business name, a catchy tagline, and what action they want visitors to take (book, call, buy, etc.)

**Keep it flowing:**
- Don't overwhelm with too many questions
- One topic at a time
- Summarize occasionally: "So far we have your story, 3 testimonials, and your menu. Looking good!"
- When content feels complete: "This is shaping up nicely! Ready to pick a URL and go live?"

## EXAMPLES

**User says: "I wanna make a portfolio for my bakery"**
YOU SHOULD:
1. Call set_portfolio_type({ type: "company" })
2. Call set_profession({ profession: "Bakery" })
3. Say: "Awesome, let's make your bakery shine! 🍰 First, what's the name of your bakery? And if you had to describe it in one line - like a tagline customers would remember - what would it be?"

**User shares lots of info at once:**
Extract EVERYTHING immediately with multiple update_section_content calls, then summarize what you captured.

**User seems lost:**
"No worries! Let's start simple - tell me a bit about yourself and what you do. We'll build it from there!"

## CRITICAL RULES - FOLLOW THESE STRICTLY

**NEVER HALLUCINATE DATA:**
- ONLY save information the user explicitly provides
- If you don't have contact info, ASK - don't make it up
- If you're unsure, ASK the user instead of guessing

**AVOID DUPLICATE SECTIONS:**
- Don't save the same content to multiple sections (e.g., skills AND specialties)
- Pick ONE appropriate section name per type of content
- Before creating a new section, check if similar content already exists

**HERO SECTION MUST BE FIRST:**
- When creating hero section, ALWAYS use order: 0
- Hero contains: name, tagline, cta (call-to-action button text)
- Also call set_name to update the portfolio name to their business/personal name

**ONLY CREATE RELEVANT SECTIONS:**
- A bakery doesn't need "Education" or "Experience" sections
- Think: "Does this section make sense for THIS profession?"
- Only create sections the user actually provides content for

**SECTION ORDER:**
- hero: 0 (always first)
- about: 1
- showcase content (services, menu, gallery, etc.): 2-5
- testimonials: 6
- contact: 99 (always last)

**UPDATE PORTFOLIO NAME:**
- When user gives their business/personal name, call set_name to update it
- Don't leave it as "My Portfolio"

**FINAL LINK:**
- Only show portfolio link AFTER publish_portfolio succeeds
- Never show a link before publishing is confirmed`;
// ============================================
// SERVICE CLASS
// ============================================
class OpenAIService {
    static setCurrentPortfolioId(portfolioId) {
        this.currentPortfolioId = portfolioId;
    }
    /**
     * Process a chat message and get AI response with tool calls
     */
    /**
     * Process a chat message and get AI response with tool calls
     */
    static async chat(userId, messages, portfolio) {
        var _a, _b;
        this.currentPortfolioId = portfolio.id;
        let currentPortfolio = portfolio;
        let allToolResults = [];
        // Build context about current portfolio state (prevents hallucination)
        const currentSections = ((_a = portfolio.sections) === null || _a === void 0 ? void 0 : _a.filter(s => s.content && Object.keys(s.content).length > 0)) || [];
        const contextInfo = `
CURRENT PORTFOLIO STATE:
- Type: ${portfolio.portfolio_type || 'Not set'}
- Profession: ${portfolio.profession || 'Not set'}
- Sections with content: ${currentSections.length > 0 ? currentSections.map(s => s.title).join(', ') : 'None yet'}
- Published: ${portfolio.is_published ? 'Yes' : 'No'}
`;
        // Build authentic OpenAI message history with context
        const chatMessages = [
            { role: 'system', content: SYSTEM_PROMPT + contextInfo },
            ...messages.map(m => ({
                role: m.role,
                content: m.content
            }))
        ];
        // Max 5 turns to prevent infinite loops
        for (let turn = 0; turn < 5; turn++) {
            try {
                const response = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: chatMessages,
                    tools: portfolioTools,
                    tool_choice: 'auto',
                });
                const assistantMessage = response.choices[0].message;
                // If no tool calls, we're done - return the text response
                if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
                    return {
                        message: assistantMessage.content || "I've updated your portfolio!",
                        toolCalls: allToolResults.length > 0 ? allToolResults : undefined,
                        updatedPortfolio: currentPortfolio
                    };
                }
                // If there are tool calls, execute them and continue the loop
                chatMessages.push(assistantMessage); // Add assistant's tool call request to history
                for (const toolCall of assistantMessage.tool_calls) {
                    if (toolCall.type !== 'function')
                        continue;
                    try {
                        const args = JSON.parse(toolCall.function.arguments);
                        // 📝 VERBOSE LOGGING - Shows in backend terminal
                        console.log('\n📦 ═══════════════════════════════════════');
                        console.log(`🔧 AI TOOL CALL: ${toolCall.function.name}`);
                        console.log('📋 Arguments:', JSON.stringify(args, null, 2));
                        console.log('═══════════════════════════════════════════\n');
                        const result = await this.executeToolCall(userId, toolCall.function.name, args, currentPortfolio);
                        // Track results for frontend if needed
                        allToolResults.push({
                            name: toolCall.function.name,
                            result
                        });
                        // Log result
                        console.log(`✅ Tool "${toolCall.function.name}" executed successfully`);
                        // Update local portfolio state if changed
                        if (result && result.id) {
                            currentPortfolio = result;
                            console.log('📊 Portfolio sections now:', (_b = currentPortfolio.sections) === null || _b === void 0 ? void 0 : _b.map(s => `${s.id}: ${s.content ? '✓ has content' : '✗ empty'}`).join(', '));
                        }
                        // Add tool result to history
                        chatMessages.push({
                            role: 'tool',
                            tool_call_id: toolCall.id,
                            content: JSON.stringify(result || { success: true })
                        });
                    }
                    catch (err) {
                        console.error(`Error executing tool ${toolCall.function.name}:`, err);
                        chatMessages.push({
                            role: 'tool',
                            tool_call_id: toolCall.id,
                            content: JSON.stringify({ error: 'Failed to execute tool' })
                        });
                    }
                }
                // Loop continues to get the next response from AI based on tool outputs
            }
            catch (error) {
                console.error('OpenAI API error:', error);
                throw new Error('Failed to get AI response');
            }
        }
        return {
            message: "I've processed your updates, but I'm taking a bit too long. Is there anything else?",
            toolCalls: allToolResults,
            updatedPortfolio: currentPortfolio
        };
    }
    /**
     * Execute a tool call
     */
    static async executeToolCall(userId, toolName, args, currentPortfolio) {
        var _a, _b;
        const portfolioId = currentPortfolio.id;
        switch (toolName) {
            case 'set_portfolio_type':
                return await portfolio_service_1.default.updateTypeAndProfession(portfolioId, args.type, currentPortfolio.profession || '');
            case 'set_profession': {
                // Check if profession is changing significantly (different business type)
                const oldProfession = ((_a = currentPortfolio.profession) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
                const newProfession = args.profession.toLowerCase();
                // If profession is changing AND there are existing sections, clear them to start fresh
                const hasSections = currentPortfolio.sections && currentPortfolio.sections.length > 0;
                const professionChanged = oldProfession !== newProfession && oldProfession !== '';
                if (professionChanged && hasSections) {
                    console.log(`🔄 Profession changed from "${oldProfession}" to "${newProfession}" - clearing old sections`);
                    // Clear all sections to start fresh
                    await portfolio_service_1.default.updateSections(portfolioId, []);
                }
                // Update the profession
                await portfolio_service_1.default.updateTypeAndProfession(portfolioId, currentPortfolio.portfolio_type, args.profession);
                // Refetch to get updated portfolio
                const updated = await portfolio_service_1.default.getPortfolioById(portfolioId);
                return updated || currentPortfolio;
            }
            case 'set_name': {
                // Update the portfolio name
                console.log(`📛 Setting portfolio name to: ${args.name}`);
                return await portfolio_service_1.default.updateName(portfolioId, args.name);
            }
            case 'update_sections': {
                // Auto-generate IDs from titles if missing
                const sectionsWithIds = args.sections.map((s, index) => {
                    var _a;
                    return ({
                        id: s.id || ((_a = s.title) === null || _a === void 0 ? void 0 : _a.toLowerCase().replace(/\s+/g, '-')) || `section-${index}`,
                        title: s.title,
                        type: s.type || 'text',
                        content: s.content || (s.type === 'list' ? [] : {}),
                        order: s.order || index + 1,
                        visible: s.visible !== false
                    });
                });
                console.log('📝 Sections with auto-generated IDs:', sectionsWithIds.map((s) => s.id).join(', '));
                return await portfolio_service_1.default.updateSections(portfolioId, sectionsWithIds);
            }
            case 'update_section_content': {
                const sections = [...(currentPortfolio.sections || [])];
                // Find by ID first, then fallback to matching title
                let idx = sections.findIndex(s => s.id === args.sectionId);
                if (idx === -1) {
                    // Fallback: match by title (case-insensitive)
                    idx = sections.findIndex(s => {
                        var _a, _b, _c, _d;
                        return ((_a = s.title) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === ((_b = args.sectionId) === null || _b === void 0 ? void 0 : _b.toLowerCase()) ||
                            ((_c = s.id) === null || _c === void 0 ? void 0 : _c.toLowerCase()) === ((_d = args.sectionId) === null || _d === void 0 ? void 0 : _d.toLowerCase());
                    });
                }
                if (idx !== -1) {
                    console.log(`📝 Updating section "${sections[idx].title}" (id: ${sections[idx].id})`);
                    // For arrays (skills, testimonials, etc.), replace entirely
                    // For objects (about, contact), merge
                    if (Array.isArray(args.content)) {
                        sections[idx].content = args.content;
                    }
                    else if (typeof args.content === 'object') {
                        sections[idx].content = { ...sections[idx].content, ...args.content };
                    }
                    else {
                        sections[idx].content = args.content;
                    }
                    return await portfolio_service_1.default.updateSections(portfolioId, sections);
                }
                else {
                    // Check for existing section with similar content to prevent duplicates
                    const existingSimilar = sections.find(s => {
                        if (Array.isArray(args.content) && Array.isArray(s.content)) {
                            return JSON.stringify(s.content) === JSON.stringify(args.content);
                        }
                        return false;
                    });
                    if (existingSimilar) {
                        console.log(`⚠️ Similar content already exists in section "${existingSimilar.title}", skipping creation of "${args.sectionId}"`);
                        return currentPortfolio; // Don't create duplicate
                    }
                    // Section doesn't exist - CREATE IT DYNAMICALLY with inferred type
                    const inferredType = (0, section_types_1.inferSectionType)(args.content);
                    console.log(`✨ Creating new section: "${args.sectionId}" with type: ${inferredType}`);
                    // Determine proper order based on section type
                    let order;
                    const sectionId = args.sectionId.toLowerCase();
                    if (sectionId === 'hero') {
                        order = 0; // Hero is ALWAYS first
                    }
                    else if (sectionId === 'contact') {
                        order = 99; // Contact is ALWAYS last
                    }
                    else if (sectionId === 'about') {
                        order = 1; // About comes after hero
                    }
                    else if (sectionId === 'testimonials' || sectionId.includes('testimonial')) {
                        order = 50; // Testimonials come later
                    }
                    else {
                        // Regular sections get incremental order in middle range
                        const maxOrder = Math.max(...sections.filter(s => s.order < 50).map(s => s.order), 1);
                        order = maxOrder + 1;
                    }
                    const newSection = {
                        id: sectionId.replace(/\s+/g, '-'),
                        title: args.sectionId.charAt(0).toUpperCase() + args.sectionId.slice(1).replace(/-/g, ' '),
                        type: inferredType,
                        content: args.content,
                        order: order,
                        visible: true
                    };
                    sections.push(newSection);
                    return await portfolio_service_1.default.updateSections(portfolioId, sections);
                }
            }
            case 'check_slug_availability': {
                const available = await portfolio_service_1.default.isSlugAvailable(args.slug);
                return { slug: args.slug, available };
            }
            case 'suggest_slug': {
                const slug = await portfolio_service_1.default.generateUniqueSlug(args.baseName);
                return { suggestedSlug: slug, available: true };
            }
            case 'publish_portfolio': {
                // Validate that at least some content exists before publishing
                const sectionsWithContent = ((_b = currentPortfolio.sections) === null || _b === void 0 ? void 0 : _b.filter(s => s.content && (typeof s.content === 'string' ? s.content.trim() : Object.keys(s.content).length > 0 || Array.isArray(s.content) && s.content.length > 0))) || [];
                if (sectionsWithContent.length === 0) {
                    console.log('⚠️ WARNING: Publishing portfolio with no content sections');
                }
                console.log('🚀 PUBLISHING PORTFOLIO with slug:', args.slug);
                const result = await portfolio_service_1.default.publishPortfolioWithSlug(portfolioId, args.slug);
                // Return with proper frontend URL
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                return {
                    ...result,
                    portfolioUrl: `${frontendUrl}/${args.slug}`,
                    message: `Your portfolio is now live! View it at: ${frontendUrl}/${args.slug}`
                };
            }
            case 'get_portfolio':
                return await portfolio_service_1.default.getPortfolioById(portfolioId);
            // NOTE: Legacy tools (update_headline, update_bio, update_skills, etc.)
            // have been removed. All content now goes through update_section_content.
            default:
                console.warn(`Unknown tool: ${toolName}`);
                return null;
        }
    }
    /**
     * Portfolios now start empty - sections are created dynamically by AI
     */
    static getDefaultSections() {
        return [];
    }
    /**
     * Get tools definition
     */
    static getToolsDefinition() {
        return portfolioTools;
    }
    /**
     * Generate a smart, concise title for a chat
     */
    static async generateChatTitle(userMessage) {
        var _a;
        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'Generate a very short, concise title (3-6 words max) for a portfolio chat based on the user\'s message. Just return the title, nothing else.'
                    },
                    { role: 'user', content: userMessage }
                ],
                max_tokens: 20,
                temperature: 0.7,
            }, {
                timeout: 5000, // 5 second timeout
            });
            return ((_a = response.choices[0].message.content) === null || _a === void 0 ? void 0 : _a.trim()) || 'New Portfolio';
        }
        catch (error) {
            console.error('Failed to generate chat title:', error);
            return 'New Portfolio';
        }
    }
}
exports.OpenAIService = OpenAIService;
// Current active portfolio ID (set by chat controller)
OpenAIService.currentPortfolioId = null;
exports.default = OpenAIService;
