import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';
import { verifyTOTPToken, decryptSecret } from '@/lib/auth/totp';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    // Find admin with this invite token
    const admin = await prisma.adminUser.findUnique({
      where: { inviteToken: token },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        inviteExpires: true,
      },
    });

    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Invalid invitation token' },
        { status: 404 }
      );
    }

    // Check if token is expired
    if (admin.inviteExpires && new Date() > admin.inviteExpires) {
      return NextResponse.json(
        { success: false, error: 'Invitation has expired. Please request a new invitation.' },
        { status: 410 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error('Setup token validation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, password, confirmPassword, twoFactorMethod, totpCode, totpSecret } = body;

    // Validate required fields
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    if (!password || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Password and confirmation are required' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    // Validate password requirements
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    if (!/[A-Z]/.test(password)) {
      return NextResponse.json(
        { success: false, error: 'Password must contain at least one uppercase letter' },
        { status: 400 }
      );
    }

    if (!/[a-z]/.test(password)) {
      return NextResponse.json(
        { success: false, error: 'Password must contain at least one lowercase letter' },
        { status: 400 }
      );
    }

    if (!/[0-9]/.test(password)) {
      return NextResponse.json(
        { success: false, error: 'Password must contain at least one number' },
        { status: 400 }
      );
    }

    // Find admin with this invite token
    const admin = await prisma.adminUser.findUnique({
      where: { inviteToken: token },
    });

    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Invalid invitation token' },
        { status: 404 }
      );
    }

    // Check if token is expired
    if (admin.inviteExpires && new Date() > admin.inviteExpires) {
      return NextResponse.json(
        { success: false, error: 'Invitation has expired. Please request a new invitation.' },
        { status: 410 }
      );
    }

    // If TOTP is selected, verify the code
    if (twoFactorMethod === 'TOTP') {
      if (!totpCode || !totpSecret) {
        return NextResponse.json(
          { success: false, error: 'TOTP code and secret are required when enabling authenticator' },
          { status: 400 }
        );
      }

      // Decrypt the secret and verify the code
      const decryptedSecret = decryptSecret(totpSecret);
      const isValidCode = verifyTOTPToken(totpCode, decryptedSecret);

      if (!isValidCode) {
        return NextResponse.json(
          { success: false, error: 'Invalid authenticator code. Please try again.' },
          { status: 400 }
        );
      }
    }

    // Hash the new password
    const passwordHash = await hashPassword(password);

    // Update the admin account
    const updateData: {
      passwordHash: string;
      mustChangePassword: boolean;
      inviteToken: null;
      inviteExpires: null;
      twoFactorMethod?: 'EMAIL' | 'TOTP';
      totpSecret?: string;
    } = {
      passwordHash,
      mustChangePassword: false,
      inviteToken: null,
      inviteExpires: null,
    };

    // Set 2FA method if specified
    if (twoFactorMethod === 'TOTP' && totpSecret) {
      updateData.twoFactorMethod = 'TOTP';
      updateData.totpSecret = totpSecret; // Already encrypted
    } else {
      updateData.twoFactorMethod = 'EMAIL';
    }

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'Account setup completed successfully. You can now log in.',
    });
  } catch (error) {
    console.error('Setup completion error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
