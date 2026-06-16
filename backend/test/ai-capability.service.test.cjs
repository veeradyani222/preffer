const test = require('node:test');
const assert = require('node:assert/strict');

require('ts-node/register');

const { AICapabilityService } = require('../src/services/ai-capability.service.ts');

test('buildCapabilityReadinessGuidance describes default requirements for enabled capabilities', () => {
    const guidance = AICapabilityService.buildCapabilityReadinessGuidance([
        {
            capability_key: 'lead_capture',
            enabled: true,
            settings_json: {},
        },
        {
            capability_key: 'appointment_requests',
            enabled: true,
            settings_json: {},
        },
    ]);

    assert.match(guidance, /lead_capture/i);
    assert.match(guidance, /explicit hiring\/buying\/collaboration intent is ready even without contact/i);
    assert.match(guidance, /appointment_requests/i);
    assert.match(guidance, /one contact method \(email or phone\)/i);
    assert.match(guidance, /at least one of: requested_datetime, reason/i);
});

test('buildCapabilityReadinessGuidance reflects custom readiness overrides', () => {
    const guidance = AICapabilityService.buildCapabilityReadinessGuidance([
        {
            capability_key: 'order_quote_requests',
            enabled: true,
            settings_json: {
                readiness: {
                    require_contact: false,
                    required_fields_all: ['item_or_service', 'budget'],
                },
            },
        },
    ]);

    assert.match(guidance, /order_quote_requests/i);
    assert.match(guidance, /all of: item_or_service, budget/i);
    assert.doesNotMatch(guidance, /one contact method \(email or phone\)/i);
});
