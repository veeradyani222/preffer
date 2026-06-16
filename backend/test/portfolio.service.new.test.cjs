const test = require('node:test');
const assert = require('node:assert/strict');

require('ts-node/register');

const { resolvePortfolioColorScheme } = require('../src/services/portfolio.service.new.ts');

test('resolvePortfolioColorScheme prefers the persisted color_scheme column', () => {
    const colorScheme = resolvePortfolioColorScheme({
        color_scheme: { name: 'Ocean', colors: ['#0B1120', '#1E3A8A'] },
        wizard_data: {
            colorScheme: { name: 'Warm', colors: ['#2D1810', '#8D6E63'] }
        }
    });

    assert.deepEqual(colorScheme, { name: 'Ocean', colors: ['#0B1120', '#1E3A8A'] });
});

test('resolvePortfolioColorScheme falls back to wizard_data camelCase and snake_case when needed', () => {
    const fromCamelCase = resolvePortfolioColorScheme({
        wizard_data: {
            colorScheme: { name: 'Forest', colors: ['#052010', '#1B4D3E'] }
        }
    });

    const fromSnakeCase = resolvePortfolioColorScheme({
        wizard_data: {
            color_scheme: { name: 'Slate', colors: ['#0F172A', '#475569'] }
        }
    });

    assert.deepEqual(fromCamelCase, { name: 'Forest', colors: ['#052010', '#1B4D3E'] });
    assert.deepEqual(fromSnakeCase, { name: 'Slate', colors: ['#0F172A', '#475569'] });
});
