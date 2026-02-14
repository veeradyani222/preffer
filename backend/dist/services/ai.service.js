"use strict";
/**
 * AI Service v3 - Truly Conversational & Helpful
 *
 * No strict quality checks that block users.
 * AI helps users create content through natural conversation.
 * Options and choices appear in chat, final content appears in preview.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = exports.SECTION_LABELS = void 0;
const credits_service_1 = require("./credits.service");
const gemini_service_1 = require("./gemini.service");
const logger_1 = __importDefault(require("../utils/logger"));
// Section labels for display
exports.SECTION_LABELS = {
    hero: 'Hero / Header',
    about: 'About',
    services: 'Services',
    skills: 'Skills',
    experience: 'Experience',
    projects: 'Projects / Portfolio',
    testimonials: 'Testimonials',
    contact: 'Contact',
    faq: 'FAQ',
    pricing: 'Pricing',
    team: 'Team',
    menu: 'Menu',
    achievements: 'Achievements',
    education: 'Education',
};
// Section content structures — strict JSON schemas. Output MUST match exactly.
const SECTION_STRUCTURES = {
    hero: `{
  "headline": string (required),
  "subheadline": string (required)
}`,
    about: `{
  "text": string (required)
}`,
    services: `{
  "items": [ (required)
    {
      "name": string (required),
      "description": string (required, 1-2 sentences),
      "icon": string (required, lowercase single-word, e.g. "briefcase", "code", "star")
    }
  ]
}`,
    skills: `{
  "heading": string (required),
  "skills": [string] (required, e.g. ["React", "Node.js", "Python"])
}`,
    experience: `{
  "heading": string (required),
  "items": [ (required)
    {
      "role": string (required),
      "company": string (required),
      "period": string (required, e.g. "2020 - 2023"),
      "description": string (required)
    }
  ]
}`,
    projects: `{
  "heading": string (required),
  "items": [ (required)
    {
      "name": string (required),
      "description": string (required),
      "tags": [string] (optional),
      "link": string (optional, empty string if unavailable)
    }
  ]
}`,
    testimonials: `{
  "heading": string (required),
  "items": [ (required)
    {
      "quote": string (required),
      "author": string (required),
      "role": string (required)
    }
  ]
}`,
    contact: `{
  "heading": string (required),
  "links": string (required, comma-separated, e.g. "Email: x@y.com, Phone: 123-456")
}`,
    faq: `{
  "heading": string (required),
  "items": [ (required)
    {
      "question": string (required),
      "answer": string (required)
    }
  ]
}`,
    pricing: `{
  "heading": string (required),
  "items": [ (required)
    {
      "price": string (required, e.g. "$50"),
      "condition": string (required, e.g. "Per Hour", "Basic Plan"),
      "features": [string] (required)
    }
  ]
}`,
    team: `{
  "heading": string (required),
  "items": [ (required)
    {
      "name": string (required),
      "role": string (required),
      "bio": string (optional, empty string if not provided),
      "socials": string (optional, empty string if not provided)
    }
  ]
}`,
    menu: `{
  "heading": string (required),
  "categories": [ (required)
    {
      "name": string (required, e.g. "Beverages"),
      "items": [ (required)
        {
          "name": string (required),
          "description": string (optional, empty string if not provided),
          "price": string (optional, empty string if not provided)
        }
      ]
    }
  ]
}`,
    achievements: `{
  "heading": string (required),
  "items": [ (required)
    {
      "title": string (required),
      "description": string (required)
    }
  ]
}`,
    education: `{
  "heading": string (required),
  "items": [ (required)
    {
      "title": string (required),
      "description": string (required)
    }
  ]
}`,
};
// Section-specific guidance for conversational building
const SECTION_GUIDANCE = {
    hero: `
**HERO SECTION GUIDANCE:**
This is the first impression - make it count!

**What you need:**
- A catchy headline with their name and profession/industry — not just the name alone.
- Example: "John Doe - Valuing Visual Appeal, Recognizing the Power of Art"
- A concise subheadline in first-person perspective.

**Your approach:**
- Use the name, industry, and about section to build the heading and subheading.
- Only ask for missing pieces; do not repeat questions about information they already shared.
- If you have enough to build a good hero, include it in proposedContent.`,
    about: `
**ABOUT SECTION GUIDANCE:**
Identify their profession or industry and decide what an About section should sound like for this person/company, then create it.

**Review conversation history:**
They may have already shared background information. If it feels sufficient, use it; otherwise, ask for more.

**Your role:**
- Never add placeholders like [mention your experience]. Always confirm the reality first, and if they refuse to share, simply omit that point rather than using a placeholder.
- Create a flowing narrative in the text field.
- When complete, include in proposedContent.`,
    services: `
**SERVICES/OFFERINGS GUIDANCE:**
- Showcase what they offer clearly — service names with descriptions.
- If they haven't mentioned their services, ask: "What services do you offer?" or "Can you describe your main offerings?"
- If they already shared service information, use it to build the section.
- A service name with a 1-2 sentence description for each is generally sufficient, but adapt to what the user wants.
- Build when you have enough for proposedContent.`,
    testimonials: `
**TESTIMONIALS GUIDANCE:**
- Collect testimonials from the user — never assume or fabricate them.
- If the user says they don't have any, let them know this section won't be useful without real testimonials.
- If user provides testimonials in any format, intelligently reformat into: heading, quote, author, and role.
- Example: User says "Veer Adyani the product designer in my team said I am amazing" → quote: "UserName is amazing", author: "Veer Adyani", role: "Product Designer".
- When you have it done → Include in proposedContent.`,
    contact: `
**CONTACT SECTION GUIDANCE:**
Make it easy for people to reach them.

**Check conversation:**
They may have already mentioned contact details. If not, ask them.

**Your approach:**
- Ask something like: "Would you like to add your email, phone, location, or any social links?" if not provided already.
- Accept whatever contact information they provide.
- Intelligently format it into heading and links.
- Example: User says "My email is xyz@gmail.com, phone is 87635382764, instagram is @ashley123" → links: "Email: xyz@gmail.com, Phone: 87635382764, Instagram: @ashley123" if they give only one, just add that.
- Build with what you have for proposedContent.`,
    projects: `
**PROJECTS/PORTFOLIO GUIDANCE:**
Showcase their best work.

**Check conversation:**
They may have already mentioned their projects or work. You have to actually check. if no where mentioned then ask them about them. you cant add projects without any actual info.

**Your approach:**
- If not mentioned, ask: "What are some of your standout projects or key work you'd like to showcase?"
- Accept whatever information they provide about their projects.
- Format into: name, description, tags, link.
- Example: "I built a cool e-commerce site with React" → name: "E-commerce Platform", description: "Built with React", tags: ["React", "E-commerce"], link: ask if they have one, leave empty if not.
- Build when you have their projects for proposedContent.`,
    experience: `
**WORK EXPERIENCE GUIDANCE:**
Timeline of their professional journey.

**Check conversation:**
They may have already shared their work history.

**Your approach:**
- If not mentioned, ask: "Can you share your work experience? Where have you worked and what roles did you have?"
- Accept whatever information they provide.
- Format into: role, company, period, description.
- Example: "I was a senior dev at Google for 3 years" → role: "Senior Developer", company: "Google", period: "2020-2023", description: based on context.
- Build when you have their experience for proposedContent.`,
    skills: `
**SKILLS GUIDANCE:**
Display their expertise areas.

**Check conversation:**
They may have mentioned their skills, tools, technologies, etc.

**Your approach:**
- If they described their work, you can infer skills from context.
- If skills not mentioned, ask: "What are your main skills or technologies you work with?"
- Format into a simple array of skill names.
- Example: "I know React, Node, Python, and Figma" → ["React", "Node.js", "Python", "Figma"]
- Build when you have their skills for proposedContent.`,
    faq: `
**FAQ GUIDANCE:**
Answer common visitor questions.

**Check conversation:**
They may have mentioned common questions they receive.

**Your approach:**
- If not mentioned, ask: "Do you have any frequently asked questions you'd like to include? Or should I suggest some common ones for your industry?"
- If they want suggestions, offer industry-relevant FAQs based on their profession.
- Format into: question, answer pairs.
- Example: "People always ask about my pricing and turnaround time" → create proper Q&A pairs with detailed answers based on context.
- Build when you have the FAQs for proposedContent.`,
    pricing: `
**PRICING GUIDANCE:**
Clear pricing builds trust. Every business has a unique pricing model — adapt to theirs.

**Check conversation:**
They may have mentioned their pricing structure.

**Your approach:**
- If not mentioned, ask: "Would you like to include pricing information? You can share however you price your services — hourly, per project, packages, or any other way."
- Format into: price, condition, features.
  * **price**: The amount (e.g., "$50", "$5,000")
  * **condition**: Plan name or billing context (e.g., "Per Hour", "Basic Plan", "Enterprise")
  * **features**: Array of what's included
- Examples:
  * "I charge $50 per hour" → {price: "$50", condition: "Per Hour", features: [ask what's included]}
  * "$99/month with 5 pages and mobile responsive" → {price: "$99", condition: "Basic Plan - Monthly", features: ["Up to 5 pages", "Mobile responsive"]}
  * "Three tiers: $500 starter, $1200 pro, $3000 enterprise" → create an item for each tier with their respective features.
- If features are not mentioned, ask for them. If user declines, move on.
- Build when you have their pricing for proposedContent.`,
    team: `
**TEAM GUIDANCE:**
Introduce the people behind the work.

**Check conversation:**
They may have mentioned their team members.

**Your approach:**
- If not mentioned, ask: "Would you like to showcase your team? Please share their names, roles, and brief descriptions."
- Format into: name, role, bio, socials.
- Note: We don't have the feature for images yet, so clearly inform them.
- For **bio** and **socials**: If given, add them. If not given, ask once. If they don't want to add, leave empty.
- Example: "Sarah leads design and John handles development" → [{name: "Sarah", role: "Design Lead", bio: "", socials: ""}, {name: "John", role: "Developer", bio: "", socials: ""}] — then ask if they want to add bios or socials.
- Build when you have team info for proposedContent.`,
    menu: `
**MENU GUIDANCE:**

**Check conversation:**
They may have mentioned their menu items.

**Your approach:**
- If not mentioned, ask: "Please share your menu items — what do you offer? Include names, descriptions, and prices if you'd like."
- Format into categories with items: name, description, price.
- Only fill in data that was actually provided. Don't invent descriptions or prices.
- If only names are given, ask once if they want to add prices.
- Examples:
  * "Lattes for $5, cappuccinos $4.50, croissants $3" → Beverages: [{name: "Latte", price: "$5", description: ""}], Pastries: [{name: "Croissant", price: "$3", description: ""}]
  * "Margherita pizza $12 - classic tomato and mozzarella" → Pizzas: [{name: "Margherita", price: "$12", description: "Classic tomato and mozzarella"}]
- Build when you have menu items for proposedContent.`,
    achievements: `
**ACHIEVEMENTS GUIDANCE:**
Highlight accomplishments and milestones.

**Check conversation:**
They may have mentioned their achievements or awards.

**Your approach:**
- If not mentioned, ask: "Do you have any notable achievements, awards, or milestones you'd like to highlight?"
- Format into: title, description (only these two fields).
- Incorporate dates, award details, or other information intelligently.
- Examples:
  * "I won best startup award in 2023" → {title: "Best Startup Award 2023", description: "Recognized as the best startup."}
  * "Reached 10k users last year" → {title: "10,000 Users Milestone", description: "Successfully grew user base to 10,000 active users"}
- Build when you have achievements for proposedContent.`,
    education: `
**EDUCATION GUIDANCE:**
Academic background and credentials.

**Check conversation:**
They may have mentioned their educational background.

**Your approach:**
- If not mentioned, ask: "Would you like to include your educational background? This can include degrees, certificates, courses, or any relevant training."
- Format into: title, description (only these two fields).
- Education can be degrees, certificates, online courses, bootcamps — format it all intelligently.
- Examples:
  * "I studied Computer Science at MIT from 2015-2019" → {title: "B.S. in Computer Science - MIT", description: "2015-2019"}
  * "Got AWS certification last year" → {title: "AWS Certified Solutions Architect", description: "Professional certification obtained in 2025"}
  * "Master's degree in Design from Stanford, graduated with honors" → {title: "Master of Design - Stanford University", description: "Graduated with honors"}
- Build when you have education info for proposedContent.`
};
// ============================================
// AI SERVICE
// ============================================
class AIService {
    /**
     * Helper to extract and parse JSON from AI response
     * Handles cases where AI adds markdown formatting, conversational text, or truncated responses
     */
    static extractJson(text) {
        // First try strict parse
        try {
            return JSON.parse(text);
        }
        catch (e) {
            // Continue to other methods
        }
        // Try extracting from markdown code blocks
        const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
            try {
                return JSON.parse(codeBlockMatch[1].trim());
            }
            catch (e) {
                // Continue to other methods
            }
        }
        // Try finding JSON object in text
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            }
            catch (e) {
                // Try to fix truncated JSON
                const fixedJson = this.attemptJsonFix(jsonMatch[0]);
                if (fixedJson) {
                    try {
                        return JSON.parse(fixedJson);
                    }
                    catch (e2) {
                        // Continue to error
                    }
                }
            }
        }
        throw new Error(`Failed to parse JSON from AI response: ${text.substring(0, 100)}...`);
    }
    /**
     * Attempt to fix truncated JSON by closing unclosed brackets/braces
     */
    static attemptJsonFix(json) {
        try {
            let fixed = json.trim();
            // Remove trailing incomplete strings (ends with unclosed quote)
            if (fixed.match(/:\s*"[^"]*$/)) {
                // Find last complete property and truncate after it
                const lastCompleteMatch = fixed.match(/(.*"[^"]*"[,\s\]}]*)/);
                if (lastCompleteMatch) {
                    fixed = lastCompleteMatch[1];
                }
            }
            // Count brackets and braces
            let braceCount = 0;
            let bracketCount = 0;
            let inString = false;
            let escapeNext = false;
            for (let i = 0; i < fixed.length; i++) {
                const char = fixed[i];
                if (escapeNext) {
                    escapeNext = false;
                    continue;
                }
                if (char === '\\') {
                    escapeNext = true;
                    continue;
                }
                if (char === '"') {
                    inString = !inString;
                    continue;
                }
                if (!inString) {
                    if (char === '{')
                        braceCount++;
                    if (char === '}')
                        braceCount--;
                    if (char === '[')
                        bracketCount++;
                    if (char === ']')
                        bracketCount--;
                }
            }
            // Remove trailing commas before closing
            fixed = fixed.replace(/,\s*$/, '');
            // Close unclosed brackets and braces
            while (bracketCount > 0) {
                fixed += ']';
                bracketCount--;
            }
            while (braceCount > 0) {
                fixed += '}';
                braceCount--;
            }
            // Validate the fix worked
            JSON.parse(fixed);
            logger_1.default.info('Successfully fixed truncated JSON');
            return fixed;
        }
        catch (e) {
            return null;
        }
    }
    /**
     * Format content for human-readable display (not JSON)
     * Uses double newlines for proper Markdown paragraph breaks
     */
    static formatContentForDisplay(content, sectionType) {
        if (!content)
            return '';
        const lines = [];
        const formatValue = (key, value, indent = '') => {
            // Skip icon fields from display
            if (key === 'icon')
                return;
            // Skip heading field if it's redundant with section type (e.g., "Contact" section with "heading" field)
            if (key === 'heading') {
                // Display the heading value directly without the label
                if (value) {
                    lines.push(`**${value}**`);
                }
                return;
            }
            const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
            if (Array.isArray(value)) {
                // Don't show any labels for arrays - just display the content directly
                value.forEach((item, idx) => {
                    if (typeof item === 'object' && item !== null) {
                        const itemTitle = item.name || item.title || item.question || item.role || item.degree || `Item ${idx + 1}`;
                        lines.push(`**${idx + 1}. ${itemTitle}**`);
                        Object.entries(item).forEach(([k, v]) => {
                            // Skip icon, name, title, and role fields (already used in header)
                            if (k !== 'name' && k !== 'title' && k !== 'icon' && k !== 'role' && v) {
                                const sublabel = k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                                if (Array.isArray(v)) {
                                    const primitiveValues = v.filter(val => typeof val !== 'object' || val === null);
                                    const objectValues = v.filter(val => typeof val === 'object' && val !== null);
                                    if (primitiveValues.length > 0) {
                                        lines.push(`${sublabel}: ${primitiveValues.join(', ')}`);
                                    }
                                    if (objectValues.length > 0) {
                                        lines.push(`${sublabel}:`);
                                        objectValues.forEach((nested, nestedIdx) => {
                                            const nestedTitle = nested.name || nested.title || nested.question || nested.role || `Item ${nestedIdx + 1}`;
                                            const details = Object.entries(nested)
                                                .filter(([nestedKey, nestedValue]) => nestedKey !== 'name' &&
                                                nestedKey !== 'title' &&
                                                nestedKey !== 'icon' &&
                                                nestedKey !== 'role' &&
                                                nestedValue)
                                                .map(([nestedKey, nestedValue]) => {
                                                const nestedLabel = nestedKey.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                                                if (Array.isArray(nestedValue)) {
                                                    return `${nestedLabel}: ${nestedValue.join(', ')}`;
                                                }
                                                return `${nestedLabel}: ${nestedValue}`;
                                            });
                                            lines.push(`- ${nestedTitle}${details.length ? ` (${details.join(' | ')})` : ''}`);
                                        });
                                    }
                                }
                                else if (typeof v === 'string' && v.length > 50) {
                                    // Long text gets its own line
                                    lines.push(`${v}`);
                                }
                                else {
                                    lines.push(`${sublabel}: ${v}`);
                                }
                            }
                        });
                    }
                    else {
                        lines.push(`• ${item}`);
                    }
                });
            }
            else if (typeof value === 'object' && value !== null) {
                lines.push(`**${label}:**`);
                Object.entries(value).forEach(([k, v]) => {
                    formatValue(k, v, indent + '  ');
                });
            }
            else if (value) {
                lines.push(`**${label}:** ${value}`);
            }
        };
        // Don't add section type as header - the content usually has its own heading field
        // lines.push(`**${SECTION_LABELS[sectionType]}:**`);
        Object.entries(content).forEach(([key, value]) => {
            formatValue(key, value);
        });
        // Use double newlines between items for proper Markdown paragraph breaks
        return lines.join('\n\n').trim();
    }
    /**
     * Recommend sections using AI based on profession/business description
     */
    static async recommendSections(portfolioType, profession, description, plan = 'free') {
        var _a;
        logger_1.default.ai('Recommending sections', { portfolioType, profession, descriptionLength: description.length, plan });
        const maxCustomSections = credits_service_1.PLAN_LIMITS[plan].maxSections;
        const totalSections = maxCustomSections + 2; // +2 for mandatory hero and contact
        const availableSections = Object.keys(exports.SECTION_LABELS).join(', ');
        const prompt = `You are an expert at recommending website sections for portfolios and business websites.

User Profile:
- Type: ${portfolioType === 'individual' ? 'Personal Portfolio' : 'Business Website'}
- Profession/Industry: "${profession || 'General'}"
- Description: "${description}"

Available section types: ${availableSections}

Rules:
1. MANDATORY: Must include "hero" (first) and "contact" (last) - these are required for every portfolio
2. Recommend EXACTLY ${totalSections} sections TOTAL (hero + ${maxCustomSections} custom sections + contact)
   - Example for free plan (${totalSections} total): ["hero", "about", "services", "projects", "experience", "testimonials", "contact"]
3. Choose the middle ${maxCustomSections} sections based on INDUSTRY STANDARDS for this profession
4. Be specific to their needs

Return JSON:
{
  "sections": ["hero", "...", "...", "...", "...", "...", "contact"], 
  "reasoning": "A professional, authoritative explanation citing industry standards. Example: 'For a [Profession], it is standard to include [Section X] to showcase [Y]...'"
}

Return ONLY valid JSON, no markdown.`;
        // Retry logic for JSON parsing failures
        const maxAttempts = 3;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const text = await (0, gemini_service_1.generateWithFallback)({ temperature: 0.4, maxOutputTokens: 500, responseMimeType: 'application/json' }, prompt);
                const parsed = this.extractJson(text);
                let validSections = parsed.sections
                    .filter((s) => s in exports.SECTION_LABELS)
                    .slice(0, totalSections);
                // Ensure hero and contact are always included (mandatory)
                if (!validSections.includes('hero')) {
                    validSections.unshift('hero');
                }
                if (!validSections.includes('contact')) {
                    validSections.push('contact');
                }
                // Trim to total sections if we added mandatory ones
                validSections = validSections.slice(0, totalSections);
                // Fill with defaults if still not enough
                if (validSections.length < totalSections) {
                    const defaults = ['about', 'services', 'projects', 'experience', 'testimonials'];
                    for (const def of defaults) {
                        if (!validSections.includes(def) && validSections.length < totalSections) {
                            const contactIndex = validSections.indexOf('contact');
                            if (contactIndex !== -1) {
                                validSections.splice(contactIndex, 0, def);
                            }
                            else {
                                validSections.push(def);
                            }
                        }
                    }
                }
                return { sections: validSections, reasoning: parsed.reasoning };
            }
            catch (error) {
                const isJsonError = (_a = error === null || error === void 0 ? void 0 : error.message) === null || _a === void 0 ? void 0 : _a.includes('Failed to parse JSON');
                if (isJsonError && attempt < maxAttempts) {
                    logger_1.default.warn(`JSON parsing failed in recommendSections, retrying (attempt ${attempt}/${maxAttempts})`);
                    continue;
                }
                logger_1.default.error('AI section recommendation failed', error);
                break;
            }
        }
        // Fallback default sections if AI fails
        const middleDefaults = ['about', 'services', 'experience', 'projects', 'testimonials'];
        const sections = ['hero'];
        sections.push(...middleDefaults.slice(0, maxCustomSections));
        sections.push('contact');
        return {
            sections: sections.slice(0, maxCustomSections + 2),
            reasoning: 'Here are essential sections to get you started!'
        };
    }
    /**
     * Main chat method - truly conversational and helpful
     * No strict quality checks - AI guides users naturally
     */
    static async chat(sectionType, userMessage, context, conversationHistory) {
        var _a, _b;
        logger_1.default.divider(`CHAT: ${sectionType.toUpperCase()}`);
        logger_1.default.conversation('User message', { message: userMessage.substring(0, 100), historyLength: conversationHistory.length });
        const recentHistory = conversationHistory.slice(-6);
        const historyText = recentHistory
            .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
            .join('\n');
        const existingContent = context.existingSections || {};
        const prompt = `You are a friendly, helpful AI assistant helping someone build their ${exports.SECTION_LABELS[sectionType]} section for their ${context.portfolioType === 'company' ? 'business' : 'personal'} portfolio.

PROFILE INFO:
- Name: "${context.name || 'Not provided'}"
- Profession/Industry: "${context.profession || 'Not provided'}"
- About: "${context.description || 'Not provided'}"

CONVERSATION SO FAR:
${historyText || 'This is the start of the conversation'}

USER JUST SAID:
"${userMessage}"

EXISTING SECTIONS (for context and consistency):
${Object.entries(existingContent).map(([k, v]) => `${k}: ${JSON.stringify(v).substring(0, 150)}`).join('\n') || 'None yet'}

${SECTION_GUIDANCE[sectionType]}

SECTION STRUCTURE NEEDED:
${SECTION_STRUCTURES[sectionType]}
${['achievements', 'services'].includes(sectionType) ? '\n**ICON NAMING:** For icon fields, use lowercase single-word names (e.g., "trophy", "star", "award", "briefcase", "code", "heart", "wrench", "lightbulb"). Keep it simple and use common icon names.' : ''}

   **STRICT RULE**
   -THE CONTENT SHOULD BE STORED IN THE GIVEN SECTION STRUCTURE ONLY. BREAKING THIS CAN BREAK OUR ENTIRE APP SO BE CAREFUL OF THIS.

CRITICAL INSTRUCTIONS - READ CAREFULLY:

**CONTEXT AWARENESS:**
- Review "CONVERSATION SO FAR" and "PROFILE INFO" above - the user may have ALREADY shared relevant information
- DON'T ask for info they've already provided in previous messages
- USE that existing context to intelligently build sections
- Example: If they said "I'm a baker called Star Bakery" → You already know their name and profession for the hero section

**WHEN TO BUILD SECTIONS:**
- If you have enough info from conversation history → BUILD IT NOW with proposedContent.
- Never use placeholders like [Your Name] or [Add details]. Instead, clarify with the user. If there's a blocker, simply omit that point rather than adding a placeholder.
- Always prefer to clarify over adding unconfirmed or unapproved information that will need editing later.

**SHOWING OPTIONS:**
When presenting CHOICES, put them IN YOUR MESSAGE with numbers (these are just examples; your options should be in context):
   1. **Bold & Direct**: 'Transforming Ideas Into Reality'
   2. **Personal Touch**: 'Hi, I'm Alex - Your Creative Partner'
   3. **Action-Focused**: 'Let's Build Something Amazing Together'
   
   Which style speaks to you? Just reply with the number!

**FINALIZING CONTENT:**
- When user picks an option (says "1", "option 2", "the first one") → Generate FULL section content in proposedContent
- If user says "generate", "create", or "help me" → CREATE content based on what you know
- When you create FINAL content → include it in proposedContent for approval
- NEVER show JSON to users - format content naturally in your message

**DISPLAYING CONTENT:**
When showing what content will look like, format it naturally:
   "**Headline:** Your amazing headline here
   **Subheadline:** Supporting text goes here"
   NOT as JSON! The user is not necessarily a programmer, so be natural.

**BE HELPFUL:**
- Never refuse to help or say you need more info.
- You can always ask clarifying questions — never create placeholders as stated above.
- Be encouraging: "Let's build this together! Here's what I've created based on what you told me..."

RESPONSE RULES:
- Asking questions or showing options → action: "continue", NO proposedContent
- Created final content for approval → action: "proposal", include proposedContent with actual data
- User approves ("looks good", "yes", "save", "approve") → action: "ready", isComplete: true

**Important:**
-we have to store the data in the required structure only, so as stated above, use your intelligence to format whatever the user throws your way to format it into the required structure of the section.

Return JSON:
{
    "message": "Your friendly, conversational response. Show options with numbers. Use markdown. Display content preview in readable format, NOT JSON.",
    "action": "continue" | "proposal" | "ready",
    "proposedContent": { only if action is "proposal" - actual section data following the structure },
    "isComplete": true/false
}`;
        // Retry logic for JSON parsing failures
        const maxAttempts = 3;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const maxTokens = 2000 + (attempt - 1) * 500;
                const text = await (0, gemini_service_1.generateWithFallback)({ temperature: 0.7, maxOutputTokens: maxTokens, responseMimeType: 'application/json' }, prompt);
                const parsed = this.extractJson(text);
                // Add formatted display content if we have proposed content
                let displayContent;
                if (parsed.proposedContent) {
                    displayContent = this.formatContentForDisplay(parsed.proposedContent, sectionType);
                }
                logger_1.default.ai('Chat response', {
                    action: parsed.action,
                    hasContent: !!parsed.proposedContent,
                    messageLength: ((_a = parsed.message) === null || _a === void 0 ? void 0 : _a.length) || 0,
                    attempt
                });
                return {
                    message: parsed.message || "I'd love to help! Tell me what you'd like in this section.",
                    action: parsed.action || 'continue',
                    proposedContent: parsed.proposedContent,
                    displayContent,
                    isComplete: parsed.isComplete || false
                };
            }
            catch (error) {
                const isJsonError = (_b = error === null || error === void 0 ? void 0 : error.message) === null || _b === void 0 ? void 0 : _b.includes('Failed to parse JSON');
                if (isJsonError && attempt < maxAttempts) {
                    logger_1.default.warn(`JSON parsing failed in chat, retrying (attempt ${attempt}/${maxAttempts})`);
                    continue;
                }
                logger_1.default.error('Chat failed', error);
                return {
                    message: "An unexpected error occurred. Please try again in a few seconds.",
                    action: 'continue',
                    isComplete: false
                };
            }
        }
        // Fallback (shouldn't reach here due to return in catch)
        return {
            message: "An unexpected error occurred. Please try again in a few seconds.",
            action: 'continue',
            isComplete: false
        };
    }
    /**
     * Generate content directly (for auto-generate button)
     */
    static async generateSectionContent(sectionType, context, additionalInfo) {
        var _a, _b, _c;
        logger_1.default.divider(`GENERATE: ${sectionType.toUpperCase()}`);
        const existingContent = context.existingSections || {};
        const prompt = `Create content for a ${exports.SECTION_LABELS[sectionType]} section.

PROFILE:
- Name: "${context.name || '[Your Name]'}"
- Profession/Industry: "${context.profession || 'Professional'}"
- About: "${context.description || 'A dedicated professional'}"
- Type: ${context.portfolioType === 'company' ? 'Business Website' : 'Personal Portfolio'}
${additionalInfo ? `- Additional Info: "${additionalInfo}"` : ''}

EXISTING SECTIONS (match style/tone):
${Object.entries(existingContent).map(([k, v]) => `${k}: ${JSON.stringify(v).substring(0, 150)}`).join('\n') || 'None yet'}

${SECTION_GUIDANCE[sectionType]}

SECTION STRUCTURE:
${SECTION_STRUCTURES[sectionType]}
${['achievements', 'services'].includes(sectionType) ? '\n**ICON NAMING:** For icon fields, use lowercase single-word react-icons names only (e.g., "trophy", "star", "award", "briefcase", "code", "heart", "wrench", "lightbulb"). Keep it simple and use common icon names.' : ''}

RULES:
1. Create compelling, professional content based on the section guidance above and the profile info.
Return JSON:
{
    "content": { the actual section content following the structure above },
    "message": "A friendly message about what you created and offering to make changes"
}`;
        // Retry logic for JSON parsing failures
        const maxAttempts = 3;
        let lastError;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                // Increase token limit on retries to avoid truncation
                const maxTokens = 2000 + (attempt - 1) * 500;
                const text = await (0, gemini_service_1.generateWithFallback)({ temperature: 0.7, maxOutputTokens: maxTokens, responseMimeType: 'application/json' }, prompt);
                const parsed = this.extractJson(text);
                // Handle case where model returns content directly vs wrapped in {content: ...}
                let content = parsed.content;
                let message = parsed.message;
                // If no content field but parsed has section-specific keys, use parsed as content
                if (!content && parsed && typeof parsed === 'object') {
                    // Check if it looks like direct section content (has expected keys for this section type)
                    const sectionKeys = ['headline', 'title', 'items', 'projects', 'description', 'text', 'entries', 'name'];
                    const hasContentKeys = Object.keys(parsed).some(k => sectionKeys.includes(k) || k === sectionType);
                    if (hasContentKeys) {
                        logger_1.default.ai('Model returned content directly, wrapping it', { keys: Object.keys(parsed) });
                        content = parsed;
                        message = `Here's your ${exports.SECTION_LABELS[sectionType]} section! Let me know if you'd like any changes.`;
                    }
                }
                if (!content) {
                    logger_1.default.error('No content in parsed response', { parsed: JSON.stringify(parsed).substring(0, 200) });
                    throw new Error('No content generated');
                }
                const displayContent = this.formatContentForDisplay(content, sectionType);
                logger_1.default.ai('Content generated', {
                    sectionType,
                    contentKeys: Object.keys(content || {}),
                    attempt
                });
                return {
                    content,
                    message: message || `Here's your ${exports.SECTION_LABELS[sectionType]} section! Let me know if you'd like any changes.`,
                    displayContent
                };
            }
            catch (error) {
                lastError = error;
                const isJsonError = ((_a = error === null || error === void 0 ? void 0 : error.message) === null || _a === void 0 ? void 0 : _a.includes('Failed to parse JSON')) ||
                    ((_b = error === null || error === void 0 ? void 0 : error.message) === null || _b === void 0 ? void 0 : _b.includes('No content generated'));
                if (isJsonError && attempt < maxAttempts) {
                    logger_1.default.warn(`JSON parsing failed, retrying (attempt ${attempt}/${maxAttempts})`, {
                        error: (_c = error === null || error === void 0 ? void 0 : error.message) === null || _c === void 0 ? void 0 : _c.substring(0, 100)
                    });
                    continue;
                }
                // Not a JSON error or max retries reached
                break;
            }
        }
        logger_1.default.error('Content generation failed after retries', lastError);
        throw new Error(`I had trouble creating that. Could you tell me more about what you'd like for your ${exports.SECTION_LABELS[sectionType]} section?`);
    }
    /**
     * Improve content based on user feedback
     */
    static async improveContent(sectionType, currentContent, feedback) {
        var _a, _b;
        logger_1.default.ai('Improving content', { sectionType, feedback: feedback.substring(0, 50) });
        const prompt = `Improve this ${exports.SECTION_LABELS[sectionType]} section content based on user feedback.

CURRENT CONTENT:
${JSON.stringify(currentContent, null, 2)}

USER'S FEEDBACK:
"${feedback}"

${SECTION_GUIDANCE[sectionType]}

SECTION STRUCTURE:
${SECTION_STRUCTURES[sectionType]}
${['achievements', 'services'].includes(sectionType) ? '\n**ICON NAMING:** For icon fields, use lowercase single-word react-icons names only (e.g., "trophy", "star", "award", "briefcase", "code", "heart", "wrench", "lightbulb", etc.). Keep it simple and use common icon names.' : ''}

INSTRUCTIONS:
1. Apply the requested changes while following the section guidance above
2. Keep the same JSON structure - don't change keys or format
3. Be creative and thoughtful in interpreting their feedback
4. If they say "more professional" - elevate the language and tone
5. If they say "shorter" - be concise while keeping key info
6. If they say "add more detail" - expand with relevant, profession-appropriate content
    (Above are examples, the user can say anything and you have to use your own knowledge to respond properly in the context of it)
7. If they mention specific changes - make exactly those changes
8. Ensure improved content still fits the section's purpose (see guidance above)

Return JSON:
{
    "content": { the improved content with same structure },
    "message": "A friendly message explaining what you changed"
}`;
        // Retry logic for JSON parsing failures
        const maxAttempts = 3;
        let lastError;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const maxTokens = 1500 + (attempt - 1) * 500;
                const text = await (0, gemini_service_1.generateWithFallback)({ temperature: 0.7, maxOutputTokens: maxTokens, responseMimeType: 'application/json' }, prompt);
                const parsed = this.extractJson(text);
                if (!parsed.content) {
                    throw new Error('No content in response');
                }
                const displayContent = this.formatContentForDisplay(parsed.content, sectionType);
                return {
                    content: parsed.content,
                    message: parsed.message || "I've updated the content based on your feedback!",
                    displayContent
                };
            }
            catch (error) {
                lastError = error;
                const isJsonError = ((_a = error === null || error === void 0 ? void 0 : error.message) === null || _a === void 0 ? void 0 : _a.includes('Failed to parse JSON')) ||
                    ((_b = error === null || error === void 0 ? void 0 : error.message) === null || _b === void 0 ? void 0 : _b.includes('No content'));
                if (isJsonError && attempt < maxAttempts) {
                    logger_1.default.warn(`JSON parsing failed in improve, retrying (attempt ${attempt}/${maxAttempts})`);
                    continue;
                }
                break;
            }
        }
        logger_1.default.error('Content improvement failed after retries', lastError);
        throw new Error('Failed to improve content. Please try again.');
    }
    /**
     * Legacy method for backward compatibility
     */
    static analyzeDataSufficiency(sectionType, context, conversationHistory) {
        return {
            hasSufficientData: true,
            missingInfo: [],
            availableInfo: [`Name: ${context.name}`, `Type: ${context.portfolioType}`]
        };
    }
}
exports.AIService = AIService;
exports.default = AIService;
