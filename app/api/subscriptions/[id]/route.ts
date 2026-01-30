import { NextResponse } from 'next/server';
import { requirePermission, logAdminAction } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission(request, 'subscriptions.read');
  if (result instanceof NextResponse) return result;

  const { id } = await params;

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, fullName: true, companyName: true } },
        tier: true,
      },
    });

    if (!subscription) {
      return NextResponse.json({ success: false, error: 'Subscription not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: subscription });
  } catch (error) {
    console.error('Subscription detail error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission(request, 'subscriptions.write');
  if (result instanceof NextResponse) return result;

  const { id } = await params;

  try {
    const body = await request.json();
    const { action, expiresAt, tierId } = body;

    if (action === 'extend' && expiresAt) {
      const subscription = await prisma.subscription.update({
        where: { id },
        data: { expiresAt: new Date(expiresAt), status: 'ACTIVE' },
      });
      await logAdminAction(result.session.adminId, 'subscription.extend', 'subscription', id, { expiresAt }, request);
      return NextResponse.json({ success: true, data: subscription });
    }

    if (action === 'suspend') {
      const subscription = await prisma.subscription.update({
        where: { id },
        data: { status: 'SUSPENDED' },
      });
      await logAdminAction(result.session.adminId, 'subscription.suspend', 'subscription', id, undefined, request);
      return NextResponse.json({ success: true, data: subscription });
    }

    if (action === 'activate') {
      const subscription = await prisma.subscription.update({
        where: { id },
        data: { status: 'ACTIVE' },
      });
      await logAdminAction(result.session.adminId, 'subscription.activate', 'subscription', id, undefined, request);
      return NextResponse.json({ success: true, data: subscription });
    }

    if (action === 'cancel') {
      const subscription = await prisma.subscription.update({
        where: { id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
      await logAdminAction(result.session.adminId, 'subscription.cancel', 'subscription', id, undefined, request);
      return NextResponse.json({ success: true, data: subscription });
    }

    if (action === 'change_tier' && tierId) {
      const subscription = await prisma.subscription.update({
        where: { id },
        data: { tierId },
      });
      await logAdminAction(result.session.adminId, 'subscription.change_tier', 'subscription', id, { tierId }, request);
      return NextResponse.json({ success: true, data: subscription });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Subscription update error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
