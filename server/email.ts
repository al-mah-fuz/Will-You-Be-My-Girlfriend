import nodemailer from 'nodemailer';
import { Invitation } from '../src/types.js';

export interface SendEmailResult {
  sent: boolean;
  previewUrl?: string;
  error?: string;
  provider?: 'resend' | 'smtp' | 'ethereal' | 'console';
}

/**
 * Format a human-readable local date string
 */
function formatTimestamp(isoString?: string | null): string {
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
 * Sends acceptance email to the invitation's creator
 */
export async function sendAcceptanceNotification(invitation: Invitation): Promise<SendEmailResult> {
  const { creatorName, recipientName, creatorEmail, respondedAt } = invitation;
  const acceptedTimeStr = formatTimestamp(respondedAt);

  const subject = '💕 Someone Said YES!';

  const textBody = `Good news! 💗\n\n${recipientName} has accepted your "Will You Be My Girlfriend?" invitation.\n\nYour invitation has officially received a YES! 💕\n\nAccepted at:\n${acceptedTimeStr}\n\n— Will You Be My Girlfriend?`;

  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FFF5F7; margin: 0; padding: 24px; color: #4A1525; }
          .card { max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; padding: 36px 32px; border: 1px solid #FFE4E9; box-shadow: 0 10px 25px rgba(244, 63, 94, 0.08); text-align: center; }
          .badge { display: inline-block; background: #FFE4E9; color: #E11D48; padding: 6px 14px; border-radius: 9999px; font-weight: 600; font-size: 14px; margin-bottom: 20px; }
          h1 { color: #BE123C; font-size: 26px; margin: 0 0 16px; font-weight: 700; }
          p { font-size: 16px; line-height: 1.6; color: #4C1D2A; margin: 12px 0; }
          .highlight { font-size: 20px; font-weight: 700; color: #E11D48; margin: 24px 0; padding: 16px; background: #FFF1F4; border-radius: 12px; }
          .timestamp { font-size: 13px; color: #9F1239; margin-top: 24px; padding-top: 16px; border-top: 1px solid #FFE4E9; }
          .footer { margin-top: 20px; font-size: 14px; font-weight: 600; color: #E11D48; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">💌 Special Update</div>
          <h1>Good news, ${creatorName}! 💗</h1>
          <p><strong>${recipientName}</strong> has just opened your invitation and accepted!</p>
          <div class="highlight">
            Your invitation has officially received a YES! 💕
          </div>
          <p>Here's to something beautiful, exciting, and unforgettable together.</p>
          <div class="timestamp">
            Accepted at: <strong>${acceptedTimeStr}</strong>
          </div>
          <div class="footer">
            — Will You Be My Girlfriend?
          </div>
        </div>
      </body>
    </html>
  `;

  // 1. Try Resend if configured
  if (process.env.RESEND_API_KEY) {
    try {
      const fromAddress = process.env.SMTP_FROM || 'Will You Be My Girlfriend? <onboarding@resend.dev>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [creatorEmail],
          subject,
          text: textBody,
          html: htmlBody,
        }),
      });

      if (res.ok) {
        console.log(`[Email] Acceptance sent via Resend to ${creatorEmail}`);
        return { sent: true, provider: 'resend' };
      } else {
        const errorText = await res.text();
        console.warn(`[Email] Resend API error: ${errorText}. Falling back...`);
      }
    } catch (err: unknown) {
      console.warn('[Email] Resend delivery error:', err);
    }
  }

  // 2. Try SMTP if configured
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"Will You Be My Girlfriend?" <${process.env.SMTP_USER}>`,
        to: creatorEmail,
        subject,
        text: textBody,
        html: htmlBody,
      });

      console.log(`[Email] Acceptance sent via custom SMTP to ${creatorEmail}`);
      return { sent: true, provider: 'smtp' };
    } catch (err: unknown) {
      console.warn('[Email] Custom SMTP error:', err);
    }
  }

  // 3. Fallback: Ethereal test inbox for development & testing
  try {
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const info = await transporter.sendMail({
      from: '"Will You Be My Girlfriend?" <noreply@willyoubemygirlfriend.app>',
      to: creatorEmail,
      subject,
      text: textBody,
      html: htmlBody,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    console.log(`[Email] Acceptance simulated for testing via Ethereal to ${creatorEmail}`);
    if (previewUrl) {
      console.log(`[Email Preview URL]: ${previewUrl}`);
    }

    return {
      sent: true,
      previewUrl,
      provider: 'ethereal',
    };
  } catch (err: unknown) {
    console.warn('[Email] Ethereal fallback error:', err);
    // Console fallback
    console.log(`\n==== [EMAIL DISPATCH TO ${creatorEmail}] ====\nSubject: ${subject}\n\n${textBody}\n====================================\n`);
    return {
      sent: true,
      provider: 'console',
      error: 'Credentials not configured, logged to console',
    };
  }
}
