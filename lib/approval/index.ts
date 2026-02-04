import prisma from '@/lib/prisma';
import type { ApprovalActionType, ApprovalPriority } from '@prisma/client';
import type { AdminSessionData } from '@/types/auth';
import {
  APPROVAL_REQUIRED_ACTIONS,
  SUPER_ADMIN_BYPASS_APPROVAL,
  APPROVAL_EXPIRATION_HOURS,
} from '@/lib/constants';
import { logAdminAction } from '@/lib/auth/admin-guard';
import { executeApprovedAction } from './executors';

interface CreateApprovalRequestParams {
  actionType: ApprovalActionType;
  resourceType: string;
  resourceId?: string;
  payload: Record<string, unknown>;
  requesterNote?: string;
  priority?: ApprovalPriority;
  session: AdminSessionData;
  request?: Request;
}

interface ApprovalResult {
  requiresApproval: boolean;
  approvalRequest?: {
    id: string;
    actionType: string;
    status: string;
  };
}

/**
 * Check if an action requires approval for the current user's role
 */
export function requiresApproval(
  session: AdminSessionData,
  actionType: ApprovalActionType
): boolean {
  // SUPER_ADMIN can bypass if configured
  if (session.role === 'SUPER_ADMIN' && SUPER_ADMIN_BYPASS_APPROVAL) {
    return false;
  }

  const requiredActions = APPROVAL_REQUIRED_ACTIONS[session.role] || [];
  return requiredActions.includes(actionType as never);
}

/**
 * Create an approval request instead of executing the action directly
 */
export async function createApprovalRequest({
  actionType,
  resourceType,
  resourceId,
  payload,
  requesterNote,
  priority = 'NORMAL',
  session,
  request,
}: CreateApprovalRequestParams): Promise<ApprovalResult> {
  // Check if approval is required
  if (!requiresApproval(session, actionType)) {
    return { requiresApproval: false };
  }

  // Calculate expiration
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + APPROVAL_EXPIRATION_HOURS);

  // Create the approval request
  const approvalRequest = await prisma.approvalRequest.create({
    data: {
      actionType,
      resourceType,
      resourceId,
      payload: payload as object,
      requesterId: session.adminId,
      requesterNote,
      priority,
      expiresAt,
    },
    include: {
      requester: { select: { fullName: true, email: true } },
    },
  });

  // Log the approval request creation
  await logAdminAction(
    session.adminId,
    'approval_request.create',
    'approval_request',
    approvalRequest.id,
    { actionType, resourceType, resourceId },
    request
  );

  // Import dynamically to avoid circular dependency
  const { sendApprovalRequestEmail } = await import('@/lib/email/approval-emails');

  // Notify approvers (SUPER_ADMINs) via email
  const superAdmins = await prisma.adminUser.findMany({
    where: { role: 'SUPER_ADMIN', isActive: true },
    select: { email: true, fullName: true },
  });

  for (const admin of superAdmins) {
    await sendApprovalRequestEmail({
      to: admin.email,
      toName: admin.fullName,
      requesterName: approvalRequest.requester.fullName,
      actionType,
      resourceType,
      requestId: approvalRequest.id,
    }).catch((error) => {
      console.error('Failed to send approval request email:', error);
    });
  }

  return {
    requiresApproval: true,
    approvalRequest: {
      id: approvalRequest.id,
      actionType: approvalRequest.actionType,
      status: approvalRequest.status,
    },
  };
}

/**
 * Approve an approval request and execute the action
 */
export async function approveRequest(
  requestId: string,
  session: AdminSessionData,
  reviewerNote?: string,
  request?: Request
): Promise<{ success: boolean; error?: string; result?: unknown }> {
  const approvalRequest = await prisma.approvalRequest.findUnique({
    where: { id: requestId },
    include: { requester: { select: { email: true, fullName: true } } },
  });

  if (!approvalRequest) {
    return { success: false, error: 'Approval request not found' };
  }

  if (approvalRequest.status !== 'PENDING') {
    return {
      success: false,
      error: `Request is already ${approvalRequest.status.toLowerCase()}`,
    };
  }

  if (approvalRequest.expiresAt && approvalRequest.expiresAt < new Date()) {
    await prisma.approvalRequest.update({
      where: { id: requestId },
      data: { status: 'EXPIRED' },
    });
    return { success: false, error: 'Request has expired' };
  }

  // Update status to approved
  await prisma.approvalRequest.update({
    where: { id: requestId },
    data: {
      status: 'APPROVED',
      reviewerId: session.adminId,
      reviewerNote,
      reviewedAt: new Date(),
    },
  });

  // Execute the action
  try {
    const result = await executeApprovedAction(approvalRequest);

    await prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: 'EXECUTED',
        executionResult: result as object,
        executedAt: new Date(),
      },
    });

    // Log the approval
    await logAdminAction(
      session.adminId,
      'approval_request.approve',
      'approval_request',
      requestId,
      { actionType: approvalRequest.actionType },
      request
    );

    // Import dynamically to avoid circular dependency
    const { sendApprovalDecisionEmail } = await import('@/lib/email/approval-emails');

    // Notify requester
    await sendApprovalDecisionEmail({
      to: approvalRequest.requester.email,
      toName: approvalRequest.requester.fullName,
      actionType: approvalRequest.actionType,
      decision: 'approved',
      reviewerNote,
    }).catch((error) => {
      console.error('Failed to send approval decision email:', error);
    });

    return { success: true, result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Execution failed';

    await prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: 'FAILED',
        executionError: errorMessage,
      },
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * Reject an approval request
 */
export async function rejectRequest(
  requestId: string,
  session: AdminSessionData,
  reviewerNote: string,
  request?: Request
): Promise<{ success: boolean; error?: string }> {
  const approvalRequest = await prisma.approvalRequest.findUnique({
    where: { id: requestId },
    include: { requester: { select: { email: true, fullName: true } } },
  });

  if (!approvalRequest) {
    return { success: false, error: 'Approval request not found' };
  }

  if (approvalRequest.status !== 'PENDING') {
    return {
      success: false,
      error: `Request is already ${approvalRequest.status.toLowerCase()}`,
    };
  }

  await prisma.approvalRequest.update({
    where: { id: requestId },
    data: {
      status: 'REJECTED',
      reviewerId: session.adminId,
      reviewerNote,
      reviewedAt: new Date(),
    },
  });

  // Log the rejection
  await logAdminAction(
    session.adminId,
    'approval_request.reject',
    'approval_request',
    requestId,
    { actionType: approvalRequest.actionType, reason: reviewerNote },
    request
  );

  // Import dynamically to avoid circular dependency
  const { sendApprovalDecisionEmail } = await import('@/lib/email/approval-emails');

  // Notify requester
  await sendApprovalDecisionEmail({
    to: approvalRequest.requester.email,
    toName: approvalRequest.requester.fullName,
    actionType: approvalRequest.actionType,
    decision: 'rejected',
    reviewerNote,
  }).catch((error) => {
    console.error('Failed to send approval decision email:', error);
  });

  return { success: true };
}

/**
 * Cancel an approval request (by requester or SUPER_ADMIN)
 */
export async function cancelRequest(
  requestId: string,
  session: AdminSessionData,
  request?: Request
): Promise<{ success: boolean; error?: string }> {
  const approvalRequest = await prisma.approvalRequest.findUnique({
    where: { id: requestId },
  });

  if (!approvalRequest) {
    return { success: false, error: 'Approval request not found' };
  }

  // Only requester or SUPER_ADMIN can cancel
  if (
    approvalRequest.requesterId !== session.adminId &&
    session.role !== 'SUPER_ADMIN'
  ) {
    return { success: false, error: 'Not authorized to cancel this request' };
  }

  if (approvalRequest.status !== 'PENDING') {
    return {
      success: false,
      error: `Request is already ${approvalRequest.status.toLowerCase()}`,
    };
  }

  await prisma.approvalRequest.update({
    where: { id: requestId },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelledById: session.adminId,
    },
  });

  await logAdminAction(
    session.adminId,
    'approval_request.cancel',
    'approval_request',
    requestId,
    { actionType: approvalRequest.actionType },
    request
  );

  return { success: true };
}

/**
 * Expire pending requests that have passed their expiration date
 * Can be run as a cron job
 */
export async function expirePendingRequests(): Promise<{ expiredCount: number }> {
  const result = await prisma.approvalRequest.updateMany({
    where: {
      status: 'PENDING',
      expiresAt: {
        lt: new Date(),
      },
    },
    data: {
      status: 'EXPIRED',
    },
  });

  return { expiredCount: result.count };
}
