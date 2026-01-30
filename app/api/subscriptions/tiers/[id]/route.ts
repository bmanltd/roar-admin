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
    const tier = await prisma.subscriptionTier.findUnique({
      where: { id },
      include: {
        _count: { select: { subscriptions: true, productKeys: true } },
      },
    });

    if (!tier) {
      return NextResponse.json({ success: false, error: 'Tier not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: tier });
  } catch (error) {
    console.error('Tier detail error:', error);
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
    const {
      displayName,
      priceMonthly,
      priceYearly,
      maxDevices,
      maxProducts,
      maxUsers,
      offlineMode,
      cloudSync,
      backupEnabled,
      userManagement,
      accessLevels,
      prioritySupport,
    } = body;

    const tier = await prisma.subscriptionTier.findUnique({ where: { id } });
    if (!tier) {
      return NextResponse.json({ success: false, error: 'Tier not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (priceMonthly !== undefined) updateData.priceMonthly = priceMonthly;
    if (priceYearly !== undefined) updateData.priceYearly = priceYearly;
    if (maxDevices !== undefined) updateData.maxDevices = maxDevices;
    if (maxProducts !== undefined) updateData.maxProducts = maxProducts;
    if (maxUsers !== undefined) updateData.maxUsers = maxUsers;
    if (offlineMode !== undefined) updateData.offlineMode = offlineMode;
    if (cloudSync !== undefined) updateData.cloudSync = cloudSync;
    if (backupEnabled !== undefined) updateData.backupEnabled = backupEnabled;
    if (userManagement !== undefined) updateData.userManagement = userManagement;
    if (accessLevels !== undefined) updateData.accessLevels = accessLevels;
    if (prioritySupport !== undefined) updateData.prioritySupport = prioritySupport;

    const updatedTier = await prisma.subscriptionTier.update({
      where: { id },
      data: updateData,
    });

    await logAdminAction(result.session.adminId, 'tier.update', 'subscription_tier', id, updateData, request);

    return NextResponse.json({ success: true, data: updatedTier });
  } catch (error) {
    console.error('Tier update error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission(request, 'subscriptions.delete');
  if (result instanceof NextResponse) return result;

  const { id } = await params;

  try {
    const tier = await prisma.subscriptionTier.findUnique({
      where: { id },
      include: { _count: { select: { subscriptions: true } } },
    });

    if (!tier) {
      return NextResponse.json({ success: false, error: 'Tier not found' }, { status: 404 });
    }

    // Don't allow deletion if there are active subscriptions
    if (tier._count.subscriptions > 0) {
      return NextResponse.json({
        success: false,
        error: `Cannot delete tier with ${tier._count.subscriptions} active subscription(s)`,
      }, { status: 400 });
    }

    await prisma.subscriptionTier.delete({ where: { id } });

    await logAdminAction(result.session.adminId, 'tier.delete', 'subscription_tier', id, { name: tier.name }, request);

    return NextResponse.json({ success: true, message: 'Tier deleted' });
  } catch (error) {
    console.error('Tier delete error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
