/**
 * URL Utilities for server-side invitation link generation.
 * Guarantees that public production domains are used and Vercel preview URLs are never leaked.
 */

export const CANONICAL_PRODUCTION_DOMAIN = 'will-you-be-my-girlfriend.vercel.app';

export function cleanBaseUrl(url: string): string {
  let cleaned = url.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }
  return cleaned;
}

export function isVercelPreviewHost(host: string): boolean {
  const normalized = host.toLowerCase().split(':')[0];
  if (!normalized.endsWith('.vercel.app')) return false;

  if (normalized === CANONICAL_PRODUCTION_DOMAIN) return false;
  if (normalized.includes('will-you-be-my')) return true;

  const base = normalized.slice(0, -'.vercel.app'.length);
  return base.includes('-git-') || base.includes('-');
}

export function cleanVercelPreviewHost(host: string): string {
  const normalized = host.toLowerCase().split(':')[0];
  if (!normalized.endsWith('.vercel.app')) return normalized;

  if (normalized.includes('will-you-be-my') || normalized.includes('girlfriendy')) {
    return CANONICAL_PRODUCTION_DOMAIN;
  }

  return CANONICAL_PRODUCTION_DOMAIN;
}
