import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';
import { approveRequest, rejectRequest, cancelRequest } from '@/lib/approval';
import { ROLE_PERMISSIONS, type AdminRoleType } from '@/lib/constants';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission(request, 'approvals.read');
  if (result instanceof NextResponse) return result;

  const { id } = await params;

  try {
    const approvalRequest = await prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        requester: { select: { fullName: true, email: true, role: true } },
        reviewer: { select: { fullName: true, email: true } },
        cancelledBy: { select: { fullName: true } },
      },
    });

    if (!approvalRequest) {
      return NextResponse.json(
        { success: false, error: 'Approval request not found' },
        { status: 404 }
      );
    }

    // Check access: SUPER_ADMIN sees all, others see only their own
    if (
      result.session.role !== 'SUPER_ADMIN' &&
      approvalRequest.requesterId !== result.session.adminId
    ) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Check if user can approve (has approvals.approve permission and is not the requester)
    const userPermissions = ROLE_PERMISSIONS[result.session.role as AdminRoleType] || [];
    const canApprove =
      userPermissions.includes('approvals.approve') &&
      approvalRequest.requesterId !== result.session.adminId &&
      approvalRequest.status === 'PENDING';

    return NextResponse.json({ success: true, data: approvalRequest, canApprove });
  } catch (error) {
    console.error('Approval detail error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission(request, 'approvals.approve');
  if (result instanceof NextResponse) return result;

  const { id } = await params;

  try {
    const body = await request.json();
    const { action, note } = body;

    if (action === 'approve') {
      const approveResult = await approveRequest(id, result.session, note, request);
      if (!approveResult.success) {
        return NextResponse.json(
          { success: false, error: approveResult.error },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        message: 'Request approved and executed',
        result: approveResult.result,
      });
    }

    if (action === 'reject') {
      if (!note) {
        return NextResponse.json(
          { success: false, error: 'Rejection reason is required' },
          { status: 400 }
        );
      }
      const rejectResult = await rejectRequest(id, result.session, note, request);
      if (!rejectResult.success) {
        return NextResponse.json(
          { success: false, error: rejectResult.error },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: true, message: 'Request rejected' });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Use "approve" or "reject"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Approval action error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission(request, 'approvals.read');
  if (result instanceof NextResponse) return result;

  const { id } = await params;

  try {
    const cancelResult = await cancelRequest(id, result.session, request);
    if (!cancelResult.success) {
      return NextResponse.json(
        { success: false, error: cancelResult.error },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: true, message: 'Request cancelled' });
  } catch (error) {
    console.error('Cancel approval error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
