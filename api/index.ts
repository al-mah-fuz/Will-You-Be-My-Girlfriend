import app, { initDb } from '../server/app.js';

let isReady = false;

export default async function handler(req: any, res: any) {
  if (!isReady) {
    try {
      await initDb();
      isReady = true;
    } catch (err) {
      console.error('Error initializing database in Vercel serverless function:', err);
    }
  }

  // Restore the real URL path for Express routing when Vercel rewrites to /api
  const matchedPath =
    req.headers['x-matched-path'] ||
    req.headers['x-forwarded-uri'] ||
    req.headers['x-invoke-path'];

  if (typeof matchedPath === 'string' && matchedPath.startsWith('/api')) {
    const search = (req.url || '').includes('?')
      ? '?' + (req.url || '').split('?').slice(1).join('?')
      : '';
    req.url = matchedPath + search;
  } else {
    const rawMatch = req.query?.match || req.query?.['0'];
    if (typeof rawMatch === 'string' && rawMatch.trim()) {
      const cleanMatch = rawMatch.replace(/^\/+/, '');
      const search = (req.url || '').includes('?')
        ? '?' + (req.url || '').split('?').slice(1).join('?')
        : '';
      req.url = `/api/${cleanMatch}${search}`;
    }
  }

  // Express handles both routing and response streaming
  return app(req, res);
}
