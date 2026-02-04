import { NextResponse } from 'next/server';
import { requirePermission, logAdminAction } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';
import { generateResetToken, getResetTokenExpiry } from '@/lib/auth/password';
import { sendPasswordResetEmail } from '@/lib/email/brevo';
import { createApprovalRequest } from '@/lib/approval';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission(request, 'users.read');
  if (result instanceof NextResponse) return result;

  const { id } = await params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        subscription: {
          include: { tier: true },
        },
        devices: true,
        payments: { orderBy: { createdAt: 'desc' }, take: 10 },
        productKeys: { include: { tier: true } },
        teamUsers: { select: { id: true, fullName: true, email: true, role: true, isActive: true } },
        activityLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Remove sensitive fields
    const { passwordHash, passwordResetToken, passwordResetExpires, totpSecret, ...safeUser } = user as any;

    return NextResponse.json({ success: true, data: safeUser });
  } catch (error) {
    console.error('User detail error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission(request, 'users.write');
  if (result instanceof NextResponse) return result;

  const { id } = await params;

  try {
    const body = await request.json();
    const { action, ...data } = body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Suspend user
    if (action === 'suspend') {
      // Check if approval is required
      const approvalResult = await createApprovalRequest({
        actionType: 'USER_SUSPEND',
        resourceType: 'user',
        resourceId: id,
        payload: { action: 'suspend' },
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

      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });
      await logAdminAction(result.session.adminId, 'user.suspend', 'user', id, undefined, request);
      return NextResponse.json({ success: true, message: 'User suspended' });
    }

    // Activate user
    if (action === 'activate') {
      await prisma.user.update({
        where: { id },
        data: { isActive: true },
      });
      await logAdminAction(result.session.adminId, 'user.activate', 'user', id, undefined, request);
      return NextResponse.json({ success: true, message: 'User activated' });
    }

    // Update profile
    if (action === 'update_profile') {
      const { fullName, companyName, phone } = data;
      const updateData: any = {};
      if (fullName !== undefined) updateData.fullName = fullName;
      if (companyName !== undefined) updateData.companyName = companyName;
      if (phone !== undefined) updateData.phone = phone;

      await prisma.user.update({
        where: { id },
        data: updateData,
      });
      await logAdminAction(result.session.adminId, 'user.update_profile', 'user', id, updateData, request);
      return NextResponse.json({ success: true, message: 'Profile updated' });
    }

    // Send password reset email
    if (action === 'reset_password') {
      const resetToken = generateResetToken();
      const resetExpires = getResetTokenExpiry(24);

      await prisma.user.update({
        where: { id },
        data: {
          passwordResetToken: resetToken,
          passwordResetExpires: resetExpires,
        },
      });

      await sendPasswordResetEmail(user.email, user.fullName, resetToken);
      await logAdminAction(result.session.adminId, 'user.reset_password', 'user', id, undefined, request);
      return NextResponse.json({ success: true, message: 'Password reset email sent' });
    }

    // Verify email manually
    if (action === 'verify_email') {
      await prisma.user.update({
        where: { id },
        data: { emailVerified: true },
      });
      await logAdminAction(result.session.adminId, 'user.verify_email', 'user', id, undefined, request);
      return NextResponse.json({ success: true, message: 'Email verified' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('User update error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission(request, 'users.delete');
  if (result instanceof NextResponse) return result;

  const { id } = await params;

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Check if approval is required
    const approvalResult = await createApprovalRequest({
      actionType: 'USER_DELETE',
      resourceType: 'user',
      resourceId: id,
      payload: { userId: id, email: user.email },
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

    // Soft delete - just deactivate and anonymize
    await prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        email: `deleted_${id}@deleted.local`,
        fullName: 'Deleted User',
        phone: null,
        companyName: null,
      },
    });

    await logAdminAction(result.session.adminId, 'user.delete', 'user', id, { originalEmail: user.email }, request);
    return NextResponse.json({ success: true, message: 'User deleted' });
  } catch (error) {
    console.error('User delete error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
