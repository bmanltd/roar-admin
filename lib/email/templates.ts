export function getEmailWrapper(title: string, content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr><td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
            <tr><td style="background-color: #0f172a; padding: 32px 40px; text-align: center;">
              <div style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 10px; line-height: 48px; margin-bottom: 16px;">
                <span style="color: white; font-weight: bold; font-size: 22px;">B</span>
              </div>
              <h1 style="color: #ffffff; font-size: 20px; font-weight: 600; margin: 0;">${title}</h1>
            </td></tr>
            <tr><td style="padding: 40px;">
              ${content}
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
}

export function getNewsletterTemplate(subject: string, content: string, unsubscribeUrl: string): string {
  return getEmailWrapper(subject, `
    <div style="color: #525252; font-size: 14px; line-height: 1.8;">
      ${content}
    </div>
    <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />
    <p style="color: #a3a3a3; font-size: 12px; text-align: center;">
      <a href="${unsubscribeUrl}" style="color: #a3a3a3;">Unsubscribe</a>
    </p>
  `);
}
