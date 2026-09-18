import express from 'express';
import {
  initDb,
  createInvitation,
  getInvitation,
  getPublicInvitation,
  acceptInvitation,
  toPublicInvitation,
  getEmailJsSettings,
  saveEmailJsSettings,
  getDatabaseDiagnosticInfo,
} from './db.js';
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
    req.params?.id ||
    (req.params as any)?.invitationId ||
    (req.params as any)?.invitation_id ||
    (req.params as any)?.[0];
  if (typeof paramId === 'string' && paramId.trim()) {
    return decodeURIComponent(paramId).trim();
  }

  // 2. Query params
  const qId =
    req.query?.id ||
    req.query?.invitationId ||
    req.query?.invitation_id ||
    req.query?.invite ||
    req.query?.code;
  if (typeof qId === 'string' && qId.trim()) {
    return decodeURIComponent(String(qId)).trim();
  }

  // 3. Request body (e.g. sent by POST JSON payload)
  const bodyId =
    req.body?.id ||
    req.body?.invitationId ||
    req.body?.invitation_id;
  if (typeof bodyId === 'string' && bodyId.trim()) {
    return decodeURIComponent(String(bodyId)).trim();
  }

  // 4. Vercel query wildcard params (match or 0)
  const rawMatch = req.query?.match || (req.query as any)?.['0'];
  if (typeof rawMatch === 'string' && rawMatch.trim()) {
    const parts = rawMatch.split('/').filter(Boolean);
    // Find the part that is not 'invitations', 'invitation', 'invite', 'api', or 'accept'
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (p && !['invitations', 'invitation', 'invite', 'api', 'accept'].includes(p.toLowerCase())) {
        return decodeURIComponent(p).trim();
      }
    }
  }

  // 5. Fallback: Parse directly from raw requested URL string or headers
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

      console.log(
        `[DIAGNOSTIC - API CREATION] The invitation ID generated during creation: "${invitation.id}"`
      );
      console.log(
        `[DIAGNOSTIC - API CREATION] The exact invitation URL generated: "${shareUrl}"`
      );

      const dbInfo = getDatabaseDiagnosticInfo();

      return res.status(201).json({
        success: true,
        invitation: toPublicInvitation(invitation),
        shareUrl,
        diagnostic: {
          invitationId: invitation.id,
          shareUrl,
          collection: dbInfo.collection,
          databaseTarget: dbInfo.dbFilePath,
          totalRecords: dbInfo.totalRecords,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err: unknown) {
      console.error('[DIAGNOSTIC - API CREATION ERROR] Error creating invitation:', err);
      const message = err instanceof Error ? err.message : 'Failed to create invitation. Please try again.';
      return res.status(500).json({
        success: false,
        error: message,
        code: 'CREATION_FAILED',
        diagnostic: {
          error: message,
          collection: 'invitations',
          timestamp: new Date().toISOString(),
        },
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
    const id = extractInvitationId(req);
    const dbInfo = getDatabaseDiagnosticInfo();

    console.log(
      `[DIAGNOSTIC - API QUERY] Request received for invitation ID: "${id}" | Original URL: "${req.originalUrl}" | Method: ${req.method} | Params: ${JSON.stringify(req.params)} | Query: ${JSON.stringify(req.query)}`
    );

    if (!id) {
      console.warn(
        `[DIAGNOSTIC - API QUERY BAD REQUEST] Missing or invalid ID parameter in URL: "${req.originalUrl}"`
      );
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing invitation ID (HTTP 400). Please check the link URL.',
        code: 'INVALID_ID',
        diagnostic: {
          status: 400,
          receivedId: id,
          collection: dbInfo.collection,
          databaseTarget: dbInfo.dbFilePath,
          url: req.originalUrl,
          timestamp: new Date().toISOString(),
        },
      });
    }

    try {
      console.log(
        `[DIAGNOSTIC - API DB READ] Querying collection: "${dbInfo.collection}" at "${dbInfo.dbFilePath}" for ID: "${id}"`
      );
      const pubInv = await getPublicInvitation(id);

      if (!pubInv) {
        console.warn(
          `[DIAGNOSTIC - API QUERY RESULT 404] Invitation "${id}" genuinely not found in collection "${dbInfo.collection}". Total records in DB: ${dbInfo.totalRecords}`
        );
        return res.status(404).json({
          success: false,
          error: `Invitation genuinely does not exist in database (HTTP 404). ID "${id}" was not found.`,
          code: 'NOT_FOUND',
          diagnostic: {
            status: 404,
            queriedId: id,
            collection: dbInfo.collection,
            databaseTarget: dbInfo.dbFilePath,
            totalRecordsInDatabase: dbInfo.totalRecords,
            queryResult: null,
            timestamp: new Date().toISOString(),
          },
        });
      }

      console.log(
        `[DIAGNOSTIC - API QUERY RESULT 200] SUCCESS: Found invitation "${id}" for recipient "${pubInv.recipientName}" (Status: ${pubInv.responseStatus})`
      );

      return res.json({
        success: true,
        invitation: pubInv,
        diagnostic: {
          status: 200,
          queriedId: id,
          collection: dbInfo.collection,
          databaseTarget: dbInfo.dbFilePath,
          queryResult: 'FOUND',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(
        `[DIAGNOSTIC - API DATABASE ERROR 500] Database error querying invitation "${id}":`,
        err
      );
      return res.status(500).json({
        success: false,
        error: `Database or server error while retrieving invitation (HTTP 500): ${errMsg}`,
        code: 'DB_ERROR',
        diagnostic: {
          status: 500,
          queriedId: id,
          collection: dbInfo.collection,
          databaseTarget: dbInfo.dbFilePath,
          actualDatabaseError: errMsg,
          timestamp: new Date().toISOString(),
        },
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
          code: 'ALREADY_ACCEPTED',
          message: 'This invitation has already received an answer 💕',
          invitation: toPublicInvitation(existing),
        });
      }

      const result = await acceptInvitation(id);
      if (!result.success || !result.invitation) {
        return res.status(500).json({
          success: false,
          error: 'Database error: failed to record acceptance in database.',
          code: 'DB_ERROR',
        });
      }

      // Retrieve saved EmailJS configuration
      const emailConfig = await getEmailJsSettings();

      return res.json({
        success: true,
        message: 'Acceptance recorded! 💕',
        invitation: toPublicInvitation(result.invitation),
        targetEmail: result.invitation.creatorEmail,
        emailConfig: emailConfig
          ? {
              serviceId: emailConfig.serviceId,
              templateId: emailConfig.templateId,
              publicKey: emailConfig.publicKey,
            }
          : null,
      });
    } catch (err: unknown) {
      console.error('Error accepting invitation:', err);
      return res.status(500).json({
        success: false,
        error: 'Database or server error while submitting response. Please try again.',
        code: 'DB_ERROR',
      });
    }
  }
);

// 4. EmailJS Configuration endpoints (Settings)
app.get(['/api/settings/emailjs', '/settings/emailjs'], async (req, res) => {
  try {
    const config = await getEmailJsSettings();
    return res.json({
      success: true,
      config: config || { serviceId: '', templateId: '', publicKey: '' },
    });
  } catch (err) {
    console.error('Error fetching EmailJS settings:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve EmailJS settings.',
    });
  }
});

app.post(['/api/settings/emailjs', '/settings/emailjs'], async (req, res) => {
  try {
    const { serviceId, templateId, publicKey } = req.body || {};
    const saved = await saveEmailJsSettings({
      serviceId: typeof serviceId === 'string' ? serviceId.trim() : '',
      templateId: typeof templateId === 'string' ? templateId.trim() : '',
      publicKey: typeof publicKey === 'string' ? publicKey.trim() : '',
    });

    return res.json({
      success: true,
      message: 'EmailJS settings saved successfully.',
      config: saved,
    });
  } catch (err) {
    console.error('Error saving EmailJS settings:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to save EmailJS settings.',
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
