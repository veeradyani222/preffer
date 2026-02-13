/**
 * MCP Server for Portfolio App
 * 
 * Exposes portfolio management as granular MCP tools
 * for Archestra integration via Streamable HTTP transport.
 * 
 * Auth: Bearer token = user's api_key from the users table.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import PortfolioService, {
    SectionType,
    Section,
    Portfolio
} from '../services/portfolio.service.new';
import { AIService, SECTION_LABELS } from '../services/ai.service';
import { CreditsService, PLAN_LIMITS, Plan } from '../services/credits.service';
import ApiKeyService from '../services/apiKey.service';
import pool from '../config/database';
import logger from '../utils/logger';

// ============================================
// SECTION SCHEMAS + CONTENT GUIDANCE
// (exposed to Archestra AI for high-quality content construction)
// ============================================

interface SectionSchema {
    structure: string;
    guidance: string;
}

const SECTION_SCHEMAS: Record<string, SectionSchema> = {
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
const AVAILABLE_COLOR_SCHEMES: Record<string, string[]> = {
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

function textResult(text: string) {
    return { content: [{ type: 'text' as const, text }] };
}

function errorResult(message: string) {
    return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true as const };
}

function formatPortfolioSummary(p: Portfolio): string {
    const sections = Array.isArray(p.sections) ? p.sections : [];
    const filledSections = sections.filter(s => s.content && Object.keys(s.content).length > 0);
    return [
        `**${p.name || 'Untitled'}** (ID: \`${p.id}\`)`,
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

function formatPortfolioDetail(p: Portfolio): string {
    const sections = Array.isArray(p.sections) ? p.sections : [];
    const sectionsList = sections.map((s, i) => {
        const hasContent = s.content && Object.keys(s.content).length > 0;
        return `  ${i + 1}. **${s.title || s.type}** (type: \`${s.type}\`, id: \`${s.id}\`) — ${hasContent ? 'has content' : 'empty'}`;
    }).join('\n');

    const lines = [
        `# ${p.name || 'Untitled Portfolio'}`,
        ``,
        `- **ID**: \`${p.id}\``,
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
        lines.push(
            `## AI Manager`,
            `- **Name**: ${p.ai_manager_name || 'not named'}`,
            `- **Personality**: ${p.ai_manager_personality || 'not set'}`,
            `- **Finalized**: ${p.ai_manager_finalized ? 'yes' : 'no'}`,
            `- **Has Portfolio Access**: ${p.ai_manager_has_portfolio_access ? 'yes' : 'no'}`,
            `- **Custom Instructions**: ${p.ai_manager_custom_instructions ? 'set' : 'none'}`,
            ``
        );
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

export async function resolveUserFromApiKey(apiKey: string): Promise<{ userId: string; email: string; username: string } | null> {
    const user = await ApiKeyService.validateApiKey(apiKey);
    if (!user) return null;
    return { userId: user.id, email: user.email, username: user.username };
}

// ============================================
// MCP SERVER FACTORY
// ============================================

export function createMcpServer(): McpServer {
    const server = new McpServer({
        name: 'portfolio-mcp',
        version: '1.0.0'
    });

    // ------------------------------------------
    // TOOL: get_portfolios
    // ------------------------------------------
    server.tool(
        'get_portfolios',
        `List all portfolios owned by the authenticated user. Returns portfolio names, IDs, statuses (draft/published), slugs, section counts, and AI manager status. Use this to discover which portfolios exist before performing operations on them.`,
        {},
        async (_args, extra) => {
            try {
                const userId = (extra as any)._userId;
                if (!userId) return errorResult('Authentication required');

                const portfolios = await PortfolioService.getByUserId(userId);

                if (portfolios.length === 0) {
                    return textResult('No portfolios found. Use `create_portfolio` to create one.');
                }

                const summaries = portfolios.map(formatPortfolioSummary).join('\n\n---\n\n');
                return textResult(`# Your Portfolios (${portfolios.length})\n\n${summaries}`);
            } catch (error: any) {
                return errorResult(error.message);
            }
        }
    );

    // ------------------------------------------
    // TOOL: get_portfolio
    // ------------------------------------------
    server.tool(
        'get_portfolio',
        `Get full details of a portfolio by its ID. Returns all sections with their content, theme, color scheme, AI manager configuration, and metadata. Use this after get_portfolios to inspect a specific portfolio's content before making edits.`,
        { portfolio_id: z.string().uuid().describe('The portfolio UUID to retrieve') },
        async ({ portfolio_id }, extra) => {
            try {
                const userId = (extra as any)._userId;
                if (!userId) return errorResult('Authentication required');

                const portfolio = await PortfolioService.getById(portfolio_id, userId);
                if (!portfolio) return errorResult('Portfolio not found or access denied');

                return textResult(formatPortfolioDetail(portfolio));
            } catch (error: any) {
                return errorResult(error.message);
            }
        }
    );

    // ------------------------------------------
    // TOOL: get_portfolio_by_slug
    // ------------------------------------------
    server.tool(
        'get_portfolio_by_slug',
        `Get a published portfolio by its public slug. Does not require authentication. Returns full portfolio details including all section content. Use this to inspect any published portfolio. The slug is the URL path segment, e.g. for myportfolio.app/john-doe the slug is "john-doe".`,
        { slug: z.string().min(1).describe('The portfolio slug (URL path)') },
        async ({ slug }) => {
            try {
                const portfolio = await PortfolioService.getBySlug(slug);
                if (!portfolio) return errorResult('No published portfolio found with that slug');

                return textResult(formatPortfolioDetail(portfolio));
            } catch (error: any) {
                return errorResult(error.message);
            }
        }
    );

    // ------------------------------------------
    // TOOL: create_portfolio
    // ------------------------------------------
    server.tool(
        'create_portfolio',
        `Create a new draft portfolio. Returns the new portfolio ID. The portfolio starts as a draft with no sections. After creating, use add_section to add sections and publish_portfolio to make it live. Costs credits on publish only.`,
        {
            name: z.string().min(1).max(255).describe('Portfolio display name, e.g. "John Doe Portfolio"'),
            portfolio_type: z.enum(['individual', 'company']).describe('"individual" for personal portfolios, "company" for business websites')
        },
        async ({ name, portfolio_type }, extra) => {
            try {
                const userId = (extra as any)._userId;
                if (!userId) return errorResult('Authentication required');

                const portfolio = await PortfolioService.createDraft(userId, { portfolio_type, name });
                return textResult(`Portfolio created!\n\n${formatPortfolioSummary(portfolio)}`);
            } catch (error: any) {
                return errorResult(error.message);
            }
        }
    );

    // ------------------------------------------
    // TOOL: update_portfolio_info
    // ------------------------------------------
    server.tool(
        'update_portfolio_info',
        `Update a portfolio's basic information: name, profession, and/or description. Does not affect sections or theme. Only updates the fields you provide.`,
        {
            portfolio_id: z.string().uuid().describe('Portfolio ID to update'),
            name: z.string().min(1).max(255).optional().describe('New display name'),
            profession: z.string().max(255).optional().describe('Profession or industry, e.g. "Web Developer"'),
            description: z.string().optional().describe('Brief description of the portfolio owner or business')
        },
        async ({ portfolio_id, name, profession, description }, extra) => {
            try {
                const userId = (extra as any)._userId;
                if (!userId) return errorResult('Authentication required');

                const portfolio = await PortfolioService.getById(portfolio_id, userId);
                if (!portfolio) return errorResult('Portfolio not found or access denied');

                const updates: any = {};
                if (name !== undefined) updates.name = name;
                if (profession !== undefined) updates.profession = profession;
                if (description !== undefined) updates.description = description;

                if (Object.keys(updates).length === 0) {
                    return errorResult('No fields provided to update');
                }

                // Build UPDATE query
                const setClauses: string[] = [];
                const values: any[] = [];
                let idx = 1;

                for (const [key, value] of Object.entries(updates)) {
                    setClauses.push(`${key} = $${idx++}`);
                    values.push(value);
                }
                setClauses.push(`updated_at = NOW()`);
                values.push(portfolio_id);
                values.push(userId);

                await pool.query(
                    `UPDATE portfolios SET ${setClauses.join(', ')} WHERE id = $${idx++} AND user_id = $${idx}`,
                    values
                );

                // Also update wizard_data for consistency
                const wizardUpdates: any = {};
                if (name !== undefined) wizardUpdates.name = name;
                if (profession !== undefined) wizardUpdates.profession = profession;
                if (description !== undefined) wizardUpdates.description = description;

                if (Object.keys(wizardUpdates).length > 0) {
                    await pool.query(
                        `UPDATE portfolios SET wizard_data = wizard_data || $1::jsonb WHERE id = $2`,
                        [JSON.stringify(wizardUpdates), portfolio_id]
                    );
                }

                const updated = await PortfolioService.getById(portfolio_id, userId);
                return textResult(`Portfolio info updated!\n\n${formatPortfolioSummary(updated!)}`);
            } catch (error: any) {
                return errorResult(error.message);
            }
        }
    );

    // ------------------------------------------
    // TOOL: delete_portfolio
    // ------------------------------------------
    server.tool(
        'delete_portfolio',
        `Delete a portfolio. Only draft portfolios can be deleted. Published portfolios must be unpublished first. This action is irreversible.`,
        { portfolio_id: z.string().uuid().describe('Portfolio ID to delete') },
        async ({ portfolio_id }, extra) => {
            try {
                const userId = (extra as any)._userId;
                if (!userId) return errorResult('Authentication required');

                await PortfolioService.delete(portfolio_id, userId);
                return textResult(`Portfolio \`${portfolio_id}\` deleted successfully.`);
            } catch (error: any) {
                return errorResult(error.message);
            }
        }
    );

    // ------------------------------------------
    // TOOL: add_section
    // ------------------------------------------
    server.tool(
        'add_section',
        `Add a new section to a portfolio. The section content must match the schema AND follow the content creation guidance for that section type. IMPORTANT: Call get_section_schemas first to see both the required JSON structure and writing guidelines for each type. Follow the guidance closely — it contains formatting rules, examples, and quality tips.

Available section types: hero, about, services, skills, experience, projects, testimonials, contact, faq, pricing, team, menu, achievements, education.

The section is appended at the end (before contact if contact exists).`,
        {
            portfolio_id: z.string().uuid().describe('Portfolio ID'),
            section_type: z.string().describe('Section type (e.g. "hero", "about", "services")'),
            title: z.string().optional().describe('Display title for the section. Defaults to the section type label.'),
            content: z.record(z.string(), z.any()).describe('Section content matching the schema. Follow the guidance from get_section_schemas for high-quality content.')
        },
        async ({ portfolio_id, section_type, title, content }, extra) => {
            try {
                const userId = (extra as any)._userId;
                if (!userId) return errorResult('Authentication required');

                if (!(section_type in SECTION_LABELS)) {
                    return errorResult(`Invalid section type "${section_type}". Valid types: ${Object.keys(SECTION_LABELS).join(', ')}`);
                }

                const portfolio = await PortfolioService.getById(portfolio_id, userId);
                if (!portfolio) return errorResult('Portfolio not found or access denied');

                const sections = Array.isArray(portfolio.sections) ? [...portfolio.sections] : [];

                // Generate unique ID
                const newId = `${section_type}-${Date.now()}`;
                const sectionTitle = title || SECTION_LABELS[section_type as SectionType];

                // Find insert position (before contact if it exists)
                const contactIndex = sections.findIndex(s => s.type === 'contact');
                const newSection: Section = {
                    id: newId,
                    type: section_type as SectionType,
                    title: sectionTitle,
                    content,
                    order: contactIndex !== -1 ? contactIndex : sections.length
                };

                if (contactIndex !== -1) {
                    sections.splice(contactIndex, 0, newSection);
                    // Re-order contact
                    sections[contactIndex + 1].order = contactIndex + 1;
                } else {
                    sections.push(newSection);
                }

                // Re-index all orders
                sections.forEach((s, i) => s.order = i);

                await PortfolioService.updateSections(portfolio_id, userId, sections);

                return textResult(`Section **${sectionTitle}** (\`${section_type}\`) added with ID \`${newId}\`.\n\nPortfolio now has ${sections.length} sections.`);
            } catch (error: any) {
                return errorResult(error.message);
            }
        }
    );

    // ------------------------------------------
    // TOOL: update_section
    // ------------------------------------------
    server.tool(
        'update_section',
        `Update the content of an existing section. You must provide the complete updated content object (not a partial update). The content must match the section type's schema AND follow the content creation guidance. IMPORTANT: Call get_section_schemas to see both the required JSON structure and writing guidelines, then use get_portfolio to see current section IDs and content before updating.`,
        {
            portfolio_id: z.string().uuid().describe('Portfolio ID'),
            section_id: z.string().describe('Section ID to update (from get_portfolio output)'),
            content: z.record(z.string(), z.any()).describe('Complete updated section content matching the schema. Follow guidance from get_section_schemas.'),
            title: z.string().optional().describe('Optional: update the section display title')
        },
        async ({ portfolio_id, section_id, content, title }, extra) => {
            try {
                const userId = (extra as any)._userId;
                if (!userId) return errorResult('Authentication required');

                const portfolio = await PortfolioService.getById(portfolio_id, userId);
                if (!portfolio) return errorResult('Portfolio not found or access denied');

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

                await PortfolioService.updateSections(portfolio_id, userId, sections);

                return textResult(`Section **${sections[sectionIndex].title || sections[sectionIndex].type}** updated successfully.`);
            } catch (error: any) {
                return errorResult(error.message);
            }
        }
    );

    // ------------------------------------------
    // TOOL: remove_section
    // ------------------------------------------
    server.tool(
        'remove_section',
        `Remove a section from a portfolio by its section ID. The hero and contact sections typically should not be removed as they are mandatory. Use get_portfolio to see section IDs.`,
        {
            portfolio_id: z.string().uuid().describe('Portfolio ID'),
            section_id: z.string().describe('Section ID to remove')
        },
        async ({ portfolio_id, section_id }, extra) => {
            try {
                const userId = (extra as any)._userId;
                if (!userId) return errorResult('Authentication required');

                const portfolio = await PortfolioService.getById(portfolio_id, userId);
                if (!portfolio) return errorResult('Portfolio not found or access denied');

                const sections = Array.isArray(portfolio.sections) ? [...portfolio.sections] : [];
                const sectionIndex = sections.findIndex(s => s.id === section_id);

                if (sectionIndex === -1) {
                    return errorResult(`Section "${section_id}" not found`);
                }

                const removed = sections.splice(sectionIndex, 1)[0];
                sections.forEach((s, i) => s.order = i);

                await PortfolioService.updateSections(portfolio_id, userId, sections);

                return textResult(`Section **${removed.title || removed.type}** removed. Portfolio now has ${sections.length} sections.`);
            } catch (error: any) {
                return errorResult(error.message);
            }
        }
    );

    // ------------------------------------------
    // TOOL: get_section_schemas
    // ------------------------------------------
    server.tool(
        'get_section_schemas',
        `Get the JSON content schemas AND content creation guidance for all 14 section types. Each entry shows:
1. The exact JSON structure required for add_section / update_section
2. Writing guidelines with formatting rules, examples, and quality tips

ALWAYS call this before creating or updating sections. Follow both the structure AND guidance for high-quality content.`,
        {
            section_type: z.string().optional().describe('Optional: get schema for a specific section type only')
        },
        async ({ section_type }) => {
            try {
                if (section_type) {
                    if (!(section_type in SECTION_SCHEMAS)) {
                        return errorResult(`Unknown section type "${section_type}". Valid: ${Object.keys(SECTION_SCHEMAS).join(', ')}`);
                    }
                    const schema = SECTION_SCHEMAS[section_type];
                    return textResult(
                        `## Schema for \`${section_type}\`\n\n### JSON Structure\n\`\`\`\n${schema.structure}\n\`\`\`\n\n### Content Guidance\n${schema.guidance}`
                    );
                }

                const schemas = Object.entries(SECTION_SCHEMAS).map(([type, schema]) =>
                    `### \`${type}\`\n\n**JSON Structure:**\n\`\`\`\n${schema.structure}\n\`\`\`\n\n**Content Guidance:**\n${schema.guidance}`
                ).join('\n\n---\n\n');

                return textResult(`# Section Schemas & Content Guidance\n\nUse these structures AND follow the guidance when providing content to \`add_section\` or \`update_section\`.\n\n---\n\n${schemas}`);
            } catch (error: any) {
                return errorResult(error.message);
            }
        }
    );

    // ------------------------------------------
    // TOOL: recommend_sections
    // ------------------------------------------
    server.tool(
        'recommend_sections',
        `Use AI to recommend the best sections for a portfolio based on the profession and description. Returns a list of recommended section types with reasoning. Useful when setting up a new portfolio to determine which sections to add.`,
        {
            portfolio_type: z.enum(['individual', 'company']).describe('Portfolio type'),
            profession: z.string().describe('Profession or industry, e.g. "Web Developer", "Photography Studio"'),
            description: z.string().describe('Brief description of the person or business')
        },
        async ({ portfolio_type, profession, description }, extra) => {
            try {
                const userId = (extra as any)._userId;
                if (!userId) return errorResult('Authentication required');

                // Get user plan for section limits
                const credits = await CreditsService.getUserCredits(userId);
                const result = await AIService.recommendSections(
                    portfolio_type,
                    profession,
                    description,
                    credits.plan as Plan
                );

                const sectionList = result.sections.map((s, i) =>
                    `${i + 1}. **${SECTION_LABELS[s] || s}** (\`${s}\`)`
                ).join('\n');

                return textResult(
                    `# Recommended Sections\n\n${sectionList}\n\n## Reasoning\n${result.reasoning}\n\n_Use \`add_section\` with each type to add them to your portfolio._`
                );
            } catch (error: any) {
                return errorResult(error.message);
            }
        }
    );

    // ------------------------------------------
    // TOOL: publish_portfolio
    // ------------------------------------------
    server.tool(
        'publish_portfolio',
        `Publish a draft portfolio with a slug, making it live at myportfolio.app/{slug}. This deducts credits from the user's balance. Use check_slug first to verify the slug is available. The portfolio must have at least hero and contact sections.`,
        {
            portfolio_id: z.string().uuid().describe('Portfolio ID to publish'),
            slug: z.string().min(1).max(100).describe('URL slug for the published portfolio, e.g. "john-doe"')
        },
        async ({ portfolio_id, slug }, extra) => {
            try {
                const userId = (extra as any)._userId;
                if (!userId) return errorResult('Authentication required');

                const portfolio = await PortfolioService.getById(portfolio_id, userId);
                if (!portfolio) return errorResult('Portfolio not found or access denied');

                const hasAi = portfolio.has_ai_manager && portfolio.ai_manager_finalized;
                const published = await PortfolioService.publish(portfolio_id, userId, slug, !!hasAi);

                return textResult(
                    `Portfolio published! 🎉\n\n` +
                    `- **URL**: myportfolio.app/${slug}\n` +
                    `- **Status**: published\n` +
                    `- **Preview**: https://myportfolio.app/${slug}`
                );
            } catch (error: any) {
                return errorResult(error.message);
            }
        }
    );

    // ------------------------------------------
    // TOOL: check_slug
    // ------------------------------------------
    server.tool(
        'check_slug',
        `Check if a URL slug is available for publishing. Returns whether the slug is taken or available. Always check before publishing.`,
        {
            slug: z.string().min(1).max(100).describe('Slug to check availability for'),
            exclude_portfolio_id: z.string().uuid().optional().describe('Optional: exclude this portfolio ID from the check (for re-publishing)')
        },
        async ({ slug, exclude_portfolio_id }) => {
            try {
                const available = await PortfolioService.isSlugAvailable(slug, exclude_portfolio_id);
                return textResult(
                    available
                        ? `✅ Slug \`${slug}\` is **available**!`
                        : `❌ Slug \`${slug}\` is **taken**. Try a different one.`
                );
            } catch (error: any) {
                return errorResult(error.message);
            }
        }
    );

    // ------------------------------------------
    // TOOL: get_ai_manager
    // ------------------------------------------
    server.tool(
        'get_ai_manager',
        `Get the AI manager configuration for a portfolio. Returns the manager's name, personality, custom instructions, finalized status, and portfolio access settings.`,
        { portfolio_id: z.string().uuid().describe('Portfolio ID') },
        async ({ portfolio_id }, extra) => {
            try {
                const userId = (extra as any)._userId;
                if (!userId) return errorResult('Authentication required');

                const portfolio = await PortfolioService.getById(portfolio_id, userId);
                if (!portfolio) return errorResult('Portfolio not found or access denied');

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
            } catch (error: any) {
                return errorResult(error.message);
            }
        }
    );

    // ------------------------------------------
    // TOOL: update_ai_manager
    // ------------------------------------------
    server.tool(
        'update_ai_manager',
        `Update the AI manager settings for a portfolio. You can update the name, personality, custom instructions, portfolio access, and finalized status. Only updates the fields you provide.`,
        {
            portfolio_id: z.string().uuid().describe('Portfolio ID'),
            name: z.string().max(120).optional().describe('AI manager display name'),
            personality: z.string().max(60).optional().describe('Personality type, e.g. "professional", "friendly", "casual"'),
            custom_instructions: z.string().optional().describe('Custom behavior instructions for the AI manager'),
            has_portfolio_access: z.boolean().optional().describe('Whether the AI manager can read portfolio content'),
            finalized: z.boolean().optional().describe('Whether the AI manager setup is complete')
        },
        async ({ portfolio_id, name, personality, custom_instructions, has_portfolio_access, finalized }, extra) => {
            try {
                const userId = (extra as any)._userId;
                if (!userId) return errorResult('Authentication required');

                const portfolio = await PortfolioService.getById(portfolio_id, userId);
                if (!portfolio) return errorResult('Portfolio not found or access denied');

                const setClauses: string[] = [];
                const values: any[] = [];
                let idx = 1;

                // Enable AI manager if not already
                if (!portfolio.has_ai_manager) {
                    setClauses.push(`has_ai_manager = true`);
                }

                if (name !== undefined) { setClauses.push(`ai_manager_name = $${idx++}`); values.push(name); }
                if (personality !== undefined) { setClauses.push(`ai_manager_personality = $${idx++}`); values.push(personality); }
                if (custom_instructions !== undefined) { setClauses.push(`ai_manager_custom_instructions = $${idx++}`); values.push(custom_instructions); }
                if (has_portfolio_access !== undefined) { setClauses.push(`ai_manager_has_portfolio_access = $${idx++}`); values.push(has_portfolio_access); }
                if (finalized !== undefined) { setClauses.push(`ai_manager_finalized = $${idx++}`); values.push(finalized); }

                if (setClauses.length === 0) {
                    return errorResult('No fields provided to update');
                }

                setClauses.push(`updated_at = NOW()`);
                values.push(portfolio_id);
                values.push(userId);

                await pool.query(
                    `UPDATE portfolios SET ${setClauses.join(', ')} WHERE id = $${idx++} AND user_id = $${idx}`,
                    values
                );

                return textResult(`AI manager settings updated for portfolio \`${portfolio_id}\`.`);
            } catch (error: any) {
                return errorResult(error.message);
            }
        }
    );

    // ------------------------------------------
    // TOOL: get_credits
    // ------------------------------------------
    server.tool(
        'get_credits',
        `Get the authenticated user's credit balance, plan type, portfolio count, and limits. Credits are used when publishing portfolios. Free plan: 500 signup credits, 100 per basic portfolio, 250 with AI manager.`,
        {},
        async (_args, extra) => {
            try {
                const userId = (extra as any)._userId;
                if (!userId) return errorResult('Authentication required');

                const credits = await CreditsService.getUserCredits(userId);

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
            } catch (error: any) {
                return errorResult(error.message);
            }
        }
    );

    // ------------------------------------------
    // TOOL: get_themes
    // ------------------------------------------
    server.tool(
        'get_themes',
        `List all available themes and color schemes for portfolios. Returns theme names and color scheme names with their hex color values. Use update_theme to apply a theme or color scheme to a portfolio.`,
        {},
        async () => {
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
        }
    );

    // ------------------------------------------
    // TOOL: update_theme
    // ------------------------------------------
    server.tool(
        'update_theme',
        `Update a portfolio's visual theme and/or color scheme. Use get_themes to see available options. You can update theme only, color scheme only, or both at once. Changes take effect immediately on the published portfolio.

Available themes: minimal, techie, elegant
Available color schemes: warm, forest, ocean, luxury, berry, terra, teal, slate, monochrome`,
        {
            portfolio_id: z.string().uuid().describe('Portfolio ID to update'),
            theme: z.string().optional().describe('Theme name: "minimal", "techie", or "elegant"'),
            color_scheme: z.string().optional().describe('Color scheme name: "warm", "forest", "ocean", "luxury", "berry", "terra", "teal", "slate", or "monochrome"')
        },
        async ({ portfolio_id, theme, color_scheme }, extra) => {
            try {
                const userId = (extra as any)._userId;
                if (!userId) return errorResult('Authentication required');

                const portfolio = await PortfolioService.getById(portfolio_id, userId);
                if (!portfolio) return errorResult('Portfolio not found or access denied');

                if (!theme && !color_scheme) {
                    return errorResult('Provide at least one of: theme, color_scheme');
                }

                if (theme && !AVAILABLE_THEMES.includes(theme.toLowerCase())) {
                    return errorResult(`Invalid theme "${theme}". Available: ${AVAILABLE_THEMES.join(', ')}`);
                }

                if (color_scheme && !(color_scheme.toLowerCase() in AVAILABLE_COLOR_SCHEMES)) {
                    return errorResult(`Invalid color scheme "${color_scheme}". Available: ${Object.keys(AVAILABLE_COLOR_SCHEMES).join(', ')}`);
                }

                const updates: string[] = [];
                const values: any[] = [];
                let idx = 1;
                const wizardUpdates: Record<string, any> = {};
                const changedParts: string[] = [];

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

                await pool.query(
                    `UPDATE portfolios SET ${updates.join(', ')} WHERE id = $${idx++} AND user_id = $${idx}`,
                    values
                );

                return textResult(`Portfolio style updated! 🎨\n\n${changedParts.join('\n')}`);
            } catch (error: any) {
                return errorResult(error.message);
            }
        }
    );

    return server;
}

export default createMcpServer;
