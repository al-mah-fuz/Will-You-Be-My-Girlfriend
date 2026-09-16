/**
 * URL Utilities for generating safe, public invitation links.
 * Uses the existing website origin/URL and ensures Vercel preview / deployment-specific URLs
 * (e.g. *-uuu16.vercel.app) are automatically resolved to the public production domain
 * without requiring any new environment variables.
 */

export const CANONICAL_PRODUCTION_DOMAIN = 'will-you-be-my-girlfriendy.vercel.app';

// Format any raw URL into a clean base URL (e.g. "https://domain.com")
export function cleanBaseUrl(url: string): string {
  let cleaned = url.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }
  return cleaned;
}

// Check if a host is a Vercel preview or branch deployment
export function isVercelPreviewHost(host: string): boolean {
  const normalized = host.toLowerCase().split(':')[0];
  if (!normalized.endsWith('.vercel.app')) return false;

  // If it is already the canonical production domain, it is not a preview host
  if (normalized === CANONICAL_PRODUCTION_DOMAIN) return false;

  // Any other vercel.app domain for this project is a preview/branch deployment
  if (normalized.includes('will-you-be-my')) return true;

  const base = normalized.slice(0, -'.vercel.app'.length);
  return base.includes('-git-') || base.includes('-');
}

// Convert a Vercel preview host to its canonical production domain
export function cleanVercelPreviewHost(host: string): string {
  const normalized = host.toLowerCase().split(':')[0];
  if (!normalized.endsWith('.vercel.app')) return normalized;

  // Any deployment of this project always resolves to the canonical production domain
  if (normalized.includes('will-you-be-my') || normalized.includes('girlfriendy')) {
    return CANONICAL_PRODUCTION_DOMAIN;
  }

  return CANONICAL_PRODUCTION_DOMAIN;
}

/**
 * Builds the canonical public share URL for an invitation ID.
 * Uses the canonical production website domain (will-you-be-my-girlfriendy.vercel.app)
 * while allowing localhost/dev environments to test locally.
 */
export function buildPublicShareUrl(invitationId: string, serverShareUrl?: string): string {
  const encodedId = encodeURIComponent(invitationId);

  // 1. Primary: Browser window origin
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.host.toLowerCase().split(':')[0];
    const origin = window.location.origin ? window.location.origin.replace(/\/+$/, '') : '';

    // If running on localhost or 127.0.0.1 for local testing, keep the local origin
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      return `${origin}/invite/${encodedId}`;
    }

    // If on any Vercel domain or will-you-be-my domain, always use the canonical domain
    if (host.endsWith('.vercel.app') || host.includes('will-you-be-my') || host.includes('girlfriendy')) {
      return `https://${CANONICAL_PRODUCTION_DOMAIN}/invite/${encodedId}`;
    }

    // If on a custom domain, preserve it
    if (origin) {
      return `${origin}/invite/${encodedId}`;
    }
  }

  // 2. Server suggested URL fallback
  if (serverShareUrl && typeof serverShareUrl === 'string' && serverShareUrl.trim()) {
    try {
      const parsed = new URL(serverShareUrl);
      const host = parsed.host.toLowerCase().split(':')[0];
      if (host.includes('localhost') || host.includes('127.0.0.1')) {
        return `${parsed.origin}/invite/${encodedId}`;
      }
      if (host.endsWith('.vercel.app') || host.includes('will-you-be-my')) {
        return `https://${CANONICAL_PRODUCTION_DOMAIN}/invite/${encodedId}`;
      }
      return serverShareUrl.replace(/\/+$/, '');
    } catch {
      // ignore
    }
  }

  return `https://${CANONICAL_PRODUCTION_DOMAIN}/invite/${encodedId}`;
}
