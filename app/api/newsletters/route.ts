import { NextResponse } from 'next/server';
import { requirePermission, logAdminAction } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const result = await requirePermission(request, 'newsletters.read');
  if (result instanceof NextResponse) return result;
  try {
    const campaigns = await prisma.newsletterCampaign.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ success: true, data: campaigns });
  } catch { return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }); }
}

export async function POST(request: Request) {
  const result = await requirePermission(request, 'newsletters.write');
  if (result instanceof NextResponse) return result;
  try {
    const { subject, content } = await request.json();
    const campaign = await prisma.newsletterCampaign.create({ data: { subject, content, createdBy: result.session.adminId } });
    await logAdminAction(result.session.adminId, 'newsletter.create', 'newsletter_campaign', campaign.id, { subject }, request);
    return NextResponse.json({ success: true, data: campaign });
  } catch { return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }); }
}
