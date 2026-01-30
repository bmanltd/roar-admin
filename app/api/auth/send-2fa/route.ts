import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateEmailCode, storeAdmin2FACode } from '@/lib/auth/totp';
import { sendAdmin2FACode } from '@/lib/email/brevo';

export async function POST(request: Request) {
  try {
    const { adminId } = await request.json();

    if (!adminId) {
      return NextResponse.json(
        { success: false, error: 'Admin ID is required' },
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

    const code = generateEmailCode();
    await storeAdmin2FACode(admin.id, code);
    await sendAdmin2FACode(admin.email, admin.fullName, code);

    return NextResponse.json({
      success: true,
      message: 'Verification code sent',
    });
  } catch (error) {
    console.error('Send 2FA error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
