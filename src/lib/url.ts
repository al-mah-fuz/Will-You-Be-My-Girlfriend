/**
 * URL Utilities for generating safe, public invitation links.
 * Uses the existing website origin/URL and ensures Vercel preview / deployment-specific URLs
 * (e.g. *-git-*.vercel.app) are safely resolved using the server-detected production domain
 * without requiring any new environment variables or hardcoded domains.
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

  // Match Git branch previews: <project>-git-<branch>-<user>.vercel.app
  if (base.includes('-git-')) return true;

  // Match deployment-specific hash previews: <project>-<hash>-<user>.vercel.app
  // where the hash segment is 7-16 alphanumeric chars
  const parts = base.split('-');
  if (parts.length >= 3) {
    const secondToLast = parts[parts.length - 2];
    if (/^[a-z0-9]{7,16}$/.test(secondToLast)) {
      return true;
    }
  }

  return false;
}

/**
 * Builds the canonical public share URL for an invitation ID.
 * Respects the actual website domain (browser origin / custom domain / verified production domain)
 * without hardcoding or rewriting domain names.
 */
export function buildPublicShareUrl(invitationId: string, serverShareUrl?: string): string {
  const encodedId = encodeURIComponent(invitationId);

  // 1. If server provided a share URL:
  // Check if client is on a preview deployment (e.g. -git- branch) and server computed a production URL
  if (serverShareUrl && typeof serverShareUrl === 'string' && serverShareUrl.trim()) {
    try {
      const parsed = new URL(serverShareUrl);
      const serverHost = parsed.host.toLowerCase().split(':')[0];

      if (typeof window !== 'undefined' && window.location) {
        const clientHost = window.location.host.toLowerCase().split(':')[0];
        // If client is on a preview host but server gave us a non-preview production URL, use server's production URL
        if (isVercelPreviewHost(clientHost) && !isVercelPreviewHost(serverHost)) {
          return `${parsed.origin}/invite/${encodedId}`;
        }
      } else {
        return `${parsed.origin}/invite/${encodedId}`;
      }
    } catch {
      // ignore URL parsing errors
    }
  }

  // 2. Browser window origin: matches the exact URL the user is currently visiting
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin ? window.location.origin.replace(/\/+$/, '') : '';
    if (origin) {
      return `${origin}/invite/${encodedId}`;
    }
  }

  // 3. Server share URL fallback
  if (serverShareUrl && typeof serverShareUrl === 'string' && serverShareUrl.trim()) {
    return serverShareUrl.replace(/\/+$/, '');
  }

  return `/invite/${encodedId}`;
}

