import { NextResponse } from 'next/server';
import { requirePermission, logAdminAction } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const result = await requirePermission(request, 'subscriptions.read');
  if (result instanceof NextResponse) return result;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const status = searchParams.get('status');
    const tier = searchParams.get('tier');

    const where: any = {};
    if (status) where.status = status;
    if (tier) where.tier = { name: tier };

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: {
          user: { select: { email: true, fullName: true, companyName: true } },
          tier: { select: { name: true, displayName: true, priceMonthly: true, priceYearly: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.subscription.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: subscriptions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Subscriptions list error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const result = await requirePermission(request, 'subscriptions.write');
  if (result instanceof NextResponse) return result;

  try {
    const body = await request.json();
    const { userId, tierId, billingCycle, validityDays, pricePaid } = body;

    if (!userId || !tierId) {
      return NextResponse.json({ success: false, error: 'User ID and Tier ID are required' }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Check if tier exists
    const tier = await prisma.subscriptionTier.findUnique({ where: { id: tierId } });
    if (!tier) {
      return NextResponse.json({ success: false, error: 'Subscription tier not found' }, { status: 404 });
    }

    const cycle = billingCycle || 'MONTHLY';
    const days = validityDays || (cycle === 'YEARLY' ? 365 : cycle === 'BIANNUAL' ? 180 : 30);
    const price = pricePaid || (cycle === 'YEARLY' ? tier.priceYearly : tier.priceMonthly);

    // Check for existing subscription
    const existingSub = await prisma.subscription.findUnique({ where: { userId } });

    // Generate unique transaction reference for payment
    const txRef = `ADMIN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    if (existingSub) {
      // RENEWAL: Only allow if subscription is EXPIRED or CANCELLED
      if (existingSub.status === 'ACTIVE') {
        return NextResponse.json({
          success: false,
          error: 'User has an active subscription. Use extend or modify instead.',
        }, { status: 400 });
      }

      // Calculate new expiry from NOW (not from old expiry)
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + days);

      // Update subscription (tier change allowed)
      const subscription = await prisma.subscription.update({
        where: { userId },
        data: {
          tierId,
          status: 'ACTIVE',
          billingCycle: cycle,
          expiresAt: newExpiresAt,
          pricePaid: price,
        },
        include: {
          user: { select: { email: true, fullName: true } },
          tier: { select: { name: true, displayName: true } },
        },
      });

      // Create payment record for renewal
      await prisma.payment.create({
        data: {
          userId,
          txRef,
          amount: price,
          currency: 'RWF',
          paymentMethod: 'BANK',
          status: 'SUCCESSFUL',
          planTier: tier.name,
          billingCycle: cycle,
          paidAt: new Date(),
        },
      });

      await logAdminAction(
        result.session.adminId,
        'subscription.renew',
        'subscription',
        subscription.id,
        { userId, tierId, billingCycle: cycle, days, previousStatus: existingSub.status },
        request
      );

      return NextResponse.json({
        success: true,
        data: subscription,
        message: 'Subscription renewed successfully',
      });
    } else {
      // NEW SUBSCRIPTION: Create fresh
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);

      const subscription = await prisma.subscription.create({
        data: {
          userId,
          tierId,
          status: 'ACTIVE',
          billingCycle: cycle,
          startsAt: new Date(),
          expiresAt,
          pricePaid: price,
        },
        include: {
          user: { select: { email: true, fullName: true } },
          tier: { select: { name: true, displayName: true } },
        },
      });

      // Create payment record for new subscription
      await prisma.payment.create({
        data: {
          userId,
          txRef,
          amount: price,
          currency: 'RWF',
          paymentMethod: 'BANK',
          status: 'SUCCESSFUL',
          planTier: tier.name,
          billingCycle: cycle,
          paidAt: new Date(),
        },
      });

      await logAdminAction(
        result.session.adminId,
        'subscription.create',
        'subscription',
        subscription.id,
        { userId, tierId, billingCycle: cycle },
        request
      );

      return NextResponse.json({
        success: true,
        data: subscription,
        message: 'Subscription created successfully',
      });
    }
  } catch (error) {
    console.error('Create subscription error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
