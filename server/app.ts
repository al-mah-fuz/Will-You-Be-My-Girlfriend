import express from 'express';
import {
  initDb,
  createInvitation,
  getInvitation,
  getPublicInvitation,
  acceptInvitation,
  toPublicInvitation,
} from './db.js';
import { sendAcceptanceNotification } from './email.js';
import { cleanBaseUrl, isVercelPreviewHost } from './url.js';

// Email validator regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const app = express();

// Parse JSON payloads with reasonable limit
app.use(express.json({ limit: '1mb' }));

// Middleware to normalize URL paths under Vercel rewrites or serverless gateways
app.use((req, res, next) => {
  const matchedPath =
    (req.headers['x-matched-path'] as string) ||
    (req.headers['x-forwarded-uri'] as string) ||
    (req.headers['x-invoke-path'] as string);

  if (typeof matchedPath === 'string' && matchedPath.startsWith('/api')) {
    const search = req.url.includes('?') ? '?' + req.url.split('?').slice(1).join('?') : '';
    req.url = matchedPath + search;
  } else {
    const rawMatch = req.query?.match || (req.query as any)?.['0'];
    if (typeof rawMatch === 'string' && rawMatch.trim()) {
      const cleanMatch = rawMatch.replace(/^\/+/, '');
      const search = req.url.includes('?') ? '?' + req.url.split('?').slice(1).join('?') : '';
      req.url = `/api/${cleanMatch}${search}`;
    }
  }
  next();
});

// Helper to robustly extract invitationId from route params, query, wildcards, or full URL
function extractInvitationId(req: express.Request): string {
  // 1. Direct route params (checking id, invitationId, and positional params)
  const paramId =
    req.params.id ||
    (req.params as any).invitationId ||
    (req.params as any).invitation_id ||
    (req.params as any)[0];
  if (typeof paramId === 'string' && paramId.trim()) {
    return decodeURIComponent(paramId).trim();
  }

  // 2. Query params
  const qId =
    req.query.id ||
    req.query.invitationId ||
    req.query.invitation_id ||
    req.query.invite ||
    req.query.code;
  if (typeof qId === 'string' && qId.trim()) {
    return decodeURIComponent(String(qId)).trim();
  }

  // 3. Vercel query wildcard params (match or 0)
  const rawMatch = req.query.match || (req.query as any)['0'];
  if (typeof rawMatch === 'string' && rawMatch.trim()) {
    const parts = rawMatch.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1];
    if (
      lastPart &&
      !['invitations', 'invitation', 'invite', 'api', 'accept'].includes(lastPart.toLowerCase())
    ) {
      return decodeURIComponent(lastPart).trim();
    }
  }

  // 4. Fallback: Parse directly from raw requested URL string or headers
  const urlCandidates = [
    req.headers['x-matched-path'] as string,
    req.headers['x-forwarded-uri'] as string,
    req.originalUrl,
    req.url,
  ];
  for (const rawUrl of urlCandidates) {
    if (typeof rawUrl === 'string' && rawUrl) {
      const match = rawUrl.match(/(?:invitations?|invite)\/([^/?#]+)/i);
      if (match && match[1]) {
        return decodeURIComponent(match[1]).trim();
      }
    }
  }

  return '';
}

// Health check endpoint
app.get(['/api/health', '/health'], (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Helper to determine canonical public base URL for public invitation links
function getBaseUrl(req: express.Request): string {
  // 1. Inspect request host/origin from client
  const rawHost = (req.get('x-forwarded-host') || req.get('host') || 'localhost:3000').split(',')[0].trim();
  const hostWithoutPort = rawHost.split(':')[0].toLowerCase();

  // If local development, preserve localhost
  if (hostWithoutPort.includes('localhost') || hostWithoutPort.includes('127.0.0.1')) {
    const proto = (req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0].trim();
    return `${proto}://${rawHost}`;
  }

  // 2. Use Vercel built-in system production domain if set by Vercel
  const vercelProdDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProdDomain && typeof vercelProdDomain === 'string' && vercelProdDomain.trim()) {
    return `https://${vercelProdDomain.trim().replace(/\/+$/, '')}`;
  }

  // 3. Default to current request host for custom domains or direct Vercel domains
  const proto = (req.get('x-forwarded-proto') || req.protocol || 'https').split(',')[0].trim();
  return `${proto}://${rawHost}`;
}

// 1. Create a new invitation (handles both /api/invitations and /invitations)
app.post(
  ['/api/invitations', '/invitations', '/api/invitation', '/invitation'],
  async (req, res) => {
    try {
      const { creatorName, recipientName, creatorEmail } = req.body || {};
      const rawPersonalMessage =
        req.body?.personalMessage ??
        req.body?.personal_message ??
        req.body?.message ??
        req.body?.customMessage ??
        req.body?.custom_message;

      // Validation
      if (!creatorName || typeof creatorName !== 'string' || !creatorName.trim()) {
        return res.status(400).json({ success: false, error: 'Your name is required.' });
      }
      if (!recipientName || typeof recipientName !== 'string' || !recipientName.trim()) {
        return res.status(400).json({ success: false, error: "The recipient's name is required." });
      }
      if (!creatorEmail || typeof creatorEmail !== 'string' || !EMAIL_REGEX.test(creatorEmail.trim())) {
        return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
      }
      if (creatorName.trim().length > 60) {
        return res.status(400).json({ success: false, error: 'Your name must be under 60 characters.' });
      }
      if (recipientName.trim().length > 60) {
        return res.status(400).json({ success: false, error: "Recipient's name must be under 60 characters." });
      }
      if (rawPersonalMessage && typeof rawPersonalMessage === 'string' && rawPersonalMessage.trim().length > 1000) {
        return res.status(400).json({ success: false, error: 'Personal message must be under 1000 characters.' });
      }

      const invitation = await createInvitation({
        creatorName: creatorName.trim(),
        recipientName: recipientName.trim(),
        creatorEmail: creatorEmail.trim(),
        personalMessage:
          typeof rawPersonalMessage === 'string' && rawPersonalMessage.trim().length > 0
            ? rawPersonalMessage.trim()
            : undefined,
      });

      const baseUrl = getBaseUrl(req);
      const shareUrl = `${baseUrl}/invite/${invitation.id}`;

      return res.status(201).json({
        success: true,
        invitation: toPublicInvitation(invitation),
        shareUrl,
      });
    } catch (err: unknown) {
      console.error('Error creating invitation:', err);
      const message = err instanceof Error ? err.message : 'Failed to create invitation. Please try again.';
      return res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
);

// 2. Fetch invitation by ID (Public view)
app.get(
  [
    '/api/invitations/:id',
    '/invitations/:id',
    '/api/invitation/:id',
    '/invitation/:id',
    '/api/invitations',
    '/invitations',
    '/api/invitation',
    '/invitation',
  ],
  async (req, res) => {
    try {
      const id = extractInvitationId(req);
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or missing invitation link. Please verify the URL.',
          code: 'INVALID_ID',
        });
      }

      const pubInv = await getPublicInvitation(id);

      if (!pubInv) {
        return res.status(404).json({
          success: false,
          error: 'Invitation not found. Please check your link or ask the sender to share it again.',
          code: 'NOT_FOUND',
        });
      }

      return res.json({
        success: true,
        invitation: pubInv,
      });
    } catch (err: unknown) {
      console.error('Error fetching invitation:', err);
      return res.status(500).json({
        success: false,
        error: 'Database or server error while retrieving invitation. Please try again.',
        code: 'DB_ERROR',
      });
    }
  }
);

// 3. Accept invitation
app.post(
  [
    '/api/invitations/:id/accept',
    '/invitations/:id/accept',
    '/api/invitation/:id/accept',
    '/invitation/:id/accept',
    '/api/invitations/accept',
    '/invitations/accept',
  ],
  async (req, res) => {
    try {
      const id = extractInvitationId(req);
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or missing invitation ID.',
          code: 'INVALID_ID',
        });
      }

      const existing = await getInvitation(id);

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Invitation not found. Please check your link or ask the sender to share it again.',
          code: 'NOT_FOUND',
        });
      }

      if (existing.responseStatus === 'accepted') {
        return res.status(200).json({
          success: false,
          alreadyAccepted: true,
          message: 'This invitation has already received an answer 💕',
          invitation: toPublicInvitation(existing),
        });
      }

      const result = await acceptInvitation(id);
      if (!result.success || !result.invitation) {
        return res.status(400).json({
          success: false,
          error: 'Failed to record acceptance.',
        });
      }

      // Trigger email dispatch in background (with result reporting)
      let emailStatus = { sent: false };
      try {
        emailStatus = await sendAcceptanceNotification(result.invitation);
      } catch (emailErr) {
        console.error('Failed to send acceptance notification email:', emailErr);
      }

      return res.json({
        success: true,
        message: 'Acceptance recorded successfully!',
        invitation: toPublicInvitation(result.invitation),
        emailStatus,
      });
    } catch (err: unknown) {
      console.error('Error accepting invitation:', err);
      return res.status(500).json({
        success: false,
        error: 'Unable to submit response. Please try again.',
      });
    }
  }
);

// JSON fallback for unknown /api routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Express error handler to guarantee JSON is returned on any internal error
app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  if (res.headersSent) {
    return next(err);
  }
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  return res.status(500).json({
    success: false,
    error: message,
  });
});

export { app, initDb };
export default app;
