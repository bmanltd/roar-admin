import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { logAdminAction } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await verifySession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const admin = await prisma.adminUser.findUnique({
      where: { id: session.adminId },
    });

    if (!admin) {
      return NextResponse.json({ success: false, error: 'Admin not found' }, { status: 404 });
    }

    if (admin.twoFactorMethod !== 'TOTP') {
      return NextResponse.json({ success: false, error: 'TOTP is not enabled' }, { status: 400 });
    }

    await prisma.adminUser.update({
      where: { id: session.adminId },
      data: {
        twoFactorMethod: 'EMAIL',
        totpSecret: null,
      },
    });

    await logAdminAction(session.adminId, 'totp_disabled', 'admin_user', session.adminId, undefined, request);

    return NextResponse.json({ success: true, message: 'TOTP disabled successfully' });
  } catch (error) {
    console.error('TOTP disable error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
