import { NextResponse } from 'next/server';
import { requirePermission, requireRole, logAdminAction } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { sendAdminInviteEmail } from '@/lib/email/brevo';

export async function GET(request: Request) {
  const result = await requirePermission(request, 'admin_users.read');
  if (result instanceof NextResponse) return result;
  try {
    const admins = await prisma.adminUser.findMany({
      select: { id: true, email: true, fullName: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ success: true, data: admins });
  } catch { return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }); }
}

export async function POST(request: Request) {
  const result = await requireRole(request, ['SUPER_ADMIN']);
  if (result instanceof NextResponse) return result;
  try {
    const { email, fullName, role } = await request.json();
    if (!email || !fullName || !role) return NextResponse.json({ success: false, error: 'All fields required' }, { status: 400 });

    const existing = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) return NextResponse.json({ success: false, error: 'Email already registered' }, { status: 400 });

    const inviteToken = uuidv4();
    const tempPassword = uuidv4().slice(0, 12);
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const admin = await prisma.adminUser.create({
      data: {
        email: email.toLowerCase().trim(),
        fullName,
        passwordHash,
        role: role as any,
        invitedBy: result.session.adminId,
        inviteToken,
        inviteExpires: new Date(Date.now() + 48 * 60 * 60 * 1000),
        mustChangePassword: true,
      },
    });

    const inviterAdmin = await prisma.adminUser.findUnique({ where: { id: result.session.adminId } });
    await sendAdminInviteEmail(email, inviterAdmin?.fullName || 'Admin', role, inviteToken);

    await logAdminAction(result.session.adminId, 'admin_user.invite', 'admin_user', admin.id, { email, role }, request);

    return NextResponse.json({ success: true, data: { id: admin.id, email: admin.email, role: admin.role } });
  } catch (error) {
    console.error('Admin invite error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
