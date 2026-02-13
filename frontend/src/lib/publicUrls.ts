const SITE_URL =
    (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_PUBLIC_BASE_URL || '').replace(/\/+$/, '');

export function buildPortfolioUrl(slug: string): string {
    const cleanSlug = (slug || '').trim();
    if (!cleanSlug) return '';

    // In the browser, always trust the current host to avoid stale build-time env values.
    if (typeof window !== 'undefined') return `${window.location.origin}/${cleanSlug}`;
    if (SITE_URL) return `${SITE_URL}/${cleanSlug}`;
    return `/${cleanSlug}`;
}

export function getPortfolioBaseLabel(): string {
    if (typeof window !== 'undefined') {
        return `${window.location.host}/`;
    }

    if (SITE_URL) {
        try {
            return `${new URL(SITE_URL).host}/`;
        } catch {
            return `${SITE_URL.replace(/^https?:\/\//, '')}/`;
        }
    }

    return 'prefer.me/';
}

export function getSiteDisplayName(): string {
    if (typeof window !== 'undefined') {
        return window.location.host;
    }

    if (SITE_URL) {
        try {
            return new URL(SITE_URL).host;
        } catch {
            return SITE_URL.replace(/^https?:\/\//, '');
        }
    }

    return 'prefer.me';
}
