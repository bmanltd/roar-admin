import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createSession, setSessionCookies } from '@/lib/auth/session';
import { isCodeExpired, verifyTOTPToken, decryptSecret } from '@/lib/auth/totp';
import { logAdminAction } from '@/lib/auth/admin-guard';

export async function POST(request: Request) {
  try {
    const { adminId, code, method } = await request.json();

    if (!adminId || !code) {
      return NextResponse.json(
        { success: false, error: 'Admin ID and code are required' },
        { status: 400 }
      );
    }

    const admin = await prisma.adminUser.findUnique({
      where: { id: adminId },
    });

    if (!admin || !admin.isActive) {
      return NextResponse.json(
        { success: false, error: 'Invalid admin account' },
        { status: 401 }
      );
    }

    let isValid = false;

    if (method === 'TOTP' && admin.totpSecret) {
      const secret = decryptSecret(admin.totpSecret);
      isValid = verifyTOTPToken(code, secret);
    } else {
      // Email code verification
      const storedCode = await prisma.adminTwoFactorCode.findFirst({
        where: {
          adminId,
          code,
          usedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (storedCode && !isCodeExpired(storedCode.expiresAt)) {
        isValid = true;
        await prisma.adminTwoFactorCode.update({
          where: { id: storedCode.id },
          data: { usedAt: new Date() },
        });
      }
    }

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired verification code' },
        { status: 401 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';
    const userAgent = request.headers.get('user-agent') || '';

    const sessionResult = await createSession({
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
      ipAddress,
      userAgent,
    });

    if (!sessionResult.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to create session' },
        { status: 500 }
      );
    }

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    await logAdminAction(admin.id, 'login', 'admin_user', admin.id, { method: '2fa' }, request);

    const response = NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
        mustChangePassword: admin.mustChangePassword,
      },
    });

    return setSessionCookies(response, sessionResult.sessionToken!, sessionResult.refreshToken!);
  } catch (error) {
    console.error('2FA verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
