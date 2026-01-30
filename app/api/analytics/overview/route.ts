import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const result = await requirePermission(request, 'analytics.read');
  if (result instanceof NextResponse) return result;

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeSubscriptions,
      monthlyPayments,
      activeDevices,
      pendingTickets,
      totalProductKeys,
      newUsersThisMonth,
      expiringSubscriptions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.payment.aggregate({
        where: {
          status: 'SUCCESSFUL',
          paidAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      prisma.deviceRegistry.count({ where: { isActive: true } }),
      prisma.feedback.count({ where: { status: 'NEW' } }),
      prisma.productKey.count(),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.subscription.count({
        where: {
          status: 'ACTIVE',
          expiresAt: { lte: sevenDaysFromNow, gte: now },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        activeSubscriptions,
        monthlyRevenue: monthlyPayments._sum.amount || 0,
        activeDevices,
        pendingTickets,
        totalProductKeys,
        newUsersThisMonth,
        expiringSubscriptions,
      },
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
