/**
 * URL Utilities for server-side invitation link generation.
 * Ensures preview URLs are safely identified and production domains are preserved.
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

  // Match Git branch previews: <project>-git-<branch>-<user>.vercel.app
  if (base.includes('-git-')) return true;

  // Match deployment-specific hash previews: <project>-<hash>-<user>.vercel.app
  const parts = base.split('-');
  if (parts.length >= 3) {
    const secondToLast = parts[parts.length - 2];
    if (/^[a-z0-9]{7,16}$/.test(secondToLast)) {
      return true;
    }
  }

  return false;
}

