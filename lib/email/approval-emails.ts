import { sendEmail } from './brevo';
import { APPROVAL_ACTION_LABELS, type ApprovalActionType } from '@/lib/constants';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';

interface ApprovalRequestEmailParams {
  to: string;
  toName: string;
  requesterName: string;
  actionType: ApprovalActionType;
  resourceType: string;
  requestId: string;
}

export async function sendApprovalRequestEmail({
  to,
  toName,
  requesterName,
  actionType,
  resourceType,
  requestId,
}: ApprovalRequestEmailParams) {
  const actionLabel = APPROVAL_ACTION_LABELS[actionType] || actionType;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px 40px; text-align: center;">
                  <div style="display: inline-block; width: 56px; height: 56px; background: rgba(255,255,255,0.2); border-radius: 14px; line-height: 56px; margin-bottom: 16px;">
                    <span style="color: white; font-weight: bold; font-size: 28px;">!</span>
                  </div>
                  <h1 style="color: #ffffff; font-size: 22px; font-weight: 600; margin: 0;">Approval Required</h1>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="color: #171717; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                    Hi <strong>${toName}</strong>,
                  </p>

                  <p style="color: #525252; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                    <strong>${requesterName}</strong> has submitted a request that requires your approval:
                  </p>

                  <!-- Action Card -->
                  <div style="background-color: #fef3c7; border-radius: 10px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
                    <table cellpadding="0" cellspacing="0" style="width: 100%;">
                      <tr>
                        <td style="padding-bottom: 8px;">
                          <span style="color: #92400e; font-size: 12px; text-transform: uppercase; font-weight: 600;">Action</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <span style="color: #78350f; font-size: 16px; font-weight: 600;">${actionLabel}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px;">
                          <span style="color: #92400e; font-size: 12px; text-transform: uppercase; font-weight: 600;">Resource Type</span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <span style="color: #78350f; font-size: 14px;">${resourceType}</span>
                        </td>
                      </tr>
                    </table>
                  </div>

                  <!-- CTA Button -->
                  <div style="text-align: center; margin-bottom: 32px;">
                    <a href="${APP_URL}/approvals/${requestId}"
                       style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                      Review Request
                    </a>
                  </div>

                  <p style="color: #737373; font-size: 13px; line-height: 1.5; margin: 0; text-align: center;">
                    This request will expire in 72 hours if not reviewed.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #fafafa; padding: 24px 40px; border-top: 1px solid #e5e5e5;">
                  <p style="color: #a3a3a3; font-size: 12px; margin: 0; text-align: center;">
                    &copy; ${new Date().getFullYear()} BMan Admin. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    toName,
    subject: `[Action Required] Approval Request: ${actionLabel}`,
    htmlContent,
  });
}

interface ApprovalDecisionEmailParams {
  to: string;
  toName: string;
  actionType: ApprovalActionType;
  decision: 'approved' | 'rejected';
  reviewerNote?: string;
}

export async function sendApprovalDecisionEmail({
  to,
  toName,
  actionType,
  decision,
  reviewerNote,
}: ApprovalDecisionEmailParams) {
  const actionLabel = APPROVAL_ACTION_LABELS[actionType] || actionType;
  const isApproved = decision === 'approved';
  const bgColor = isApproved ? '#10b981' : '#ef4444';
  const bgGradient = isApproved
    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
    : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
  const statusText = isApproved ? 'Approved' : 'Rejected';
  const icon = isApproved ? '&#10003;' : '&#10007;';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <!-- Header -->
              <tr>
                <td style="background: ${bgGradient}; padding: 32px 40px; text-align: center;">
                  <div style="display: inline-block; width: 56px; height: 56px; background: rgba(255,255,255,0.2); border-radius: 50%; line-height: 56px; margin-bottom: 16px;">
                    <span style="color: white; font-weight: bold; font-size: 28px;">${icon}</span>
                  </div>
                  <h1 style="color: #ffffff; font-size: 22px; font-weight: 600; margin: 0;">Request ${statusText}</h1>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="color: #171717; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                    Hi <strong>${toName}</strong>,
                  </p>

                  <p style="color: #525252; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                    Your approval request for <strong>${actionLabel}</strong> has been
                    <span style="color: ${bgColor}; font-weight: 600;">${decision}</span>.
                  </p>

                  ${
                    reviewerNote
                      ? `
                  <!-- Reviewer Note -->
                  <div style="background-color: #f5f5f5; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
                    <p style="color: #737373; font-size: 12px; text-transform: uppercase; font-weight: 600; margin: 0 0 8px 0;">
                      Reviewer's Note
                    </p>
                    <p style="color: #525252; font-size: 14px; line-height: 1.5; margin: 0;">
                      ${reviewerNote}
                    </p>
                  </div>
                  `
                      : ''
                  }

                  ${
                    isApproved
                      ? `
                  <div style="background-color: #ecfdf5; border-radius: 10px; padding: 16px; text-align: center;">
                    <p style="color: #059669; font-size: 14px; font-weight: 500; margin: 0;">
                      The action has been executed successfully.
                    </p>
                  </div>
                  `
                      : ''
                  }
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #fafafa; padding: 24px 40px; border-top: 1px solid #e5e5e5;">
                  <p style="color: #a3a3a3; font-size: 12px; margin: 0; text-align: center;">
                    &copy; ${new Date().getFullYear()} BMan Admin. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    toName,
    subject: `Request ${statusText}: ${actionLabel}`,
    htmlContent,
  });
}
