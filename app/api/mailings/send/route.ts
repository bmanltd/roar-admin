import { NextResponse } from 'next/server';
import { requirePermission, logAdminAction } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email/brevo';

interface Recipient {
  email: string;
  name?: string;
}

interface SendMailingBody {
  recipients: Recipient[] | string;
  templateId?: string;
  subject?: string;
  htmlContent?: string;
  variables?: Record<string, string>;
}

function replaceVariables(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match;
  });
}

export async function POST(request: Request) {
  const result = await requirePermission(request, 'mailings.send');
  if (result instanceof NextResponse) return result;

  try {
    const body: SendMailingBody = await request.json();
    const { recipients, templateId, variables = {} } = body;
    let { subject, htmlContent } = body;

    // Normalize recipients to array
    const recipientList: Recipient[] = typeof recipients === 'string'
      ? [{ email: recipients }]
      : recipients;

    if (!recipientList || recipientList.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one recipient is required' },
        { status: 400 }
      );
    }

    // If templateId is provided, fetch template
    if (templateId) {
      const template = await prisma.emailTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        return NextResponse.json(
          { success: false, error: 'Email template not found' },
          { status: 404 }
        );
      }

      if (!template.isActive) {
        return NextResponse.json(
          { success: false, error: 'Email template is not active' },
          { status: 400 }
        );
      }

      subject = template.subject;
      htmlContent = template.htmlContent;
    }

    // Validate subject and htmlContent
    if (!subject) {
      return NextResponse.json(
        { success: false, error: 'Subject is required' },
        { status: 400 }
      );
    }

    if (!htmlContent) {
      return NextResponse.json(
        { success: false, error: 'HTML content is required' },
        { status: 400 }
      );
    }

    let sent = 0;
    let failed = 0;

    // Send email to each recipient
    for (const recipient of recipientList) {
      // Replace variables in subject and content for this recipient
      const personalizedSubject = replaceVariables(subject, variables);
      const personalizedContent = replaceVariables(htmlContent, variables);

      const emailResult = await sendEmail({
        to: recipient.email,
        toName: recipient.name,
        subject: personalizedSubject,
        htmlContent: personalizedContent,
      });

      const status = emailResult.success ? 'sent' : 'failed';

      // Create EmailSendLog record
      await prisma.emailSendLog.create({
        data: {
          templateId: templateId || null,
          recipientEmail: recipient.email,
          subject: personalizedSubject,
          status,
          sentBy: result.session.adminId,
        },
      });

      if (emailResult.success) {
        sent++;
      } else {
        failed++;
      }
    }

    // Log admin action
    await logAdminAction(
      result.session.adminId,
      'mailing.send',
      'email',
      templateId || undefined,
      {
        recipientCount: recipientList.length,
        sent,
        failed,
        templateId: templateId || null,
      },
      request
    );

    return NextResponse.json({
      success: true,
      sent,
      failed,
    });
  } catch (error) {
    console.error('Mailing send error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
