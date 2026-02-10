/**
 * AI Service v3 - Truly Conversational & Helpful
 * 
 * No strict quality checks that block users.
 * AI helps users create content through natural conversation.
 * Options and choices appear in chat, final content appears in preview.
 */

import { SectionType } from './portfolio.service.new';
import { PLAN_LIMITS, Plan } from './credits.service';
import { generateWithFallback } from './gemini.service';
import logger from '../utils/logger';

// ============================================
// TYPES
// ============================================

export interface ConversationMessage {
    role: 'user' | 'ai';
    content: string;
    timestamp?: Date;
}

export interface ChatResponse {
    message: string;
    action: 'continue' | 'proposal' | 'ready';
    proposedContent?: any;
    displayContent?: string;
    isComplete?: boolean;
}

export interface PortfolioContext {
    name: string;
    profession?: string;
    description?: string;
    portfolioType: 'individual' | 'company';
    existingSections?: Record<string, any>;
}

// Section labels for display
export const SECTION_LABELS: Record<SectionType, string> = {
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

// Section content structures for AI guidance
const SECTION_STRUCTURES: Record<SectionType, string> = {
    hero: `headline (main title), subheadline (supporting text)`,
    about: `text (main paragraph/story)`,
    services: `items (array with: name, description, icon)`,
    skills: `heading, skills (simple array of skill names)`,
    experience: `heading, items (array with: role, company, period, description)`,
    projects: `heading, items (array with: name, description, tags, link)`,
    testimonials: `heading, items (array with: quote, author and role)`,
    contact: `heading, links`,
    faq: `heading, items (array with: question, answer)`,
    pricing: `heading, items (array with: price, condition, features)`,
    team: `heading, items (array with: name, role, bio, image, socials)`,
    menu: `heading, categories (array with: name, items with: name, description, price)`,
    achievements: `heading, items (array with: title, description)`,
    education: `heading, items (array with: title, description)`,
};

// Section-specific guidance for conversational building
const SECTION_GUIDANCE: Record<SectionType, string> = {
    hero: `
**HERO SECTION GUIDANCE:**
This is the first impression - make it count!

**What you need:**
- A nice, catchy headline according to the profession or industry with their name. (individual's name or business name) but not just the name, some more.
- For example: John Doe - Valuing Visual Appeal, recognising the poer of Art, etc etc
- A concise subheadline in first-person perspective


**Your approach:**
- We have the name and the industry and an about section, use these to build the heading and the subheading like i told u under the "What you need".
- Only ask for missing pieces, don't repeat questions about info they already shared
- If you have enough to build a good hero → DO IT, include it in proposedContent`,

    about: `
**ABOUT SECTION GUIDANCE:**
You have to identify their profession or industry and then decide what should an About section on this person/company's website sound/look like by using your great knowledge.And then create it.

**Review conversation history:**
They may have already shared some background info and you have it, look intoit and if that feels good eniugh use it, or ask for more.

**Your role:**
- Never add placeholders like [mention your experience] that they can fill in, alwaysconfirm the reality and then use it, if they refuse to share or any situation like that, just ignore making such a point where we'd need a placeholder.
- Create a flowing narrative in the text field.
- When you have it done → Build it with the tool: proposedContent`,

    services: `
**SERVICES/OFFERINGS GUIDANCE:**
- Showcase what they offer clearly - just service names with descriptions
- You may definitely need to ask them about their services if they didn't mention them, but if they did, use that info to build the section, if it's enough.
- If directly content generation is selected, you could always come up with a question if they never mentioned about their services or anything like that, like "What services do you offer?" or "Can you describe your main offerings?" and then use their answer to generate the content.
- Service name with 1-2 sentences description for each is generally enough, but if they want more, just agree on what the user wants.
- Build it when you have enough for proposedContent`,

    testimonials: `
**TESTIMONIALS GUIDANCE:**
-You have to collect the testimonials from the user if haven't mentioned anywhere yet, never assume it yourself, becasue you know why.
- Testimonials are nice-to-have, not required, but if the user says they don't have any, make them know that then this section will not be useful.
-If the user gives their testimonials and they are in the data format we have to store in, great, and if not just make whatever the user gives in that format intelligently. For example, If a user gives their testimonial like: veer adyani the product designer in my team said i am amazing, So here you will use your intelligence and store this info in the format of heading, quote, author and role, the quote becomes - "UserName is amazing, the author becomes Veer and role becomes Product designer. now here we dont know the user's company so we will just keep it as Product Designer. This is how you have to user your intelligence to format any given testimonial into the format we want. Mind you, this was just an example"
- When you have it done → Include in proposedContent`,

    contact: `
**CONTACT SECTION GUIDANCE:**
Make it easy for people to reach them.

**Check conversation:**
They may have already mentioned contact details. If not, ask them.

**Your approach:**
- Ask the user what contact information they'd like to add, ask something like: "Would you like to add your email, phone, location, or any social links?"
- Accept whatever information they provide on being asked but it should be contact info.
-Now use this info and intelligently format it into the format we want. which is heading and links.
-Example:
User says: My email is xyz@gmail.com, my phone is 87635382764 and my office is at this this address and my instagram is @ashley123 so this gets formatted into heading and links:"Instagram: @ashley123, Email:"xyz@gmail.com and so on" 
- Build with what you have for proposedContent`,

    projects: `
**PROJECTS/PORTFOLIO GUIDANCE:**
Showcase their best work.

**Check conversation:**
They may have already mentioned their projects or work.

**Your approach:**
- If they haven't mentioned projects, ask something like: "What are some of your standout projects or key work you'd like to showcase?"
- Accept whatever information they provide about their projects
- Use your intelligence to format whatever they give into the data format: name, description, tags, link, image
- For example, if they say "I built a cool e-commerce site with React", format it as: name: "E-commerce Platform", description: "Built with React", tags: ["React", "E-commerce", put link only if they provide, ask if they have any links for these projects and if not leave link empty.]
- Build when you have their projects for proposedContent`,

    experience: `
**WORK EXPERIENCE GUIDANCE:**
Timeline of their professional journey.

**Check conversation:**
They may have already shared their work history.

**Your approach:**
- If not mentioned, ask something like: "Can you share your work experience? Where have you worked and what roles did you have?"
- Accept whatever information they provide
- Use your intelligence to format into: role, company, period, description
- For example, if they say "I was a senior dev at Google for 3 years", format it as: role: "Senior Developer", company: "Google", period: "2020-2023", description: based on context
- Build when you have their experience for proposedContent`,

    skills: `
**SKILLS GUIDANCE:**
Display their expertise areas.

**Check conversation:**
They may have mentioned their skills, tools, technologies, etc.

**Your approach:**
- If they described their work, you can infer skills from context
- If skills not mentioned, ask something like: "What are your main skills or technologies you work with?"
- Accept whatever they provide
- Use your intelligence to format into a simple array of skill names
- For example, if they say "I know React, Node, Python, and design tools like Figma", format as: ["React", "Node.js", "Python", "Figma"]
- Build when you have their skills for proposedContent`,

    faq: `
**FAQ GUIDANCE:**
Answer common visitor questions.

**Check conversation:**
They may have mentioned common questions they receive.

**Your approach:**
- If not mentioned, ask: "Do you have any frequently asked questions you'd like to include? Or should I suggest some common ones for your industry?"
- Accept whatever questions they provide
- If they want suggestions, offer industry-relevant FAQs based on their profession
- Use your intelligence to format into: question, answer pairs
- For example, if they say "People always ask about my pricing and turnaround time", create proper Q&A pairs with detailed answers based on context
- Build when you have the FAQs for proposedContent`,

    pricing: `
**PRICING GUIDANCE:**
Clear pricing builds trust. Every business has a unique pricing model - adapt to theirs!

**Check conversation:**
They may have mentioned their pricing structure.

**Your approach:**
- If not mentioned, ask something like: "Would you like to include pricing information? You can share however you price your services - hourly, per project, daily, monthly, packages, or any other way."
- Accept whatever pricing model they describe
- Use your intelligence to format into: price, condition, features
  * **price**: The actual price amount (e.g., "$50", "$5,000", "$99")
  * **condition**: The plan/package name, timeline, or context (e.g., "Hourly", "Per Project", "Basic Plan", "Monthly", "Per Day", "Starter Package", "Enterprise")
  * **features**: Array of what's included or details about this pricing option
- Examples of what user says → what you format:
  * User says: "I charge $50 per hour"
    → Format as: {price: "$50", condition: "Per Hour", features: [Notice here no features were told so ask for them and then dp what the user says. see further examples on how to store data.]}
  
  * User says: "Full project cost is $5000 with revisions included"
    → Format as: {price: "$5,000", condition: "Full Project", features: [ "Includes revisions" , here notice only one thing was said, so ask if wanna add more and if given, add more and if not move on, if asked to suggest, suggest based on context, never assume things.]}
  
  * User says: "We have a basic plan for $99/month with 5 pages and mobile responsive design"
    → Format as: {price: "$99", condition: "Basic Plan - Monthly", features: ["Up to 5 pages", "Mobile responsive"]}
  
  * User says: "My day rate is $400"
    → Format as: {price: "$400", condition: "Daily Rate", features: [see example 1]}
  
  * User says: "I have three tiers: $500 for starter, $1200 for pro, and $3000 for enterprise"
    → Format as: [{price: "$500", condition: "Starter Package", features: [...]}, {price: "$1,200", condition: "Pro Package", features: [...]}, {price: "$3,000", condition: "Enterprise Package", features: [...]}]
- If they have multiple pricing options, create an item for each
- If they have single pricing, create one item
- Build when you have their pricing for proposedContent`,

    team: `
**TEAM GUIDANCE:**
Introduce the people behind the work.

**Check conversation:**
They may have mentioned their team members.

**Your approach:**
- If not mentioned, ask something like: "Would you like to showcase your team? Please share their names, roles, and brief descriptions."
- Accept whatever team information they provide
- Use your intelligence to format into: name, role, bio, socials
- **Note:** We don't have the feature for images yet, so clearly inform them about it
- For **bio**: If given, add it. If not given, ask if they want to add it. If they don't want to add or say it's not necessary, it can be left empty
- For **socials**: If they provide social links (LinkedIn, Twitter, etc.), add them. If not mentioned, ask if they'd like to add social links for team members. If they don't want to add, it can be left empty
- Example: If they say "Sarah leads design and John handles development"
  → Format as: [{name: "Sarah", role: "Design Lead", bio: [ask for bio - if given add, if not wanted leave empty], socials: [ask for socials - if given add, if not wanted leave empty]}, {name: "John", role: "Developer", bio: [same approach], socials: [same approach]}]
- Build when you have team info for proposedContent`,

    menu: `
**MENU GUIDANCE:**

**Check conversation:**
They may have mentioned their menu items.

**Your approach:**
- If not mentioned, ask something like: "Please share your menu items - what do you offer? Include names, descriptions, and prices if you'd like."
- Accept whatever menu information they provide
- Use your intelligence to format into categories with items: name, description, price
- **For description field:**
  * If user provides description → Add it directly
  * If user doesn't provide description → Use your intelligence to create a brief, appealing description based on the item name and context
- Examples:
  * User says: "We have lattes for $5, cappuccinos $4.50, and croissants $3"
    → Format as: Beverages: [{name: "Latte", price: "$5", description: "Smooth and creamy espresso with steamed milk"}, {name: "Cappuccino", price: "$4.50", description: "Rich espresso topped with frothy milk foam"}], Pastries: [{name: "Croissant", price: "$3", description: "Buttery, flaky French pastry"}]
  
  * User says: "Margherita pizza $12 - classic tomato and mozzarella, Pepperoni pizza $14"
    → Format as: Pizzas: [{name: "Margherita", price: "$12", description: "Classic tomato and mozzarella"}, {name: "Pepperoni", price: "$14", description: "Topped with spicy pepperoni slices"}]
- Build when you have menu items for proposedContent`,

    achievements: `
**ACHIEVEMENTS GUIDANCE:**
Highlight accomplishments and milestones.
 
**Check conversation:**
They may have mentioned their achievements or awards.

**Your approach:**
- If not mentioned, ask something like: "Do you have any notable achievements, awards, or milestones you'd like to highlight?"
- Accept whatever achievement information they provide
- Use your intelligence to format into: title, description (only these two fields)
- If they mention dates, awards details, or other information, incorporate it intelligently into the title and description
- Examples of what user says → what you format:
  * User says: "I won best startup award in 2023"
    → Format as: {title: "Best Startup Award 2023", description: "Recognized as the best startup."}
  
  * User says: "Reached 10k users last year"
    → Format as: {title: "10,000 Users Milestone", description: "Successfully grew user base to 10,000 active users"}
  
  * User says: "Featured in TechCrunch magazine for our AI product"
    → Format as: {title: "Featured in TechCrunch", description: "Our AI product was featured in TechCrunch magazine for its innovative approach"}
  
  * User says: "Completed 500+ projects with 99% client satisfaction"
    → Format as: {title: "500+ Successful Projects", description: "Delivered over 500 projects with 99% client satisfaction rate"}
- Build when you have achievements for proposedContent`,

    education: `
**EDUCATION GUIDANCE:**
Academic background and credentials.

**Check conversation:**
They may have mentioned their educational background.

**Your approach:**
- If not mentioned, ask something like: "Would you like to include your educational background? This can include degrees, certificates, courses, or any relevant training."
- Accept whatever education information they provide
- Use your intelligence to format into: title, description (only these two fields)
- Education can be degrees, certificates, online courses, bootcamps, or any learning - format it all intelligently
- If they mention institutions, dates, honors, or other details, incorporate them into the title and description using your intelligence
- Examples of what user says → what you format:
  * User says: "I studied Computer Science at MIT from 2015-2019"
    → Format as: {title: "Bachelor of Science in Computer Science - MIT", description: "2015-2019"}
  
  * User says: "Got AWS certification last year"
    → Format as: {title: "AWS Certified Solutions Architect", description: "Professional certification obtained in 2025. (Here you obtain the year from knowing the current year and going to the last year from that year.)"}
  
  * User says: "Completed a web development bootcamp at Le Wagon in 2022"
    → Format as: {title: "Web Development Bootcamp - Le Wagon", description: "Intensive full-stack development program completed in 2022"}
  
  * User says: "Master's degree in Design from Stanford, graduated with honors"
    → Format as: {title: "Master of Design - Stanford University", description: "Graduated with honors, specializing in design"}
  
  * User says: "Took an online machine learning course of 56 hours from Coursera "
    → Format as: {title: "Machine Learning Specialization - Coursera", description: "Online certification program covering ML fundamentals and applications - 56 hours of coursework"}
- Build when you have education info for proposedContent`
};

// ============================================
// AI SERVICE
// ============================================

export class AIService {

    /**
     * Helper to extract and parse JSON from AI response
     * Handles cases where AI adds markdown formatting, conversational text, or truncated responses
     */
    private static extractJson(text: string): any {
        // First try strict parse
        try {
            return JSON.parse(text);
        } catch (e) {
            // Continue to other methods
        }

        // Try extracting from markdown code blocks
        const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
            try {
                return JSON.parse(codeBlockMatch[1].trim());
            } catch (e) {
                // Continue to other methods
            }
        }

        // Try finding JSON object in text
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch (e) {
                // Try to fix truncated JSON
                const fixedJson = this.attemptJsonFix(jsonMatch[0]);
                if (fixedJson) {
                    try {
                        return JSON.parse(fixedJson);
                    } catch (e2) {
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
    private static attemptJsonFix(json: string): string | null {
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
                    if (char === '{') braceCount++;
                    if (char === '}') braceCount--;
                    if (char === '[') bracketCount++;
                    if (char === ']') bracketCount--;
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
            logger.info('Successfully fixed truncated JSON');
            return fixed;
            
        } catch (e) {
            return null;
        }
    }

    /**
     * Format content for human-readable display (not JSON)
     * Uses double newlines for proper Markdown paragraph breaks
     */
    static formatContentForDisplay(content: any, sectionType: SectionType): string {
        if (!content) return '';

        const lines: string[] = [];

        const formatValue = (key: string, value: any, indent = ''): void => {
            // Skip icon fields from display
            if (key === 'icon') return;
            
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
                                    lines.push(`${sublabel}: ${(v as string[]).join(', ')}`);
                                } else if (typeof v === 'string' && v.length > 50) {
                                    // Long text gets its own line
                                    lines.push(`${v}`);
                                } else {
                                    lines.push(`${sublabel}: ${v}`);
                                }
                            }
                        });
                    } else {
                        lines.push(`• ${item}`);
                    }
                });
            } else if (typeof value === 'object' && value !== null) {
                lines.push(`**${label}:**`);
                Object.entries(value).forEach(([k, v]) => {
                    formatValue(k, v, indent + '  ');
                });
            } else if (value) {
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
    static async recommendSections(
        portfolioType: 'individual' | 'company',
        profession: string,
        description: string,
        plan: Plan = 'free'
    ): Promise<{ sections: SectionType[]; reasoning: string }> {
        logger.ai('Recommending sections', { portfolioType, profession, descriptionLength: description.length, plan });

        const maxCustomSections = PLAN_LIMITS[plan].maxSections;
        const totalSections = maxCustomSections + 2; // +2 for mandatory hero and contact
        const availableSections = Object.keys(SECTION_LABELS).join(', ');

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

        try {
            const text = await generateWithFallback(
                { temperature: 0.4, maxOutputTokens: 500, responseMimeType: 'application/json' },
                prompt
            );
            const parsed = this.extractJson(text);

            let validSections = parsed.sections
                .filter((s: string) => s in SECTION_LABELS)
                .slice(0, totalSections) as SectionType[];

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
                const defaults: SectionType[] = ['about', 'services', 'projects', 'experience', 'testimonials'];
                for (const def of defaults) {
                    if (!validSections.includes(def) && validSections.length < totalSections) {
                        const contactIndex = validSections.indexOf('contact');
                        if (contactIndex !== -1) {
                            validSections.splice(contactIndex, 0, def);
                        } else {
                            validSections.push(def);
                        }
                    }
                }
            }

            return { sections: validSections, reasoning: parsed.reasoning };

        } catch (error) {
            logger.error('AI section recommendation failed', error);
            // Always include hero and contact, fill middle with defaults
            const middleDefaults: SectionType[] = ['about', 'services', 'experience', 'projects', 'testimonials'];
            const sections: SectionType[] = ['hero'];
            const maxCustomSections = PLAN_LIMITS[plan].maxSections;
            sections.push(...middleDefaults.slice(0, maxCustomSections));
            sections.push('contact');
            return {
                sections: sections.slice(0, maxCustomSections + 2),
                reasoning: 'Here are essential sections to get you started!'
            };
        }
    }

    /**
     * Main chat method - truly conversational and helpful
     * No strict quality checks - AI guides users naturally
     */
    static async chat(
        sectionType: SectionType,
        userMessage: string,
        context: PortfolioContext,
        conversationHistory: ConversationMessage[]
    ): Promise<ChatResponse> {

        logger.divider(`CHAT: ${sectionType.toUpperCase()}`);
        logger.conversation('User message', { message: userMessage.substring(0, 100), historyLength: conversationHistory.length });

        const historyText = conversationHistory
            .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
            .join('\n');

        const existingContent = context.existingSections || {};

        const prompt = `You are a friendly, helpful AI assistant helping someone build their ${SECTION_LABELS[sectionType]} section for their ${context.portfolioType === 'company' ? 'business' : 'personal'} portfolio.

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
${['achievements', 'services'].includes(sectionType) ? '\n**ICON NAMING:** For icon fields, use lowercase single-word react-icons names only (e.g., "trophy", "star", "award", "briefcase", "code", "heart", "wrench", "lightbulb" , etc etc etc, according to the usecase). Keep it simple and use common icon names.' : ''}

CRITICAL INSTRUCTIONS - READ CAREFULLY:

**CONTEXT AWARENESS:**
- Review "CONVERSATION SO FAR" and "PROFILE INFO" above - the user may have ALREADY shared relevant information
- DON'T ask for info they've already provided in previous messages
- USE that existing context to intelligently build sections
- Example: If they said "I'm a baker called Star Bakery" → You already know their name and profession for the hero section

**WHEN TO BUILD SECTIONS:**
- If you have enough info from conversation history → BUILD IT NOW with proposedContent
- Don't wait for "complete" information - work with what you have
- You will never use placeholders like [Your Name] or [Add details] for missing pieces, isntead clarify with the user for more inofo and if there's any sort of blcoker in that, choose to simply not respons with something that needs a placeholder but something that doesn't and still makes sense.
- Better to clarify than adding useleff, uncleared and unapproved information that will need editing later.

**SHOWING OPTIONS:**
When presenting CHOICES, put them IN YOUR MESSAGE with numbers:
   "Here are some headline options:(these are just examples. your options need to be in the context of what the conversation is and what's been asked)
   1. **Bold & Direct**: 'Transforming Ideas Into Reality'
   2. **Personal Touch**: 'Hi, I'm Alex - Your Creative Partner'  
   3. **Action-Focused**: 'Let's Build Something Amazing Together'
   
   Which style speaks to you? Just reply with the number!"

**FINALIZING CONTENT:**
- When user picks an option (says "1", "option 2", "the first one") → Generate FULL section content in proposedContent
- If user says "generate", "create", or "help me" → CREATE content based on what you know
- When you create FINAL content → include it in proposedContent for approval
- NEVER show JSON to users - format content naturally in your message

**DISPLAYING CONTENT:**
When showing what content will look like, format it naturally:
   "**Headline:** Your amazing headline here
   **Subheadline:** Supporting text goes here"
   NOT as JSON!

**BE HELPFUL:**
- Never refuse to help or say you need more info
- Don't always Work with what you have you can always ask a few questions, never create placeholders as stated above.
- Be encouraging: "Let's build this together! Here's what I've created based on what you told me..."

RESPONSE RULES:
- Asking questions or showing options → action: "continue", NO proposedContent
- Created final content for approval → action: "proposal", include proposedContent with actual data
- User approves ("looks good", "yes", "save", "approve") → action: "ready", isComplete: true

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
                
                const text = await generateWithFallback(
                    { temperature: 0.7, maxOutputTokens: maxTokens, responseMimeType: 'application/json' },
                    prompt
                );
                const parsed = this.extractJson(text);

                // Add formatted display content if we have proposed content
                let displayContent: string | undefined;
                if (parsed.proposedContent) {
                    displayContent = this.formatContentForDisplay(parsed.proposedContent, sectionType);
                }

                logger.ai('Chat response', {
                    action: parsed.action,
                    hasContent: !!parsed.proposedContent,
                    messageLength: parsed.message?.length || 0,
                    attempt
                });

                return {
                    message: parsed.message || "I'd love to help! Tell me what you'd like in this section.",
                    action: parsed.action || 'continue',
                    proposedContent: parsed.proposedContent,
                    displayContent,
                    isComplete: parsed.isComplete || false
                };

            } catch (error: any) {
                const isJsonError = error?.message?.includes('Failed to parse JSON');
                
                if (isJsonError && attempt < maxAttempts) {
                    logger.warn(`JSON parsing failed in chat, retrying (attempt ${attempt}/${maxAttempts})`);
                    continue;
                }
                
                logger.error('Chat failed', error);
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
    static async generateSectionContent(
        sectionType: SectionType,
        context: PortfolioContext,
        additionalInfo?: string
    ): Promise<{ content: any; message: string; displayContent: string }> {

        logger.divider(`GENERATE: ${sectionType.toUpperCase()}`);

        const existingContent = context.existingSections || {};

        const prompt = `Create content for a ${SECTION_LABELS[sectionType]} section.

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
        let lastError: any;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                // Increase token limit on retries to avoid truncation
                const maxTokens = 2000 + (attempt - 1) * 500;
                
                const text = await generateWithFallback(
                    { temperature: 0.7, maxOutputTokens: maxTokens, responseMimeType: 'application/json' },
                    prompt
                );
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
                        logger.ai('Model returned content directly, wrapping it', { keys: Object.keys(parsed) });
                        content = parsed;
                        message = `Here's your ${SECTION_LABELS[sectionType]} section! Let me know if you'd like any changes.`;
                    }
                }

                if (!content) {
                    logger.error('No content in parsed response', { parsed: JSON.stringify(parsed).substring(0, 200) });
                    throw new Error('No content generated');
                }

                const displayContent = this.formatContentForDisplay(content, sectionType);

                logger.ai('Content generated', {
                    sectionType,
                    contentKeys: Object.keys(content || {}),
                    attempt
                });

                return {
                    content,
                    message: message || `Here's your ${SECTION_LABELS[sectionType]} section! Let me know if you'd like any changes.`,
                    displayContent
                };

            } catch (error: any) {
                lastError = error;
                const isJsonError = error?.message?.includes('Failed to parse JSON') || 
                                   error?.message?.includes('No content generated');
                
                if (isJsonError && attempt < maxAttempts) {
                    logger.warn(`JSON parsing failed, retrying (attempt ${attempt}/${maxAttempts})`, { 
                        error: error?.message?.substring(0, 100) 
                    });
                    continue;
                }
                
                // Not a JSON error or max retries reached
                break;
            }
        }

        logger.error('Content generation failed after retries', lastError);
        throw new Error(`I had trouble creating that. Could you tell me more about what you'd like for your ${SECTION_LABELS[sectionType]} section?`);
    }

    /**
     * Improve content based on user feedback
     */
    static async improveContent(
        sectionType: SectionType,
        currentContent: any,
        feedback: string
    ): Promise<{ content: any; message: string; displayContent: string }> {

        logger.ai('Improving content', { sectionType, feedback: feedback.substring(0, 50) });

        const prompt = `Improve this ${SECTION_LABELS[sectionType]} section content based on user feedback.

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
        let lastError: any;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const maxTokens = 1500 + (attempt - 1) * 500;
                
                const text = await generateWithFallback(
                    { temperature: 0.7, maxOutputTokens: maxTokens, responseMimeType: 'application/json' },
                    prompt
                );
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

            } catch (error: any) {
                lastError = error;
                const isJsonError = error?.message?.includes('Failed to parse JSON') || 
                                   error?.message?.includes('No content');
                
                if (isJsonError && attempt < maxAttempts) {
                    logger.warn(`JSON parsing failed in improve, retrying (attempt ${attempt}/${maxAttempts})`);
                    continue;
                }
                break;
            }
        }

        logger.error('Content improvement failed after retries', lastError);
        throw new Error('Failed to improve content. Please try again.');
    }

    /**
     * Legacy method for backward compatibility
     */
    static analyzeDataSufficiency(
        sectionType: SectionType,
        context: PortfolioContext,
        conversationHistory: ConversationMessage[]
    ): { hasSufficientData: boolean; missingInfo: string[]; availableInfo: string[] } {
        return {
            hasSufficientData: true,
            missingInfo: [],
            availableInfo: [`Name: ${context.name}`, `Type: ${context.portfolioType}`]
        };
    }
}

export default AIService;
