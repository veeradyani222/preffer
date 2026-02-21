export function normalizeExternalUrl(
    value: any,
    opts?: { blockPreferProjectsPath?: boolean }
): string | null {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (!raw) return null;
    if (raw.startsWith('/')) return null;
    if (/\s/.test(raw)) return null;

    const blockPreferProjectsPath = Boolean(opts?.blockPreferProjectsPath);
    const blockedHosts = new Set(['preffer.me', 'www.preffer.me', 'prefer.me', 'www.prefer.me']);

    const isBlockedPreferProjectsPath = (url: URL): boolean => {
        if (!blockPreferProjectsPath) return false;
        return blockedHosts.has(url.hostname.toLowerCase()) && (url.pathname || '').toLowerCase().startsWith('/projects');
    };

    try {
        const parsed = new URL(raw);
        if (!['http:', 'https:'].includes(parsed.protocol)) return null;
        if (isBlockedPreferProjectsPath(parsed)) return null;
        return parsed.toString();
    } catch {
        try {
            const parsed = new URL(`https://${raw}`);
            if (!['http:', 'https:'].includes(parsed.protocol)) return null;
            if (isBlockedPreferProjectsPath(parsed)) return null;
            return parsed.toString();
        } catch {
            return null;
        }
    }
}

