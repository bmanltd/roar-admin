import { NextResponse } from 'next/server';
import { requirePermission, logAdminAction } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';
import { createApprovalRequest } from '@/lib/approval';

export async function GET(request: Request) {
  const result = await requirePermission(request, 'payments.read');
  if (result instanceof NextResponse) return result;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          user: { select: { email: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: payments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Payments list error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const result = await requirePermission(request, 'payments.write');
  if (result instanceof NextResponse) return result;

  try {
    const body = await request.json();
    const {
      userId,
      amount,
      currency = 'RWF',
      paymentMethod,
      planTier,
      billingCycle,
      notes,
      extendSubscription
    } = body;

    if (!userId || !amount || !paymentMethod || !planTier || !billingCycle) {
      return NextResponse.json({
        success: false,
        error: 'userId, amount, paymentMethod, planTier, and billingCycle are required'
      }, { status: 400 });
    }

    // Validate paymentMethod
    const validMethods = ['MANUAL', 'CASH', 'BANK_TRANSFER'];
    if (!validMethods.includes(paymentMethod)) {
      return NextResponse.json({
        success: false,
        error: `Invalid payment method. Must be one of: ${validMethods.join(', ')}`
      }, { status: 400 });
    }

    // Validate billingCycle
    const validCycles = ['MONTHLY', 'BIANNUAL', 'YEARLY'];
    if (!validCycles.includes(billingCycle)) {
      return NextResponse.json({
        success: false,
        error: `Invalid billing cycle. Must be one of: ${validCycles.join(', ')}`
      }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Check if approval is required
    const approvalResult = await createApprovalRequest({
      actionType: 'PAYMENT_CREATE',
      resourceType: 'payment',
      payload: { userId, amount, currency, paymentMethod, planTier, billingCycle, notes, extendSubscription },
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

    // Generate unique transaction reference
    const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
    const txRef = `MANUAL-${Date.now()}-${randomPart}`;

    // Map payment method to enum value (BANK for manual/transfer, CARD for cash as fallback)
    const methodMapping: Record<string, 'MOMO' | 'CARD' | 'BANK'> = {
      'MANUAL': 'BANK',
      'CASH': 'CARD',
      'BANK_TRANSFER': 'BANK',
    };

    const payment = await prisma.payment.create({
      data: {
        userId,
        txRef,
        amount: parseInt(amount),
        currency,
        paymentMethod: methodMapping[paymentMethod],
        status: 'SUCCESSFUL',
        planTier,
        billingCycle,
        paidAt: new Date(),
        flwResponse: {
          manualEntry: true,
          originalMethod: paymentMethod,
          notes: notes || null,
          createdBy: result.session.adminId,
        },
      },
      include: {
        user: { select: { email: true, fullName: true } },
      },
    });

    // Extend subscription if requested
    if (extendSubscription) {
      const subscription = await prisma.subscription.findUnique({ where: { userId } });

      if (subscription) {
        // Calculate days to add based on billing cycle
        const daysToAdd = billingCycle === 'YEARLY' ? 365 : billingCycle === 'BIANNUAL' ? 180 : 30;

        // Start from current expiry date if still valid, otherwise from now
        const baseDate = subscription.expiresAt > new Date() ? subscription.expiresAt : new Date();
        const newExpiresAt = new Date(baseDate);
        newExpiresAt.setDate(newExpiresAt.getDate() + daysToAdd);

        await prisma.subscription.update({
          where: { userId },
          data: {
            expiresAt: newExpiresAt,
            status: 'ACTIVE',
          },
        });
      }
    }

    await logAdminAction(
      result.session.adminId,
      'payment.create',
      'payment',
      payment.id,
      {
        userId,
        amount,
        paymentMethod,
        planTier,
        billingCycle,
        extendSubscription: extendSubscription || false,
        notes: notes || null,
      },
      request
    );

    return NextResponse.json({
      success: true,
      data: payment,
      message: 'Manual payment record created successfully',
    });
  } catch (error) {
    console.error('Create payment error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
