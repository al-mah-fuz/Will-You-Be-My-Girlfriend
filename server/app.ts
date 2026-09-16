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
app.post(['/api/invitations', '/invitations'], async (req, res) => {
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
});

// 2. Fetch invitation by ID (Public view)
app.get(['/api/invitations/:id', '/invitations/:id'], async (req, res) => {
  try {
    const rawId = req.params.id;
    const id = typeof rawId === 'string' ? decodeURIComponent(rawId).trim() : '';
    if (!id) {
      return res.status(404).json({
        success: false,
        error: "This invitation doesn't exist 💔",
      });
    }

    const pubInv = await getPublicInvitation(id);

    if (!pubInv) {
      return res.status(404).json({
        success: false,
        error: "This invitation doesn't exist 💔",
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
      error: 'Unable to load invitation at this time.',
    });
  }
});

// 3. Accept invitation
app.post(['/api/invitations/:id/accept', '/invitations/:id/accept'], async (req, res) => {
  try {
    const rawId = req.params.id;
    const id = typeof rawId === 'string' ? decodeURIComponent(rawId).trim() : '';
    if (!id) {
      return res.status(404).json({
        success: false,
        error: "This invitation doesn't exist 💔",
      });
    }

    const existing = await getInvitation(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: "This invitation doesn't exist 💔",
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
});

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
