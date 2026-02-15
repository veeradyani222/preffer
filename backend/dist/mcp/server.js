"use strict";
/**
 * MCP Server for Portfolio App
 *
 * Exposes portfolio management as granular MCP tools
 * for Archestra integration via Streamable HTTP transport.
 *
 * Auth: Bearer token = user's api_key from the users table.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveUserFromApiKey = resolveUserFromApiKey;
exports.createMcpServer = createMcpServer;
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const zod_1 = require("zod");
const portfolio_service_new_1 = __importDefault(require("../services/portfolio.service.new"));
const ai_service_1 = require("../services/ai.service");
const credits_service_1 = require("../services/credits.service");
const analytics_service_1 = __importDefault(require("../services/analytics.service"));
const apiKey_service_1 = __importDefault(require("../services/apiKey.service"));
const ai_capability_service_1 = __importDefault(require("../services/ai-capability.service"));
const archestra_agent_service_1 = __importDefault(require("../services/archestra-agent.service"));
const ai_capabilities_1 = require("../constants/ai-capabilities");
const database_1 = __importDefault(require("../config/database"));
// Public-facing base URL for portfolio links (from env, no trailing slash)
const PORTFOLIO_BASE_URL = (process.env.PORTFOLIO_BASE_URL || 'https://prefer.me').replace(/\/+$/, '');
function normalizeCapabilityPayload(raw) {
    const out = [];
    for (const item of (Array.isArray(raw) ? raw : [])) {
        if (!item || !(0, ai_capabilities_1.isAICapabilityKey)(item.capability_key))
            continue;
        out.push({
            capability_key: item.capability_key,
            enabled: Boolean(item.enabled),
            settings_json: item.settings_json || item.settings || {},
        });
    }
    return out;
}
const SECTION_SCHEMAS = {
    hero: {
        structure: `{
  "headline": string (required),
  "subheadline": string (required)
}`,
        guidance: `HERO SECTION — First impression, make it count!
- Headline: catchy line with name AND profession/industry — not just the name alone.
  Example: "John Doe - Valuing Visual Appeal, Recognizing the Power of Art"
- Subheadline: concise, first-person perspective describing what they do.
- Use the name, industry, and about info to build both fields.
- Never leave generic; always personalize to the profession.`
    },
    about: {
        structure: `{
  "text": string (required)
}`,
        guidance: `ABOUT SECTION — Their story in a flowing narrative.
- Create a flowing narrative in the text field based on their profession/background.
- Never add placeholders like "[mention your experience]". If info is missing, omit that point.
- Identify their profession/industry and tailor the tone accordingly.
- a portfolio for a lawyer should sound different from one for a DJ.`
    },
    services: {
        structure: `{
  "items": [
    {
      "name": string (required),
      "description": string (required, 1-2 sentences),
      "icon": string (required, lowercase single-word e.g. "briefcase", "code", "star")
    }
  ]
}`,
        guidance: `SERVICES/OFFERINGS — Showcase what they offer clearly.
- Each service needs a name + 1-2 sentence description + icon name.
- Icon: lowercase single word (e.g. "code", "briefcase", "paintbrush", "camera", "wrench").
- Adapt to their profession — a photographer's services differ from a developer's.
- If user provides raw info like "I do web design and branding", expand into proper service entries.`
    },
    skills: {
        structure: `{
  "heading": string (required),
  "skills": [string] (required, e.g. ["React", "Node.js", "Python"])
}`,
        guidance: `SKILLS — Display their expertise areas.
- Simple array of skill/technology names.
- Can infer skills from context if they described their work.
- Example: "I know React, Node, Python, and Figma" → ["React", "Node.js", "Python", "Figma"]
- The heading should be relevant: "Technical Skills", "Core Competencies", "What I Know", etc.`
    },
    experience: {
        structure: `{
  "heading": string (required),
  "items": [
    {
      "role": string (required),
      "company": string (required),
      "period": string (required, e.g. "2020 - 2023"),
      "description": string (required)
    }
  ]
}`,
        guidance: `WORK EXPERIENCE — Timeline of their professional journey.
- Format into: role, company, period, description.
- Example: "I was a senior dev at Google for 3 years" →
  role: "Senior Developer", company: "Google", period: "2020-2023", description: based on context.
- Period should be a readable range like "Jan 2020 - Dec 2023" or "2020 - Present".
- Description should capture key responsibilities or achievements in that role.`
    },
    projects: {
        structure: `{
  "heading": string (required),
  "items": [
    {
      "name": string (required),
      "description": string (required),
      "tags": [string] (optional),
      "link": string (optional, empty string if unavailable)
    }
  ]
}`,
        guidance: `PROJECTS/PORTFOLIO — Showcase their best work.
- Format into: name, description, tags, link.
- Example: "I built a cool e-commerce site with React" →
  name: "E-commerce Platform", description: "Built with React", tags: ["React", "E-commerce"], link: "" (empty if not provided).
- Tags should be relevant technologies or categories.
- Use empty string for link if no URL is available, never omit the field.`
    },
    testimonials: {
        structure: `{
  "heading": string (required),
  "items": [
    {
      "quote": string (required),
      "author": string (required),
      "role": string (required)
    }
  ]
}`,
        guidance: `TESTIMONIALS — Real client/colleague feedback. NEVER fabricate testimonials.
- Only use testimonials explicitly provided by the user.
- Intelligently reformat raw input into: quote, author, role.
- Example: User says "Veer the product designer in my team said I am amazing" →
  quote: "They are amazing to work with", author: "Veer", role: "Product Designer".
- If no real testimonials exist, don't create fake ones — inform that this section needs real quotes.`
    },
    contact: {
        structure: `{
  "heading": string (required),
  "links": string (required, comma-separated, e.g. "Email: x@y.com, Phone: 123-456")
}`,
        guidance: `CONTACT — Make it easy for people to reach them.
- Links is a comma-separated string of contact details.
- Example: "email is xyz@gmail.com, phone is 87635382764, instagram is @ashley123" →
  links: "Email: xyz@gmail.com, Phone: 87635382764, Instagram: @ashley123"
- Accept any contact info: email, phone, social links, location, website.
- Format each with a label prefix (Email:, Phone:, Instagram:, etc.).`
    },
    faq: {
        structure: `{
  "heading": string (required),
  "items": [
    {
      "question": string (required),
      "answer": string (required)
    }
  ]
}`,
        guidance: `FAQ — Answer common visitor questions.
- Format into question/answer pairs.
- Can suggest industry-relevant FAQs if user requests it.
- Example: "People always ask about my pricing and turnaround time" →
  Create proper Q&A pairs with detailed answers based on profession context.
- Answers should be helpful and specific, not generic.`
    },
    pricing: {
        structure: `{
  "heading": string (required),
  "items": [
    {
      "price": string (required, e.g. "$50"),
      "condition": string (required, e.g. "Per Hour", "Basic Plan"),
      "features": [string] (required)
    }
  ]
}`,
        guidance: `PRICING — Clear pricing builds trust. Adapt to their pricing model.
- price: The amount (e.g., "$50", "$5,000")
- condition: Plan name or billing context (e.g., "Per Hour", "Basic Plan", "Enterprise")
- features: Array of what's included in that tier
- Examples:
  * "I charge $50 per hour" → price: "$50", condition: "Per Hour", features: [what's included]
  * "$99/month with 5 pages and mobile responsive" → price: "$99", condition: "Monthly", features: ["Up to 5 pages", "Mobile responsive"]
  * Multiple tiers: create an item for each tier with respective features.`
    },
    team: {
        structure: `{
  "heading": string (required),
  "items": [
    {
      "name": string (required),
      "role": string (required),
      "bio": string (optional, empty string if not provided),
      "socials": string (optional, empty string if not provided)
    }
  ]
}`,
        guidance: `TEAM — Introduce the people behind the work.
- Format into: name, role, bio, socials.
- bio and socials: use empty string if not provided, never omit.
- Example: "Sarah leads design and John handles development" →
  [{name: "Sarah", role: "Design Lead", bio: "", socials: ""}, {name: "John", role: "Developer", bio: "", socials: ""}]
- Note: no image support yet in team members.`
    },
    menu: {
        structure: `{
  "heading": string (required),
  "categories": [
    {
      "name": string (required, e.g. "Beverages"),
      "items": [
        {
          "name": string (required),
          "description": string (optional, empty string if not provided),
          "price": string (optional, empty string if not provided)
        }
      ]
    }
  ]
}`,
        guidance: `MENU — For restaurants, cafes, food businesses.
- Organize items into logical categories.
- Only fill in data actually provided — don't invent descriptions or prices.
- Examples:
  * "Lattes for $5, cappuccinos $4.50, croissants $3" →
    Beverages: [{name: "Latte", price: "$5"}], Pastries: [{name: "Croissant", price: "$3"}]
  * "Margherita pizza $12 - classic tomato and mozzarella" →
    Pizzas: [{name: "Margherita", price: "$12", description: "Classic tomato and mozzarella"}]`
    },
    achievements: {
        structure: `{
  "heading": string (required),
  "items": [
    {
      "title": string (required),
      "description": string (required)
    }
  ]
}`,
        guidance: `ACHIEVEMENTS — Highlight accomplishments and milestones.
- Format into: title, description (only these two fields).
- Incorporate dates, award details, or other info intelligently into title or description.
- Examples:
  * "I won best startup award in 2023" → title: "Best Startup Award 2023", description: "Recognized as the best startup."
  * "Reached 10k users last year" → title: "10,000 Users Milestone", description: "Successfully grew user base to 10,000 active users"`
    },
    education: {
        structure: `{
  "heading": string (required),
  "items": [
    {
      "title": string (required),
      "description": string (required)
    }
  ]
}`,
        guidance: `EDUCATION — Academic background and credentials.
- Format into: title, description (only these two fields).
- Can be degrees, certificates, online courses, bootcamps — format all intelligently.
- Examples:
  * "I studied Computer Science at MIT from 2015-2019" → title: "B.S. in Computer Science - MIT", description: "2015-2019"
  * "Got AWS certification last year" → title: "AWS Certified Solutions Architect", description: "Professional certification obtained in 2025"
  * "Master's degree in Design from Stanford, graduated with honors" → title: "Master of Design - Stanford University", description: "Graduated with honors"`
    }
};
// Available themes and color schemes
const AVAILABLE_THEMES = ['minimal', 'techie', 'elegant'];
const AVAILABLE_COLOR_SCHEMES = {
    'warm': ['#2D1810', '#8D6E63', '#D7CCC8', '#FFFCF9'],
    'forest': ['#052010', '#1B4D3E', '#5D8C7B', '#F4FBF7'],
    'ocean': ['#0B1120', '#1E3A8A', '#93C5FD', '#F8FAFC'],
    'luxury': ['#1E1B2E', '#5B21B6', '#DDD6FE', '#FAF9FE'],
    'berry': ['#2A0A18', '#BE185D', '#FBCFE8', '#FFF5F7'],
    'terra': ['#2C1810', '#9A3412', '#FED7AA', '#FFF7ED'],
    'teal': ['#042F2E', '#0D9488', '#99F6E4', '#F0FDFA'],
    'slate': ['#0F172A', '#475569', '#CBD5E1', '#F8FAFC'],
    'monochrome': ['#000000', '#404040', '#A3A3A3', '#FAFAFA']
};
// ============================================
// HELPERS
// ============================================
function textResult(text) {
    return { content: [{ type: 'text', text }] };
}
function errorResult(message) {
    return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
}
function formatPortfolioSummary(p) {
    const sections = Array.isArray(p.sections) ? p.sections : [];
    const filledSections = sections.filter(s => s.content && Object.keys(s.content).length > 0);
    return [
        `**${p.name || 'Untitled'}**`,
        `- Status: ${p.status}`,
        `- Slug: ${p.slug || 'not published'}`,
        `- Type: ${p.portfolio_type}`,
        `- Profession: ${p.profession || 'not set'}`,
        `- Theme: ${p.theme}`,
        `- Sections: ${filledSections.length}/${sections.length} filled`,
        `- AI Manager: ${p.has_ai_manager ? (p.ai_manager_name || 'enabled') : 'none'}`,
        `- Created: ${p.created_at.toISOString().split('T')[0]}`
    ].join('\n');
}
function formatPortfolioDetail(p) {
    const sections = Array.isArray(p.sections) ? p.sections : [];
    const sectionsList = sections.map((s, i) => {
        const hasContent = s.content && Object.keys(s.content).length > 0;
        return `  ${i + 1}. **${s.title || s.type}** (${s.type}) — ${hasContent ? 'has content' : 'empty'}`;
    }).join('\n');
    const lines = [
        `# ${p.name || 'Untitled Portfolio'}`,
        ``,
        `- **Status**: ${p.status}`,
        `- **Slug**: ${p.slug || 'not published'}`,
        `- **Type**: ${p.portfolio_type}`,
        `- **Profession**: ${p.profession || 'not set'}`,
        `- **Description**: ${p.description || 'not set'}`,
        `- **Theme**: ${p.theme}`,
        `- **Color Scheme**: ${p.color_scheme ? JSON.stringify(p.color_scheme) : 'default'}`,
        ``,
        `## Sections (${sections.length})`,
        sectionsList || '  _(no sections)_',
        ``
    ];
    if (p.has_ai_manager) {
        lines.push(`## AI Manager`, `- **Name**: ${p.ai_manager_name || 'not named'}`, `- **Personality**: ${p.ai_manager_personality || 'not set'}`, `- **Finalized**: ${p.ai_manager_finalized ? 'yes' : 'no'}`, `- **Has Portfolio Access**: ${p.ai_manager_has_portfolio_access ? 'yes' : 'no'}`, `- **Custom Instructions**: ${p.ai_manager_custom_instructions ? 'set' : 'none'}`, ``);
    }
    // Include section content details
    const filledSections = sections.filter(s => s.content && Object.keys(s.content).length > 0);
    if (filledSections.length > 0) {
        lines.push(`## Section Contents`);
        for (const s of filledSections) {
            lines.push(`### ${s.title || s.type} (\`${s.type}\`)`);
            lines.push('```json');
            lines.push(JSON.stringify(s.content, null, 2));
            lines.push('```');
            lines.push('');
        }
    }
    return lines.join('\n');
}
// ============================================
// USER RESOLUTION FROM API KEY
// ============================================
async function resolveUserFromApiKey(apiKey) {
    const user = await apiKey_service_1.default.validateApiKey(apiKey);
    if (!user)
        return null;
    return { userId: user.id, email: user.email, username: user.username };
}
// ============================================
// MCP SERVER FACTORY
// ============================================
function createMcpServer() {
    const server = new mcp_js_1.McpServer({
        name: 'portfolio-mcp',
        version: '1.0.0'
    });
    // ------------------------------------------
    // TOOL: get_portfolios
    // ------------------------------------------
    server.tool('get_portfolios', `List all portfolios owned by the authenticated user. Returns portfolio names, statuses (draft/published), slugs, section counts, and AI manager status. Use this to discover which portfolios exist before performing operations on them.

IMPORTANT: Do NOT show portfolio IDs or any internal identifiers to the user. Use them internally only. Refer to portfolios by their name when talking to the user.`, {}, async (_args, extra) => {
        try {
            const userId = extra._userId;
            if (!userId)
                return errorResult('Authentication required');
            const portfolios = await portfolio_service_new_1.default.getByUserId(userId);
            if (portfolios.length === 0) {
                return textResult('No portfolios found. Use `create_portfolio` to create one.');
            }
            const summaries = portfolios.map(formatPortfolioSummary).join('\n\n---\n\n');
            return textResult(`# Your Portfolios (${portfolios.length})\n\n${summaries}`);
        }
        catch (error) {
            return errorResult(error.message);
        }
    });
    // ------------------------------------------
    // TOOL: get_portfolio
    // ------------------------------------------
    server.tool('get_portfolio', `Get full details of a portfolio by its ID. Returns all sections with their content, theme, color scheme, AI manager configuration, and metadata. Use this after get_portfolios to inspect a specific portfolio's content before making edits.

IMPORTANT: Do NOT expose any IDs (portfolio ID, section IDs) or raw JSON to the user. Use all identifiers internally only.`, { portfolio_id: zod_1.z.string().uuid().describe('The portfolio UUID to retrieve') }, async ({ portfolio_id }, extra) => {
        try {
            const userId = extra._userId;
            if (!userId)
                return errorResult('Authentication required');
            const portfolio = await portfolio_service_new_1.default.getById(portfolio_id, userId);
            if (!portfolio)
                return errorResult('Portfolio not found or access denied');
            return textResult(formatPortfolioDetail(portfolio));
        }
        catch (error) {
            return errorResult(error.message);
        }
    });
    // ------------------------------------------
    // TOOL: get_portfolio_by_slug
    // ------------------------------------------
    server.tool('get_portfolio_by_slug', `Get a published portfolio by its public slug. Does not require authentication. Returns full portfolio details including all section content. Use this to inspect any published portfolio. The slug is the URL path segment, e.g. for ${PORTFOLIO_BASE_URL}/john-doe the slug is "john-doe".

IMPORTANT: Do NOT expose any IDs or raw JSON to the user. Use all identifiers internally only.`, { slug: zod_1.z.string().min(1).describe('The portfolio slug (URL path)') }, async ({ slug }) => {
        try {
            const portfolio = await portfolio_service_new_1.default.getBySlug(slug);
            if (!portfolio)
                return errorResult('No published portfolio found with that slug');
            return textResult(formatPortfolioDetail(portfolio));
        }
        catch (error) {
            return errorResult(error.message);
        }
    });
    // ------------------------------------------
    // TOOL: create_portfolio
    // ------------------------------------------
    server.tool('create_portfolio', `Create a new draft portfolio. The portfolio starts as a draft with no sections.

FULL PORTFOLIO CREATION FLOW (follow this order strictly):
1. Create portfolio (this tool)
2. Update portfolio info — call update_portfolio_info with profession and description
3. Recommend sections — call recommend_sections
4. Build ALL sections one by one — for each, draft content, present for approval, add with add_section
5. AI Manager setup — after ALL sections are done, ask user if they want an AI manager. If yes, ask for name, personality, and any custom instructions, then call update_ai_manager. If they want intent capture/escalation features, call update_ai_capabilities too.
6. Theme & color scheme — ask the user's preference or suggest one, then call update_theme.
7. Publish — check slug availability with check_slug, then call publish_portfolio.

CRITICAL RULES:
- Do NOT show the portfolio ID to the user. Just confirm by name.
- Do NOT ask the user what to do next or list next steps. Just proceed automatically through the flow above.
- Do NOT tell the user to "add sections" or "update theme" themselves — you handle everything.`, {
        name: zod_1.z.string().min(1).max(255).describe('Portfolio display name, e.g. "John Doe Portfolio"'),
        portfolio_type: zod_1.z.enum(['individual', 'company']).describe('"individual" for personal portfolios, "company" for business websites')
    }, async ({ name, portfolio_type }, extra) => {
        try {
            const userId = extra._userId;
            if (!userId)
                return errorResult('Authentication required');
            const portfolio = await portfolio_service_new_1.default.createDraft(userId, { portfolio_type, name });
            return textResult(`Portfolio created!\n\n${formatPortfolioSummary(portfolio)}`);
        }
        catch (error) {
            return errorResult(error.message);
        }
    });
    // ------------------------------------------
    // TOOL: update_portfolio_info
    // ------------------------------------------
    server.tool('update_portfolio_info', `Update a portfolio's basic information: name, profession, and/or description. Does not affect sections or theme. Only updates the fields you provide.

After updating, do NOT ask the user what to do next. Proceed automatically to the next step (e.g. recommend_sections if building a new portfolio).`, {
        portfolio_id: zod_1.z.string().uuid().describe('Portfolio ID to update'),
        name: zod_1.z.string().min(1).max(255).optional().describe('New display name'),
        profession: zod_1.z.string().max(255).optional().describe('Profession or industry, e.g. "Web Developer"'),
        description: zod_1.z.string().optional().describe('Brief description of the portfolio owner or business')
    }, async ({ portfolio_id, name, profession, description }, extra) => {
        try {
            const userId = extra._userId;
            if (!userId)
                return errorResult('Authentication required');
            const portfolio = await portfolio_service_new_1.default.getById(portfolio_id, userId);
            if (!portfolio)
                return errorResult('Portfolio not found or access denied');
            const updates = {};
            if (name !== undefined)
                updates.name = name;
            if (profession !== undefined)
                updates.profession = profession;
            if (description !== undefined)
                updates.description = description;
            if (Object.keys(updates).length === 0) {
                return errorResult('No fields provided to update');
            }
            // Build UPDATE query
            const setClauses = [];
            const values = [];
            let idx = 1;
            for (const [key, value] of Object.entries(updates)) {
                setClauses.push(`${key} = $${idx++}`);
                values.push(value);
            }
            setClauses.push(`updated_at = NOW()`);
            values.push(portfolio_id);
            values.push(userId);
            await database_1.default.query(`UPDATE portfolios SET ${setClauses.join(', ')} WHERE id = $${idx++} AND user_id = $${idx}`, values);
            // Also update wizard_data for consistency
            const wizardUpdates = {};
            if (name !== undefined)
                wizardUpdates.name = name;
            if (profession !== undefined)
                wizardUpdates.profession = profession;
            if (description !== undefined)
                wizardUpdates.description = description;
            if (Object.keys(wizardUpdates).length > 0) {
                await database_1.default.query(`UPDATE portfolios SET wizard_data = wizard_data || $1::jsonb WHERE id = $2`, [JSON.stringify(wizardUpdates), portfolio_id]);
            }
            const updated = await portfolio_service_new_1.default.getById(portfolio_id, userId);
            return textResult(`Portfolio info updated!\n\n${formatPortfolioSummary(updated)}`);
        }
        catch (error) {
            return errorResult(error.message);
        }
    });
    // ------------------------------------------
    // TOOL: delete_portfolio
    // ------------------------------------------
    server.tool('delete_portfolio', `Delete a portfolio. Only draft portfolios can be deleted. Published portfolios must be unpublished first. This action is irreversible.

IMPORTANT: Do NOT show the portfolio ID to the user. Refer to the portfolio by name.`, { portfolio_id: zod_1.z.string().uuid().describe('Portfolio ID to delete') }, async ({ portfolio_id }, extra) => {
        try {
            const userId = extra._userId;
            if (!userId)
                return errorResult('Authentication required');
            await portfolio_service_new_1.default.delete(portfolio_id, userId);
            return textResult(`Portfolio deleted successfully.`);
        }
        catch (error) {
            return errorResult(error.message);
        }
    });
    // ------------------------------------------
    // TOOL: add_section
    // ------------------------------------------
    server.tool('add_section', `Add a new section to a portfolio. Call get_section_schemas first to get the JSON structure and content guidance — use it internally, NEVER show it to the user.

Available section types: hero, about, services, skills, experience, projects, testimonials, contact, faq, pricing, team, menu, achievements, education.

CRITICAL RULES FOR CONVERSATION FLOW:
1. NEVER tell the user the section ID, section type code, or any internal identifier. Just say the section name (e.g. "Hero", "About", "Services").
2. NEVER show JSON structures, schemas, or raw data to the user.
3. After adding a section, IMMEDIATELY move to the next recommended section. Draft the content yourself (based on what you know about the user), present it for approval, then add it. Do NOT ask "which section do you want next?" or "what would you like to do?". Just say something like "Great! Now let's work on your Services section..." and present the draft.
4. Only ask the user for information you genuinely need and cannot infer from context.
5. After ALL sections are done, move to the AI Manager step: ask the user if they'd like an AI manager for their portfolio, and if yes, ask for the name, personality, and any custom instructions. Then proceed to theme selection, and finally publishing.`, {
        portfolio_id: zod_1.z.string().uuid().describe('Portfolio ID'),
        section_type: zod_1.z.string().describe('Section type (e.g. "hero", "about", "services")'),
        title: zod_1.z.string().optional().describe('Display title for the section. Defaults to the section type label.'),
        content: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).describe('Section content matching the schema. Follow the guidance from get_section_schemas for high-quality content.')
    }, async ({ portfolio_id, section_type, title, content }, extra) => {
        try {
            const userId = extra._userId;
            if (!userId)
                return errorResult('Authentication required');
            if (!(section_type in ai_service_1.SECTION_LABELS)) {
                return errorResult(`Invalid section type "${section_type}". Valid types: ${Object.keys(ai_service_1.SECTION_LABELS).join(', ')}`);
            }
            const portfolio = await portfolio_service_new_1.default.getById(portfolio_id, userId);
            if (!portfolio)
                return errorResult('Portfolio not found or access denied');
            const sections = Array.isArray(portfolio.sections) ? [...portfolio.sections] : [];
            // Generate unique ID
            const newId = `${section_type}-${Date.now()}`;
            const sectionTitle = title || ai_service_1.SECTION_LABELS[section_type];
            // Find insert position (before contact if it exists)
            const contactIndex = sections.findIndex(s => s.type === 'contact');
            const newSection = {
                id: newId,
                type: section_type,
                title: sectionTitle,
                content,
                order: contactIndex !== -1 ? contactIndex : sections.length
            };
            if (contactIndex !== -1) {
                sections.splice(contactIndex, 0, newSection);
                // Re-order contact
                sections[contactIndex + 1].order = contactIndex + 1;
            }
            else {
                sections.push(newSection);
            }
            // Re-index all orders
            sections.forEach((s, i) => s.order = i);
            await portfolio_service_new_1.default.updateSections(portfolio_id, userId, sections);
            return textResult(`Section **${sectionTitle}** added successfully! Portfolio now has ${sections.length} section(s).\n\n_INTERNAL: section_id=${newId}. Do NOT share this ID with the user. Proceed to the next section immediately._`);
        }
        catch (error) {
            return errorResult(error.message);
        }
    });
    // ------------------------------------------
    // TOOL: update_section
    // ------------------------------------------
    server.tool('update_section', `Update the content of an existing section. You must provide the complete updated content object (not a partial update). The content must match the section type's schema AND follow the content creation guidance. Call get_section_schemas to see both the required JSON structure and writing guidelines, then use get_portfolio to see current section IDs and content before updating.

IMPORTANT: Do NOT show portfolio IDs, section IDs, schemas, or JSON to the user. Use all identifiers internally only. Refer to sections by their display name.`, {
        portfolio_id: zod_1.z.string().uuid().describe('Portfolio ID'),
        section_id: zod_1.z.string().describe('Section ID to update (from get_portfolio output)'),
        content: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).describe('Complete updated section content matching the schema. Follow guidance from get_section_schemas.'),
        title: zod_1.z.string().optional().describe('Optional: update the section display title')
    }, async ({ portfolio_id, section_id, content, title }, extra) => {
        try {
            const userId = extra._userId;
            if (!userId)
                return errorResult('Authentication required');
            const portfolio = await portfolio_service_new_1.default.getById(portfolio_id, userId);
            if (!portfolio)
                return errorResult('Portfolio not found or access denied');
            const sections = Array.isArray(portfolio.sections) ? [...portfolio.sections] : [];
            const sectionIndex = sections.findIndex(s => s.id === section_id);
            if (sectionIndex === -1) {
                const available = sections.map(s => `\`${s.id}\` (${s.type})`).join(', ');
                return errorResult(`Section "${section_id}" not found. Available sections: ${available}`);
            }
            sections[sectionIndex] = {
                ...sections[sectionIndex],
                content,
                ...(title ? { title } : {})
            };
            await portfolio_service_new_1.default.updateSections(portfolio_id, userId, sections);
            return textResult(`Section **${sections[sectionIndex].title || sections[sectionIndex].type}** updated successfully.`);
        }
        catch (error) {
            return errorResult(error.message);
        }
    });
    // ------------------------------------------
    // TOOL: remove_section
    // ------------------------------------------
    server.tool('remove_section', `Remove a section from a portfolio by its section ID. The hero and contact sections typically should not be removed as they are mandatory. Use get_portfolio to see section IDs.

IMPORTANT: Do NOT show portfolio IDs or section IDs to the user. Refer to sections by their display name.`, {
        portfolio_id: zod_1.z.string().uuid().describe('Portfolio ID'),
        section_id: zod_1.z.string().describe('Section ID to remove')
    }, async ({ portfolio_id, section_id }, extra) => {
        try {
            const userId = extra._userId;
            if (!userId)
                return errorResult('Authentication required');
            const portfolio = await portfolio_service_new_1.default.getById(portfolio_id, userId);
            if (!portfolio)
                return errorResult('Portfolio not found or access denied');
            const sections = Array.isArray(portfolio.sections) ? [...portfolio.sections] : [];
            const sectionIndex = sections.findIndex(s => s.id === section_id);
            if (sectionIndex === -1) {
                return errorResult(`Section "${section_id}" not found`);
            }
            const removed = sections.splice(sectionIndex, 1)[0];
            sections.forEach((s, i) => s.order = i);
            await portfolio_service_new_1.default.updateSections(portfolio_id, userId, sections);
            return textResult(`Section **${removed.title || removed.type}** removed. Portfolio now has ${sections.length} sections.`);
        }
        catch (error) {
            return errorResult(error.message);
        }
    });
    // ------------------------------------------
    // TOOL: get_section_schemas
    // ------------------------------------------
    server.tool('get_section_schemas', `Get the JSON content schemas AND content creation guidance for section types. ALWAYS call this before creating or updating sections.

CRITICAL: This is STRICTLY for your internal use. ABSOLUTELY NEVER show schemas, JSON structures, field names, or guidance text to the user. The user should never know these exist. Use them silently to construct proper section content.`, {
        section_type: zod_1.z.string().optional().describe('Optional: get schema for a specific section type only')
    }, async ({ section_type }) => {
        try {
            if (section_type) {
                if (!(section_type in SECTION_SCHEMAS)) {
                    return errorResult(`Unknown section type "${section_type}". Valid: ${Object.keys(SECTION_SCHEMAS).join(', ')}`);
                }
                const schema = SECTION_SCHEMAS[section_type];
                return textResult(`## Schema for \`${section_type}\`\n\n### JSON Structure\n\`\`\`\n${schema.structure}\n\`\`\`\n\n### Content Guidance\n${schema.guidance}`);
            }
            const schemas = Object.entries(SECTION_SCHEMAS).map(([type, schema]) => `### \`${type}\`\n\n**JSON Structure:**\n\`\`\`\n${schema.structure}\n\`\`\`\n\n**Content Guidance:**\n${schema.guidance}`).join('\n\n---\n\n');
            return textResult(`# Section Schemas & Content Guidance\n\nUse these structures AND follow the guidance when providing content to \`add_section\` or \`update_section\`.\n\n---\n\n${schemas}`);
        }
        catch (error) {
            return errorResult(error.message);
        }
    });
    // ------------------------------------------
    // TOOL: recommend_sections
    // ------------------------------------------
    server.tool('recommend_sections', `Use AI to recommend the best sections for a portfolio based on the profession and description.

CRITICAL RULES AFTER RECEIVING RECOMMENDATIONS:
1. Do NOT list the recommended sections to the user or ask them to choose. Just start building.
2. For EACH section, silently call get_section_schemas, draft high-quality content based on what you know about the user, present the draft for approval, then call add_section.
3. After each section is added, IMMEDIATELY move to the next one. Say something like "Perfect! Now let's set up your About section..." and present the next draft.
4. NEVER ask "which section do you want next?" or "what would you like to do?" — just keep going.
5. Do NOT show section type codes (like "hero", "about") — use friendly names ("Hero", "About", "Services").
6. After ALL sections are built, proceed to the AI Manager step: ask the user if they want an AI manager, collect name/personality/instructions if yes, then move to theme selection, then publishing.`, {
        portfolio_type: zod_1.z.enum(['individual', 'company']).describe('Portfolio type'),
        profession: zod_1.z.string().describe('Profession or industry, e.g. "Web Developer", "Photography Studio"'),
        description: zod_1.z.string().describe('Brief description of the person or business')
    }, async ({ portfolio_type, profession, description }, extra) => {
        try {
            const userId = extra._userId;
            if (!userId)
                return errorResult('Authentication required');
            // Get user plan for section limits
            const credits = await credits_service_1.CreditsService.getUserCredits(userId);
            const result = await ai_service_1.AIService.recommendSections(portfolio_type, profession, description, credits.plan);
            const sectionList = result.sections.map((s, i) => `${i + 1}. ${ai_service_1.SECTION_LABELS[s] || s} [type:${s}]`).join('\n');
            return textResult(`# Recommended Sections (INTERNAL — do NOT show this list to the user)\n\n${sectionList}\n\n## Reasoning\n${result.reasoning}\n\n---\n**INSTRUCTION**: Start building sections NOW. Begin with section 1. For each: silently get the schema, draft content, present it to user, add on approval, then move to the next. Do NOT list these to the user or ask which one they want.`);
        }
        catch (error) {
            return errorResult(error.message);
        }
    });
    // ------------------------------------------
    // TOOL: publish_portfolio
    // ------------------------------------------
    server.tool('publish_portfolio', `Publish a draft portfolio with a slug, making it live at ${PORTFOLIO_BASE_URL}/{slug}. This deducts credits from the user's balance. Use check_slug first to verify the slug is available. The portfolio must have at least hero and contact sections.

IMPORTANT: Do NOT show the portfolio ID to the user. Just share the live URL after publishing.`, {
        portfolio_id: zod_1.z.string().uuid().describe('Portfolio ID to publish'),
        slug: zod_1.z.string().min(1).max(100).describe('URL slug for the published portfolio, e.g. "john-doe"')
    }, async ({ portfolio_id, slug }, extra) => {
        try {
            const userId = extra._userId;
            if (!userId)
                return errorResult('Authentication required');
            const portfolio = await portfolio_service_new_1.default.getById(portfolio_id, userId);
            if (!portfolio)
                return errorResult('Portfolio not found or access denied');
            const hasAi = portfolio.has_ai_manager && portfolio.ai_manager_finalized;
            const published = await portfolio_service_new_1.default.publish(portfolio_id, userId, slug, !!hasAi);
            return textResult(`Portfolio published! 🎉\n\n` +
                `- **URL**: ${PORTFOLIO_BASE_URL}/${slug}\n` +
                `- **Status**: published\n` +
                `- **Preview**: ${PORTFOLIO_BASE_URL}/${slug}`);
        }
        catch (error) {
            return errorResult(error.message);
        }
    });
    // ------------------------------------------
    // TOOL: check_slug
    // ------------------------------------------
    server.tool('check_slug', `Check if a URL slug is available for publishing. Returns whether the slug is taken or available. Always check before publishing.`, {
        slug: zod_1.z.string().min(1).max(100).describe('Slug to check availability for'),
        exclude_portfolio_id: zod_1.z.string().uuid().optional().describe('Optional: exclude this portfolio ID from the check (for re-publishing)')
    }, async ({ slug, exclude_portfolio_id }) => {
        try {
            const available = await portfolio_service_new_1.default.isSlugAvailable(slug, exclude_portfolio_id);
            return textResult(available
                ? `✅ Slug \`${slug}\` is **available**!`
                : `❌ Slug \`${slug}\` is **taken**. Try a different one.`);
        }
        catch (error) {
            return errorResult(error.message);
        }
    });
    // ------------------------------------------
    // TOOL: get_ai_manager
    // ------------------------------------------
    server.tool('get_ai_manager', `Get the AI manager configuration for a portfolio. Returns the manager's name, personality, custom instructions, finalized status, and portfolio access settings.

IMPORTANT: Do NOT show portfolio IDs or internal configuration details to the user. Present AI manager info in a friendly, readable way.`, { portfolio_id: zod_1.z.string().uuid().describe('Portfolio ID') }, async ({ portfolio_id }, extra) => {
        try {
            const userId = extra._userId;
            if (!userId)
                return errorResult('Authentication required');
            const portfolio = await portfolio_service_new_1.default.getById(portfolio_id, userId);
            if (!portfolio)
                return errorResult('Portfolio not found or access denied');
            if (!portfolio.has_ai_manager) {
                return textResult('This portfolio does not have an AI manager configured.');
            }
            return textResult([
                `# AI Manager: ${portfolio.ai_manager_name || 'Unnamed'}`,
                ``,
                `- **Name**: ${portfolio.ai_manager_name || 'not set'}`,
                `- **Personality**: ${portfolio.ai_manager_personality || 'not set'}`,
                `- **Finalized**: ${portfolio.ai_manager_finalized ? 'yes' : 'no'}`,
                `- **Has Portfolio Access**: ${portfolio.ai_manager_has_portfolio_access ? 'yes' : 'no'}`,
                ``,
                `## Custom Instructions`,
                portfolio.ai_manager_custom_instructions || '_(no custom instructions set)_'
            ].join('\n'));
        }
        catch (error) {
            return errorResult(error.message);
        }
    });
    // ------------------------------------------
    // TOOL: update_ai_manager
    // ------------------------------------------
    server.tool('update_ai_manager', `Update the AI manager settings for a portfolio. You can update the name, personality, custom instructions, portfolio access, and finalized status. Only updates the fields you provide.

IMPORTANT: Do NOT show portfolio IDs to the user. After updating, proceed to the next step in the flow (theme selection if during portfolio creation). If user wants structured lead/callback/support capture, call update_ai_capabilities.`, {
        portfolio_id: zod_1.z.string().uuid().describe('Portfolio ID'),
        name: zod_1.z.string().max(120).optional().describe('AI manager display name'),
        personality: zod_1.z.string().max(60).optional().describe('Personality type, e.g. "professional", "friendly", "casual"'),
        custom_instructions: zod_1.z.string().optional().describe('Custom behavior instructions for the AI manager'),
        has_portfolio_access: zod_1.z.boolean().optional().describe('Whether the AI manager can read portfolio content'),
        finalized: zod_1.z.boolean().optional().describe('Whether the AI manager setup is complete'),
        capabilities: zod_1.z.array(zod_1.z.object({
            capability_key: zod_1.z.enum(ai_capabilities_1.AI_CAPABILITY_KEYS),
            enabled: zod_1.z.boolean(),
            settings: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
            settings_json: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
        })).optional().describe('Optional capability updates to apply in the same call')
    }, async ({ portfolio_id, name, personality, custom_instructions, has_portfolio_access, finalized, capabilities }, extra) => {
        try {
            const userId = extra._userId;
            if (!userId)
                return errorResult('Authentication required');
            const portfolio = await portfolio_service_new_1.default.getById(portfolio_id, userId);
            if (!portfolio)
                return errorResult('Portfolio not found or access denied');
            const setClauses = [];
            const values = [];
            let idx = 1;
            // Enable AI manager if not already
            if (!portfolio.has_ai_manager) {
                setClauses.push(`has_ai_manager = true`);
            }
            if (name !== undefined) {
                setClauses.push(`ai_manager_name = $${idx++}`);
                values.push(name);
            }
            if (personality !== undefined) {
                setClauses.push(`ai_manager_personality = $${idx++}`);
                values.push(personality);
            }
            if (custom_instructions !== undefined) {
                setClauses.push(`ai_manager_custom_instructions = $${idx++}`);
                values.push(custom_instructions);
            }
            if (has_portfolio_access !== undefined) {
                setClauses.push(`ai_manager_has_portfolio_access = $${idx++}`);
                values.push(has_portfolio_access);
            }
            if (finalized !== undefined) {
                setClauses.push(`ai_manager_finalized = $${idx++}`);
                values.push(finalized);
            }
            const hasCapabilityUpdates = Array.isArray(capabilities) && capabilities.length > 0;
            if (setClauses.length === 0 && !hasCapabilityUpdates) {
                return errorResult('No fields provided to update');
            }
            if (setClauses.length > 0) {
                setClauses.push(`updated_at = NOW()`);
                values.push(portfolio_id);
                values.push(userId);
                await database_1.default.query(`UPDATE portfolios SET ${setClauses.join(', ')} WHERE id = $${idx++} AND user_id = $${idx}`, values);
            }
            if (hasCapabilityUpdates) {
                const incoming = normalizeCapabilityPayload(capabilities);
                if (!incoming.length)
                    return errorResult('No valid capabilities provided');
                // Merge input with current state so partial updates do not disable unspecified capabilities.
                const current = await ai_capability_service_1.default.getCapabilities(portfolio_id);
                const mergedByKey = new Map(current.map((item) => [
                    item.capability_key,
                    { enabled: item.enabled, settings_json: item.settings_json || {} },
                ]));
                for (const cfg of incoming) {
                    mergedByKey.set(cfg.capability_key, {
                        enabled: cfg.enabled,
                        settings_json: cfg.settings_json || {},
                    });
                }
                const merged = ai_capabilities_1.AI_CAPABILITY_KEYS.map((key) => {
                    var _a, _b, _c;
                    return ({
                        capability_key: key,
                        enabled: (_b = (_a = mergedByKey.get(key)) === null || _a === void 0 ? void 0 : _a.enabled) !== null && _b !== void 0 ? _b : false,
                        settings_json: ((_c = mergedByKey.get(key)) === null || _c === void 0 ? void 0 : _c.settings_json) || {},
                    });
                });
                const saved = await ai_capability_service_1.default.upsertCapabilities(portfolio_id, merged);
                const capabilityMap = saved.reduce((acc, item) => {
                    acc[item.capability_key] = {
                        enabled: item.enabled,
                        settings: item.settings_json || {},
                    };
                    return acc;
                }, {});
                await database_1.default.query(`UPDATE portfolios
                         SET wizard_data = jsonb_set(COALESCE(wizard_data, '{}'::jsonb), '{aiCapabilities}', $1::jsonb, true),
                             updated_at = NOW()
                         WHERE id = $2`, [JSON.stringify(capabilityMap), portfolio_id]);
            }
            const refreshed = await portfolio_service_new_1.default.getById(portfolio_id, userId);
            if ((refreshed === null || refreshed === void 0 ? void 0 : refreshed.status) === 'published' && refreshed.archestra_agent_id && archestra_agent_service_1.default.isA2AEnabled()) {
                archestra_agent_service_1.default.updateAgent(refreshed.archestra_agent_id, refreshed).catch(() => { });
            }
            return textResult(`AI manager settings updated successfully!`);
        }
        catch (error) {
            return errorResult(error.message);
        }
    });
    // ------------------------------------------
    // TOOL: get_ai_capabilities
    // ------------------------------------------
    server.tool('get_ai_capabilities', `Get AI capability configuration for a portfolio. Returns whether each capability is enabled and its settings.

Use this before update_ai_capabilities when the user asks what is currently enabled.`, {
        portfolio_id: zod_1.z.string().uuid().describe('Portfolio ID'),
    }, async ({ portfolio_id }, extra) => {
        try {
            const userId = extra._userId;
            if (!userId)
                return errorResult('Authentication required');
            const portfolio = await portfolio_service_new_1.default.getById(portfolio_id, userId);
            if (!portfolio)
                return errorResult('Portfolio not found or access denied');
            const capabilities = await ai_capability_service_1.default.getCapabilities(portfolio_id);
            const lines = [
                `# AI Capabilities`,
                ``,
                ...capabilities.map((c) => `- **${ai_capabilities_1.AI_CAPABILITY_LABELS[c.capability_key]}**: ${c.enabled ? 'enabled' : 'disabled'}`),
            ];
            return textResult(lines.join('\n'));
        }
        catch (error) {
            return errorResult(error.message);
        }
    });
    // ------------------------------------------
    // TOOL: update_ai_capabilities
    // ------------------------------------------
    server.tool('update_ai_capabilities', `Update AI capabilities for a portfolio. This controls structured intent capture (lead capture, appointments, support escalation, etc.).

This tool applies partial updates safely: capabilities not included remain unchanged.`, {
        portfolio_id: zod_1.z.string().uuid().describe('Portfolio ID'),
        capabilities: zod_1.z.array(zod_1.z.object({
            capability_key: zod_1.z.enum(ai_capabilities_1.AI_CAPABILITY_KEYS),
            enabled: zod_1.z.boolean(),
            settings: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
            settings_json: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
        })).min(1).describe('Capability updates to apply'),
    }, async ({ portfolio_id, capabilities }, extra) => {
        try {
            const userId = extra._userId;
            if (!userId)
                return errorResult('Authentication required');
            const portfolio = await portfolio_service_new_1.default.getById(portfolio_id, userId);
            if (!portfolio)
                return errorResult('Portfolio not found or access denied');
            const incoming = normalizeCapabilityPayload(capabilities);
            if (!incoming.length)
                return errorResult('No valid capabilities provided');
            // Merge input with current state so partial updates do not disable unspecified capabilities.
            const current = await ai_capability_service_1.default.getCapabilities(portfolio_id);
            const mergedByKey = new Map(current.map((item) => [
                item.capability_key,
                { enabled: item.enabled, settings_json: item.settings_json || {} },
            ]));
            for (const cfg of incoming) {
                mergedByKey.set(cfg.capability_key, {
                    enabled: cfg.enabled,
                    settings_json: cfg.settings_json || {},
                });
            }
            const merged = ai_capabilities_1.AI_CAPABILITY_KEYS.map((key) => {
                var _a, _b, _c;
                return ({
                    capability_key: key,
                    enabled: (_b = (_a = mergedByKey.get(key)) === null || _a === void 0 ? void 0 : _a.enabled) !== null && _b !== void 0 ? _b : false,
                    settings_json: ((_c = mergedByKey.get(key)) === null || _c === void 0 ? void 0 : _c.settings_json) || {},
                });
            });
            const saved = await ai_capability_service_1.default.upsertCapabilities(portfolio_id, merged);
            const capabilityMap = saved.reduce((acc, item) => {
                acc[item.capability_key] = {
                    enabled: item.enabled,
                    settings: item.settings_json || {},
                };
                return acc;
            }, {});
            await database_1.default.query(`UPDATE portfolios
                     SET wizard_data = jsonb_set(COALESCE(wizard_data, '{}'::jsonb), '{aiCapabilities}', $1::jsonb, true),
                         updated_at = NOW()
                     WHERE id = $2`, [JSON.stringify(capabilityMap), portfolio_id]);
            // Keep linked Archestra agent in sync when portfolio is already published.
            const refreshed = await portfolio_service_new_1.default.getById(portfolio_id, userId);
            if ((refreshed === null || refreshed === void 0 ? void 0 : refreshed.status) === 'published' && refreshed.archestra_agent_id && archestra_agent_service_1.default.isA2AEnabled()) {
                archestra_agent_service_1.default.updateAgent(refreshed.archestra_agent_id, refreshed).catch(() => { });
            }
            const enabledLabels = saved
                .filter((item) => item.enabled)
                .map((item) => ai_capabilities_1.AI_CAPABILITY_LABELS[item.capability_key]);
            return textResult(enabledLabels.length
                ? `AI capabilities updated. Enabled: ${enabledLabels.join(', ')}`
                : 'AI capabilities updated. No capabilities are currently enabled.');
        }
        catch (error) {
            return errorResult(error.message);
        }
    });
    // ------------------------------------------
    // TOOL: get_credits
    // ------------------------------------------
    server.tool('get_credits', `Get the authenticated user's credit balance, plan type, portfolio count, and limits. Credits are used when publishing portfolios. Free plan: 500 signup credits, 100 per basic portfolio, 250 with AI manager.`, {}, async (_args, extra) => {
        try {
            const userId = extra._userId;
            if (!userId)
                return errorResult('Authentication required');
            const credits = await credits_service_1.CreditsService.getUserCredits(userId);
            return textResult([
                `# Credit Balance`,
                ``,
                `- **Credits**: ${credits.credits}`,
                `- **Plan**: ${credits.plan}`,
                `- **Published Portfolios**: ${credits.portfolioCount}`,
                `- **Can Create More**: ${credits.canCreatePortfolio ? 'yes' : 'no'}`,
                `- **Max Sections Per Portfolio**: ${credits.maxSections}`,
                ``,
                `## Costs`,
                `- Basic portfolio: 100 credits`,
                `- Portfolio with AI manager: 250 credits`
            ].join('\n'));
        }
        catch (error) {
            return errorResult(error.message);
        }
    });
    // ------------------------------------------
    // TOOL: get_themes
    // ------------------------------------------
    server.tool('get_themes', `List all available themes and color schemes for portfolios. Returns theme names and color scheme names with their hex color values. Use update_theme to apply a theme or color scheme to a portfolio.`, {}, async () => {
        const colorList = Object.entries(AVAILABLE_COLOR_SCHEMES)
            .map(([name, colors]) => `- **${name}**: ${colors.join(', ')}`)
            .join('\n');
        return textResult([
            `# Available Themes`,
            ``,
            AVAILABLE_THEMES.map(t => `- **${t}**`).join('\n'),
            ``,
            `# Available Color Schemes`,
            ``,
            colorList,
            ``,
            `_Color values are ordered: darkest → 2nd darkest → 2nd lightest → lightest_`
        ].join('\n'));
    });
    // ------------------------------------------
    // TOOL: update_theme
    // ------------------------------------------
    server.tool('update_theme', `Update a portfolio's visual theme and/or color scheme. Use get_themes to see available options. You can update theme only, color scheme only, or both at once. Changes take effect immediately on the published portfolio.

Available themes: minimal, techie, elegant
Available color schemes: warm, forest, ocean, luxury, berry, terra, teal, slate, monochrome

IMPORTANT: Do NOT show portfolio IDs to the user. After updating, proceed to publishing if during portfolio creation flow.`, {
        portfolio_id: zod_1.z.string().uuid().describe('Portfolio ID to update'),
        theme: zod_1.z.string().optional().describe('Theme name: "minimal", "techie", or "elegant"'),
        color_scheme: zod_1.z.string().optional().describe('Color scheme name: "warm", "forest", "ocean", "luxury", "berry", "terra", "teal", "slate", or "monochrome"')
    }, async ({ portfolio_id, theme, color_scheme }, extra) => {
        try {
            const userId = extra._userId;
            if (!userId)
                return errorResult('Authentication required');
            const portfolio = await portfolio_service_new_1.default.getById(portfolio_id, userId);
            if (!portfolio)
                return errorResult('Portfolio not found or access denied');
            if (!theme && !color_scheme) {
                return errorResult('Provide at least one of: theme, color_scheme');
            }
            if (theme && !AVAILABLE_THEMES.includes(theme.toLowerCase())) {
                return errorResult(`Invalid theme "${theme}". Available: ${AVAILABLE_THEMES.join(', ')}`);
            }
            if (color_scheme && !(color_scheme.toLowerCase() in AVAILABLE_COLOR_SCHEMES)) {
                return errorResult(`Invalid color scheme "${color_scheme}". Available: ${Object.keys(AVAILABLE_COLOR_SCHEMES).join(', ')}`);
            }
            const updates = [];
            const values = [];
            let idx = 1;
            const wizardUpdates = {};
            const changedParts = [];
            if (theme) {
                const t = theme.toLowerCase();
                updates.push(`theme = $${idx++}`);
                values.push(t);
                wizardUpdates.theme = t;
                changedParts.push(`theme → **${t}**`);
            }
            if (color_scheme) {
                const cs = color_scheme.toLowerCase();
                const colors = AVAILABLE_COLOR_SCHEMES[cs];
                const colorSchemeObj = { name: cs, colors };
                updates.push(`color_scheme = $${idx++}::jsonb`);
                values.push(JSON.stringify(colorSchemeObj));
                wizardUpdates.colorScheme = colorSchemeObj;
                changedParts.push(`color scheme → **${cs}** (${colors.join(', ')})`);
            }
            if (Object.keys(wizardUpdates).length > 0) {
                updates.push(`wizard_data = wizard_data || $${idx++}::jsonb`);
                values.push(JSON.stringify(wizardUpdates));
            }
            updates.push(`updated_at = NOW()`);
            values.push(portfolio_id);
            values.push(userId);
            await database_1.default.query(`UPDATE portfolios SET ${updates.join(', ')} WHERE id = $${idx++} AND user_id = $${idx}`, values);
            return textResult(`Portfolio style updated! 🎨\n\n${changedParts.join('\n')}`);
        }
        catch (error) {
            return errorResult(error.message);
        }
    });
    // ==========================================
    // ANALYTICS TOOLS
    // ==========================================
    // ------------------------------------------
    // TOOL: get_analytics_overview
    // ------------------------------------------
    server.tool('get_analytics_overview', `Get a high-level analytics overview across ALL of the user's portfolios. Returns aggregate stats (total views, unique visitors, AI chat sessions, total messages) plus 5-day trend numbers. Use this to give the user a quick snapshot of how their portfolios are performing overall.

Returns:
- total_views, unique_visitors, total_sessions, total_messages (all-time)
- views_5d, sessions_5d (last 5 days — useful for spotting trends)

IMPORTANT: Present the data conversationally. Don't dump raw numbers — highlight trends and notable stats.`, {}, async (_args, extra) => {
        try {
            const userId = extra._userId;
            if (!userId)
                return errorResult('Authentication required');
            const stats = await analytics_service_1.default.getDashboardStats(userId);
            const lines = [
                `# Analytics Overview`,
                ``,
                `| Metric | All-Time | Last 5 Days |`,
                `|--------|----------|-------------|`,
                `| Page Views | ${stats.total_views.toLocaleString()} | ${stats.views_5d.toLocaleString()} |`,
                `| Unique Visitors | ${stats.unique_visitors.toLocaleString()} | — |`,
                `| AI Chat Sessions | ${stats.total_sessions.toLocaleString()} | ${stats.sessions_5d.toLocaleString()} |`,
                `| Total Messages | ${stats.total_messages.toLocaleString()} | — |`,
            ];
            if (stats.total_views === 0 && stats.total_sessions === 0) {
                lines.push(``, `_No visitor data yet. The user should share their portfolio links to start getting traffic._`);
            }
            return textResult(lines.join('\n'));
        }
        catch (error) {
            return errorResult(error.message);
        }
    });
    // ------------------------------------------
    // TOOL: get_portfolio_analytics
    // ------------------------------------------
    server.tool('get_portfolio_analytics', `Get detailed analytics for a specific portfolio. Returns the same stats as get_analytics_overview but filtered to a single portfolio — views, unique visitors, sessions, messages, and 5-day trends.

Use this when the user asks about a specific portfolio's performance (e.g. "how is my John Doe portfolio doing?"). Call get_portfolios first to find the portfolio ID.

IMPORTANT: Do NOT show the portfolio ID to the user. Refer to it by name.`, {
        portfolio_id: zod_1.z.string().uuid().describe('The portfolio UUID to get analytics for'),
    }, async ({ portfolio_id }, extra) => {
        try {
            const userId = extra._userId;
            if (!userId)
                return errorResult('Authentication required');
            // Verify ownership
            const portfolio = await portfolio_service_new_1.default.getById(portfolio_id, userId);
            if (!portfolio)
                return errorResult('Portfolio not found or access denied');
            const stats = await analytics_service_1.default.getDashboardStats(userId, portfolio_id);
            const lines = [
                `# Analytics: ${portfolio.name || 'Untitled'}`,
                portfolio.slug ? `_Published at /${portfolio.slug}_` : `_Not yet published_`,
                ``,
                `| Metric | All-Time | Last 5 Days |`,
                `|--------|----------|-------------|`,
                `| Page Views | ${stats.total_views.toLocaleString()} | ${stats.views_5d.toLocaleString()} |`,
                `| Unique Visitors | ${stats.unique_visitors.toLocaleString()} | — |`,
                `| AI Chat Sessions | ${stats.total_sessions.toLocaleString()} | ${stats.sessions_5d.toLocaleString()} |`,
                `| Total Messages | ${stats.total_messages.toLocaleString()} | — |`,
            ];
            if (portfolio.has_ai_manager) {
                lines.push(``, `AI Manager: **${portfolio.ai_manager_name || 'enabled'}**`);
            }
            else {
                lines.push(``, `_No AI Manager configured. Enabling one can boost visitor engagement._`);
            }
            return textResult(lines.join('\n'));
        }
        catch (error) {
            return errorResult(error.message);
        }
    });
    // ------------------------------------------
    // TOOL: get_top_portfolios
    // ------------------------------------------
    server.tool('get_top_portfolios', `Get a ranked list of the user's published portfolios by performance. Each portfolio includes: views, unique visitors, AI chat sessions, message count, and whether it has an AI manager enabled. Sorted by views descending.

Use this when the user asks "which portfolio is performing best?" or wants to compare portfolios. Also useful for identifying underperforming portfolios that might need attention.

IMPORTANT: Do NOT show portfolio IDs to the user. Refer to portfolios by name and slug.`, {}, async (_args, extra) => {
        try {
            const userId = extra._userId;
            if (!userId)
                return errorResult('Authentication required');
            const portfolios = await analytics_service_1.default.getTopPortfolios(userId);
            if (portfolios.length === 0) {
                return textResult('No published portfolios found. Portfolios need to be published before analytics are tracked.');
            }
            const lines = [
                `# Portfolio Rankings (by views)`,
                ``,
            ];
            portfolios.forEach((p, idx) => {
                lines.push(`### ${idx + 1}. ${p.name || 'Untitled'} (/${p.slug})`, `- Views: **${p.views}** (${p.unique_visitors} unique)`, `- Sessions: **${p.sessions}** | Messages: **${p.messages}**`, `- AI Manager: ${p.has_ai_manager ? '✅ enabled' : '❌ not enabled'}`, ``);
            });
            return textResult(lines.join('\n'));
        }
        catch (error) {
            return errorResult(error.message);
        }
    });
    // ------------------------------------------
    // TOOL: get_visitor_conversations
    // ------------------------------------------
    server.tool('get_visitor_conversations', `Retrieve recent AI manager chat conversations from visitors. Returns full message history for each session including visitor messages and AI responses, with timestamps and portfolio context.

Optionally filter to a specific portfolio. Returns the most recent conversations first (up to the specified limit).

Use this when the user asks:
- "What are visitors asking about?"
- "Show me recent chats"
- "What questions do people have about my portfolio?"

IMPORTANT: Do NOT expose session IDs or visitor IPs to the user. Summarize conversations naturally and focus on the content.`, {
        portfolio_id: zod_1.z.string().uuid().optional().describe('Optional portfolio UUID to filter conversations. Omit for all portfolios.'),
        limit: zod_1.z.number().int().min(1).max(50).optional().describe('Number of conversations to return (default: 10, max: 50)'),
    }, async ({ portfolio_id, limit: rawLimit }, extra) => {
        try {
            const userId = extra._userId;
            if (!userId)
                return errorResult('Authentication required');
            const limit = rawLimit !== null && rawLimit !== void 0 ? rawLimit : 10;
            // Verify ownership if filtering by portfolio
            if (portfolio_id) {
                const portfolio = await portfolio_service_new_1.default.getById(portfolio_id, userId);
                if (!portfolio)
                    return errorResult('Portfolio not found or access denied');
            }
            const conversations = await analytics_service_1.default.getRecentConversations(userId, limit, portfolio_id);
            if (conversations.length === 0) {
                return textResult('No conversations found. Visitors haven\'t chatted with your AI managers yet.');
            }
            const lines = [
                `# Recent Conversations (${conversations.length})`,
                ``,
            ];
            conversations.forEach((conv, idx) => {
                const startDate = new Date(conv.started_at).toLocaleString();
                lines.push(`### Conversation ${idx + 1} — ${conv.portfolio_name} (/${conv.portfolio_slug})`, `_${startDate} · ${conv.message_count} messages_`, ``);
                conv.messages.forEach(msg => {
                    const role = msg.role === 'visitor' ? '🧑 Visitor' : '🤖 AI';
                    // Truncate very long messages
                    const content = msg.content.length > 500 ? msg.content.substring(0, 500) + '...' : msg.content;
                    lines.push(`**${role}**: ${content}`);
                });
                lines.push(``, `---`, ``);
            });
            return textResult(lines.join('\n'));
        }
        catch (error) {
            return errorResult(error.message);
        }
    });
    // ------------------------------------------
    // TOOL: get_analytics_insights
    // ------------------------------------------
    server.tool('get_analytics_insights', `Generate AI-powered business intelligence and insights from the user's analytics data. Uses a two-phase AI analysis to produce:

1. **Executive Summary** — Key takeaway with numbers
2. **Sentiment Analysis** — Positive/neutral/negative breakdown of visitor conversations
3. **Interest Areas** — What topics visitors are most interested in, ranked by frequency
4. **Top Questions** — Actual questions visitors asked in AI chats
5. **Conversion Opportunities** — Where visitors showed hiring/buying/collaboration intent, with suggested actions
6. **Recommendations** — Actionable, data-driven next steps

Optionally filter to a specific portfolio for focused insights.

⚠️ This tool calls Gemini AI and may take 5-15 seconds. Only call it when the user explicitly asks for insights, analysis, or recommendations — not for simple stat lookups.

IMPORTANT: Present insights conversationally. Don't dump the raw structure — weave it into a narrative the user can act on.`, {
        portfolio_id: zod_1.z.string().uuid().optional().describe('Optional portfolio UUID to focus insights on. Omit for cross-portfolio analysis.'),
    }, async ({ portfolio_id }, extra) => {
        try {
            const userId = extra._userId;
            if (!userId)
                return errorResult('Authentication required');
            // Verify ownership if filtering
            if (portfolio_id) {
                const portfolio = await portfolio_service_new_1.default.getById(portfolio_id, userId);
                if (!portfolio)
                    return errorResult('Portfolio not found or access denied');
            }
            const insights = await analytics_service_1.default.generateInsights(userId, portfolio_id);
            const lines = [
                `# Analytics Insights`,
                ``,
                `## Executive Summary`,
                insights.executive_summary,
                ``,
            ];
            // Sentiment
            const total = insights.sentiment.positive + insights.sentiment.neutral + insights.sentiment.negative;
            if (total > 0) {
                lines.push(`## Visitor Sentiment`, `- 😊 Positive: **${insights.sentiment.positive}** (${Math.round(insights.sentiment.positive / total * 100)}%)`, `- 😐 Neutral: **${insights.sentiment.neutral}** (${Math.round(insights.sentiment.neutral / total * 100)}%)`, `- 😟 Negative: **${insights.sentiment.negative}** (${Math.round(insights.sentiment.negative / total * 100)}%)`, ``);
            }
            // Interest areas
            if (insights.interest_areas.length > 0) {
                lines.push(`## What Visitors Are Interested In`);
                insights.interest_areas.forEach(area => {
                    lines.push(`- **${area.topic}**: ${area.percentage}% of interest (${area.count} mentions)`);
                });
                lines.push(``);
            }
            // Top questions
            if (insights.top_questions.length > 0) {
                lines.push(`## Top Questions From Visitors`);
                insights.top_questions.forEach((q, i) => {
                    lines.push(`${i + 1}. ${q}`);
                });
                lines.push(``);
            }
            // Conversion opportunities
            if (insights.conversion_opportunities.length > 0) {
                lines.push(`## Conversion Opportunities`);
                insights.conversion_opportunities.forEach(opp => {
                    const emoji = opp.potential === 'high' ? '🔥' : opp.potential === 'medium' ? '⚡' : '💡';
                    lines.push(`${emoji} **${opp.description}** (${opp.potential} potential)`);
                    lines.push(`   → Action: ${opp.action}`);
                });
                lines.push(``);
            }
            // Recommendations
            if (insights.recommendations.length > 0) {
                lines.push(`## Recommended Actions`);
                insights.recommendations.forEach((rec, i) => {
                    lines.push(`${i + 1}. ${rec}`);
                });
                lines.push(``);
            }
            return textResult(lines.join('\n'));
        }
        catch (error) {
            return errorResult(error.message);
        }
    });
    // ------------------------------------------
    // TOOL: get_traffic_trends
    // ------------------------------------------
    server.tool('get_traffic_trends', `Get daily page views and AI chat message counts over a configurable time window. Returns day-by-day numbers that you can use to describe trends like "views are up 40% this week" or "traffic peaked on Tuesday".

Optionally filter to a specific portfolio. Supports 7, 14, or 30 day windows.

Use this when the user asks:
- "How's my traffic trending?"
- "Am I getting more visitors lately?"
- "Show me traffic for the last 2 weeks"

IMPORTANT: Don't list raw daily numbers. Summarize the trend — rising, falling, flat, spikes on certain days, etc.`, {
        days: zod_1.z.number().int().min(1).max(30).optional().describe('Number of days to look back (default: 7, max: 30)'),
        portfolio_id: zod_1.z.string().uuid().optional().describe('Optional portfolio UUID to filter. Omit for all portfolios.'),
    }, async ({ days: rawDays, portfolio_id }, extra) => {
        try {
            const userId = extra._userId;
            if (!userId)
                return errorResult('Authentication required');
            const days = rawDays !== null && rawDays !== void 0 ? rawDays : 7;
            if (portfolio_id) {
                const portfolio = await portfolio_service_new_1.default.getById(portfolio_id, userId);
                if (!portfolio)
                    return errorResult('Portfolio not found or access denied');
            }
            const [viewsPerDay, messagesPerDay] = await Promise.all([
                analytics_service_1.default.getViewsPerDay(userId, days, portfolio_id),
                analytics_service_1.default.getMessagesPerDay(userId, days, portfolio_id),
            ]);
            const totalViews = viewsPerDay.reduce((sum, d) => sum + d.views, 0);
            const totalMessages = messagesPerDay.reduce((sum, d) => sum + d.messages, 0);
            const lines = [
                `# Traffic Trends (last ${days} days)`,
                ``,
                `**Totals**: ${totalViews} views, ${totalMessages} messages`,
                ``,
                `| Date | Views | Messages |`,
                `|------|-------|----------|`,
            ];
            const messagesByDate = {};
            messagesPerDay.forEach(d => { messagesByDate[d.date] = d.messages; });
            viewsPerDay.forEach(d => {
                const msgs = messagesByDate[d.date] || 0;
                lines.push(`| ${d.date} | ${d.views} | ${msgs} |`);
            });
            // Add simple trend description
            if (viewsPerDay.length >= 2) {
                const firstHalf = viewsPerDay.slice(0, Math.floor(viewsPerDay.length / 2));
                const secondHalf = viewsPerDay.slice(Math.floor(viewsPerDay.length / 2));
                const firstAvg = firstHalf.reduce((s, d) => s + d.views, 0) / firstHalf.length;
                const secondAvg = secondHalf.reduce((s, d) => s + d.views, 0) / secondHalf.length;
                let trend = 'flat';
                if (secondAvg > firstAvg * 1.2)
                    trend = 'trending upward 📈';
                else if (secondAvg < firstAvg * 0.8)
                    trend = 'trending downward 📉';
                const peakDay = viewsPerDay.reduce((max, d) => d.views > max.views ? d : max, viewsPerDay[0]);
                lines.push(``, `**Trend**: Views are ${trend}.`);
                if (peakDay.views > 0) {
                    lines.push(`**Peak day**: ${peakDay.date} with ${peakDay.views} views.`);
                }
            }
            return textResult(lines.join('\n'));
        }
        catch (error) {
            return errorResult(error.message);
        }
    });
    // ------------------------------------------
    // TOOL: compare_portfolios
    // ------------------------------------------
    server.tool('compare_portfolios', `Compare two portfolios side-by-side on key metrics: views, unique visitors, AI chat sessions, messages, and whether each has an AI manager. Helps users understand which portfolio is performing better and why.

Use this when the user asks:
- "Compare my two portfolios"
- "Which one is doing better?"
- "How does portfolio X stack up against Y?"

IMPORTANT: Do NOT show portfolio IDs. Refer to portfolios by name. Highlight the winner in each category and provide a brief takeaway.`, {
        portfolio_id_a: zod_1.z.string().uuid().describe('First portfolio UUID to compare'),
        portfolio_id_b: zod_1.z.string().uuid().describe('Second portfolio UUID to compare'),
    }, async ({ portfolio_id_a, portfolio_id_b }, extra) => {
        try {
            const userId = extra._userId;
            if (!userId)
                return errorResult('Authentication required');
            const [portfolioA, portfolioB] = await Promise.all([
                portfolio_service_new_1.default.getById(portfolio_id_a, userId),
                portfolio_service_new_1.default.getById(portfolio_id_b, userId),
            ]);
            if (!portfolioA)
                return errorResult('First portfolio not found or access denied');
            if (!portfolioB)
                return errorResult('Second portfolio not found or access denied');
            const [statsA, statsB] = await Promise.all([
                analytics_service_1.default.getDashboardStats(userId, portfolio_id_a),
                analytics_service_1.default.getDashboardStats(userId, portfolio_id_b),
            ]);
            const nameA = portfolioA.name || 'Portfolio A';
            const nameB = portfolioB.name || 'Portfolio B';
            const winner = (a, b) => {
                if (a > b)
                    return `← **${nameA}**`;
                if (b > a)
                    return `**${nameB}** →`;
                return 'Tied';
            };
            const lines = [
                `# Portfolio Comparison`,
                ``,
                `| Metric | ${nameA} | ${nameB} | Winner |`,
                `|--------|${'-'.repeat(nameA.length + 2)}|${'-'.repeat(nameB.length + 2)}|--------|`,
                `| Total Views | ${statsA.total_views} | ${statsB.total_views} | ${winner(statsA.total_views, statsB.total_views)} |`,
                `| Unique Visitors | ${statsA.unique_visitors} | ${statsB.unique_visitors} | ${winner(statsA.unique_visitors, statsB.unique_visitors)} |`,
                `| Chat Sessions | ${statsA.total_sessions} | ${statsB.total_sessions} | ${winner(statsA.total_sessions, statsB.total_sessions)} |`,
                `| Messages | ${statsA.total_messages} | ${statsB.total_messages} | ${winner(statsA.total_messages, statsB.total_messages)} |`,
                `| Views (5d) | ${statsA.views_5d} | ${statsB.views_5d} | ${winner(statsA.views_5d, statsB.views_5d)} |`,
                `| Sessions (5d) | ${statsA.sessions_5d} | ${statsB.sessions_5d} | ${winner(statsA.sessions_5d, statsB.sessions_5d)} |`,
                ``,
                `**AI Manager**: ${nameA} ${portfolioA.has_ai_manager ? '✅' : '❌'} | ${nameB} ${portfolioB.has_ai_manager ? '✅' : '❌'}`,
            ];
            // Overall verdict
            const scoreA = (statsA.total_views > statsB.total_views ? 1 : 0)
                + (statsA.unique_visitors > statsB.unique_visitors ? 1 : 0)
                + (statsA.total_sessions > statsB.total_sessions ? 1 : 0)
                + (statsA.total_messages > statsB.total_messages ? 1 : 0);
            const scoreB = 4 - scoreA - ((statsA.total_views === statsB.total_views ? 1 : 0)
                + (statsA.unique_visitors === statsB.unique_visitors ? 1 : 0)
                + (statsA.total_sessions === statsB.total_sessions ? 1 : 0)
                + (statsA.total_messages === statsB.total_messages ? 1 : 0));
            if (scoreA > scoreB) {
                lines.push(``, `**Overall**: **${nameA}** leads in ${scoreA} of 4 key metrics.`);
            }
            else if (scoreB > scoreA) {
                lines.push(``, `**Overall**: **${nameB}** leads in ${scoreB} of 4 key metrics.`);
            }
            else {
                lines.push(``, `**Overall**: Both portfolios are performing similarly.`);
            }
            if (!portfolioA.has_ai_manager && statsB.total_sessions > 0) {
                lines.push(`\n💡 _Tip: Enabling an AI manager on "${nameA}" could boost engagement like "${nameB}"._`);
            }
            else if (!portfolioB.has_ai_manager && statsA.total_sessions > 0) {
                lines.push(`\n💡 _Tip: Enabling an AI manager on "${nameB}" could boost engagement like "${nameA}"._`);
            }
            return textResult(lines.join('\n'));
        }
        catch (error) {
            return errorResult(error.message);
        }
    });
    return server;
}
exports.default = createMcpServer;
