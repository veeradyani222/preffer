'use client';

import ReactMarkdown from 'react-markdown';
import { Theme } from '@/themes';
import { PortfolioSection } from '@/types/section.types';

interface SectionProps {
    section: PortfolioSection;
    theme: Theme;
}

function normalizeMarkdownInput(value: any): string | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return value.trim() ? value : null;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value === 'object') {
        try {
            const str = JSON.stringify(value, null, 2);
            return str.trim() ? str : null;
        } catch {
            return String(value);
        }
    }
    return String(value);
}

function tryParseJsonString(value: any): any | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[') && !trimmed.startsWith('\"{')) {
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

function renderMarkdown(value?: any) {
    const text = normalizeMarkdownInput(value);
    if (!text) return null;
    return (
        <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{text}</ReactMarkdown>
        </div>
    );
}

function renderListItems(items: any[], theme: Theme) {
    if (!Array.isArray(items) || items.length === 0) return null;
    return (
        <div className="space-y-4">
            {items.map((item, idx) => (
                <div
                    key={idx}
                    className="p-4"
                    style={{
                        backgroundColor: theme.colors.surface,
                        borderRadius: theme.radius.medium,
                        border: `1px solid ${theme.colors.border}`,
                    }}
                >
                    {item.title && (
                        <h3 className="font-semibold" style={{ color: theme.colors.text.primary }}>
                            {item.title}
                        </h3>
                    )}
                    {item.name && !item.title && (
                        <h3 className="font-semibold" style={{ color: theme.colors.text.primary }}>
                            {item.name}
                        </h3>
                    )}
                    {item.role && (
                        <p className="text-sm" style={{ color: theme.colors.text.muted }}>
                            {item.role}
                        </p>
                    )}
                    {item.company && (
                        <p className="text-sm" style={{ color: theme.colors.text.muted }}>
                            {item.company}
                        </p>
                    )}
                    {item.period && (
                        <p className="text-sm" style={{ color: theme.colors.text.muted }}>
                            {item.period}
                        </p>
                    )}
                    {item.description && (
                        <div className="mt-2" style={{ color: theme.colors.text.secondary }}>
                            {renderMarkdown(item.description) || <p>{String(item.description)}</p>}
                        </div>
                    )}
                    {Array.isArray(item.features) && item.features.length > 0 && (
                        <ul className="mt-2 list-disc list-inside" style={{ color: theme.colors.text.secondary }}>
                            {item.features.map((f: string, fIdx: number) => (
                                <li key={fIdx}>{f}</li>
                            ))}
                        </ul>
                    )}
                    {Array.isArray(item.tags) && item.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                            {item.tags.map((tag: string, tIdx: number) => (
                                <span
                                    key={tIdx}
                                    className="text-xs px-2 py-1 rounded-full"
                                    style={{
                                        backgroundColor: theme.colors.surface,
                                        border: `1px solid ${theme.colors.border}`,
                                        color: theme.colors.text.muted,
                                    }}
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                    {item.link && (
                        <a
                            href={item.link}
                            className="mt-2 inline-block text-sm underline"
                            style={{ color: theme.colors.accent }}
                            target="_blank"
                            rel="noreferrer"
                        >
                            View link
                        </a>
                    )}
                    {item.socials && (
                        <div className="mt-2 text-sm" style={{ color: theme.colors.text.secondary }}>
                            {Array.isArray(item.socials) ? item.socials.join(' · ') : String(item.socials)}
                        </div>
                    )}
                    {item.quote && (
                        <p className="mt-2 italic" style={{ color: theme.colors.text.secondary }}>
                            "{item.quote}"
                        </p>
                    )}
                    {item.author && (
                        <p className="mt-1 font-medium" style={{ color: theme.colors.text.primary }}>
                            â€” {item.author}
                        </p>
                    )}
                </div>
            ))}
        </div>
    );
}

export function StructuredSection({ section, theme }: SectionProps) {
    const content = section.content || {};

    switch (section.type) {
        case 'hero': {
            const headline = content.headline || content.title || '';
            const subheadline = content.subheadline || content.subtitle || content.text || '';
            return (
                <div>
                    {headline && (
                        <h1
                            className="text-4xl font-semibold"
                            style={{ color: theme.colors.text.primary }}
                        >
                            {headline}
                        </h1>
                    )}
                    {subheadline && (
                        <p
                            className="mt-4 text-lg"
                            style={{ color: theme.colors.text.secondary }}
                        >
                            {subheadline}
                        </p>
                    )}
                </div>
            );
        }
        case 'about': {
            const parsedFromString = tryParseJsonString(content);

            const text =
                content.text ||
                content.description ||
                content.about ||
                content.story ||
                content?.about?.text ||
                parsedFromString?.text ||
                parsedFromString?.description ||
                parsedFromString?.about ||
                parsedFromString?.story ||
                (typeof content === 'string' ? content : '');
            const heading = content.heading || content.title;
            return (
                <div style={{ color: theme.colors.text.secondary }}>
                    {heading && !text && (
                        <p className="font-medium" style={{ color: theme.colors.text.primary }}>
                            {heading}
                        </p>
                    )}
                    {renderMarkdown(text) || <p>{String(text || '')}</p>}
                </div>
            );
        }
        case 'services': {
            const items = Array.isArray(content.items) ? content.items : [];
            return renderListItems(items, theme);
        }
        case 'skills': {
            const skills = Array.isArray(content.skills) ? content.skills : [];
            return (
                <div>
                    {content.heading && (
                        <p className="mb-3 font-medium" style={{ color: theme.colors.text.primary }}>
                            {content.heading}
                        </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                        {skills.map((skill: string, idx: number) => (
                            <span
                                key={idx}
                                className="px-3 py-1 text-sm rounded-full"
                                style={{
                                    backgroundColor: theme.colors.surface,
                                    border: `1px solid ${theme.colors.border}`,
                                    color: theme.colors.text.secondary,
                                }}
                            >
                                {skill}
                            </span>
                        ))}
                    </div>
                </div>
            );
        }
        case 'experience': {
            const items = Array.isArray(content.items) ? content.items : [];
            return renderListItems(items, theme);
        }
        case 'projects': {
            const items = Array.isArray(content.items) ? content.items : [];
            return renderListItems(items, theme);
        }
        case 'pricing': {
            const items = Array.isArray(content.items) ? content.items : [];
            return (
                <div className="grid gap-4 md:grid-cols-2">
                    {items.map((item: any, idx: number) => (
                        <div
                            key={idx}
                            className="p-4"
                            style={{
                                backgroundColor: theme.colors.surface,
                                borderRadius: theme.radius.medium,
                                border: `1px solid ${theme.colors.border}`,
                            }}
                        >
                            <p className="text-2xl font-semibold" style={{ color: theme.colors.text.primary }}>
                                {item.price}
                            </p>
                            <p className="text-sm" style={{ color: theme.colors.text.muted }}>
                                {item.condition}
                            </p>
                            {Array.isArray(item.features) && item.features.length > 0 && (
                                <ul className="mt-3 list-disc list-inside" style={{ color: theme.colors.text.secondary }}>
                                    {item.features.map((f: string, fIdx: number) => (
                                        <li key={fIdx}>{f}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}
                </div>
            );
        }
        case 'team': {
            const items = Array.isArray(content.items) ? content.items : [];
            return renderListItems(items, theme);
        }
        case 'menu': {
            const categories = Array.isArray(content.categories) ? content.categories : [];
            return (
                <div className="space-y-6">
                    {categories.map((cat: any, idx: number) => (
                        <div key={idx}>
                            <h3 className="font-semibold" style={{ color: theme.colors.text.primary }}>
                                {cat.name}
                            </h3>
                            <div className="mt-3 space-y-3">
                                {(cat.items || []).map((item: any, itemIdx: number) => (
                                    <div
                                        key={itemIdx}
                                        className="flex items-start justify-between gap-4"
                                        style={{ color: theme.colors.text.secondary }}
                                    >
                                        <div>
                                            <p className="font-medium" style={{ color: theme.colors.text.primary }}>
                                                {item.name}
                                            </p>
                                            {item.description && <p className="text-sm">{item.description}</p>}
                                        </div>
                                        {item.price && (
                                            <span className="text-sm" style={{ color: theme.colors.text.muted }}>
                                                {item.price}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            );
        }
        case 'achievements':
        case 'education': {
            const items = Array.isArray(content.items) ? content.items : [];
            return renderListItems(items, theme);
        }
        default: {
            const fallbackText = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
            return (
                <div style={{ color: theme.colors.text.secondary }}>
                    {renderMarkdown(fallbackText) || <pre className="text-sm whitespace-pre-wrap">{fallbackText}</pre>}
                </div>
            );
        }
    }
}
