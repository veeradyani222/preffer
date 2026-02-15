export const AI_CAPABILITY_KEYS = [
    'lead_capture',
    'appointment_requests',
    'order_quote_requests',
    'support_escalation',
    'faq_unknown_escalation',
    'follow_up_requests',
    'feedback_reviews',
] as const;

export type AICapabilityKey = typeof AI_CAPABILITY_KEYS[number];

export const AI_CAPABILITY_LABELS: Record<AICapabilityKey, string> = {
    lead_capture: 'Lead Capture',
    appointment_requests: 'Appointment Requests',
    order_quote_requests: 'Order/Quote Requests',
    support_escalation: 'Support Escalation',
    faq_unknown_escalation: 'FAQ + Unknown Escalation',
    follow_up_requests: 'Follow-up Requests',
    feedback_reviews: 'Feedback & Reviews',
};

export const AI_CAPABILITY_DESCRIPTIONS: Record<AICapabilityKey, string> = {
    lead_capture: 'Detect buying/hiring intent, capture contact, and save leads.',
    appointment_requests: 'Capture demo/call requests and preferred time windows.',
    order_quote_requests: 'Capture product/service requests, scope, quantity, and budget.',
    support_escalation: 'Resolve when possible, escalate unresolved issues.',
    faq_unknown_escalation: 'Answer known FAQs and log unknown questions.',
    follow_up_requests: 'Track follow-up and reminder requests.',
    feedback_reviews: 'Capture testimonials, complaints, and feedback.',
};

export function isAICapabilityKey(value: string): value is AICapabilityKey {
    return (AI_CAPABILITY_KEYS as readonly string[]).includes(value);
}
