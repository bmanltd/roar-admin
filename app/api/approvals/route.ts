import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';
import { ApprovalStatus, ApprovalActionType, Prisma } from '@prisma/client';

export async function GET(request: Request) {
  const result = await requirePermission(request, 'approvals.read');
  if (result instanceof NextResponse) return result;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const status = searchParams.get('status');
    const actionType = searchParams.get('actionType');

    const where: Prisma.ApprovalRequestWhereInput = {};

    // SUPER_ADMIN sees all, others see only their own
    if (result.session.role !== 'SUPER_ADMIN') {
      where.requesterId = result.session.adminId;
    }

    if (status && status !== 'all') {
      where.status = status as ApprovalStatus;
    }
    if (actionType && actionType !== 'all') {
      where.actionType = actionType as ApprovalActionType;
    }

    const [requests, total] = await Promise.all([
      prisma.approvalRequest.findMany({
        where,
        include: {
          requester: { select: { fullName: true, email: true, role: true } },
          reviewer: { select: { fullName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.approvalRequest.count({ where }),
    ]);

    // Get pending count for badge (SUPER_ADMIN sees all pending, others see their own)
    const pendingWhere: Prisma.ApprovalRequestWhereInput = { status: ApprovalStatus.PENDING };
    if (result.session.role !== 'SUPER_ADMIN') {
      pendingWhere.requesterId = result.session.adminId;
    }
    const pendingCount = await prisma.approvalRequest.count({ where: pendingWhere });

    return NextResponse.json({
      success: true,
      data: requests,
      pendingCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Approvals list error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
