import type { SectionType } from './portfolio.service.new';

export interface WizardDocumentSource {
    id: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    extractedText: string;
    previewText: string;
    relevantSections: SectionType[];
    createdAt: string;
}

const CORE_SECTION_SUPPORT: Record<SectionType, boolean> = {
    hero: true,
    about: true,
    services: true,
    skills: true,
    experience: true,
    projects: true,
    testimonials: false,
    contact: true,
    faq: false,
    pricing: false,
    team: false,
    menu: false,
    achievements: true,
    education: true,
};

const SECTION_KEYWORDS: Record<SectionType, RegExp[]> = {
    hero: [/\bsummary\b/i, /\bprofile\b/i, /\babout\b/i, /\bobjective\b/i],
    about: [/\bsummary\b/i, /\bprofile\b/i, /\babout\b/i, /\bexperience\b/i, /\bbackground\b/i],
    services: [/\bservice\b/i, /\boffering\b/i, /\bconsulting\b/i, /\bpackage\b/i, /\bsolution\b/i],
    skills: [/\bskill(s)?\b/i, /\btools?\b/i, /\btech stack\b/i, /\btechnolog(y|ies)\b/i, /\bproficien(t|cy)\b/i],
    experience: [/\bexperience\b/i, /\bemployment\b/i, /\bwork history\b/i, /\bcompany\b/i, /\brole\b/i],
    projects: [/\bproject(s)?\b/i, /\bcase study\b/i, /\bportfolio\b/i, /\bbuilt\b/i, /\bdeveloped\b/i],
    testimonials: [],
    contact: [/\bemail\b/i, /\bphone\b/i, /\bwebsite\b/i, /\blinkedin\b/i, /\bgithub\b/i],
    faq: [],
    pricing: [],
    team: [],
    menu: [],
    achievements: [/\baward\b/i, /\bachievement\b/i, /\brecognition\b/i, /\bcertification\b/i, /\bcertified\b/i],
    education: [/\beducation\b/i, /\buniversity\b/i, /\bcollege\b/i, /\bdegree\b/i, /\bbachelor\b/i, /\bmaster\b/i, /\bdiploma\b/i],
};

function truncate(value: string, limit: number): string {
    return value.length <= limit ? value : `${value.slice(0, limit)}...`;
}

export function buildGeneralDocumentContext(
    documents: WizardDocumentSource[] | undefined,
    options?: {
        intro?: string;
        maxDocs?: number;
        maxCharsPerDoc?: number;
    }
): string {
    if (!documents?.length) {
        return '';
    }

    const intro = options?.intro || 'SUPPORTING DOCUMENT CONTEXT:';
    const maxDocs = options?.maxDocs ?? 3;
    const maxCharsPerDoc = options?.maxCharsPerDoc ?? 2500;

    const parts = documents.slice(0, maxDocs).map((doc) => {
        const text = truncate(doc.extractedText, maxCharsPerDoc);
        return `Document: ${doc.fileName}\nRelevant sections: ${doc.relevantSections.join(', ')}\nExtracted text:\n${text}`;
    });

    return `${intro}\nUse verified facts from these uploaded documents where helpful. Do not invent details that are not present in the docs.\n\n${parts.join('\n\n---\n\n')}`;
}

export function inferRelevantSectionsFromText(text: string): SectionType[] {
    const normalized = text || '';
    const matches = new Set<SectionType>();

    (Object.keys(CORE_SECTION_SUPPORT) as SectionType[]).forEach((section) => {
        if (!CORE_SECTION_SUPPORT[section]) return;
        const patterns = SECTION_KEYWORDS[section];
        if (section === 'about') {
            matches.add(section);
            return;
        }
        if (patterns.some((pattern) => pattern.test(normalized))) {
            matches.add(section);
        }
    });

    if (matches.size === 1 && matches.has('about')) {
        matches.add('hero');
    }

    return Array.from(matches);
}

export function shouldUseDocumentSupport(sectionType: SectionType): boolean {
    return CORE_SECTION_SUPPORT[sectionType];
}

export function buildDocumentContextForSection(
    documents: WizardDocumentSource[] | undefined,
    sectionType: SectionType
): string {
    if (!documents?.length || !shouldUseDocumentSupport(sectionType)) {
        return '';
    }

    const matchingDocs = documents.filter((doc) => doc.relevantSections.includes(sectionType) || sectionType === 'about');
    if (!matchingDocs.length) {
        return '';
    }

    let budget = 12000;
    const trimmedDocs = matchingDocs.slice(0, 3).map((doc) => {
        const remaining = Math.max(budget, 0);
        const text = truncate(doc.extractedText, Math.min(remaining, 4000));
        budget -= text.length;
        return {
            ...doc,
            extractedText: text,
        };
    });

    return buildGeneralDocumentContext(trimmedDocs, {
        intro: 'SUPPORTING DOCUMENT CONTEXT:',
        maxDocs: 3,
        maxCharsPerDoc: 4000,
    });
}
