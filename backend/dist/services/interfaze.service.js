"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterfazeService = void 0;
const openai_1 = __importDefault(require("openai"));
const logger_1 = __importDefault(require("../utils/logger"));
class InterfazeService {
    static getClient() {
        const apiKey = process.env.INTERFAZE_API_KEY;
        if (!apiKey || apiKey.trim() === '') {
            logger_1.default.error('INTERFAZE_API_KEY Error', {
                isDefined: !!apiKey,
                isEmpty: (apiKey === null || apiKey === void 0 ? void 0 : apiKey.trim()) === '',
                nodeEnv: process.env.NODE_ENV,
            });
            throw new Error('INTERFAZE_API_KEY is not configured. Ensure .env file is loaded with: import "dotenv/config" at the entry point.');
        }
        return new openai_1.default({
            apiKey,
            baseURL: 'https://api.interfaze.ai/v1',
            defaultHeaders: {
                'x-show-additional-info': 'true',
            },
        });
    }
    static async extractDocumentText(input) {
        var _a, _b, _c, _d, _e, _f, _g;
        logger_1.default.ai('Interfaze document extraction', {
            fileName: input.fileName,
            mimeType: input.mimeType,
            fileSize: input.fileData.length,
        });
        const client = this.getClient();
        // Use the <task>ocr</task> singular task tag for deterministic OCR extraction.
        // Per Interfaze docs: Do NOT provide a non-empty response_format schema
        // alongside a <task> tag, or the schema takes priority and the task is skipped.
        const response = await client.chat.completions.create({
            model: 'interfaze-beta',
            messages: [
                {
                    role: 'system',
                    content: '<task>ocr</task>',
                },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: 'Extract all readable text from this document.',
                        },
                        {
                            type: 'file',
                            file: {
                                filename: input.fileName,
                                file_data: input.fileData,
                            },
                        },
                    ],
                },
            ],
        });
        let extractedText = '';
        // 1. Try precontext (available when x-show-additional-info header is set)
        const precontext = response === null || response === void 0 ? void 0 : response.precontext;
        if (Array.isArray(precontext)) {
            for (const entry of precontext) {
                const text = (_a = entry === null || entry === void 0 ? void 0 : entry.result) === null || _a === void 0 ? void 0 : _a.extracted_text;
                if (typeof text === 'string' && text.trim()) {
                    extractedText = text;
                    break;
                }
                // Also check for pages array (PDF OCR returns pages)
                const pages = (_b = entry === null || entry === void 0 ? void 0 : entry.result) === null || _b === void 0 ? void 0 : _b.pages;
                if (Array.isArray(pages)) {
                    const pageTexts = pages
                        .map((p) => (p === null || p === void 0 ? void 0 : p.extracted_text) || (p === null || p === void 0 ? void 0 : p.text) || '')
                        .filter(Boolean);
                    if (pageTexts.length > 0) {
                        extractedText = pageTexts.join('\n\n');
                        break;
                    }
                }
            }
        }
        // 2. Fall back to choices content (singular task returns raw task output here)
        if (!extractedText) {
            const rawContent = (_e = (_d = (_c = response.choices) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.message) === null || _e === void 0 ? void 0 : _e.content;
            if (typeof rawContent === 'string') {
                try {
                    const parsed = JSON.parse(rawContent);
                    // Handle various output shapes from OCR task
                    extractedText =
                        ((_f = parsed === null || parsed === void 0 ? void 0 : parsed.result) === null || _f === void 0 ? void 0 : _f.extracted_text) ||
                            (parsed === null || parsed === void 0 ? void 0 : parsed.extracted_text) ||
                            (parsed === null || parsed === void 0 ? void 0 : parsed.text) ||
                            '';
                    // Handle pages array in parsed response
                    if (!extractedText && Array.isArray((_g = parsed === null || parsed === void 0 ? void 0 : parsed.result) === null || _g === void 0 ? void 0 : _g.pages)) {
                        extractedText = parsed.result.pages
                            .map((p) => (p === null || p === void 0 ? void 0 : p.extracted_text) || (p === null || p === void 0 ? void 0 : p.text) || '')
                            .filter(Boolean)
                            .join('\n\n');
                    }
                    if (!extractedText && Array.isArray(parsed === null || parsed === void 0 ? void 0 : parsed.pages)) {
                        extractedText = parsed.pages
                            .map((p) => (p === null || p === void 0 ? void 0 : p.extracted_text) || (p === null || p === void 0 ? void 0 : p.text) || '')
                            .filter(Boolean)
                            .join('\n\n');
                    }
                    // If parsed is just a string-like object, use stringified
                    if (!extractedText && typeof parsed === 'object') {
                        const allValues = Object.values(parsed).filter(v => typeof v === 'string');
                        if (allValues.length > 0) {
                            extractedText = allValues.join('\n');
                        }
                    }
                }
                catch (_h) {
                    // Not JSON — use raw content directly
                    extractedText = rawContent;
                }
            }
        }
        const normalized = extractedText.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
        if (!normalized) {
            throw new Error('No readable text was extracted from the document');
        }
        return {
            extractedText: normalized,
            previewText: normalized.slice(0, 1200),
        };
    }
    /**
     * Scrape a LinkedIn profile URL using the Interfaze web scraping engine.
     * Returns the scraped profile information as extracted text.
     */
    static async scrapeLinkedIn(url) {
        var _a, _b, _c, _d, _e;
        logger_1.default.ai('Interfaze LinkedIn scrape', { url });
        const client = this.getClient();
        const response = await client.chat.completions.create({
            model: 'interfaze-beta',
            messages: [
                {
                    role: 'user',
                    content: `Extract all professional information from ${url}. Include the person's full name, headline/title, location, about/summary section, work experience (company names, roles, dates, descriptions), education (schools, degrees, dates), skills, certifications, and any other professional details visible on their profile.`,
                },
            ],
        });
        let extractedText = '';
        // 1. Try the main content from choices (Interfaze returns scraped + processed text here)
        const rawContent = (_c = (_b = (_a = response.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content;
        if (typeof rawContent === 'string') {
            try {
                const parsed = JSON.parse(rawContent);
                // If it parsed as an object, stringify it nicely for use as document context
                if (typeof parsed === 'object' && parsed !== null) {
                    const lines = [];
                    const flatten = (obj, prefix = '') => {
                        for (const [key, value] of Object.entries(obj)) {
                            const label = prefix ? `${prefix} > ${key}` : key;
                            if (Array.isArray(value)) {
                                lines.push(`${label}:`);
                                value.forEach((item) => {
                                    if (typeof item === 'object' && item !== null) {
                                        const parts = Object.entries(item)
                                            .filter(([, v]) => v)
                                            .map(([k, v]) => `${k}: ${v}`);
                                        lines.push(`  - ${parts.join(' | ')}`);
                                    }
                                    else {
                                        lines.push(`  - ${item}`);
                                    }
                                });
                            }
                            else if (typeof value === 'object' && value !== null) {
                                flatten(value, label);
                            }
                            else if (value) {
                                lines.push(`${label}: ${value}`);
                            }
                        }
                    };
                    flatten(parsed);
                    extractedText = lines.join('\n');
                }
            }
            catch (_f) {
                // Not JSON — use raw content directly (Interfaze sometimes returns plain text)
                extractedText = rawContent;
            }
        }
        // 2. Fallback: check precontext for scraped_content (web_extract results)
        if (!extractedText) {
            const precontext = response === null || response === void 0 ? void 0 : response.precontext;
            if (Array.isArray(precontext)) {
                for (const entry of precontext) {
                    const scraped = (_d = entry === null || entry === void 0 ? void 0 : entry.result) === null || _d === void 0 ? void 0 : _d.scraped_content;
                    if (scraped && typeof scraped === 'object') {
                        const parts = [];
                        for (const [key, value] of Object.entries(scraped)) {
                            if (Array.isArray(value)) {
                                parts.push(`${key}: ${value.slice(0, 5).join(', ')}`);
                            }
                            else if (value) {
                                parts.push(`${key}: ${value}`);
                            }
                        }
                        if (parts.length > 0) {
                            extractedText = parts.join('\n');
                            break;
                        }
                    }
                    // Also try meta description
                    const meta = (_e = entry === null || entry === void 0 ? void 0 : entry.result) === null || _e === void 0 ? void 0 : _e.meta;
                    if ((meta === null || meta === void 0 ? void 0 : meta.description) && !extractedText) {
                        extractedText = meta.description;
                    }
                }
            }
        }
        const normalized = extractedText.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
        if (!normalized) {
            throw new Error('Could not extract profile information from the LinkedIn URL. Make sure it is a valid public LinkedIn profile.');
        }
        return {
            extractedText: normalized,
            previewText: normalized.slice(0, 1200),
        };
    }
}
exports.InterfazeService = InterfazeService;
exports.default = InterfazeService;
