"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AI_CAPABILITY_DESCRIPTIONS = exports.AI_CAPABILITY_LABELS = exports.AI_CAPABILITY_KEYS = void 0;
exports.isAICapabilityKey = isAICapabilityKey;
exports.AI_CAPABILITY_KEYS = [
    'lead_capture',
    'appointment_requests',
    'order_quote_requests',
    'support_escalation',
    'faq_unknown_escalation',
    'follow_up_requests',
    'feedback_reviews',
];
exports.AI_CAPABILITY_LABELS = {
    lead_capture: 'Lead Capture',
    appointment_requests: 'Appointment Requests',
    order_quote_requests: 'Order/Quote Requests',
    support_escalation: 'Support Escalation',
    faq_unknown_escalation: 'FAQ + Unknown Escalation',
    follow_up_requests: 'Follow-up Requests',
    feedback_reviews: 'Feedback & Reviews',
};
exports.AI_CAPABILITY_DESCRIPTIONS = {
    lead_capture: 'Detect buying/hiring intent, capture contact, and save leads.',
    appointment_requests: 'Capture demo/call requests and preferred time windows.',
    order_quote_requests: 'Capture product/service requests, scope, quantity, and budget.',
    support_escalation: 'Resolve when possible, escalate unresolved issues.',
    faq_unknown_escalation: 'Answer known FAQs and log unknown questions.',
    follow_up_requests: 'Track follow-up and reminder requests.',
    feedback_reviews: 'Capture testimonials, complaints, and feedback.',
};
function isAICapabilityKey(value) {
    return exports.AI_CAPABILITY_KEYS.includes(value);
}
