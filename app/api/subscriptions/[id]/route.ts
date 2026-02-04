import { NextResponse } from 'next/server';
import { requirePermission, logAdminAction } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';
import { createApprovalRequest } from '@/lib/approval';
import type { ApprovalActionType } from '@prisma/client';

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

    // Map actions to approval action types (actions requiring approval)
    const approvalActionMap: Record<string, ApprovalActionType> = {
      extend: 'SUBSCRIPTION_EXTEND',
      suspend: 'SUBSCRIPTION_SUSPEND',
      cancel: 'SUBSCRIPTION_CANCEL',
      change_tier: 'SUBSCRIPTION_CHANGE_TIER',
    };

    // Check if this action requires approval
    if (approvalActionMap[action]) {
      const approvalResult = await createApprovalRequest({
        actionType: approvalActionMap[action],
        resourceType: 'subscription',
        resourceId: id,
        payload: { action, expiresAt, tierId },
        session: result.session,
        request,
      });

      if (approvalResult.requiresApproval) {
        return NextResponse.json({
          success: true,
          requiresApproval: true,
          approvalRequest: approvalResult.approvalRequest,
          message: 'Your request has been submitted for approval',
        });
      }
    }

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
      // Activate doesn't require approval - it's restoring access
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
