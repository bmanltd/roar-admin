import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { verifyTOTPToken, decryptSecret } from '@/lib/auth/totp';
import { logAdminAction } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await verifySession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token is required' }, { status: 400 });
    }

    const admin = await prisma.adminUser.findUnique({
      where: { id: session.adminId },
    });

    if (!admin?.totpSecret) {
      return NextResponse.json({ success: false, error: 'TOTP not set up' }, { status: 400 });
    }

    const secret = decryptSecret(admin.totpSecret);
    const isValid = verifyTOTPToken(token, secret);

    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Invalid TOTP token' }, { status: 401 });
    }

    await prisma.adminUser.update({
      where: { id: session.adminId },
      data: {
        twoFactorEnabled: true,
        twoFactorMethod: 'TOTP',
      },
    });

    await logAdminAction(session.adminId, 'totp_enabled', 'admin_user', session.adminId, undefined, request);

    return NextResponse.json({ success: true, message: 'TOTP enabled successfully' });
  } catch (error) {
    console.error('TOTP verify error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
