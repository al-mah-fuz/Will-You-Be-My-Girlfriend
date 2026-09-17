import {
  CreateInvitationInput,
  CreateInvitationResponse,
  PublicInvitation,
  AcceptInvitationResponse,
} from '../types';

/**
 * Safely parses response JSON and provides explicit HTTP status diagnostics
 * if the server or edge returns an HTML/text error (e.g. 404/500/502/504)
 */
async function parseJsonResponse<T>(res: Response, defaultErrorText: string): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.toLowerCase().includes('application/json');

  if (isJson) {
    try {
      const data = await res.json();
      if (!res.ok) {
        if (data?.error) {
          throw new Error(data.error);
        }
        if (data?.message) {
          throw new Error(data.message);
        }
        if (res.status === 404) {
          throw new Error('Invitation not found. Please verify your link or ask the sender to share it again.');
        }
        if (res.status === 400) {
          throw new Error('Invalid or missing invitation link. Please check the URL.');
        }
        if (res.status === 401 || res.status === 403) {
          throw new Error('Access denied. You do not have permission to view this invitation.');
        }
        if (res.status >= 500) {
          throw new Error('Database or server error. Please try again in a few moments.');
        }
        throw new Error(`${defaultErrorText} (HTTP ${res.status})`);
      }
      return data as T;
    } catch (err: unknown) {
      // Re-throw known Error instances from above
      if (err instanceof Error && !err.message.toLowerCase().includes('json')) {
        throw err;
      }
      throw new Error(`Server returned malformed response (HTTP ${res.status}).`);
    }
  }

  // If the server/edge returned non-JSON
  if (res.status === 404) {
    throw new Error('Invitation not found. Please verify your link or ask the sender to share it again.');
  }
  if (res.status >= 500) {
    throw new Error('Server or database temporarily unavailable. Please try again in a few moments.');
  }

  const rawText = await res.text();
  const cleanSnippet = rawText.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
  const summary = cleanSnippet
    ? (cleanSnippet.length > 120 ? `${cleanSnippet.slice(0, 120)}...` : cleanSnippet)
    : res.statusText || 'No response details';

  throw new Error(`Unable to load invitation (HTTP ${res.status}): ${summary}`);
}

export async function createInvitation(
  input: CreateInvitationInput
): Promise<CreateInvitationResponse> {
  const res = await fetch('/api/invitations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  return parseJsonResponse<CreateInvitationResponse>(res, 'Failed to create invitation.');
}

export async function getInvitation(id: string): Promise<PublicInvitation> {
  const cleanId = id.trim();
  const res = await fetch(
    `/api/invitations/${encodeURIComponent(cleanId)}?id=${encodeURIComponent(cleanId)}`
  );
  const data = await parseJsonResponse<{ success: boolean; invitation: PublicInvitation }>(
    res,
    'Invitation not found. Please verify the invitation link.'
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
