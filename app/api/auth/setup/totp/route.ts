import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  generateTOTPSecret,
  generateTOTPUri,
  generateQRCodeDataURL,
  encryptSecret,
} from '@/lib/auth/totp';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token } = body;

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

    // Generate TOTP secret and QR code
    const secret = generateTOTPSecret();
    const uri = generateTOTPUri(admin.email, secret);
    const qrCode = await generateQRCodeDataURL(uri);

    // Encrypt the secret for storage (will be saved when setup is completed)
    const encryptedSecret = encryptSecret(secret);

    return NextResponse.json({
      success: true,
      data: {
        qrCode,
        secret, // Plain secret for manual entry
        encryptedSecret, // Encrypted secret to send back during setup completion
      },
    });
  } catch (error) {
    console.error('TOTP setup generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
