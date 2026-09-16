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

  // Express handles both routing and response streaming
  return app(req, res);
}
