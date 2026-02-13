const SITE_URL =
    (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_PUBLIC_BASE_URL || '').replace(/\/+$/, '');

export function buildPortfolioUrl(slug: string): string {
    const cleanSlug = (slug || '').trim();
    if (!cleanSlug) return '';

    if (SITE_URL) return `${SITE_URL}/${cleanSlug}`;
    if (typeof window !== 'undefined') return `${window.location.origin}/${cleanSlug}`;
    return `/${cleanSlug}`;
}

export function getPortfolioBaseLabel(): string {
    if (SITE_URL) {
        try {
            return `${new URL(SITE_URL).host}/`;
        } catch {
            return `${SITE_URL.replace(/^https?:\/\//, '')}/`;
        }
    }

    if (typeof window !== 'undefined') {
        return `${window.location.host}/`;
    }

    return 'your-domain.com/';
}

export function getSiteDisplayName(): string {
    if (SITE_URL) {
        try {
            return new URL(SITE_URL).host;
        } catch {
            return SITE_URL.replace(/^https?:\/\//, '');
        }
    }

    if (typeof window !== 'undefined') {
        return window.location.host;
    }

    return 'your-domain.com';
}
