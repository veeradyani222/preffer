"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AICapabilityService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const database_1 = __importDefault(require("../config/database"));
const ai_capabilities_1 = require("../constants/ai-capabilities");
const gemini_service_1 = require("./gemini.service");
const archestra_outgoing_email_service_1 = __importDefault(require("./archestra-outgoing-email.service"));
const logger_1 = __importDefault(require("../utils/logger"));
const CAPABILITY_TABLES = {
    lead_capture: 'ai_leads',
    appointment_requests: 'ai_appointments',
    order_quote_requests: 'ai_orders',
    support_escalation: 'ai_support_tickets',
    faq_unknown_escalation: 'ai_faq_unknowns',
    follow_up_requests: 'ai_followups',
    feedback_reviews: 'ai_feedback',
};
class AICapabilityService {
    static async getPortfolioOwnedBy(portfolioId, userId) {
        const result = await database_1.default.query('SELECT id, user_id FROM portfolios WHERE id = $1 AND user_id = $2', [portfolioId, userId]);
        return result.rows[0] || null;
    }
    static async getCapabilities(portfolioId) {
        var _a, _b;
        const result = await database_1.default.query(`SELECT capability_key, enabled, settings_json
             FROM portfolio_ai_capabilities
             WHERE portfolio_id = $1`, [portfolioId]);
        if (result.rows.length === 0) {
            const fallback = await database_1.default.query('SELECT wizard_data FROM portfolios WHERE id = $1', [portfolioId]);
            const map = ((_b = (_a = fallback.rows[0]) === null || _a === void 0 ? void 0 : _a.wizard_data) === null || _b === void 0 ? void 0 : _b.aiCapabilities) || {};
            return ai_capabilities_1.AI_CAPABILITY_KEYS.map((key) => {
                var _a, _b;
                return ({
                    capability_key: key,
                    enabled: Boolean((_a = map === null || map === void 0 ? void 0 : map[key]) === null || _a === void 0 ? void 0 : _a.enabled),
                    settings_json: ((_b = map === null || map === void 0 ? void 0 : map[key]) === null || _b === void 0 ? void 0 : _b.settings) || {},
                });
            });
        }
        const existing = new Map();
        result.rows.forEach((row) => {
            if ((0, ai_capabilities_1.isAICapabilityKey)(row.capability_key)) {
                existing.set(row.capability_key, {
                    capability_key: row.capability_key,
                    enabled: Boolean(row.enabled),
                    settings_json: row.settings_json || {},
                });
            }
        });
        return ai_capabilities_1.AI_CAPABILITY_KEYS.map((key) => existing.get(key) || ({
            capability_key: key,
            enabled: false,
            settings_json: {},
        }));
    }
    static async upsertCapabilities(portfolioId, configs) {
        const byKey = new Map();
        ai_capabilities_1.AI_CAPABILITY_KEYS.forEach((key) => {
            byKey.set(key, { enabled: false, settings_json: {} });
        });
        configs.forEach((cfg) => {
            if ((0, ai_capabilities_1.isAICapabilityKey)(cfg.capability_key)) {
                byKey.set(cfg.capability_key, {
                    enabled: Boolean(cfg.enabled),
                    settings_json: cfg.settings_json || {},
                });
            }
        });
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            for (const key of ai_capabilities_1.AI_CAPABILITY_KEYS) {
                const cfg = byKey.get(key);
                await client.query(`INSERT INTO portfolio_ai_capabilities (portfolio_id, capability_key, enabled, settings_json)
                     VALUES ($1, $2, $3, $4::jsonb)
                     ON CONFLICT (portfolio_id, capability_key)
                     DO UPDATE SET enabled = EXCLUDED.enabled, settings_json = EXCLUDED.settings_json, updated_at = NOW()`, [portfolioId, key, cfg.enabled, JSON.stringify(cfg.settings_json)]);
            }
            await client.query('COMMIT');
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
        return this.getCapabilities(portfolioId);
    }
    static async listRecords(portfolioId, capability, limit = 100) {
        const table = CAPABILITY_TABLES[capability];
        const safeLimit = Math.max(1, Math.min(200, limit));
        const result = await database_1.default.query(`SELECT * FROM ${table} WHERE portfolio_id = $1 ORDER BY created_at DESC LIMIT ${safeLimit}`, [portfolioId]);
        return result.rows;
    }
    static async updateRecordStatus(portfolioId, capability, recordId, status, notes) {
        const table = CAPABILITY_TABLES[capability];
        const result = await database_1.default.query(`UPDATE ${table}
             SET status = $1, notes = COALESCE($2, notes), updated_at = NOW()
             WHERE id = $3 AND portfolio_id = $4
             RETURNING *`, [status, notes || null, recordId, portfolioId]);
        return result.rows[0] || null;
    }
    static async logToolEvent(portfolioId, capability, toolName, payload, resultData, status, errorMessage) {
        await database_1.default.query(`INSERT INTO ai_tool_events (portfolio_id, capability_key, tool_name, payload_json, result_json, status, error_message)
             VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7)`, [
            portfolioId,
            capability,
            toolName,
            JSON.stringify(payload || {}),
            JSON.stringify(resultData || {}),
            status,
            errorMessage || null,
        ]);
    }
    static async listToolEvents(portfolioId, limit = 100, status, capability) {
        const safeLimit = Math.max(1, Math.min(300, limit));
        if (status && capability) {
            const result = await database_1.default.query(`SELECT *
                 FROM ai_tool_events
                 WHERE portfolio_id = $1 AND status = $2 AND capability_key = $3
                 ORDER BY created_at DESC
                 LIMIT ${safeLimit}`, [portfolioId, status, capability]);
            return result.rows;
        }
        if (status) {
            const result = await database_1.default.query(`SELECT *
                 FROM ai_tool_events
                 WHERE portfolio_id = $1 AND status = $2
                 ORDER BY created_at DESC
                 LIMIT ${safeLimit}`, [portfolioId, status]);
            return result.rows;
        }
        if (capability) {
            const result = await database_1.default.query(`SELECT *
                 FROM ai_tool_events
                 WHERE portfolio_id = $1 AND capability_key = $2
                 ORDER BY created_at DESC
                 LIMIT ${safeLimit}`, [portfolioId, capability]);
            return result.rows;
        }
        const result = await database_1.default.query(`SELECT *
             FROM ai_tool_events
             WHERE portfolio_id = $1
             ORDER BY created_at DESC
             LIMIT ${safeLimit}`, [portfolioId]);
        return result.rows;
    }
    static async getEnabledToolNames(portfolioId) {
        const caps = await this.getCapabilities(portfolioId);
        const enabled = caps.filter((c) => c.enabled).map((c) => c.capability_key);
        const tools = enabled.flatMap((key) => this.CAPABILITY_TOOL_MAP[key] || []);
        return Array.from(new Set(tools));
    }
    static async isCapabilityEnabled(portfolioId, capability) {
        const caps = await this.getCapabilities(portfolioId);
        return caps.some((c) => c.capability_key === capability && c.enabled);
    }
    static async createRecord(portfolioId, capability, data, idempotencyKey) {
        const table = CAPABILITY_TABLES[capability];
        const fields = Object.keys(data);
        if (fields.length === 0)
            return null;
        const columns = ['portfolio_id', ...fields, 'idempotency_key'];
        const values = [portfolioId, ...fields.map((k) => data[k]), idempotencyKey || null];
        const placeholders = values.map((_, idx) => `$${idx + 1}`);
        const result = await database_1.default.query(`INSERT INTO ${table} (${columns.join(', ')})
             VALUES (${placeholders.join(', ')})
             ON CONFLICT (portfolio_id, idempotency_key) WHERE idempotency_key IS NOT NULL
             DO UPDATE SET updated_at = NOW()
             RETURNING *`, values);
        return result.rows[0] || null;
    }
    static async captureFromConversation(input) {
        var _a;
        const configs = await this.getCapabilities(input.portfolioId);
        const enabled = configs.filter((c) => c.enabled);
        if (!enabled.length)
            return;
        const msg = (input.visitorMessage || '').trim();
        const ai = (input.aiReply || '').trim();
        const conversationContext = (input.conversationContext || '').trim();
        if (!msg)
            return;
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
                        intent_summary: this.asText(extracted.overall_summary, `${msg.slice(0, 260)}${msg.length > 260 ? '...' : ''}`),
                        reasoning: 'Heuristic fallback for explicit hiring or collaboration intent.',
                        missing_fields: [],
                        extracted_fields: {},
                    },
                    ...extracted.actions,
                ],
            };
        }
        if (!extracted.actions.length)
            return;
        for (const action of extracted.actions) {
            if (!action.should_execute)
                continue;
            if (!this.isEnabled(enabled, action.capability_key))
                continue;
            const extractedFields = action.extracted_fields || {};
            const tableData = this.toTableData(action.capability_key, extractedFields, enabled, msg, ai, action);
            if (!this.isActionReadyForPersist(action.capability_key, tableData, action, enabled)) {
                continue;
            }
            const toolName = ((_a = this.CAPABILITY_TOOL_MAP[action.capability_key]) === null || _a === void 0 ? void 0 : _a[0]) || `create_${action.capability_key}_record`;
            try {
                const sessionRecordId = await this.getSessionRecordId(input.portfolioId, action.capability_key, input.sessionId || null);
                let record = null;
                let operation = 'noop';
                if (sessionRecordId) {
                    const existing = await this.getRecordById(input.portfolioId, action.capability_key, sessionRecordId);
                    if (existing && this.canMergeIntoRecord(existing, tableData)) {
                        const updateResult = await this.mergeIntoExistingRecord(input.portfolioId, action.capability_key, sessionRecordId, tableData);
                        record = updateResult.record;
                        operation = updateResult.updated ? 'updated' : 'noop';
                    }
                    else {
                        const idBase = `${input.portfolioId}|${msg.toLowerCase()}|${ai.toLowerCase()}|${action.intent_label}|${JSON.stringify(extractedFields)}`;
                        record = await this.createRecord(input.portfolioId, action.capability_key, tableData, this.makeIdempotencyKey(action.capability_key, idBase));
                        operation = record ? 'created' : 'noop';
                    }
                }
                else {
                    const idBase = `${input.portfolioId}|${msg.toLowerCase()}|${ai.toLowerCase()}|${action.intent_label}|${JSON.stringify(extractedFields)}`;
                    record = await this.createRecord(input.portfolioId, action.capability_key, tableData, this.makeIdempotencyKey(action.capability_key, idBase));
                    operation = record ? 'created' : 'noop';
                }
                if (!record) {
                    continue;
                }
                await this.logToolEvent(input.portfolioId, action.capability_key, toolName, {
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
                }, {
                    id: (record === null || record === void 0 ? void 0 : record.id) || null,
                    status: (record === null || record === void 0 ? void 0 : record.status) || tableData.status || 'new',
                    operation,
                }, 'success');
                if (action.capability_key === 'lead_capture' && operation === 'created') {
                    const recipientEmail = this.asNullableText(record === null || record === void 0 ? void 0 : record.email) || this.asNullableText(tableData === null || tableData === void 0 ? void 0 : tableData.email);
                    const recipientName = this.asNullableText(record === null || record === void 0 ? void 0 : record.name) || this.asNullableText(tableData === null || tableData === void 0 ? void 0 : tableData.name);
                    if (recipientEmail) {
                        await archestra_outgoing_email_service_1.default.sendLeadFollowUpEmail({
                            portfolioId: input.portfolioId,
                            recipientEmail,
                            recipientName,
                            intentSummary: this.asNullableText(record === null || record === void 0 ? void 0 : record.intent_summary) || this.asNullableText(tableData === null || tableData === void 0 ? void 0 : tableData.intent_summary),
                        }).catch((emailError) => {
                            logger_1.default.warn('Lead follow-up email trigger failed', {
                                portfolioId: input.portfolioId,
                                capability: action.capability_key,
                                error: (emailError === null || emailError === void 0 ? void 0 : emailError.message) || String(emailError),
                            });
                        });
                    }
                }
            }
            catch (error) {
                await this.logToolEvent(input.portfolioId, action.capability_key, toolName, {
                    visitor_message: msg,
                    ai_reply: ai,
                    session_id: input.sessionId || null,
                    extracted_action: action,
                }, {}, 'error', (error === null || error === void 0 ? void 0 : error.message) || String(error));
            }
        }
    }
    static async extractActionsWithAI(portfolioId, visitorMessage, aiReply, conversationContext, enabledConfigs) {
        const enabledCapabilities = enabledConfigs.map((c) => {
            var _a;
            return ({
                key: c.capability_key,
                settings: c.settings_json || {},
                tool_name: ((_a = this.CAPABILITY_TOOL_MAP[c.capability_key]) === null || _a === void 0 ? void 0 : _a[0]) || '',
            });
        });
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
            const text = await (0, gemini_service_1.generateWithFallback)({ temperature: 0.2, maxOutputTokens: 1400, responseMimeType: 'application/json' }, prompt);
            const parsed = this.extractJson(text);
            const actions = Array.isArray(parsed === null || parsed === void 0 ? void 0 : parsed.actions) ? parsed.actions : [];
            const normalized = actions
                .filter((a) => a && (0, ai_capabilities_1.isAICapabilityKey)(String(a.capability_key)))
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
                overall_summary: this.asText(parsed === null || parsed === void 0 ? void 0 : parsed.overall_summary, ''),
                actions: normalized,
            };
        }
        catch (error) {
            logger_1.default.error('AI capability extraction failed', {
                portfolioId,
                error: (error === null || error === void 0 ? void 0 : error.message) || String(error),
            });
            return { overall_summary: '', actions: [] };
        }
    }
    static toTableData(capability, fields, enabledConfigs, visitorMessage, aiReply, action) {
        var _a;
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
            const timezone = this.asNullableText(fields.timezone) ||
                this.asNullableText((_a = this.getCapabilitySettings(enabledConfigs, 'appointment_requests')) === null || _a === void 0 ? void 0 : _a.timezone);
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
    static isEnabled(configs, key) {
        return configs.some((c) => c.capability_key === key && c.enabled);
    }
    static hasContactSignal(data) {
        return Boolean(this.asNullableText(data.email) ||
            this.asNullableText(data.phone) ||
            this.asNullableText(data.contact) ||
            this.asNullableText(data.contact_optional));
    }
    static normalizeMissingFields(fields) {
        const out = new Set();
        if (!Array.isArray(fields))
            return out;
        for (const field of fields) {
            out.add(String(field || '').trim().toLowerCase());
        }
        return out;
    }
    static hasDataFieldValue(data, field) {
        return !this.isMissingValue(data[field]);
    }
    static hasAnyFieldValue(data, fields) {
        if (!fields.length)
            return true;
        return fields.some((field) => this.hasDataFieldValue(data, field));
    }
    static toStringArray(value) {
        if (!Array.isArray(value))
            return [];
        return value
            .map((v) => String(v || '').trim())
            .filter((v) => Boolean(v));
    }
    static boolOrDefault(value, fallback) {
        return typeof value === 'boolean' ? value : fallback;
    }
    static numberOrDefault(value, fallback) {
        const n = this.asNullableNumber(value);
        return n === null ? fallback : n;
    }
    static getDefaultReadinessRules(capability) {
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
    static getReadinessRules(configs, capability) {
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
            allowHighConfidenceBypassAny: this.boolOrDefault(readiness.allow_high_confidence_bypass_any, defaults.allowHighConfidenceBypassAny),
            highConfidenceThreshold: Math.max(0, Math.min(1, this.numberOrDefault(readiness.high_confidence_threshold, defaults.highConfidenceThreshold))),
        };
    }
    static isActionReadyForPersist(capability, tableData, action, enabledConfigs) {
        const missing = this.normalizeMissingFields(action.missing_fields);
        const confidence = this.asConfidence(action.confidence);
        const rules = this.getReadinessRules(enabledConfigs, capability);
        const hasContact = this.hasContactSignal(tableData);
        const missingContact = missing.has('contact') || missing.has('email') || missing.has('phone') || missing.has('contact_optional');
        if (confidence < rules.minConfidence)
            return false;
        if (rules.requireContact && (missingContact || !hasContact))
            return false;
        const requiredAllMissing = rules.requiredFieldsAll.some((field) => {
            const key = field.toLowerCase();
            return missing.has(key) || !this.hasDataFieldValue(tableData, field);
        });
        if (requiredAllMissing)
            return false;
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
    static getCapabilitySettings(configs, key) {
        var _a;
        return ((_a = configs.find((c) => c.capability_key === key)) === null || _a === void 0 ? void 0 : _a.settings_json) || {};
    }
    static async getSessionRecordId(portfolioId, capability, sessionId) {
        var _a;
        if (!sessionId)
            return null;
        const result = await database_1.default.query(`SELECT result_json->>'id' AS record_id
             FROM ai_tool_events
             WHERE portfolio_id = $1
               AND capability_key = $2
               AND status = 'success'
               AND payload_json->>'session_id' = $3
               AND COALESCE(result_json->>'id', '') <> ''
             ORDER BY created_at DESC
             LIMIT 1`, [portfolioId, capability, sessionId]);
        const recordId = (_a = result.rows[0]) === null || _a === void 0 ? void 0 : _a.record_id;
        return recordId ? String(recordId) : null;
    }
    static async getRecordById(portfolioId, capability, recordId) {
        const table = CAPABILITY_TABLES[capability];
        const result = await database_1.default.query(`SELECT * FROM ${table} WHERE id = $1 AND portfolio_id = $2 LIMIT 1`, [recordId, portfolioId]);
        return result.rows[0] || null;
    }
    static normalizeContactValue(value) {
        const text = this.asNullableText(value);
        if (!text)
            return null;
        return text.toLowerCase().replace(/\s+/g, '');
    }
    static canMergeIntoRecord(existing, incoming) {
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
    static isMissingValue(value) {
        if (value === null || value === undefined)
            return true;
        if (typeof value === 'string')
            return value.trim().length === 0;
        return false;
    }
    static shouldMergeValue(field, currentValue, incomingValue) {
        var _a;
        if (incomingValue === null || incomingValue === undefined)
            return false;
        if (field === 'status')
            return false;
        if (field === 'confidence') {
            const curr = (_a = this.asNullableNumber(currentValue)) !== null && _a !== void 0 ? _a : 0;
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
    static async mergeIntoExistingRecord(portfolioId, capability, recordId, incomingData) {
        const table = CAPABILITY_TABLES[capability];
        const existingResult = await database_1.default.query(`SELECT * FROM ${table} WHERE id = $1 AND portfolio_id = $2 LIMIT 1`, [recordId, portfolioId]);
        const existing = existingResult.rows[0];
        if (!existing)
            return { record: null, updated: false };
        const patch = {};
        for (const [field, value] of Object.entries(incomingData)) {
            if (this.shouldMergeValue(field, existing[field], value)) {
                patch[field] = value;
            }
        }
        const keys = Object.keys(patch);
        if (!keys.length)
            return { record: existing, updated: false };
        const assignments = keys.map((k, idx) => `${k} = $${idx + 1}`);
        const values = keys.map((k) => patch[k]);
        const result = await database_1.default.query(`UPDATE ${table}
             SET ${assignments.join(', ')}, updated_at = NOW()
             WHERE id = $${keys.length + 1} AND portfolio_id = $${keys.length + 2}
             RETURNING *`, [...values, recordId, portfolioId]);
        return { record: result.rows[0] || existing, updated: true };
    }
    static extractJson(text) {
        try {
            return JSON.parse(text);
        }
        catch (_a) {
            // continue
        }
        const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
            try {
                return JSON.parse(codeBlockMatch[1].trim());
            }
            catch (_b) {
                // continue
            }
        }
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in model output');
        }
        return JSON.parse(jsonMatch[0]);
    }
    static asText(value, fallback) {
        const text = typeof value === 'string' ? value.trim() : '';
        return text || fallback;
    }
    static asNullableText(value) {
        const text = typeof value === 'string' ? value.trim() : '';
        if (!text)
            return null;
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
        if (placeholderValues.has(normalized))
            return null;
        return text;
    }
    static asNullableNumber(value) {
        if (typeof value === 'number' && Number.isFinite(value))
            return value;
        if (typeof value === 'string') {
            const parsed = Number(value);
            if (Number.isFinite(parsed))
                return parsed;
        }
        return null;
    }
    static asConfidence(value) {
        const n = this.asNullableNumber(value);
        if (n === null)
            return 0.5;
        return Math.max(0, Math.min(1, n));
    }
    static asSeverity(value) {
        const raw = this.asText(value, 'medium').toLowerCase();
        if (raw === 'low' || raw === 'medium' || raw === 'high')
            return raw;
        return 'medium';
    }
    static asFeedbackType(value) {
        const raw = this.asText(value, 'neutral').toLowerCase();
        if (raw === 'positive' || raw === 'constructive' || raw === 'neutral')
            return raw;
        return 'neutral';
    }
    static hasHiringIntentSignal(visitorMessage, conversationContext) {
        const text = `${visitorMessage || ''}\n${conversationContext || ''}`.toLowerCase();
        if (!text.trim())
            return false;
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
    static extractEmail(text) {
        const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
        return match ? match[0].toLowerCase() : null;
    }
    static extractPhone(text) {
        const match = text.match(/(?:\+?\d[\d\s\-()]{7,}\d)/);
        return match ? match[0].trim() : null;
    }
    static makeIdempotencyKey(capability, base) {
        return crypto_1.default.createHash('sha256').update(`${capability}|${base}`).digest('hex');
    }
}
exports.AICapabilityService = AICapabilityService;
AICapabilityService.CAPABILITY_TOOL_MAP = {
    lead_capture: ['create_lead_capture_record'],
    appointment_requests: ['create_appointment_request_record'],
    order_quote_requests: ['create_order_quote_request_record'],
    support_escalation: ['create_support_escalation_record'],
    faq_unknown_escalation: ['create_faq_unknown_record'],
    follow_up_requests: ['create_follow_up_request_record'],
    feedback_reviews: ['create_feedback_review_record'],
};
exports.default = AICapabilityService;
