/**
 * URL Utilities for server-side invitation link generation.
 * Guarantees that public production domains are used and Vercel preview URLs are never leaked.
 */

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
