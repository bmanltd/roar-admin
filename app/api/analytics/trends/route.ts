import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const result = await requirePermission(request, 'analytics.read');
  if (result instanceof NextResponse) return result;

  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Get monthly revenue for last 6 months
    const revenueByMonth = await prisma.payment.groupBy({
      by: ['paidAt'],
      where: {
        status: 'SUCCESSFUL',
        paidAt: { gte: sixMonthsAgo },
      },
      _sum: { amount: true },
    });

    // Process into monthly buckets
    const monthlyRevenue: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleString('default', { month: 'short' });
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthPayments = await prisma.payment.aggregate({
        where: {
          status: 'SUCCESSFUL',
          paidAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      });

      monthlyRevenue.push({
        month: monthKey,
        revenue: monthPayments._sum.amount || 0,
      });
    }

    // Get user signups by month for last 6 months
    const userGrowth: { month: string; users: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleString('default', { month: 'short' });
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const count = await prisma.user.count({
        where: {
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      });

      userGrowth.push({
        month: monthKey,
        users: count,
      });
    }

    // Get subscription distribution by tier
    const tierDistribution = await prisma.subscriptionTier.findMany({
      select: {
        displayName: true,
        _count: {
          select: {
            subscriptions: {
              where: { status: 'ACTIVE' },
            },
          },
        },
      },
    });

    const subscriptionsByTier = tierDistribution.map((tier) => ({
      name: tier.displayName,
      value: tier._count.subscriptions,
    })).filter(t => t.value > 0);

    return NextResponse.json({
      success: true,
      data: {
        monthlyRevenue,
        userGrowth,
        subscriptionsByTier,
      },
    });
  } catch (error) {
    console.error('Analytics trends error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
