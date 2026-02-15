import crypto from 'crypto';
import pool from '../config/database';
import { AICapabilityKey, AI_CAPABILITY_KEYS, isAICapabilityKey } from '../constants/ai-capabilities';
import { generateWithFallback } from './gemini.service';
import ArchestraOutgoingEmailService from './archestra-outgoing-email.service';
import logger from '../utils/logger';

export interface CapabilityConfig {
    capability_key: AICapabilityKey;
    enabled: boolean;
    settings_json: Record<string, any>;
}

interface PortfolioRow {
    id: string;
    user_id: string;
}

interface CaptureInput {
    portfolioId: string;
    visitorMessage: string;
    aiReply: string;
    sessionId?: string | null;
    conversationContext?: string;
}

interface AIExtractedAction {
    capability_key: AICapabilityKey;
    should_execute: boolean;
    confidence: number;
    intent_label: string;
    intent_summary: string;
    reasoning?: string;
    missing_fields?: string[];
    extracted_fields?: Record<string, any>;
}

interface AIExtractionResult {
    overall_summary?: string;
    actions: AIExtractedAction[];
}

interface CapabilityReadinessRules {
    minConfidence: number;
    requireContact: boolean;
    requiredFieldsAll: string[];
    requiredFieldsAny: string[];
    allowHighConfidenceBypassAny: boolean;
    highConfidenceThreshold: number;
}

const CAPABILITY_TABLES: Record<AICapabilityKey, string> = {
    lead_capture: 'ai_leads',
    appointment_requests: 'ai_appointments',
    order_quote_requests: 'ai_orders',
    support_escalation: 'ai_support_tickets',
    faq_unknown_escalation: 'ai_faq_unknowns',
    follow_up_requests: 'ai_followups',
    feedback_reviews: 'ai_feedback',
};

export class AICapabilityService {
    static readonly CAPABILITY_TOOL_MAP: Record<AICapabilityKey, string[]> = {
        lead_capture: ['create_lead_capture_record'],
        appointment_requests: ['create_appointment_request_record'],
        order_quote_requests: ['create_order_quote_request_record'],
        support_escalation: ['create_support_escalation_record'],
        faq_unknown_escalation: ['create_faq_unknown_record'],
        follow_up_requests: ['create_follow_up_request_record'],
        feedback_reviews: ['create_feedback_review_record'],
    };

    static async getPortfolioOwnedBy(portfolioId: string, userId: string): Promise<PortfolioRow | null> {
        const result = await pool.query(
            'SELECT id, user_id FROM portfolios WHERE id = $1 AND user_id = $2',
            [portfolioId, userId]
        );
        return result.rows[0] || null;
    }

    static async getCapabilities(portfolioId: string): Promise<CapabilityConfig[]> {
        const result = await pool.query(
            `SELECT capability_key, enabled, settings_json
             FROM portfolio_ai_capabilities
             WHERE portfolio_id = $1`,
            [portfolioId]
        );

        if (result.rows.length === 0) {
            const fallback = await pool.query(
                'SELECT wizard_data FROM portfolios WHERE id = $1',
                [portfolioId]
            );
            const map = fallback.rows[0]?.wizard_data?.aiCapabilities || {};
            return AI_CAPABILITY_KEYS.map((key) => ({
                capability_key: key,
                enabled: Boolean(map?.[key]?.enabled),
                settings_json: map?.[key]?.settings || {},
            }));
        }

        const existing = new Map<string, CapabilityConfig>();
        result.rows.forEach((row) => {
            if (isAICapabilityKey(row.capability_key)) {
                existing.set(row.capability_key, {
                    capability_key: row.capability_key,
                    enabled: Boolean(row.enabled),
                    settings_json: row.settings_json || {},
                });
            }
        });

        return AI_CAPABILITY_KEYS.map((key) => existing.get(key) || ({
            capability_key: key,
            enabled: false,
            settings_json: {},
        }));
    }

    static async upsertCapabilities(
        portfolioId: string,
        configs: Array<{ capability_key: AICapabilityKey; enabled: boolean; settings_json?: Record<string, any> }>
    ): Promise<CapabilityConfig[]> {
        const byKey = new Map<AICapabilityKey, { enabled: boolean; settings_json: Record<string, any> }>();

        AI_CAPABILITY_KEYS.forEach((key) => {
            byKey.set(key, { enabled: false, settings_json: {} });
        });

        configs.forEach((cfg) => {
            if (isAICapabilityKey(cfg.capability_key)) {
                byKey.set(cfg.capability_key, {
                    enabled: Boolean(cfg.enabled),
                    settings_json: cfg.settings_json || {},
                });
            }
        });

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            for (const key of AI_CAPABILITY_KEYS) {
                const cfg = byKey.get(key)!;
                await client.query(
                    `INSERT INTO portfolio_ai_capabilities (portfolio_id, capability_key, enabled, settings_json)
                     VALUES ($1, $2, $3, $4::jsonb)
                     ON CONFLICT (portfolio_id, capability_key)
                     DO UPDATE SET enabled = EXCLUDED.enabled, settings_json = EXCLUDED.settings_json, updated_at = NOW()`,
                    [portfolioId, key, cfg.enabled, JSON.stringify(cfg.settings_json)]
                );
            }
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

        return this.getCapabilities(portfolioId);
    }

    static async listRecords(portfolioId: string, capability: AICapabilityKey, limit: number = 100): Promise<any[]> {
        const table = CAPABILITY_TABLES[capability];
        const safeLimit = Math.max(1, Math.min(200, limit));
        const result = await pool.query(
            `SELECT * FROM ${table} WHERE portfolio_id = $1 ORDER BY created_at DESC LIMIT ${safeLimit}`,
            [portfolioId]
        );
        return result.rows;
    }

    static async updateRecordStatus(
        portfolioId: string,
        capability: AICapabilityKey,
        recordId: string,
        status: string,
        notes?: string
    ): Promise<any | null> {
        const table = CAPABILITY_TABLES[capability];
        const result = await pool.query(
            `UPDATE ${table}
             SET status = $1, notes = COALESCE($2, notes), updated_at = NOW()
             WHERE id = $3 AND portfolio_id = $4
             RETURNING *`,
            [status, notes || null, recordId, portfolioId]
        );
        return result.rows[0] || null;
    }

    static async logToolEvent(
        portfolioId: string,
        capability: AICapabilityKey,
        toolName: string,
        payload: any,
        resultData: any,
        status: 'success' | 'error',
        errorMessage?: string
    ): Promise<void> {
        await pool.query(
            `INSERT INTO ai_tool_events (portfolio_id, capability_key, tool_name, payload_json, result_json, status, error_message)
             VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7)`,
            [
                portfolioId,
                capability,
                toolName,
                JSON.stringify(payload || {}),
                JSON.stringify(resultData || {}),
                status,
                errorMessage || null,
            ]
        );
    }

    static async listToolEvents(
        portfolioId: string,
        limit: number = 100,
        status?: 'success' | 'error',
        capability?: AICapabilityKey
    ): Promise<any[]> {
        const safeLimit = Math.max(1, Math.min(300, limit));
        if (status && capability) {
            const result = await pool.query(
                `SELECT *
                 FROM ai_tool_events
                 WHERE portfolio_id = $1 AND status = $2 AND capability_key = $3
                 ORDER BY created_at DESC
                 LIMIT ${safeLimit}`,
                [portfolioId, status, capability]
            );
            return result.rows;
        }

        if (status) {
            const result = await pool.query(
                `SELECT *
                 FROM ai_tool_events
                 WHERE portfolio_id = $1 AND status = $2
                 ORDER BY created_at DESC
                 LIMIT ${safeLimit}`,
                [portfolioId, status]
            );
            return result.rows;
        }

        if (capability) {
            const result = await pool.query(
                `SELECT *
                 FROM ai_tool_events
                 WHERE portfolio_id = $1 AND capability_key = $2
                 ORDER BY created_at DESC
                 LIMIT ${safeLimit}`,
                [portfolioId, capability]
            );
            return result.rows;
        }

        const result = await pool.query(
            `SELECT *
             FROM ai_tool_events
             WHERE portfolio_id = $1
             ORDER BY created_at DESC
             LIMIT ${safeLimit}`,
            [portfolioId]
        );
        return result.rows;
    }

    static async getEnabledToolNames(portfolioId: string): Promise<string[]> {
        const caps = await this.getCapabilities(portfolioId);
        const enabled = caps.filter((c) => c.enabled).map((c) => c.capability_key);
        const tools = enabled.flatMap((key) => this.CAPABILITY_TOOL_MAP[key] || []);
        return Array.from(new Set(tools));
    }

    static async isCapabilityEnabled(portfolioId: string, capability: AICapabilityKey): Promise<boolean> {
        const caps = await this.getCapabilities(portfolioId);
        return caps.some((c) => c.capability_key === capability && c.enabled);
    }

    static async createRecord(
        portfolioId: string,
        capability: AICapabilityKey,
        data: Record<string, any>,
        idempotencyKey?: string | null
    ): Promise<any | null> {
        const table = CAPABILITY_TABLES[capability];

        const fields = Object.keys(data);
        if (fields.length === 0) return null;

        const columns = ['portfolio_id', ...fields, 'idempotency_key'];
        const values = [portfolioId, ...fields.map((k) => data[k]), idempotencyKey || null];
        const placeholders = values.map((_, idx) => `$${idx + 1}`);

        const result = await pool.query(
            `INSERT INTO ${table} (${columns.join(', ')})
             VALUES (${placeholders.join(', ')})
             ON CONFLICT (portfolio_id, idempotency_key) WHERE idempotency_key IS NOT NULL
             DO UPDATE SET updated_at = NOW()
             RETURNING *`,
            values
        );
        return result.rows[0] || null;
    }

    static async captureFromConversation(input: CaptureInput): Promise<void> {
        const configs = await this.getCapabilities(input.portfolioId);
        const enabled = configs.filter((c) => c.enabled);
        if (!enabled.length) return;

        const msg = (input.visitorMessage || '').trim();
        const ai = (input.aiReply || '').trim();
        const conversationContext = (input.conversationContext || '').trim();
        if (!msg) return;

        const leadCaptureEnabled = this.isEnabled(enabled, 'lead_capture');
        const hasLeadIntentSignal = this.hasHiringIntentSignal(msg, conversationContext);

        let extracted = await this.extractActionsWithAI(input.portfolioId, msg, ai, conversationContext, enabled);
        const hasLeadAction = extracted.actions.some((a) => a.capability_key === 'lead_capture');
        if (leadCaptureEnabled && hasLeadIntentSignal && !hasLeadAction) {
            extracted = {
                ...extracted,
                actions: [
                    {
                        capability_key: 'lead_capture',
                        should_execute: true,
                        confidence: 0.76,
                        intent_label: 'Hiring / collaboration intent',
                        intent_summary: this.asText(
                            extracted.overall_summary,
                            `${msg.slice(0, 260)}${msg.length > 260 ? '...' : ''}`
                        ),
                        reasoning: 'Heuristic fallback for explicit hiring or collaboration intent.',
                        missing_fields: [],
                        extracted_fields: {},
                    },
                    ...extracted.actions,
                ],
            };
        }

        if (!extracted.actions.length) return;

        for (const action of extracted.actions) {
            if (!action.should_execute) continue;
            if (!this.isEnabled(enabled, action.capability_key)) continue;

            const extractedFields = action.extracted_fields || {};
            const tableData = this.toTableData(action.capability_key, extractedFields, enabled, msg, ai, action);
            if (!this.isActionReadyForPersist(action.capability_key, tableData, action, enabled)) {
                continue;
            }

            const toolName = this.CAPABILITY_TOOL_MAP[action.capability_key]?.[0] || `create_${action.capability_key}_record`;

            try {
                const sessionRecordId = await this.getSessionRecordId(
                    input.portfolioId,
                    action.capability_key,
                    input.sessionId || null
                );

                let record: any | null = null;
                let operation: 'created' | 'updated' | 'noop' = 'noop';
                if (sessionRecordId) {
                    const existing = await this.getRecordById(
                        input.portfolioId,
                        action.capability_key,
                        sessionRecordId
                    );
                    if (existing && this.canMergeIntoRecord(existing, tableData)) {
                        const updateResult = await this.mergeIntoExistingRecord(
                            input.portfolioId,
                            action.capability_key,
                            sessionRecordId,
                            tableData
                        );
                        record = updateResult.record;
                        operation = updateResult.updated ? 'updated' : 'noop';
                    } else {
                        const idBase = `${input.portfolioId}|${msg.toLowerCase()}|${ai.toLowerCase()}|${action.intent_label}|${JSON.stringify(extractedFields)}`;
                        record = await this.createRecord(
                            input.portfolioId,
                            action.capability_key,
                            tableData,
                            this.makeIdempotencyKey(action.capability_key, idBase)
                        );
                        operation = record ? 'created' : 'noop';
                    }
                } else {
                    const idBase = `${input.portfolioId}|${msg.toLowerCase()}|${ai.toLowerCase()}|${action.intent_label}|${JSON.stringify(extractedFields)}`;
                    record = await this.createRecord(
                        input.portfolioId,
                        action.capability_key,
                        tableData,
                        this.makeIdempotencyKey(action.capability_key, idBase)
                    );
                    operation = record ? 'created' : 'noop';
                }

                if (!record) {
                    continue;
                }

                await this.logToolEvent(
                    input.portfolioId,
                    action.capability_key,
                    toolName,
                    {
                        visitor_message: msg,
                        ai_reply: ai,
                        session_id: input.sessionId || null,
                        extracted_action: {
                            intent_label: action.intent_label,
                            intent_summary: action.intent_summary,
                            confidence: action.confidence,
                            reasoning: action.reasoning || '',
                            missing_fields: action.missing_fields || [],
                            extracted_fields: extractedFields,
                            overall_summary: extracted.overall_summary || '',
                        },
                    },
                    {
                        id: record?.id || null,
                        status: record?.status || tableData.status || 'new',
                        operation,
                    },
                    'success'
                );

                if (action.capability_key === 'lead_capture' && operation === 'created') {
                    const recipientEmail = this.asNullableText(record?.email) || this.asNullableText(tableData?.email);
                    const recipientName = this.asNullableText(record?.name) || this.asNullableText(tableData?.name);
                    if (recipientEmail) {
                        await ArchestraOutgoingEmailService.sendLeadFollowUpEmail({
                            portfolioId: input.portfolioId,
                            recipientEmail,
                            recipientName,
                            intentSummary: this.asNullableText(record?.intent_summary) || this.asNullableText(tableData?.intent_summary),
                        }).catch((emailError: any) => {
                            logger.warn('Lead follow-up email trigger failed', {
                                portfolioId: input.portfolioId,
                                capability: action.capability_key,
                                error: emailError?.message || String(emailError),
                            });
                        });
                    }
                }
            } catch (error: any) {
                await this.logToolEvent(
                    input.portfolioId,
                    action.capability_key,
                    toolName,
                    {
                        visitor_message: msg,
                        ai_reply: ai,
                        session_id: input.sessionId || null,
                        extracted_action: action,
                    },
                    {},
                    'error',
                    error?.message || String(error)
                );
            }
        }
    }

    private static async extractActionsWithAI(
        portfolioId: string,
        visitorMessage: string,
        aiReply: string,
        conversationContext: string,
        enabledConfigs: CapabilityConfig[]
    ): Promise<AIExtractionResult> {
        const enabledCapabilities = enabledConfigs.map((c) => ({
            key: c.capability_key,
            settings: c.settings_json || {},
            tool_name: this.CAPABILITY_TOOL_MAP[c.capability_key]?.[0] || '',
        }));

        const prompt = `You are an intent-extraction and tool-routing engine for portfolio visitor conversations.

Task:
- Read the visitor message and AI reply.
- Decide which enabled capability tools should be executed. Based on the messages. It's gonna be clear to you clear by the tool's names
- Extract structured fields for each selected capability.

Enabled capabilities and tools:
${JSON.stringify(enabledCapabilities, null, 2)}

Conversation input:
{
  "recent_conversation_context": ${JSON.stringify(conversationContext || null)},
  "visitor_message": ${JSON.stringify(visitorMessage)},
  "ai_reply": ${JSON.stringify(aiReply)}
}

Output strict JSON only (this is very important):
{
  "overall_summary": "short summary",
  "actions": [
    {
      "capability_key": "lead_capture|appointment_requests|order_quote_requests|support_escalation|faq_unknown_escalation|follow_up_requests|feedback_reviews",
      "should_execute": false,
      "confidence": 0.0,
      "intent_label": "short label",
      "intent_summary": "what user wants and why this capability applies",
      "reasoning": "brief rationale",
      "missing_fields": ["optional_field_name"],
      "extracted_fields": {
        "name": null,
        "email": null,
        "phone": null,
        "company": null,
        "requested_datetime": null,
        "timezone": null,
        "reason": null,
        "contact": null,
        "item_or_service": null,
        "quantity": 0,
        "budget": null,
        "notes": null,
        "issue_title": null,
        "issue_summary": null,
        "severity": "low|medium|high",
        "question": null,
        "context": null,
        "topic": null,
        "preferred_contact_time": null,
        "feedback_type": "positive|constructive|neutral",
        "rating_optional": 1,
        "message": null
      }
    }
  ]
}

Rules:
- Set should_execute=true only when the action is ready to persist as a structured record.
- If details are still being collected, set should_execute=false and include missing_fields.
- Use null for unknown fields. Never output placeholder strings like "optional", "n/a", or "-".
- For lead_capture, explicit hiring/buying/collaboration intent is ready to persist even without contact details.
- intent_summary must be a conversation-level conclusion (include key context from recent messages), not only a restatement of the last message.
- Extract contact details only if explicitly provided by the visitor. Never copy owner/portfolio contacts from assistant text.
- If callback/contact is requested, include prior interest/topic plus captured contact in intent_summary.
- Maximum 3 actions.
- If no actions are appropriate, return actions as [].
- Confidence must be between 1 and 100 in percentage, so show like 99% or 50% or 20%.
- capability_key must be one of enabled capabilities only.`;

        try {
            const text = await generateWithFallback(
                { temperature: 0.2, maxOutputTokens: 1400, responseMimeType: 'application/json' },
                prompt
            );
            const parsed = this.extractJson(text) as AIExtractionResult;
            const actions = Array.isArray(parsed?.actions) ? parsed.actions : [];
            const normalized = actions
                .filter((a) => a && isAICapabilityKey(String(a.capability_key)))
                .filter((a) => enabledConfigs.some((c) => c.capability_key === a.capability_key))
                .slice(0, 3)
                .map((a) => ({
                    capability_key: a.capability_key,
                    should_execute: Boolean(a.should_execute),
                    confidence: this.asConfidence(a.confidence),
                    intent_label: this.asText(a.intent_label, 'Intent'),
                    intent_summary: this.asText(a.intent_summary, visitorMessage.slice(0, 300)),
                    reasoning: this.asText(a.reasoning, ''),
                    missing_fields: Array.isArray(a.missing_fields) ? a.missing_fields.map((x) => String(x)) : [],
                    extracted_fields: (a.extracted_fields && typeof a.extracted_fields === 'object')
                        ? a.extracted_fields
                        : {},
                }));

            return {
                overall_summary: this.asText(parsed?.overall_summary, ''),
                actions: normalized,
            };
        } catch (error: any) {
            logger.error('AI capability extraction failed', {
                portfolioId,
                error: error?.message || String(error),
            });
            return { overall_summary: '', actions: [] };
        }
    }

    private static toTableData(
        capability: AICapabilityKey,
        fields: Record<string, any>,
        enabledConfigs: CapabilityConfig[],
        visitorMessage: string,
        aiReply: string,
        action: AIExtractedAction
    ): Record<string, any> {
        const messageSummary = this.asText(action.intent_summary, visitorMessage).slice(0, 1200);
        const name = this.asNullableText(fields.name);
        const email = this.asNullableText(fields.email) || this.extractEmail(visitorMessage);
        const phone = this.asNullableText(fields.phone) || this.extractPhone(visitorMessage);

        if (capability === 'lead_capture') {
            return {
                name,
                email,
                phone,
                company: this.asNullableText(fields.company),
                intent_summary: messageSummary.slice(0, 800),
                confidence: this.asConfidence(action.confidence),
                status: 'new',
            };
        }

        if (capability === 'appointment_requests') {
            const timezone =
                this.asNullableText(fields.timezone) ||
                this.asNullableText(this.getCapabilitySettings(enabledConfigs, 'appointment_requests')?.timezone);
            return {
                name,
                email,
                phone,
                requested_datetime: this.asNullableText(fields.requested_datetime),
                timezone,
                reason: this.asNullableText(fields.reason) || messageSummary.slice(0, 800),
                status: 'new',
            };
        }

        if (capability === 'order_quote_requests') {
            return {
                name,
                contact: this.asNullableText(fields.contact) || email || phone || null,
                item_or_service: this.asNullableText(fields.item_or_service) || messageSummary.slice(0, 300),
                quantity: this.asNullableNumber(fields.quantity),
                budget: this.asNullableText(fields.budget),
                notes: this.asNullableText(fields.notes) || messageSummary.slice(0, 800),
                status: 'new',
            };
        }

        if (capability === 'support_escalation') {
            return {
                issue_title: this.asNullableText(fields.issue_title) || messageSummary.slice(0, 120),
                issue_summary: this.asNullableText(fields.issue_summary) || messageSummary.slice(0, 1200),
                severity: this.asSeverity(fields.severity),
                contact: this.asNullableText(fields.contact) || email || phone || null,
                status: 'open',
            };
        }

        if (capability === 'faq_unknown_escalation') {
            return {
                question: this.asNullableText(fields.question) || visitorMessage.slice(0, 1000),
                context: this.asNullableText(fields.context) || aiReply.slice(0, 1000),
                contact_optional: this.asNullableText(fields.contact_optional) || email || phone || null,
                status: 'new',
            };
        }

        if (capability === 'follow_up_requests') {
            return {
                topic: this.asNullableText(fields.topic) || messageSummary.slice(0, 300),
                preferred_contact_time: this.asNullableText(fields.preferred_contact_time),
                contact: this.asNullableText(fields.contact) || email || phone || null,
                status: 'new',
            };
        }

        return {
            feedback_type: this.asFeedbackType(fields.feedback_type),
            rating_optional: this.asNullableNumber(fields.rating_optional),
            message: this.asNullableText(fields.message) || messageSummary.slice(0, 1200),
            contact_optional: this.asNullableText(fields.contact_optional) || email || phone || null,
            status: 'new',
        };
    }

    private static isEnabled(configs: CapabilityConfig[], key: AICapabilityKey): boolean {
        return configs.some((c) => c.capability_key === key && c.enabled);
    }

    private static hasContactSignal(data: Record<string, any>): boolean {
        return Boolean(
            this.asNullableText(data.email) ||
            this.asNullableText(data.phone) ||
            this.asNullableText(data.contact) ||
            this.asNullableText(data.contact_optional)
        );
    }

    private static normalizeMissingFields(fields: string[] | undefined): Set<string> {
        const out = new Set<string>();
        if (!Array.isArray(fields)) return out;
        for (const field of fields) {
            out.add(String(field || '').trim().toLowerCase());
        }
        return out;
    }

    private static hasDataFieldValue(data: Record<string, any>, field: string): boolean {
        return !this.isMissingValue(data[field]);
    }

    private static hasAnyFieldValue(data: Record<string, any>, fields: string[]): boolean {
        if (!fields.length) return true;
        return fields.some((field) => this.hasDataFieldValue(data, field));
    }

    private static toStringArray(value: any): string[] {
        if (!Array.isArray(value)) return [];
        return value
            .map((v) => String(v || '').trim())
            .filter((v) => Boolean(v));
    }

    private static boolOrDefault(value: any, fallback: boolean): boolean {
        return typeof value === 'boolean' ? value : fallback;
    }

    private static numberOrDefault(value: any, fallback: number): number {
        const n = this.asNullableNumber(value);
        return n === null ? fallback : n;
    }

    private static getDefaultReadinessRules(capability: AICapabilityKey): CapabilityReadinessRules {
        if (capability === 'lead_capture') {
            return {
                minConfidence: 0,
                requireContact: false,
                requiredFieldsAll: [],
                requiredFieldsAny: [],
                allowHighConfidenceBypassAny: false,
                highConfidenceThreshold: 0.9,
            };
        }

        if (capability === 'appointment_requests') {
            return {
                minConfidence: 0,
                requireContact: true,
                requiredFieldsAll: [],
                requiredFieldsAny: ['requested_datetime', 'reason'],
                allowHighConfidenceBypassAny: false,
                highConfidenceThreshold: 0.9,
            };
        }

        if (capability === 'order_quote_requests') {
            return {
                minConfidence: 0,
                requireContact: true,
                requiredFieldsAll: ['item_or_service'],
                requiredFieldsAny: [],
                allowHighConfidenceBypassAny: false,
                highConfidenceThreshold: 0.9,
            };
        }

        if (capability === 'support_escalation') {
            return {
                minConfidence: 0,
                requireContact: true,
                requiredFieldsAll: [],
                requiredFieldsAny: ['issue_title', 'issue_summary'],
                allowHighConfidenceBypassAny: false,
                highConfidenceThreshold: 0.9,
            };
        }

        if (capability === 'faq_unknown_escalation') {
            return {
                minConfidence: 0.65,
                requireContact: false,
                requiredFieldsAll: ['question'],
                requiredFieldsAny: [],
                allowHighConfidenceBypassAny: false,
                highConfidenceThreshold: 0.9,
            };
        }

        if (capability === 'follow_up_requests') {
            return {
                minConfidence: 0,
                requireContact: true,
                requiredFieldsAll: ['topic'],
                requiredFieldsAny: [],
                allowHighConfidenceBypassAny: false,
                highConfidenceThreshold: 0.9,
            };
        }

        return {
            minConfidence: 0,
            requireContact: false,
            requiredFieldsAll: ['message'],
            requiredFieldsAny: ['contact_optional', 'contact', 'email', 'phone', 'rating_optional'],
            allowHighConfidenceBypassAny: true,
            highConfidenceThreshold: 0.8,
        };
    }

    private static getReadinessRules(
        configs: CapabilityConfig[],
        capability: AICapabilityKey
    ): CapabilityReadinessRules {
        const defaults = this.getDefaultReadinessRules(capability);
        const settings = this.getCapabilitySettings(configs, capability) || {};
        const readiness = (settings.readiness && typeof settings.readiness === 'object')
            ? settings.readiness
            : settings;

        const requiredAll = this.toStringArray(readiness.required_fields_all);
        const requiredAny = this.toStringArray(readiness.required_fields_any);

        return {
            minConfidence: Math.max(0, Math.min(1, this.numberOrDefault(readiness.min_confidence, defaults.minConfidence))),
            requireContact: this.boolOrDefault(readiness.require_contact, defaults.requireContact),
            requiredFieldsAll: requiredAll.length ? requiredAll : defaults.requiredFieldsAll,
            requiredFieldsAny: requiredAny.length ? requiredAny : defaults.requiredFieldsAny,
            allowHighConfidenceBypassAny: this.boolOrDefault(
                readiness.allow_high_confidence_bypass_any,
                defaults.allowHighConfidenceBypassAny
            ),
            highConfidenceThreshold: Math.max(
                0,
                Math.min(1, this.numberOrDefault(readiness.high_confidence_threshold, defaults.highConfidenceThreshold))
            ),
        };
    }

    private static isActionReadyForPersist(
        capability: AICapabilityKey,
        tableData: Record<string, any>,
        action: AIExtractedAction,
        enabledConfigs: CapabilityConfig[]
    ): boolean {
        const missing = this.normalizeMissingFields(action.missing_fields);
        const confidence = this.asConfidence(action.confidence);
        const rules = this.getReadinessRules(enabledConfigs, capability);
        const hasContact = this.hasContactSignal(tableData);
        const missingContact = missing.has('contact') || missing.has('email') || missing.has('phone') || missing.has('contact_optional');

        if (confidence < rules.minConfidence) return false;
        if (rules.requireContact && (missingContact || !hasContact)) return false;

        const requiredAllMissing = rules.requiredFieldsAll.some((field) => {
            const key = field.toLowerCase();
            return missing.has(key) || !this.hasDataFieldValue(tableData, field);
        });
        if (requiredAllMissing) return false;

        if (rules.requiredFieldsAny.length) {
            const anySatisfied = this.hasAnyFieldValue(tableData, rules.requiredFieldsAny);
            const allAnyMarkedMissing = rules.requiredFieldsAny.every((field) => missing.has(field.toLowerCase()));
            if (!anySatisfied) {
                if (!(rules.allowHighConfidenceBypassAny && confidence >= rules.highConfidenceThreshold)) {
                    return false;
                }
            }
            if (allAnyMarkedMissing) {
                if (!(rules.allowHighConfidenceBypassAny && confidence >= rules.highConfidenceThreshold)) {
                    return false;
                }
            }
        }

        return true;
    }

    private static getCapabilitySettings(configs: CapabilityConfig[], key: AICapabilityKey): Record<string, any> {
        return configs.find((c) => c.capability_key === key)?.settings_json || {};
    }

    private static async getSessionRecordId(
        portfolioId: string,
        capability: AICapabilityKey,
        sessionId: string | null
    ): Promise<string | null> {
        if (!sessionId) return null;
        const result = await pool.query(
            `SELECT result_json->>'id' AS record_id
             FROM ai_tool_events
             WHERE portfolio_id = $1
               AND capability_key = $2
               AND status = 'success'
               AND payload_json->>'session_id' = $3
               AND COALESCE(result_json->>'id', '') <> ''
             ORDER BY created_at DESC
             LIMIT 1`,
            [portfolioId, capability, sessionId]
        );
        const recordId = result.rows[0]?.record_id;
        return recordId ? String(recordId) : null;
    }

    private static async getRecordById(
        portfolioId: string,
        capability: AICapabilityKey,
        recordId: string
    ): Promise<any | null> {
        const table = CAPABILITY_TABLES[capability];
        const result = await pool.query(
            `SELECT * FROM ${table} WHERE id = $1 AND portfolio_id = $2 LIMIT 1`,
            [recordId, portfolioId]
        );
        return result.rows[0] || null;
    }

    private static normalizeContactValue(value: any): string | null {
        const text = this.asNullableText(value);
        if (!text) return null;
        return text.toLowerCase().replace(/\s+/g, '');
    }

    private static canMergeIntoRecord(existing: Record<string, any>, incoming: Record<string, any>): boolean {
        const contactFields = ['email', 'phone', 'contact', 'contact_optional'];
        for (const field of contactFields) {
            const current = this.normalizeContactValue(existing[field]);
            const next = this.normalizeContactValue(incoming[field]);
            if (current && next && current !== next) {
                return false;
            }
        }
        return true;
    }

    private static isMissingValue(value: any): boolean {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim().length === 0;
        return false;
    }

    private static shouldMergeValue(field: string, currentValue: any, incomingValue: any): boolean {
        if (incomingValue === null || incomingValue === undefined) return false;
        if (field === 'status') return false;

        if (field === 'confidence') {
            const curr = this.asNullableNumber(currentValue) ?? 0;
            const next = this.asNullableNumber(incomingValue);
            return next !== null && next > curr;
        }

        if (field === 'intent_summary') {
            const curr = this.asNullableText(currentValue) || '';
            const next = this.asNullableText(incomingValue) || '';
            return next.length > curr.length;
        }

        return this.isMissingValue(currentValue) && !this.isMissingValue(incomingValue);
    }

    private static async mergeIntoExistingRecord(
        portfolioId: string,
        capability: AICapabilityKey,
        recordId: string,
        incomingData: Record<string, any>
    ): Promise<{ record: any | null; updated: boolean }> {
        const table = CAPABILITY_TABLES[capability];
        const existingResult = await pool.query(
            `SELECT * FROM ${table} WHERE id = $1 AND portfolio_id = $2 LIMIT 1`,
            [recordId, portfolioId]
        );
        const existing = existingResult.rows[0];
        if (!existing) return { record: null, updated: false };

        const patch: Record<string, any> = {};
        for (const [field, value] of Object.entries(incomingData)) {
            if (this.shouldMergeValue(field, existing[field], value)) {
                patch[field] = value;
            }
        }

        const keys = Object.keys(patch);
        if (!keys.length) return { record: existing, updated: false };

        const assignments = keys.map((k, idx) => `${k} = $${idx + 1}`);
        const values = keys.map((k) => patch[k]);
        const result = await pool.query(
            `UPDATE ${table}
             SET ${assignments.join(', ')}, updated_at = NOW()
             WHERE id = $${keys.length + 1} AND portfolio_id = $${keys.length + 2}
             RETURNING *`,
            [...values, recordId, portfolioId]
        );
        return { record: result.rows[0] || existing, updated: true };
    }

    private static extractJson(text: string): any {
        try {
            return JSON.parse(text);
        } catch {
            // continue
        }

        const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
            try {
                return JSON.parse(codeBlockMatch[1].trim());
            } catch {
                // continue
            }
        }

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in model output');
        }

        return JSON.parse(jsonMatch[0]);
    }

    private static asText(value: any, fallback: string): string {
        const text = typeof value === 'string' ? value.trim() : '';
        return text || fallback;
    }

    private static asNullableText(value: any): string | null {
        const text = typeof value === 'string' ? value.trim() : '';
        if (!text) return null;

        // Normalize model placeholders so they do not get stored as literal values.
        const normalized = text.toLowerCase();
        const placeholderValues = new Set([
            'optional',
            'not specified',
            'unspecified',
            'unknown',
            'na',
            'n/a',
            'null',
            'none',
            '-',
            '--',
            'tbd',
        ]);
        if (placeholderValues.has(normalized)) return null;

        return text;
    }

    private static asNullableNumber(value: any): number | null {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string') {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) return parsed;
        }
        return null;
    }

    private static asConfidence(value: any): number {
        const n = this.asNullableNumber(value);
        if (n === null) return 0.5;
        return Math.max(0, Math.min(1, n));
    }

    private static asSeverity(value: any): string {
        const raw = this.asText(value, 'medium').toLowerCase();
        if (raw === 'low' || raw === 'medium' || raw === 'high') return raw;
        return 'medium';
    }

    private static asFeedbackType(value: any): string {
        const raw = this.asText(value, 'neutral').toLowerCase();
        if (raw === 'positive' || raw === 'constructive' || raw === 'neutral') return raw;
        return 'neutral';
    }

    private static hasHiringIntentSignal(visitorMessage: string, conversationContext: string): boolean {
        const text = `${visitorMessage || ''}\n${conversationContext || ''}`.toLowerCase();
        if (!text.trim()) return false;

        const strongSignals = [
            /\b(?:want|would like|looking)\s+to\s+(?:hire|work with|engage)\b/,
            /\b(?:hire|hiring)\s+(?:you|u|him|her|them)\b/,
            /\b(?:let'?s|lets)\s+(?:work together|collaborate)\b/,
            /\binterested\s+in\s+(?:working with|hiring|your services)\b/,
            /\b(?:need|seeking)\s+(?:a|an)?\s*(?:developer|designer|consultant|freelancer|engineer)\b/,
            /\bcan we (?:start|proceed|move forward)\b/,
            /\b(?:quote|proposal|estimate)\b.*\b(?:for|to start)\b/,
        ];

        return strongSignals.some((pattern) => pattern.test(text));
    }

    private static extractEmail(text: string): string | null {
        const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
        return match ? match[0].toLowerCase() : null;
    }

    private static extractPhone(text: string): string | null {
        const match = text.match(/(?:\+?\d[\d\s\-()]{7,}\d)/);
        return match ? match[0].trim() : null;
    }

    private static makeIdempotencyKey(capability: AICapabilityKey, base: string): string {
        return crypto.createHash('sha256').update(`${capability}|${base}`).digest('hex');
    }
}

export default AICapabilityService;
