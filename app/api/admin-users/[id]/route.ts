import { NextResponse } from 'next/server';
import { requirePermission, logAdminAction } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';

// Role hierarchy for permission checks
const ROLE_HIERARCHY: Record<string, number> = {
  SUPER_ADMIN: 4,
  ADMIN: 3,
  SUPPORT: 2,
  MARKETING: 1,
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission(request, 'admin_users.read');
  if (result instanceof NextResponse) return result;

  const { id } = await params;

  try {
    const adminUser = await prisma.adminUser.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        twoFactorEnabled: true,
        twoFactorMethod: true,
        invitedBy: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!adminUser) {
      return NextResponse.json({ success: false, error: 'Admin user not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: adminUser });
  } catch (error) {
    console.error('Admin user detail error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission(request, 'admin_users.write');
  if (result instanceof NextResponse) return result;

  const { id } = await params;

  try {
    const body = await request.json();
    const { fullName, role, isActive, twoFactorEnabled } = body;

    const adminUser = await prisma.adminUser.findUnique({ where: { id } });
    if (!adminUser) {
      return NextResponse.json({ success: false, error: 'Admin user not found' }, { status: 404 });
    }

    const currentAdminId = result.session.adminId;
    const currentAdminRole = result.session.role;
    const isSelf = currentAdminId === id;

    // Cannot deactivate self
    if (isSelf && isActive === false) {
      return NextResponse.json(
        { success: false, error: 'Cannot deactivate your own account' },
        { status: 400 }
      );
    }

    // Cannot edit own role to lower level (prevent self-demotion)
    if (isSelf && role !== undefined && role !== currentAdminRole) {
      const currentLevel = ROLE_HIERARCHY[currentAdminRole] || 0;
      const newLevel = ROLE_HIERARCHY[role] || 0;
      if (newLevel < currentLevel) {
        return NextResponse.json(
          { success: false, error: 'Cannot demote your own role' },
          { status: 400 }
        );
      }
    }

    // Only SUPER_ADMIN can change roles
    if (role !== undefined && role !== adminUser.role) {
      if (currentAdminRole !== 'SUPER_ADMIN') {
        return NextResponse.json(
          { success: false, error: 'Only SUPER_ADMIN can change roles' },
          { status: 403 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (twoFactorEnabled !== undefined) updateData.twoFactorEnabled = twoFactorEnabled;

    const updatedAdmin = await prisma.adminUser.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        twoFactorEnabled: true,
        twoFactorMethod: true,
        invitedBy: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await logAdminAction(currentAdminId, 'admin_user.update', 'admin_user', id, updateData, request);

    return NextResponse.json({ success: true, data: updatedAdmin });
  } catch (error) {
    console.error('Admin user update error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission(request, 'admin_users.delete');
  if (result instanceof NextResponse) return result;

  const { id } = await params;

  try {
    const adminUser = await prisma.adminUser.findUnique({ where: { id } });

    if (!adminUser) {
      return NextResponse.json({ success: false, error: 'Admin user not found' }, { status: 404 });
    }

    const currentAdminId = result.session.adminId;

    // Cannot delete self
    if (currentAdminId === id) {
      return NextResponse.json(
        { success: false, error: 'Cannot deactivate your own account' },
        { status: 400 }
      );
    }

    // Soft delete: set isActive to false instead of deleting
    await prisma.adminUser.update({
      where: { id },
      data: { isActive: false },
    });

    // Invalidate all sessions for this admin
    await prisma.adminSession.deleteMany({
      where: { adminId: id },
    });

    await logAdminAction(currentAdminId, 'admin_user.deactivate', 'admin_user', id, { email: adminUser.email }, request);

    return NextResponse.json({ success: true, message: 'Admin user deactivated successfully' });
  } catch (error) {
    console.error('Admin user delete error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
