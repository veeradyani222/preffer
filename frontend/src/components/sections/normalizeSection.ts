'use client';

import { PortfolioSection } from '@/types/section.types';

function tryParseJson(value: any): any | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[') && !trimmed.startsWith('"')) {
        return null;
    }
    try {
        const first = JSON.parse(trimmed);
        if (typeof first === 'string') {
            const inner = first.trim();
            if (inner.startsWith('{') || inner.startsWith('[')) {
                try {
                    return JSON.parse(inner);
                } catch {
                    return first;
                }
            }
        }
        return first;
    } catch {
        return null;
    }
}

function normalizeValue(value: any): any {
    const parsed = tryParseJson(value);
    return parsed ?? value;
}

function ensureArray(value: any): any[] {
    const normalized = normalizeValue(value);
    if (Array.isArray(normalized)) return normalized;
    if (normalized && typeof normalized === 'object') return [normalized];
    return [];
}

function extractText(value: any): string | undefined {
    if (!value) return undefined;
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value === 'object') {
        if (typeof value.text === 'string') return value.text;
        if (typeof value.description === 'string') return value.description;
        if (typeof value.about === 'string') return value.about;
        if (typeof value.story === 'string') return value.story;
    }
    return undefined;
}

function normalizeContentByType(type: string, content: any): any {
    let normalized = normalizeValue(content);

    if (normalized && typeof normalized === 'object' && !Array.isArray(normalized)) {
        for (const key of Object.keys(normalized)) {
            normalized[key] = normalizeValue(normalized[key]);
        }
    }

    switch (type) {
        case 'about': {
            if (normalized && typeof normalized === 'object') {
                const aboutValue = normalizeValue(normalized.about);
                const textValue =
                    extractText(normalized.text) ||
                    extractText(normalized.description) ||
                    extractText(normalized.story) ||
                    extractText(aboutValue) ||
                    (typeof aboutValue === 'string' ? aboutValue : undefined);
                return {
                    ...normalized,
                    text: textValue || normalized.text,
                };
            }
            return { text: normalized };
        }
        case 'hero': {
            if (normalized && typeof normalized === 'object') {
                return {
                    ...normalized,
                    headline: extractText(normalized.headline) || extractText(normalized.title),
                    subheadline: extractText(normalized.subheadline) || extractText(normalized.subtitle) || extractText(normalized.text),
                };
            }
            return { headline: normalized };
        }
        case 'skills': {
            if (normalized && typeof normalized === 'object') {
                let skills = normalized.skills;
                if (typeof skills === 'string') {
                    skills = skills.split(',').map(s => s.trim()).filter(Boolean);
                }
                return { ...normalized, skills };
            }
            if (typeof normalized === 'string') {
                return { skills: normalized.split(',').map(s => s.trim()).filter(Boolean) };
            }
            return normalized;
        }
        case 'services':
        case 'projects':
        case 'experience':
        case 'education':
        case 'achievements':
        case 'team':
        case 'pricing': {
            if (normalized && typeof normalized === 'object') {
                const items = ensureArray(
                    normalized.items ||
                    normalized.entries ||
                    normalized.list ||
                    normalized[type] ||
                    normalized.content?.items
                );
                return { ...normalized, items };
            }
            return { items: ensureArray(normalized) };
        }
        case 'testimonials':
        case 'faq': {
            if (normalized && typeof normalized === 'object') {
                const items = ensureArray(
                    normalized.items ||
                    normalized.list ||
                    normalized[type] ||
                    normalized.content?.items
                );
                return { ...normalized, items };
            }
            return { items: ensureArray(normalized) };
        }
        case 'menu': {
            if (normalized && typeof normalized === 'object') {
                let categories = normalized.categories || normalized.menu || normalized.content?.categories;
                if (!categories && normalized.items) {
                    categories = [{ name: 'Menu', items: ensureArray(normalized.items) }];
                }
                categories = ensureArray(categories);
                return { ...normalized, categories };
            }
            return { categories: ensureArray(normalized) };
        }
        case 'contact': {
            if (normalized && typeof normalized === 'object') {
                const nestedContact = normalizeValue(normalized.contact);
                let links =
                    normalizeValue(normalized.links) ||
                    normalizeValue(nestedContact?.links);
                if (typeof links === 'string') {
                    links = links.split(',').map(s => s.trim()).filter(Boolean);
                }
                if (!links && (normalized.items || nestedContact?.items)) {
                    links = normalizeValue(normalized.items || nestedContact?.items);
                }
                return {
                    ...normalized,
                    heading: normalized.heading || nestedContact?.heading,
                    links,
                };
            }
            if (typeof normalized === 'string') {
                return { links: normalized.split(',').map(s => s.trim()).filter(Boolean) };
            }
            if (Array.isArray(normalized)) {
                return { links: normalized };
            }
            return normalized;
        }
        default:
            return normalized;
    }
}

export function normalizeSection(section: PortfolioSection): PortfolioSection {
    return {
        ...section,
        content: normalizeContentByType(section.type, section.content),
    };
}
