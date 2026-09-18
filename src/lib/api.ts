import {
  CreateInvitationInput,
  CreateInvitationResponse,
  PublicInvitation,
  AcceptInvitationResponse,
  EmailJsConfig,
} from '../types';

export interface ApiDiagnostic {
  status?: number;
  queriedId?: string;
  receivedId?: string;
  collection?: string;
  databaseTarget?: string;
  totalRecordsInDatabase?: number;
  queryResult?: any;
  actualDatabaseError?: string;
  timestamp?: string;
  url?: string;
  [key: string]: any;
}

export class ApiError extends Error {
  status: number;
  code: string;
  diagnostic?: ApiDiagnostic;

  constructor(message: string, status: number, code: string, diagnostic?: ApiDiagnostic) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.diagnostic = diagnostic;
  }
}

/**
 * Safely parses response JSON and provides explicit HTTP status diagnostics
 * differentiating 404, 403, 500, 400, and network failures.
 */
async function parseJsonResponse<T>(res: Response, defaultErrorText: string): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.toLowerCase().includes('application/json');

  let data: any = null;
  if (isJson) {
    try {
      data = await res.json();
    } catch {
      // Non-JSON or broken JSON
    }
  }

  if (!res.ok) {
    const status = res.status;
    const diagnostic: ApiDiagnostic = (data && data.diagnostic) || {
      status,
      timestamp: new Date().toISOString(),
    };

    let code = (data && data.code) || 'UNKNOWN_ERROR';
    let message = (data && (data.error || data.message)) || '';

    if (status === 404) {
      code = code === 'UNKNOWN_ERROR' ? 'NOT_FOUND' : code;
      message =
        message || 'Invitation genuinely does not exist in database (HTTP 404).';
    } else if (status === 400) {
      code = code === 'UNKNOWN_ERROR' ? 'INVALID_ID' : code;
      message = message || 'Invalid or missing invitation ID (HTTP 400).';
    } else if (status === 401 || status === 403) {
      code = code === 'UNKNOWN_ERROR' ? 'PERMISSION_DENIED' : code;
      message =
        message || 'Database permission error: Access denied to invitation (HTTP 403).';
    } else if (status >= 500) {
      code = code === 'UNKNOWN_ERROR' ? 'DB_ERROR' : code;
      message =
        message || `Database or server error while retrieving invitation (HTTP ${status}).`;
    } else {
      message = message || `${defaultErrorText} (HTTP ${status})`;
    }

    throw new ApiError(message, status, code, diagnostic);
  }

  if (!data) {
    throw new ApiError(
      `Empty response received from server (HTTP ${res.status}).`,
      res.status,
      'EMPTY_RESPONSE'
    );
  }

  return data as T;
}

export async function createInvitation(
  input: CreateInvitationInput
): Promise<CreateInvitationResponse> {
  console.log('[DIAGNOSTIC - CLIENT CREATE] Submitting creation payload to /api/invitations:', {
    creatorName: input.creatorName,
    recipientName: input.recipientName,
  });

  const res = await fetch('/api/invitations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const data = await parseJsonResponse<CreateInvitationResponse>(
    res,
    'Failed to create invitation.'
  );

  console.log(
    `[DIAGNOSTIC - CLIENT CREATE RESULT] Success! Invitation ID generated: "${data.invitation.id}" | Share URL: "${data.shareUrl}"`
  );
  return data;
}

export async function getInvitation(id: string): Promise<PublicInvitation> {
  const cleanId = id.trim();
  const requestUrl = `/api/invitations/${encodeURIComponent(cleanId)}?id=${encodeURIComponent(cleanId)}`;

  console.log(
    `[DIAGNOSTIC - CLIENT GET] Requesting invitation ID: "${cleanId}" from URL: ${requestUrl}`
  );

  let res: Response;
  try {
    res = await fetch(requestUrl);
  } catch (netErr: unknown) {
    const netMsg = netErr instanceof Error ? netErr.message : String(netErr);
    console.error(
      `[DIAGNOSTIC - CLIENT GET NETWORK FAILURE] Network error fetching invitation "${cleanId}":`,
      netErr
    );
    throw new ApiError(
      `Network / request failure: Unable to reach the server (${netMsg}). Check your internet connection.`,
      0,
      'NETWORK_FAILURE',
      {
        status: 0,
        queriedId: cleanId,
        url: requestUrl,
        actualDatabaseError: netMsg,
        timestamp: new Date().toISOString(),
      }
    );
  }

  console.log(
    `[DIAGNOSTIC - CLIENT GET STATUS] Server responded with HTTP status: ${res.status} (${res.statusText})`
  );

  const data = await parseJsonResponse<{
    success: boolean;
    invitation: PublicInvitation;
    diagnostic?: ApiDiagnostic;
  }>(res, 'Invitation retrieval failed');

  console.log(
    `[DIAGNOSTIC - CLIENT GET SUCCESS] Successfully retrieved invitation: ID "${data.invitation.id}" (Recipient: "${data.invitation.recipientName}")`
  );
  return data.invitation;
}

export async function acceptInvitation(id: string): Promise<AcceptInvitationResponse> {
  const cleanId = id.trim();
  const res = await fetch(
    `/api/invitations/${encodeURIComponent(cleanId)}/accept?id=${encodeURIComponent(cleanId)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: cleanId, invitationId: cleanId }),
    }
  );

  const contentType = res.headers.get('content-type') || '';
  if (contentType.toLowerCase().includes('application/json')) {
    try {
      const data = await res.json();
      if (!res.ok && !data.alreadyAccepted) {
        throw new Error(data.error || 'Failed to submit acceptance.');
      }
      return data as AcceptInvitationResponse;
    } catch (err: unknown) {
      if (err instanceof Error && !err.message.toLowerCase().includes('json')) {
        throw err;
      }
    }
  }

  return parseJsonResponse<AcceptInvitationResponse>(res, 'Failed to submit acceptance.');
}

export async function getEmailJsSettingsApi(): Promise<EmailJsConfig> {
  const res = await fetch('/api/settings/emailjs');
  const data = await parseJsonResponse<{ success: boolean; config: EmailJsConfig }>(
    res,
    'Failed to load EmailJS settings.'
  );
  return data.config || { serviceId: '', templateId: '', publicKey: '' };
}

export async function saveEmailJsSettingsApi(config: EmailJsConfig): Promise<EmailJsConfig> {
  const res = await fetch('/api/settings/emailjs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });

  const data = await parseJsonResponse<{ success: boolean; config: EmailJsConfig }>(
    res,
    'Failed to save EmailJS settings.'
  );
  return data.config;
}
