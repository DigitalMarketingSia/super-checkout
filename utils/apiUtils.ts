/**
 * Resolves the stable API URL for the application.
 * This ensures that even when accessing via a custom domain,
 * critical API calls are routed to the stable Vercel infrastructure.
 */
export const getApiUrl = (path: string): string => {
    // 1. Explicit API URL from environment (Best for local dev or specific overrides)
    const explicitApiUrl = import.meta.env.VITE_API_URL;
    if (explicitApiUrl) {
        return `${explicitApiUrl}${path}`;
    }

    // 2. Vercel System URL (Stable production URL)
    // Note: VITE_VERCEL_URL is automatically exposed by Vercel System Env Vars if configured in vite.config.ts
    const vercelUrl = import.meta.env.VITE_VERCEL_URL;
    if (vercelUrl) {
        return `https://${vercelUrl}${path}`;
    }

    // 3. Fallback to current origin (Standard behavior)
    // This is fine for localhost or if the custom domain is fully capable
    return `${window.location.origin}${path}`;
};

/**
 * Resolves the stable Base URL (Origin)
 */
export const getBaseUrl = (): string => {
    const explicitApiUrl = import.meta.env.VITE_API_URL;
    if (explicitApiUrl) return explicitApiUrl;

    const vercelUrl = import.meta.env.VITE_VERCEL_URL;
    if (vercelUrl) return `https://${vercelUrl}`;

    return window.location.origin;
}
