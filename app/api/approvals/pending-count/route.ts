import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';
import { ApprovalStatus, Prisma } from '@prisma/client';

export async function GET(request: Request) {
  const result = await requirePermission(request, 'approvals.read');
  if (result instanceof NextResponse) return result;

  try {
    const where: Prisma.ApprovalRequestWhereInput = { status: ApprovalStatus.PENDING };

    // Non-SUPER_ADMINs only see their own pending requests
    if (result.session.role !== 'SUPER_ADMIN') {
      where.requesterId = result.session.adminId;
    }

    const count = await prisma.approvalRequest.count({ where });

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error('Pending count error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
