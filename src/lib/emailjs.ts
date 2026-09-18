import emailjs from '@emailjs/browser';
import { EmailJsConfig, PublicInvitation } from '../types';

export interface SendEmailJsNotificationParams {
  config: EmailJsConfig;
  invitation: PublicInvitation;
  targetEmail: string;
}

export interface EmailJsResult {
  sent: boolean;
  messageId?: string;
  error?: string;
  code?: string;
}

/**
 * Format timestamp in human readable form
 */
function formatHumanTimestamp(isoString?: string | null): string {
  if (!isoString) return new Date().toLocaleString();
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'medium',
    });
  } catch {
    return isoString;
  }
}

/**
 * Send acceptance notification using EmailJS
 * Populates common template variables including:
 * - to_email, creator_email, email, user_email (all mapped to creator's dynamic email)
 * - creator_name, to_name
 * - recipient_name, from_name
 * - invitation_id, id
 * - acceptance_status, status
 * - message, personal_message
 * - responded_at, accepted_at, timestamp
 */
export async function sendEmailJsAcceptanceNotification(
  params: SendEmailJsNotificationParams
): Promise<EmailJsResult> {
  const { config, invitation, targetEmail } = params;

  if (!config || !config.serviceId || !config.templateId || !config.publicKey) {
    return {
      sent: false,
      code: 'MISSING_CONFIG',
      error: 'EmailJS is not configured. Please enter Service ID, Template ID, and Public Key in settings.',
    };
  }

  const cleanTargetEmail = (targetEmail || '').trim();
  if (!cleanTargetEmail) {
    return {
      sent: false,
      code: 'MISSING_EMAIL',
      error: 'Creator email is missing from invitation.',
    };
  }

  const timestamp = formatHumanTimestamp(invitation.respondedAt);

  const templateParams: Record<string, string> = {
    // Dynamic recipient variables
    to_email: cleanTargetEmail,
    creator_email: cleanTargetEmail,
    email: cleanTargetEmail,
    user_email: cleanTargetEmail,

    // Dynamic names
    creator_name: invitation.creatorName,
    to_name: invitation.creatorName,
    recipient_name: invitation.recipientName,
    from_name: invitation.recipientName,

    // Status & invitation details
    invitation_id: invitation.id,
    id: invitation.id,
    acceptance_status: 'ACCEPTED',
    status: 'accepted',
    personal_message: invitation.personalMessage || '',
    message: invitation.personalMessage || `I said YES to being your girlfriend! 💕`,
    responded_at: timestamp,
    accepted_at: timestamp,
    timestamp: timestamp,
  };

  try {
    const response = await emailjs.send(
      config.serviceId.trim(),
      config.templateId.trim(),
      templateParams,
      {
        publicKey: config.publicKey.trim(),
      }
    );

    return {
      sent: true,
      messageId: response.text || 'EmailJS Success',
    };
  } catch (err: unknown) {
    let errorMsg = 'Failed to send notification via EmailJS';
    if (err && typeof err === 'object' && 'text' in err) {
      errorMsg = String((err as any).text);
    } else if (err instanceof Error) {
      errorMsg = err.message;
    }

    console.error('[EmailJS] Notification send error:', errorMsg);

    return {
      sent: false,
      code: 'EMAILJS_SEND_ERROR',
      error: errorMsg,
    };
  }
}

/**
 * Send a test email using EmailJS settings
 */
export async function testEmailJsConnection(
  config: EmailJsConfig,
  testRecipientEmail: string
): Promise<EmailJsResult> {
  const cleanEmail = testRecipientEmail.trim();
  if (!cleanEmail) {
    return {
      sent: false,
      error: 'Please enter a test recipient email address.',
    };
  }

  const mockInvitation: PublicInvitation = {
    id: 'TEST123',
    creatorName: 'Test Creator',
    recipientName: 'Test Recipient',
    personalMessage: 'This is a test notification from your EmailJS configuration!',
    responseStatus: 'accepted',
    createdAt: new Date().toISOString(),
    respondedAt: new Date().toISOString(),
  };

  return sendEmailJsAcceptanceNotification({
    config,
    invitation: mockInvitation,
    targetEmail: cleanEmail,
  });
}
