export function isLinkedInInAppBrowser(userAgent?: string): boolean {
    const ua =
        userAgent ??
        (typeof navigator !== 'undefined' ? navigator.userAgent : '');

    return /LinkedInApp/i.test(ua);
}
