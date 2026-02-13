"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssistantChatService = void 0;
const database_1 = __importDefault(require("../config/database"));
const portfolio_service_new_1 = __importDefault(require("./portfolio.service.new"));
const ai_service_1 = __importDefault(require("./ai.service"));
const gemini_service_1 = require("./gemini.service");
const logger_1 = __importDefault(require("../utils/logger"));
// ============================================
// ASSISTANT CHAT SERVICE — Fully Conversational
// ============================================
class AssistantChatService {
    // ------------------------------------------
    // JSON helpers (reused from ai.service pattern)
    // ------------------------------------------
    static attemptJsonFix(json) {
        try {
            let fixed = json.trim();
            if (fixed.match(/:\s*"[^"]*$/)) {
                const lastCompleteMatch = fixed.match(/(.*"[^"]*"[,\s\]}]*)/);
                if (lastCompleteMatch) {
                    fixed = lastCompleteMatch[1];
                }
            }
            fixed = fixed.replace(/,\s*$/, '');
            let braceCount = 0;
            let bracketCount = 0;
            let inString = false;
            let escapeNext = false;
            for (let i = 0; i < fixed.length; i++) {
                const ch = fixed[i];
                if (escapeNext) {
                    escapeNext = false;
                    continue;
                }
                if (ch === '\\') {
                    escapeNext = true;
                    continue;
                }
                if (ch === '"') {
                    inString = !inString;
                    continue;
                }
                if (!inString) {
                    if (ch === '{')
                        braceCount++;
                    if (ch === '}')
                        braceCount--;
                    if (ch === '[')
                        bracketCount++;
                    if (ch === ']')
                        bracketCount--;
                }
            }
            while (bracketCount > 0) {
                fixed += ']';
                bracketCount--;
            }
            while (braceCount > 0) {
                fixed += '}';
                braceCount--;
            }
            JSON.parse(fixed);
            return fixed;
        }
        catch (_a) {
            return null;
        }
    }
    static extractJson(text) {
        try {
            return JSON.parse(text);
        }
        catch (_a) {
            // continue
        }
        const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (codeMatch) {
            try {
                return JSON.parse(codeMatch[1].trim());
            }
            catch (_b) {
                const fixed = this.attemptJsonFix(codeMatch[1].trim());
                if (fixed)
                    return JSON.parse(fixed);
            }
        }
        const objectMatch = text.match(/\{[\s\S]*\}/);
        if (objectMatch) {
            try {
                return JSON.parse(objectMatch[0]);
            }
            catch (_c) {
                const fixed = this.attemptJsonFix(objectMatch[0]);
                if (fixed)
                    return JSON.parse(fixed);
            }
        }
        throw new Error('Failed to parse JSON from AI response');
    }
    // ------------------------------------------
    // DB helpers
    // ------------------------------------------
    static async getRecentConversationHistory(chatId, limit = 8) {
        const query = `
            SELECT role, content
            FROM assistant_chat_messages
            WHERE chat_id = $1
            ORDER BY created_at DESC
            LIMIT $2
        `;
        const result = await database_1.default.query(query, [chatId, limit]);
        const chronological = result.rows.reverse();
        return chronological.map((row) => ({
            role: row.role === 'assistant' ? 'ai' : 'user',
            content: row.content
        }));
    }
    static async markProposalResolved(messageId) {
        await database_1.default.query(`
            UPDATE assistant_chat_messages
            SET metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb
            WHERE id = $1
            `, [
            messageId,
            JSON.stringify({ resolved: true, resolvedAt: new Date().toISOString() })
        ]);
    }
    static async findPendingProposal(chatId, proposalMessageId) {
        if (proposalMessageId) {
            const byIdQuery = `
                SELECT id, metadata
                FROM assistant_chat_messages
                WHERE id = $1
                  AND chat_id = $2
                  AND role = 'assistant'
                  AND metadata->>'status' = 'pending_portfolio_proposal'
                  AND COALESCE(metadata->>'resolved', 'false') != 'true'
                LIMIT 1
            `;
            const byIdResult = await database_1.default.query(byIdQuery, [proposalMessageId, chatId]);
            return byIdResult.rows[0] || null;
        }
        const query = `
            SELECT id, metadata
            FROM assistant_chat_messages
            WHERE chat_id = $1
              AND role = 'assistant'
              AND metadata->>'status' = 'pending_portfolio_proposal'
              AND COALESCE(metadata->>'resolved', 'false') != 'true'
            ORDER BY created_at DESC
            LIMIT 1
        `;
        const result = await database_1.default.query(query, [chatId]);
        return result.rows[0] || null;
    }
    static buildPortfolioContext(portfolio) {
        var _a;
        const wizardData = portfolio.wizard_data || {};
        const existingSections = (portfolio.sections || []).reduce((acc, section) => {
            if (section.content && Object.keys(section.content).length > 0) {
                acc[section.type] = section.content;
            }
            return acc;
        }, {});
        // Include theme info
        const currentTheme = portfolio.theme || 'modern';
        const currentColor = ((_a = portfolio.wizard_data.color_scheme) === null || _a === void 0 ? void 0 : _a.name) || 'default';
        return {
            name: wizardData.name || portfolio.name,
            profession: wizardData.profession || portfolio.profession || undefined,
            description: wizardData.description || portfolio.description || undefined,
            portfolioType: portfolio.portfolio_type,
            existingSections,
            // @ts-ignore - extending context dynamically
            theme: currentTheme,
            colorScheme: currentColor
        };
    }
    // ------------------------------------------
    // Portfolio proposal application (unchanged)
    // ------------------------------------------
    static async applyPortfolioProposal(chat, portfolio, proposal) {
        const sectionId = proposal.metadata.sectionId;
        const sectionType = proposal.metadata.sectionType;
        const proposedContent = proposal.metadata.proposedContent;
        if (!sectionId || !sectionType || !proposedContent) {
            await this.markProposalResolved(proposal.id);
            return this.addMessage(chat.id, 'assistant', 'I found a pending proposal but it was incomplete, so I skipped it. Please ask me to generate it again.');
        }
        const sectionIndex = portfolio.sections.findIndex((section) => section.id === sectionId);
        if (sectionIndex === -1) {
            await this.markProposalResolved(proposal.id);
            return this.addMessage(chat.id, 'assistant', 'The target section no longer exists in this portfolio. Please ask again and I will rebuild it.');
        }
        const updatedSections = [...portfolio.sections];
        updatedSections[sectionIndex] = {
            ...updatedSections[sectionIndex],
            content: proposedContent
        };
        await portfolio_service_new_1.default.updateSections(portfolio.id, portfolio.user_id, updatedSections);
        await this.markProposalResolved(proposal.id);
        return this.addMessage(chat.id, 'assistant', `Done! I've updated the **${sectionType}** section. The changes are now live. ✅\n\nFeel free to ask for more edits or adjustments!`, {
            action: 'approved_portfolio_proposal',
            sectionId,
            sectionType,
            proposalMessageId: proposal.id
        });
    }
    static async updatePortfolioSettings(portfolioId, settings) {
        if (!settings.theme && !settings.colorScheme)
            return;
        const updates = [];
        const values = [];
        let paramIndex = 1;
        const wizardDataUpdates = {};
        if (settings.theme) {
            updates.push(`theme = $${paramIndex++}`);
            values.push(settings.theme.toLowerCase());
            wizardDataUpdates.theme = settings.theme.toLowerCase();
        }
        if (settings.colorScheme) {
            // We need to look up the full color scheme object based on the name if possible,
            // but for now we might have to just rely on the frontend or a fixed list.
            // Ideally, we should fetch the color definition.
            // For this implementation, we will assume we update the NAME in wizard_data or similar,
            // but the DB has a JSONB column `color_scheme`.
            // NOTE: The `portfolios` table has `color_scheme` as jsonb.
            // We need the actual colors. Since we don't have the constants here easily without importing them,
            // we will try to look it up or just update the wizard_data which drives the UI in some places,
            // BUT `PublicPortfolioPage` uses `portfolio.color_scheme`.
            // FAST FIX: We will just update the theme and let the user handle colors via wizard if complex,
            // OR we map a few common ones here.
            // Implementation: We will trust the AI to validly identify common schemes, but we need the hex codes.
            // Since we can't easily import the frontend constants, we'll skip color scheme updates for now
            // unless we duplicate the constants.
            // Let's stick to THEME updates first as requested, and colors if we can.
            // Wait, the user asked for "Theme AND color scheme".
            // I'll import the basic ones or defined them here.
            const COMMON_SCHEMES = {
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
            const colors = COMMON_SCHEMES[settings.colorScheme.toLowerCase()];
            if (colors) {
                const colorSchemeObj = { name: settings.colorScheme.toLowerCase(), colors };
                // Update root column
                updates.push(`color_scheme = $${paramIndex++}::jsonb`);
                values.push(JSON.stringify(colorSchemeObj));
                // Update wizard_data mapping (camelCase for frontend compatibility)
                wizardDataUpdates.colorScheme = colorSchemeObj;
            }
        }
        if (Object.keys(wizardDataUpdates).length > 0) {
            updates.push(`wizard_data = wizard_data || $${paramIndex++}::jsonb`);
            values.push(JSON.stringify(wizardDataUpdates));
        }
        if (updates.length === 0)
            return;
        values.push(portfolioId);
        await database_1.default.query(`UPDATE portfolios SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`, values);
    }
    // ------------------------------------------
    // Public CRUD methods (unchanged)
    // ------------------------------------------
    static async getContextOptions(userId) {
        const portfolios = await portfolio_service_new_1.default.getByUserId(userId);
        return {
            portfolios: portfolios.map((portfolio) => ({
                portfolioId: portfolio.id,
                name: portfolio.name || 'Untitled Portfolio',
                status: portfolio.status,
                updatedAt: portfolio.updated_at.toISOString()
            })),
            aiManagers: portfolios
                .filter((portfolio) => portfolio.has_ai_manager && portfolio.ai_manager_name)
                .map((portfolio) => ({
                portfolioId: portfolio.id,
                portfolioName: portfolio.name || 'Untitled Portfolio',
                managerName: portfolio.ai_manager_name || 'AI Manager',
                finalized: Boolean(portfolio.ai_manager_finalized),
                updatedAt: portfolio.updated_at.toISOString()
            }))
        };
    }
    static async getChats(userId) {
        const query = `
            SELECT c.*, p.name as portfolio_name, p.ai_manager_name
            FROM assistant_chats c
            INNER JOIN portfolios p ON p.id = c.portfolio_id
            WHERE c.user_id = $1
            ORDER BY c.updated_at DESC
        `;
        const result = await database_1.default.query(query, [userId]);
        return result.rows;
    }
    static async getChatById(chatId, userId) {
        const query = `
            SELECT c.*, p.name as portfolio_name, p.ai_manager_name
            FROM assistant_chats c
            INNER JOIN portfolios p ON p.id = c.portfolio_id
            WHERE c.id = $1 AND c.user_id = $2
            LIMIT 1
        `;
        const result = await database_1.default.query(query, [chatId, userId]);
        return result.rows[0] || null;
    }
    static async getMessages(chatId) {
        const query = `
            SELECT id, chat_id, role, content, metadata, created_at
            FROM assistant_chat_messages
            WHERE chat_id = $1
            ORDER BY created_at ASC
        `;
        const result = await database_1.default.query(query, [chatId]);
        return result.rows;
    }
    static async renameChat(chatId, userId, newTitle) {
        const query = `
            UPDATE assistant_chats
            SET title = $1, updated_at = NOW()
            WHERE id = $2 AND user_id = $3
            RETURNING *
        `;
        const result = await database_1.default.query(query, [newTitle.trim(), chatId, userId]);
        if (result.rowCount === 0) {
            throw new Error('Chat not found or access denied');
        }
        // We also need to fetch the joined data to match the AssistantChat interface fully 
        // (with portfolio_name, etc.), but for a simple rename, returning the updated row is often enough 
        // IF the frontend updates optimistically. However, to be safe, let's fetch the full object.
        return this.getChatById(chatId, userId);
    }
    static async createChat(userId, contextType, portfolioId, title) {
        const portfolio = await portfolio_service_new_1.default.getById(portfolioId, userId);
        if (!portfolio) {
            throw new Error('Portfolio not found');
        }
        if (contextType === 'ai_manager' && !portfolio.has_ai_manager) {
            throw new Error('This portfolio does not have an AI manager yet');
        }
        const defaultTitle = contextType === 'portfolio'
            ? `Portfolio: ${portfolio.name || 'Untitled Portfolio'}`
            : `AI Manager: ${portfolio.ai_manager_name || portfolio.name || 'Untitled Portfolio'}`;
        const createChatQuery = `
            INSERT INTO assistant_chats (user_id, context_type, portfolio_id, title)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const chatResult = await database_1.default.query(createChatQuery, [
            userId,
            contextType,
            portfolioId,
            (title || defaultTitle).trim().slice(0, 255)
        ]);
        const chat = chatResult.rows[0];
        // Build a friendly intro with section overview for portfolio context
        let introMessage;
        if (contextType === 'portfolio') {
            const sections = Array.isArray(portfolio.sections) ? portfolio.sections : [];
            const sectionList = sections
                .filter((s) => s.content && Object.keys(s.content).length > 0)
                .map((s) => `• **${s.title || s.type}**`)
                .join('\n');
            introMessage = `Hey! 👋 You're now editing **${portfolio.name || 'your portfolio'}**.\n\nHere are your current sections:\n${sectionList || '_(No sections with content yet)_'}\n\nJust tell me what you'd like to change — update text, tweak content, rearrange items, or even **change your theme**! 🎨\n\nWhat would you like to work on?`;
        }
        else {
            introMessage = `Hey! 👋 You're now configuring **${portfolio.ai_manager_name || 'your AI manager'}**.\n\nTell me any behavior rules, business context, or instructions you want this manager to follow. I'll merge them into its instruction set.`;
        }
        const initialMessage = await this.addMessage(chat.id, 'assistant', introMessage, {
            type: 'intro',
            contextType
        });
        return {
            chat,
            initialMessage
        };
    }
    static async addMessage(chatId, role, content, metadata = {}) {
        const query = `
            INSERT INTO assistant_chat_messages (chat_id, role, content, metadata)
            VALUES ($1, $2, $3, $4::jsonb)
            RETURNING id, chat_id, role, content, metadata, created_at
        `;
        const result = await database_1.default.query(query, [chatId, role, content, JSON.stringify(metadata)]);
        await database_1.default.query('UPDATE assistant_chats SET updated_at = NOW() WHERE id = $1', [chatId]);
        return result.rows[0];
    }
    // ------------------------------------------
    // AI Manager flow (unchanged)
    // ------------------------------------------
    static async mergeAiManagerInstructions(portfolio, userInstruction) {
        const existing = (portfolio.ai_manager_custom_instructions || '').trim();
        const prompt = `You are assisting a portfolio owner who is updating their AI manager instruction set.

Existing instructions:
${existing || 'None yet.'}

New instruction from owner:
${userInstruction}

Return ONLY valid JSON:
{
  "updatedInstructions": "A concise instruction block in plain text. Keep it clear and directly enforceable.",
  "reply": "A short confirmation message summarizing what was added/changed."
}`;
        const text = await (0, gemini_service_1.generateWithFallback)({ temperature: 0.4, maxOutputTokens: 700, responseMimeType: 'application/json' }, prompt);
        const parsed = this.extractJson(text);
        const updatedInstructions = (parsed.updatedInstructions || `${existing}\n- ${userInstruction}`).trim();
        const reply = (parsed.reply || 'Done. I updated your AI manager instructions.').trim();
        await database_1.default.query(`UPDATE portfolios SET ai_manager_custom_instructions = $1, updated_at = NOW() WHERE id = $2`, [updatedInstructions, portfolio.id]);
        return { reply, updatedInstructions };
    }
    // =============================================
    // CORE: AI-Orchestrated Portfolio Conversation
    // =============================================
    static async processPortfolioInstruction(chat, portfolio, userInstruction) {
        var _a, _b;
        const sections = Array.isArray(portfolio.sections) ? portfolio.sections : [];
        if (sections.length === 0) {
            return this.addMessage(chat.id, 'assistant', 'This portfolio has no sections yet. Head to the wizard to set up your sections first, then come back here to edit content! 🛠️');
        }
        // Build a snapshot of all sections for the AI
        const sectionsSnapshot = sections.map((s) => ({
            id: s.id,
            type: s.type,
            title: s.title || s.type,
            order: s.order,
            content: s.content || {}
        }));
        // Check for pending proposals
        const pendingProposal = await this.findPendingProposal(chat.id);
        // Get conversation history
        const conversationHistory = await this.getRecentConversationHistory(chat.id);
        const historyText = conversationHistory
            .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
            .join('\n');
        // Build portfolio context
        const context = this.buildPortfolioContext(portfolio);
        // Build the comprehensive prompt
        const prompt = this.buildConversationalPrompt(context, sectionsSnapshot, historyText, userInstruction, pendingProposal);
        // Call AI with retry logic
        const maxAttempts = 3;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const maxTokens = 2500 + (attempt - 1) * 500;
                logger_1.default.ai('Assistant chat attempt', { attempt, maxTokens, chatId: chat.id });
                const text = await (0, gemini_service_1.generateWithFallback)({ temperature: 0.6, maxOutputTokens: maxTokens, responseMimeType: 'application/json' }, prompt);
                const parsed = this.extractJson(text);
                const action = parsed.action || 'continue';
                const message = parsed.message || "I'm not sure what to do with that. Could you clarify?";
                const targetSectionId = parsed.targetSectionId || null;
                const targetSectionType = parsed.targetSectionType || null;
                const proposedContent = parsed.proposedContent || null;
                // New setting fields
                const targetSettings = parsed.targetSettings || null;
                logger_1.default.ai('Assistant chat response', {
                    action,
                    targetSectionType,
                    hasProposedContent: !!proposedContent,
                    hasTargetSettings: !!targetSettings,
                    attempt
                });
                // Handle actions
                switch (action) {
                    case 'update_settings': {
                        if (targetSettings) {
                            await this.updatePortfolioSettings(portfolio.id, targetSettings);
                            return this.addMessage(chat.id, 'assistant', message, {
                                action: 'updated_settings',
                                settings: targetSettings
                            });
                        }
                        // Fallthrough if missing settings
                        return this.addMessage(chat.id, 'assistant', "I tried to update the settings but missed the details. Could you say that again?");
                    }
                    case 'proposal': {
                        if (!targetSectionId || !proposedContent) {
                            // AI said proposal but didn't include required fields — treat as continue
                            return this.addMessage(chat.id, 'assistant', message, {
                                action: 'portfolio_conversation_continue'
                            });
                        }
                        // Format content for display
                        let displayContent;
                        try {
                            displayContent = ai_service_1.default.formatContentForDisplay(proposedContent, targetSectionType);
                        }
                        catch (_c) {
                            displayContent = undefined;
                        }
                        const proposalText = `${message}${displayContent ? `\n\n**Here's what the updated content will look like:**\n\n${displayContent}` : ''}\n\nReply **"approve"** to save this, or tell me what to change.`;
                        return this.addMessage(chat.id, 'assistant', proposalText, {
                            status: 'pending_portfolio_proposal',
                            sectionId: targetSectionId,
                            sectionType: targetSectionType,
                            proposedContent,
                            displayContent: displayContent || null,
                            aiAction: action
                        });
                    }
                    case 'apply_approved': {
                        if (!pendingProposal) {
                            return this.addMessage(chat.id, 'assistant', message || "There's no pending proposal to approve right now. Ask me for a change first!");
                        }
                        return this.applyPortfolioProposal(chat, portfolio, pendingProposal);
                    }
                    case 'reject_discarded': {
                        if (pendingProposal) {
                            await this.markProposalResolved(pendingProposal.id);
                        }
                        return this.addMessage(chat.id, 'assistant', message || "No problem, I've discarded that proposal. What would you like to change instead?", {
                            action: 'rejected_portfolio_proposal'
                        });
                    }
                    case 'continue':
                    default: {
                        return this.addMessage(chat.id, 'assistant', message, {
                            action: 'portfolio_conversation_continue',
                            ...(targetSectionId ? { sectionId: targetSectionId, sectionType: targetSectionType } : {})
                        });
                    }
                }
            }
            catch (error) {
                const isJsonError = (_a = error === null || error === void 0 ? void 0 : error.message) === null || _a === void 0 ? void 0 : _a.includes('Failed to parse JSON');
                if (isJsonError && attempt < maxAttempts) {
                    logger_1.default.warn(`JSON parsing failed in assistant chat, retrying (attempt ${attempt}/${maxAttempts})`);
                    continue;
                }
                logger_1.default.error('Assistant chat failed', error);
                return this.addMessage(chat.id, 'assistant', "Oops, something went wrong on my end. Could you try saying that again? 🙏", { action: 'error', error: (_b = error === null || error === void 0 ? void 0 : error.message) === null || _b === void 0 ? void 0 : _b.substring(0, 100) });
            }
        }
        // Fallback
        return this.addMessage(chat.id, 'assistant', "I'm having trouble processing that right now. Please try again in a moment.", { action: 'error' });
    }
    // ------------------------------------------
    // The mega prompt that powers the conversation
    // ------------------------------------------
    static buildConversationalPrompt(context, sections, conversationHistory, userMessage, pendingProposal) {
        const sectionsDetail = sections.map((s) => {
            const contentPreview = JSON.stringify(s.content || {}).substring(0, 150);
            return `  - id: "${s.id}" | type: "${s.type}" | title: "${s.title}" | content: ${contentPreview}...`;
        }).join('\n');
        // @ts-ignore
        const currentTheme = context.theme || 'modern';
        // @ts-ignore
        const currentColor = context.colorScheme || 'default';
        return `You are a friendly, intelligent portfolio editing assistant. The user is chatting with you to make changes to their live portfolio. You are conversational, warm, and helpful.

PORTFOLIO OWNER INFO:
- Name: "${context.name || 'Not provided'}"
- Profession/Industry: "${context.profession || 'Not provided'}"
- Description: "${context.description || 'Not provided'}"
- Type: ${context.portfolioType === 'company' ? 'Business Website' : 'Personal Portfolio'}

CURRENT STYLE SETTINGS:
- Theme: ${currentTheme} (Available: 'minimal', 'techie', 'elegant')
- Color Scheme: ${currentColor} (Available: 'warm', 'forest', 'ocean', 'luxury', 'berry', 'terra', 'teal', 'slate', 'monochrome')

CURRENT PORTFOLIO SECTIONS (this is the actual live data):
${sectionsDetail}

${pendingProposal ? `PENDING PROPOSAL:
There is a currently pending proposal that hasn't been approved/rejected yet.
- Target section: ${pendingProposal.metadata.sectionType} (id: ${pendingProposal.metadata.sectionId})
- Proposed content: ${JSON.stringify(pendingProposal.metadata.proposedContent).substring(0, 300)}
If the user is approving, rejecting, or modifying this proposal, act accordingly.` : 'No pending proposals.'}

CONVERSATION SO FAR:
${conversationHistory || 'This is the start of the conversation.'}

USER JUST SAID:
"${userMessage}"

YOUR CAPABILITIES & RULES:

1. **IDENTIFY INTENT**: Figure out what the user wants from context. They might say "change my headline" (hero section), "add a new team member" (team section), "switch to the sunset theme", etc.

2. **ASK WHEN UNCLEAR**: If you can't confidently determine which section or what change the user wants, ask a brief, friendly clarifying question. Don't guess — ask.

3. **EDIT EXISTING CONTENT**: When you understand the edit, prepare the ENTIRE updated section content. Output the full content object.

4. **CHANGE THEME/COLORS**: If the user wants to change the theme or color scheme:
   - Identify the target theme ('minimal', 'techie', 'elegant')
   - Identify the target color scheme ('warm', 'forest', 'ocean', 'luxury', 'berry', 'terra', 'teal', 'slate', 'monochrome')
   - If they specify one, just change that one.
   - Use action "update_settings" and provide "targetSettings".
   - You do NOT need a proposal for settings changes. Just change them and announce it ("I've updated your theme to Techie! 🎨").

5. **SHOW BEFORE SAVING**: For *content* changes, never save directly. Always create a proposal first.

6. **APPROVAL FLOW**: 
   - "apply_approved" for confirming *content* proposals.
   - "reject_discarded" for rejecting *content* proposals.
   - Settings changes (theme/color) happen immediately via "update_settings".

7. **FORMAT YOUR MESSAGES**: Use markdown. Be friendly.

RESPONSE FORMAT — Return ONLY valid JSON:
{
  "message": "Your friendly, markdown-formatted reply to the user",
  "action": "continue" | "proposal" | "apply_approved" | "reject_discarded" | "update_settings",
  "targetSectionId": "id of the section being edited (from the sections list above) or null",
  "targetSectionType": "type of the section or null",
  "proposedContent": { /* ONLY when action is 'proposal' */ },
  "targetSettings": { "theme": "...", "colorScheme": "..." } /* ONLY when action is 'update_settings'. keys are optional */
}
`;
    }
    // ------------------------------------------
    // Approve endpoint (for the explicit button)
    // ------------------------------------------
    static async approvePendingProposal(chat, proposalMessageId) {
        if (chat.context_type !== 'portfolio') {
            return this.addMessage(chat.id, 'assistant', 'Approval flow is only needed for portfolio edits.');
        }
        const portfolio = await portfolio_service_new_1.default.getById(chat.portfolio_id, chat.user_id);
        if (!portfolio) {
            return this.addMessage(chat.id, 'assistant', 'Portfolio not found for this chat.');
        }
        const pending = await this.findPendingProposal(chat.id, proposalMessageId);
        if (!pending) {
            return this.addMessage(chat.id, 'assistant', 'No pending proposal found to approve.');
        }
        return this.applyPortfolioProposal(chat, portfolio, pending);
    }
    // ------------------------------------------
    // Main entry point
    // ------------------------------------------
    static async handleUserMessage(chat, userMessage) {
        const portfolio = await portfolio_service_new_1.default.getById(chat.portfolio_id, chat.user_id);
        if (!portfolio) {
            return this.addMessage(chat.id, 'assistant', 'This context is no longer available. The linked portfolio may have been deleted.');
        }
        if (chat.context_type === 'ai_manager') {
            const result = await this.mergeAiManagerInstructions(portfolio, userMessage);
            return this.addMessage(chat.id, 'assistant', result.reply, {
                action: 'update_ai_manager_instructions',
                updatedInstructions: result.updatedInstructions
            });
        }
        return this.processPortfolioInstruction(chat, portfolio, userMessage);
    }
}
exports.AssistantChatService = AssistantChatService;
exports.default = AssistantChatService;
