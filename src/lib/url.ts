/**
 * URL Utilities for generating safe, public invitation links.
 * Uses the existing website origin/URL and ensures Vercel preview / deployment-specific URLs
 * (e.g. *-uuu16.vercel.app) are automatically resolved to the public production domain
 * without requiring any new environment variables.
 */

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

  const base = normalized.slice(0, -'.vercel.app'.length);

  // Check Git branch previews: <project>-git-<branch>-<user>.vercel.app
  if (base.includes('-git-')) return true;

  // Check unique deployment hash previews: <project>-<hash>-<user>.vercel.app
  const parts = base.split('-');
  if (parts.length >= 3) {
    const hashCandidate = parts[parts.length - 2];
    if (/^[a-z0-9]{7,16}$/.test(hashCandidate)) {
      return true;
    }
  }

  return false;
}

// Convert a Vercel preview host to its canonical production domain
export function cleanVercelPreviewHost(host: string): string {
  const normalized = host.toLowerCase().split(':')[0];
  if (!normalized.endsWith('.vercel.app')) return normalized;

  const base = normalized.slice(0, -'.vercel.app'.length);

  if (base.includes('-git-')) {
    return base.split('-git-')[0] + '.vercel.app';
  }

  const parts = base.split('-');
  if (parts.length >= 3) {
    const hashCandidate = parts[parts.length - 2];
    if (/^[a-z0-9]{7,16}$/.test(hashCandidate)) {
      return parts.slice(0, -2).join('-') + '.vercel.app';
    }
  }

  return normalized;
}

/**
 * Builds the canonical public share URL for an invitation ID.
 * Uses the existing production website origin and sanitizes any preview deployment artifacts.
 * Requires NO new environment variables.
 */
export function buildPublicShareUrl(invitationId: string, serverShareUrl?: string): string {
  // 1. Primary: Use the browser window origin
  if (typeof window !== 'undefined' && window.location) {
    const originHost = window.location.host;

    // If on a Vercel preview domain (*-uuu16.vercel.app), resolve to the public production domain
    if (isVercelPreviewHost(originHost)) {
      const cleanHost = cleanVercelPreviewHost(originHost);
      return `https://${cleanHost}/invite/${encodeURIComponent(invitationId)}`;
    }

    // If on normal production domain or custom domain
    if (window.location.origin) {
      const cleanOrigin = window.location.origin.replace(/\/+$/, '');
      return `${cleanOrigin}/invite/${encodeURIComponent(invitationId)}`;
    }
  }

  // 2. Fallback: Use sanitized server suggested URL
  if (serverShareUrl && typeof serverShareUrl === 'string' && serverShareUrl.trim()) {
    try {
      const parsed = new URL(serverShareUrl);
      if (isVercelPreviewHost(parsed.host)) {
        const cleanHost = cleanVercelPreviewHost(parsed.host);
        return `https://${cleanHost}/invite/${encodeURIComponent(invitationId)}`;
      }
      return serverShareUrl;
    } catch {
      // ignore
    }
  }

  return `/invite/${encodeURIComponent(invitationId)}`;
}
