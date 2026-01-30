import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { createSession, setSessionCookies } from '@/lib/auth/session';
import { generateEmailCode, storeAdmin2FACode } from '@/lib/auth/totp';
import { sendAdmin2FACode } from '@/lib/email/brevo';
import { logAdminAction } from '@/lib/auth/admin-guard';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const admin = await prisma.adminUser.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!admin.isActive) {
      return NextResponse.json(
        { success: false, error: 'Account is deactivated. Contact super admin.' },
        { status: 403 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, admin.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if 2FA is required
    if (admin.twoFactorEnabled) {
      if (admin.twoFactorMethod === 'TOTP' || admin.twoFactorMethod === 'BOTH') {
        // TOTP - client needs to provide the code
        return NextResponse.json({
          success: true,
          requiresTwoFactor: true,
          twoFactorMethod: admin.twoFactorMethod,
          adminId: admin.id,
        });
      }

      // Email 2FA
      const code = generateEmailCode();
      await storeAdmin2FACode(admin.id, code);
      await sendAdmin2FACode(admin.email, admin.fullName, code);

      return NextResponse.json({
        success: true,
        requiresTwoFactor: true,
        twoFactorMethod: 'EMAIL',
        adminId: admin.id,
      });
    }

    // No 2FA - create session directly
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

    await logAdminAction(admin.id, 'login', 'admin_user', admin.id, { method: 'password' }, request);

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
    console.error('Admin login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
