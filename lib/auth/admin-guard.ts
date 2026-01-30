import { NextResponse } from 'next/server';
import { verifySession } from './session';
import { ROLE_PERMISSIONS } from '@/lib/constants';
import type { AdminRole } from '@prisma/client';
import type { AdminSessionData } from '@/types/auth';
import prisma from '@/lib/prisma';

export async function requireAuth(
  request: Request
): Promise<{ session: AdminSessionData } | NextResponse> {
  const session = await verifySession(request);
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }
  return { session };
}

export async function requireRole(
  request: Request,
  roles: AdminRole[]
): Promise<{ session: AdminSessionData } | NextResponse> {
  const result = await requireAuth(request);
  if (result instanceof NextResponse) return result;

  if (!roles.includes(result.session.role)) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions' },
      { status: 403 }
    );
  }

  return result;
}

export async function requirePermission(
  request: Request,
  permission: string
): Promise<{ session: AdminSessionData } | NextResponse> {
  const result = await requireAuth(request);
  if (result instanceof NextResponse) return result;

  const rolePermissions = ROLE_PERMISSIONS[result.session.role as keyof typeof ROLE_PERMISSIONS];
  if (!rolePermissions || !rolePermissions.includes(permission)) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions' },
      { status: 403 }
    );
  }

  return result;
}

export function hasPermission(role: AdminRole, permission: string): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];
  return rolePermissions?.includes(permission) ?? false;
}

export async function logAdminAction(
  adminId: string,
  action: string,
  resource: string,
  resourceId?: string,
  details?: Record<string, unknown>,
  request?: Request
) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action,
        resource,
        resourceId,
        details: details ? (details as any) : undefined,
        ipAddress: request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip') || null,
        userAgent: request?.headers.get('user-agent') || null,
      },
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
}
