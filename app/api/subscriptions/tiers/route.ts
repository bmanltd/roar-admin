import { NextResponse } from 'next/server';
import { requirePermission, logAdminAction } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const result = await requirePermission(request, 'subscriptions.read');
  if (result instanceof NextResponse) return result;

  try {
    const tiers = await prisma.subscriptionTier.findMany({
      include: {
        _count: { select: { subscriptions: true, productKeys: true } },
      },
      orderBy: { priceMonthly: 'asc' },
    });

    return NextResponse.json({ success: true, data: tiers });
  } catch (error) {
    console.error('Tiers list error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const result = await requirePermission(request, 'subscriptions.write');
  if (result instanceof NextResponse) return result;

  try {
    const body = await request.json();
    const { tierId, ...updates } = body;

    if (!tierId) {
      return NextResponse.json({ success: false, error: 'Tier ID is required' }, { status: 400 });
    }

    const tier = await prisma.subscriptionTier.update({
      where: { id: tierId },
      data: updates,
    });

    await logAdminAction(result.session.adminId, 'tier.update', 'subscription_tier', tierId, updates, request);

    return NextResponse.json({ success: true, data: tier });
  } catch (error) {
    console.error('Tier update error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const result = await requirePermission(request, 'subscriptions.write');
  if (result instanceof NextResponse) return result;

  try {
    const body = await request.json();
    const {
      name,
      displayName,
      priceMonthly,
      priceYearly,
      maxDevices = 1,
      maxProducts = 100,
      maxUsers = 1,
      offlineMode = true,
      cloudSync = false,
      backupEnabled = false,
      userManagement = false,
      accessLevels = false,
      prioritySupport = false,
    } = body;

    if (!name || !displayName || priceMonthly === undefined || priceYearly === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Name, display name, monthly price, and yearly price are required',
      }, { status: 400 });
    }

    // Check if tier with same name exists
    const existing = await prisma.subscriptionTier.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Tier with this name already exists' }, { status: 400 });
    }

    const tier = await prisma.subscriptionTier.create({
      data: {
        name,
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
      },
    });

    await logAdminAction(result.session.adminId, 'tier.create', 'subscription_tier', tier.id, { name, displayName }, request);

    return NextResponse.json({
      success: true,
      data: tier,
      message: 'Subscription tier created successfully',
    });
  } catch (error) {
    console.error('Create tier error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
