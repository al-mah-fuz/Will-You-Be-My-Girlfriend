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
        throw new Error(data?.error || data?.message || `${defaultErrorText} (HTTP ${res.status})`);
      }
      return data as T;
    } catch (err: unknown) {
      // Re-throw known Error instances from above
      if (err instanceof Error && !err.message.toLowerCase().includes('json')) {
        throw err;
      }
      throw new Error(`Server returned malformed JSON (HTTP ${res.status}).`);
    }
  }

  // If the server/edge returned non-JSON (e.g. Vercel 404 "This page could not be found" or HTML error)
  const rawText = await res.text();
  const cleanSnippet = rawText.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
  const summary = cleanSnippet
    ? (cleanSnippet.length > 120 ? `${cleanSnippet.slice(0, 120)}...` : cleanSnippet)
    : res.statusText || 'No response details';

  throw new Error(
    `Server returned non-JSON response (HTTP ${res.status} ${res.statusText || ''}): "${summary}". Please ensure backend API routes are deployed.`
  );
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
  const res = await fetch(`/api/invitations/${encodeURIComponent(id)}`);
  const data = await parseJsonResponse<{ success: boolean; invitation: PublicInvitation }>(
    res,
    "This invitation doesn't exist 💔"
  );
  return data.invitation;
}

export async function acceptInvitation(id: string): Promise<AcceptInvitationResponse> {
  const res = await fetch(`/api/invitations/${encodeURIComponent(id)}/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

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
