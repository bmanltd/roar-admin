import { NextResponse } from 'next/server';
import { requirePermission, logAdminAction } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission(request, 'newsletters.read');
  if (result instanceof NextResponse) return result;

  const { id } = await params;

  try {
    const campaign = await prisma.newsletterCampaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: campaign });
  } catch (error) {
    console.error('Campaign detail error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission(request, 'newsletters.write');
  if (result instanceof NextResponse) return result;

  const { id } = await params;

  try {
    const body = await request.json();
    const { subject, content, scheduledAt } = body;

    const campaign = await prisma.newsletterCampaign.findUnique({ where: { id } });
    if (!campaign) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.status !== 'draft') {
      return NextResponse.json({ success: false, error: 'Only draft campaigns can be edited' }, { status: 400 });
    }

    const updateData: any = {};
    if (subject !== undefined) updateData.subject = subject;
    if (content !== undefined) updateData.content = content;
    if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;

    const updatedCampaign = await prisma.newsletterCampaign.update({
      where: { id },
      data: updateData,
    });

    await logAdminAction(result.session.adminId, 'newsletters.update', 'newsletter_campaign', id, updateData, request);

    return NextResponse.json({ success: true, data: updatedCampaign });
  } catch (error) {
    console.error('Campaign update error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission(request, 'newsletters.delete');
  if (result instanceof NextResponse) return result;

  const { id } = await params;

  try {
    const campaign = await prisma.newsletterCampaign.findUnique({ where: { id } });

    if (!campaign) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.status !== 'draft') {
      return NextResponse.json({ success: false, error: 'Only draft campaigns can be deleted' }, { status: 400 });
    }

    await prisma.newsletterCampaign.delete({ where: { id } });

    await logAdminAction(result.session.adminId, 'newsletters.delete', 'newsletter_campaign', id, { subject: campaign.subject }, request);

    return NextResponse.json({ success: true, message: 'Campaign deleted' });
  } catch (error) {
    console.error('Campaign delete error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
