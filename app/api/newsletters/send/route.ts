import { NextResponse } from 'next/server';
import { requirePermission, logAdminAction } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email/brevo';
import { getEmailWrapper } from '@/lib/email/templates';

export async function POST(request: Request) {
  const result = await requirePermission(request, 'newsletters.send');
  if (result instanceof NextResponse) return result;
  try {
    const { campaignId } = await request.json();
    const campaign = await prisma.newsletterCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    if (campaign.status !== 'draft') return NextResponse.json({ success: false, error: 'Campaign already sent' }, { status: 400 });

    const subscribers = await prisma.newsletterSubscriber.findMany({ where: { isActive: true } });

    await prisma.newsletterCampaign.update({ where: { id: campaignId }, data: { status: 'sending', recipientCount: subscribers.length } });

    let sentCount = 0;
    for (const sub of subscribers) {
      const html = getEmailWrapper(campaign.subject, campaign.content);
      const result = await sendEmail({ to: sub.email, subject: campaign.subject, htmlContent: html });
      if (result.success) sentCount++;
    }

    await prisma.newsletterCampaign.update({ where: { id: campaignId }, data: { status: 'sent', sentCount, sentAt: new Date() } });

    await logAdminAction(result.session.adminId, 'newsletter.send', 'newsletter_campaign', campaignId, { sentCount, recipientCount: subscribers.length }, request);

    return NextResponse.json({ success: true, data: { sentCount, recipientCount: subscribers.length } });
  } catch (error) {
    console.error('Newsletter send error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
