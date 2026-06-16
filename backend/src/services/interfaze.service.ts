import OpenAI from 'openai';
import logger from '../utils/logger';

export interface ExtractedWizardDocumentInput {
    fileName: string;
    mimeType: string;
    fileData: string;
}

export interface ExtractedWizardDocumentResult {
    extractedText: string;
    previewText: string;
}

export class InterfazeService {
    private static getClient(): OpenAI {
        const apiKey = process.env.INTERFAZE_API_KEY;
        if (!apiKey || apiKey.trim() === '') {
            logger.error('INTERFAZE_API_KEY Error', {
                isDefined: !!apiKey,
                isEmpty: apiKey?.trim() === '',
                nodeEnv: process.env.NODE_ENV,
            });
            throw new Error('INTERFAZE_API_KEY is not configured. Ensure .env file is loaded with: import "dotenv/config" at the entry point.');
        }

        return new OpenAI({
            apiKey,
            baseURL: 'https://api.interfaze.ai/v1',
            defaultHeaders: {
                'x-show-additional-info': 'true',
            },
        });
    }

    static async extractDocumentText(input: ExtractedWizardDocumentInput): Promise<ExtractedWizardDocumentResult> {
        logger.ai('Interfaze document extraction', {
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
                        } as any,
                    ] as any,
                },
            ],
        } as any);

        let extractedText = '';

        // 1. Try precontext (available when x-show-additional-info header is set)
        const precontext = (response as any)?.precontext;
        if (Array.isArray(precontext)) {
            for (const entry of precontext) {
                const text = entry?.result?.extracted_text;
                if (typeof text === 'string' && text.trim()) {
                    extractedText = text;
                    break;
                }
                // Also check for pages array (PDF OCR returns pages)
                const pages = entry?.result?.pages;
                if (Array.isArray(pages)) {
                    const pageTexts = pages
                        .map((p: any) => p?.extracted_text || p?.text || '')
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
            const rawContent = response.choices?.[0]?.message?.content;
            if (typeof rawContent === 'string') {
                try {
                    const parsed = JSON.parse(rawContent);
                    // Handle various output shapes from OCR task
                    extractedText =
                        parsed?.result?.extracted_text ||
                        parsed?.extracted_text ||
                        parsed?.text ||
                        '';

                    // Handle pages array in parsed response
                    if (!extractedText && Array.isArray(parsed?.result?.pages)) {
                        extractedText = parsed.result.pages
                            .map((p: any) => p?.extracted_text || p?.text || '')
                            .filter(Boolean)
                            .join('\n\n');
                    }
                    if (!extractedText && Array.isArray(parsed?.pages)) {
                        extractedText = parsed.pages
                            .map((p: any) => p?.extracted_text || p?.text || '')
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
                } catch {
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
    static async scrapeLinkedIn(url: string): Promise<ExtractedWizardDocumentResult> {
        logger.ai('Interfaze LinkedIn scrape', { url });

        const client = this.getClient();

        const response = await client.chat.completions.create({
            model: 'interfaze-beta',
            messages: [
                {
                    role: 'user',
                    content: `Extract all professional information from ${url}. Include the person's full name, headline/title, location, about/summary section, work experience (company names, roles, dates, descriptions), education (schools, degrees, dates), skills, certifications, and any other professional details visible on their profile.`,
                },
            ],
        } as any);

        let extractedText = '';

        // 1. Try the main content from choices (Interfaze returns scraped + processed text here)
        const rawContent = response.choices?.[0]?.message?.content;
        if (typeof rawContent === 'string') {
            try {
                const parsed = JSON.parse(rawContent);
                // If it parsed as an object, stringify it nicely for use as document context
                if (typeof parsed === 'object' && parsed !== null) {
                    const lines: string[] = [];
                    const flatten = (obj: any, prefix = ''): void => {
                        for (const [key, value] of Object.entries(obj)) {
                            const label = prefix ? `${prefix} > ${key}` : key;
                            if (Array.isArray(value)) {
                                lines.push(`${label}:`);
                                value.forEach((item: any) => {
                                    if (typeof item === 'object' && item !== null) {
                                        const parts = Object.entries(item)
                                            .filter(([, v]) => v)
                                            .map(([k, v]) => `${k}: ${v}`);
                                        lines.push(`  - ${parts.join(' | ')}`);
                                    } else {
                                        lines.push(`  - ${item}`);
                                    }
                                });
                            } else if (typeof value === 'object' && value !== null) {
                                flatten(value, label);
                            } else if (value) {
                                lines.push(`${label}: ${value}`);
                            }
                        }
                    };
                    flatten(parsed);
                    extractedText = lines.join('\n');
                }
            } catch {
                // Not JSON — use raw content directly (Interfaze sometimes returns plain text)
                extractedText = rawContent;
            }
        }

        // 2. Fallback: check precontext for scraped_content (web_extract results)
        if (!extractedText) {
            const precontext = (response as any)?.precontext;
            if (Array.isArray(precontext)) {
                for (const entry of precontext) {
                    const scraped = entry?.result?.scraped_content;
                    if (scraped && typeof scraped === 'object') {
                        const parts: string[] = [];
                        for (const [key, value] of Object.entries(scraped)) {
                            if (Array.isArray(value)) {
                                parts.push(`${key}: ${(value as any[]).slice(0, 5).join(', ')}`);
                            } else if (value) {
                                parts.push(`${key}: ${value}`);
                            }
                        }
                        if (parts.length > 0) {
                            extractedText = parts.join('\n');
                            break;
                        }
                    }
                    // Also try meta description
                    const meta = entry?.result?.meta;
                    if (meta?.description && !extractedText) {
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

export default InterfazeService;
