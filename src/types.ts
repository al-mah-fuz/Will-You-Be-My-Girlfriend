export type ResponseStatus = 'pending' | 'accepted';

export interface Invitation {
  id: string;
  invitationId?: string; // alias for ID compatibility
  creatorName: string;
  recipientName: string;
  creatorEmail: string;
  personalMessage?: string;
  responseStatus: ResponseStatus;
  createdAt: string; // ISO 8601
  respondedAt?: string | null;
}

// Public-safe invitation view (creatorEmail is excluded to protect privacy)
export interface PublicInvitation {
  id: string;
  invitationId?: string; // alias for ID compatibility
  creatorName: string;
  recipientName: string;
  personalMessage?: string;
  responseStatus: ResponseStatus;
  createdAt: string;
  respondedAt?: string | null;
}

export interface CreateInvitationInput {
  creatorName: string;
  recipientName: string;
  creatorEmail: string;
  personalMessage?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CreateInvitationResponse {
  success: boolean;
  invitation: PublicInvitation;
  shareUrl: string;
  error?: string;
}

export interface AcceptInvitationResponse {
  success: boolean;
  invitation: PublicInvitation;
  message?: string;
  status?: 'ACCEPTED_AND_NOTIFIED' | 'ACCEPTED_EMAIL_FAILED';
  emailStatus?: {
    sent: boolean;
    provider?: string;
    error?: string;
    code?: string;
    statusCode?: number;
    messageId?: string;
    previewUrl?: string;
    note?: string;
  };
  error?: string;
  code?: 'NOT_FOUND' | 'INVALID_ID' | 'DB_ERROR' | 'ALREADY_ACCEPTED' | 'RESEND_ERROR' | string;
  alreadyAccepted?: boolean;
}
