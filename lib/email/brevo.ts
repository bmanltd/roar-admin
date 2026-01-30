const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'noreply@butman.rw';
const SENDER_NAME = process.env.BREVO_SENDER_NAME || 'BMan Admin';

interface SendEmailParams {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export async function sendEmail({
  to,
  toName,
  subject,
  htmlContent,
  textContent,
}: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  if (!BREVO_API_KEY) {
    console.error('[Brevo] API key not configured.');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const payload = {
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: [{ email: to, name: toName || to }],
      subject,
      htmlContent,
      textContent: textContent || htmlContent.replace(/<[^>]*>/g, ''),
    };

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return { success: true };
    }

    const error = await response.json();
    console.error('[Brevo] API error:', JSON.stringify(error, null, 2));
    return { success: false, error: error.message || 'Failed to send email' };
  } catch (error) {
    console.error('[Brevo] Send error:', error);
    return { success: false, error: 'Email service unavailable' };
  }
}

export async function sendAdmin2FACode(
  email: string,
  name: string | null | undefined,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const displayName = name || 'Admin';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr><td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
            <tr><td style="background-color: #0f172a; padding: 32px 40px; text-align: center;">
              <div style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 10px; line-height: 48px; margin-bottom: 16px;">
                <span style="color: white; font-weight: bold; font-size: 22px;">B</span>
              </div>
              <h1 style="color: #ffffff; font-size: 20px; font-weight: 600; margin: 0;">Admin Verification Code</h1>
            </td></tr>
            <tr><td style="padding: 40px;">
              <p style="color: #171717; font-size: 15px; margin: 0 0 24px 0;">Hi <strong>${displayName}</strong>,</p>
              <p style="color: #525252; font-size: 14px; margin: 0 0 32px 0;">Use the code below to complete your admin sign-in. This code expires in 5 minutes.</p>
              <div style="background-color: #0f172a; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 32px;">
                <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #ffffff; font-family: 'SF Mono', monospace;">${code}</span>
              </div>
              <p style="color: #737373; font-size: 13px; margin: 0;">If you didn't request this code, please contact the super admin immediately.</p>
            </td></tr>
            <tr><td style="background-color: #fafafa; padding: 24px 40px; border-top: 1px solid #e5e5e5;">
              <p style="color: #a3a3a3; font-size: 12px; margin: 0; text-align: center;">&copy; ${new Date().getFullYear()} BMan Admin. All rights reserved.</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    toName: name || undefined,
    subject: `${code} - BMan Admin verification code`,
    htmlContent,
  });
}

export async function sendWelcomeEmail(
  email: string,
  name: string,
  tempPassword: string
): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_BMAN_WEB_URL || 'https://butman.rw';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr><td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
            <tr><td style="background-color: #0f172a; padding: 32px 40px; text-align: center;">
              <div style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 10px; line-height: 48px; margin-bottom: 16px;">
                <span style="color: white; font-weight: bold; font-size: 22px;">B</span>
              </div>
              <h1 style="color: #ffffff; font-size: 20px; font-weight: 600; margin: 0;">Welcome to BMan Stock</h1>
            </td></tr>
            <tr><td style="padding: 40px;">
              <p style="color: #171717; font-size: 15px; margin: 0 0 24px 0;">Hi <strong>${name}</strong>,</p>
              <p style="color: #525252; font-size: 14px; margin: 0 0 24px 0;">Your BMan Stock account has been created by an administrator. Use the credentials below to sign in:</p>
              <div style="background-color: #f5f5f5; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <p style="color: #171717; font-size: 14px; margin: 0 0 8px 0;"><strong>Email:</strong> ${email}</p>
                <p style="color: #171717; font-size: 14px; margin: 0;"><strong>Temporary Password:</strong> <code style="background: #e5e5e5; padding: 2px 6px; border-radius: 4px;">${tempPassword}</code></p>
              </div>
              <p style="color: #525252; font-size: 14px; margin: 0 0 32px 0;">Please change your password after your first login for security.</p>
              <div style="text-align: center; margin-bottom: 32px;">
                <a href="${appUrl}/login" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Sign In to BMan</a>
              </div>
              <p style="color: #737373; font-size: 13px; margin: 0;">If you didn't expect this account, please contact support.</p>
            </td></tr>
            <tr><td style="background-color: #fafafa; padding: 24px 40px; border-top: 1px solid #e5e5e5;">
              <p style="color: #a3a3a3; font-size: 12px; margin: 0; text-align: center;">&copy; ${new Date().getFullYear()} BMan Stock. All rights reserved.</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    toName: name,
    subject: 'Welcome to BMan Stock - Your Account Details',
    htmlContent,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetToken: string
): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_BMAN_WEB_URL || 'https://butman.rw';
  const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr><td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
            <tr><td style="background-color: #0f172a; padding: 32px 40px; text-align: center;">
              <div style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 10px; line-height: 48px; margin-bottom: 16px;">
                <span style="color: white; font-weight: bold; font-size: 22px;">B</span>
              </div>
              <h1 style="color: #ffffff; font-size: 20px; font-weight: 600; margin: 0;">Password Reset Request</h1>
            </td></tr>
            <tr><td style="padding: 40px;">
              <p style="color: #171717; font-size: 15px; margin: 0 0 24px 0;">Hi <strong>${name}</strong>,</p>
              <p style="color: #525252; font-size: 14px; margin: 0 0 32px 0;">An administrator has initiated a password reset for your account. Click the button below to set a new password. This link expires in 24 hours.</p>
              <div style="text-align: center; margin-bottom: 32px;">
                <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Reset Password</a>
              </div>
              <p style="color: #737373; font-size: 13px; margin: 0;">If you didn't request this, please contact support immediately.</p>
            </td></tr>
            <tr><td style="background-color: #fafafa; padding: 24px 40px; border-top: 1px solid #e5e5e5;">
              <p style="color: #a3a3a3; font-size: 12px; margin: 0; text-align: center;">&copy; ${new Date().getFullYear()} BMan Stock. All rights reserved.</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    toName: name,
    subject: 'BMan Stock - Password Reset Request',
    htmlContent,
  });
}

export async function sendAdminInviteEmail(
  email: string,
  inviterName: string,
  role: string,
  inviteToken: string
): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
  const inviteUrl = `${appUrl}/setup?token=${inviteToken}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr><td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
            <tr><td style="background-color: #0f172a; padding: 32px 40px; text-align: center;">
              <div style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 10px; line-height: 48px; margin-bottom: 16px;">
                <span style="color: white; font-weight: bold; font-size: 22px;">B</span>
              </div>
              <h1 style="color: #ffffff; font-size: 20px; font-weight: 600; margin: 0;">Admin Invitation</h1>
            </td></tr>
            <tr><td style="padding: 40px;">
              <p style="color: #171717; font-size: 15px; margin: 0 0 24px 0;">Hello,</p>
              <p style="color: #525252; font-size: 14px; margin: 0 0 24px 0;"><strong>${inviterName}</strong> has invited you to join the BMan Admin team as <strong>${role.replace('_', ' ')}</strong>.</p>
              <p style="color: #525252; font-size: 14px; margin: 0 0 32px 0;">Click the button below to set up your account. This invitation expires in 48 hours.</p>
              <div style="text-align: center; margin-bottom: 32px;">
                <a href="${inviteUrl}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Accept Invitation</a>
              </div>
              <p style="color: #737373; font-size: 13px; margin: 0;">If you weren't expecting this invitation, you can safely ignore this email.</p>
            </td></tr>
            <tr><td style="background-color: #fafafa; padding: 24px 40px; border-top: 1px solid #e5e5e5;">
              <p style="color: #a3a3a3; font-size: 12px; margin: 0; text-align: center;">&copy; ${new Date().getFullYear()} BMan Admin. All rights reserved.</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `You've been invited to BMan Admin`,
    htmlContent,
  });
}

export async function sendSupportReply(
  email: string,
  ticketNumber: string,
  subject: string,
  adminMessage: string
): Promise<{ success: boolean; error?: string }> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr><td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
            <tr><td style="background-color: #0f172a; padding: 32px 40px; text-align: center;">
              <div style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 10px; line-height: 48px; margin-bottom: 16px;">
                <span style="color: white; font-weight: bold; font-size: 22px;">B</span>
              </div>
              <h1 style="color: #ffffff; font-size: 20px; font-weight: 600; margin: 0;">Support Response</h1>
            </td></tr>
            <tr><td style="padding: 40px;">
              <p style="color: #525252; font-size: 14px; margin: 0 0 16px 0;">Ticket: <strong>#${ticketNumber}</strong></p>
              <p style="color: #525252; font-size: 14px; margin: 0 0 24px 0;">Subject: <strong>${subject}</strong></p>
              <div style="background-color: #f5f5f5; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <p style="color: #171717; font-size: 14px; margin: 0; white-space: pre-wrap;">${adminMessage}</p>
              </div>
              <p style="color: #737373; font-size: 13px; margin: 0;">If you have additional questions, please reply to this email or visit our support portal.</p>
            </td></tr>
            <tr><td style="background-color: #fafafa; padding: 24px 40px; border-top: 1px solid #e5e5e5;">
              <p style="color: #a3a3a3; font-size: 12px; margin: 0; text-align: center;">&copy; ${new Date().getFullYear()} BMan Stock. All rights reserved.</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Re: ${subject} - Ticket #${ticketNumber}`,
    htmlContent,
  });
}
