import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { generateTOTPSecret, generateTOTPUri, generateQRCodeDataURL, encryptSecret } from '@/lib/auth/totp';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await verifySession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const secret = generateTOTPSecret();
    const otpauthUrl = generateTOTPUri(session.email, secret);
    const qrCodeUrl = await generateQRCodeDataURL(otpauthUrl);

    // Store encrypted secret temporarily
    await prisma.adminUser.update({
      where: { id: session.adminId },
      data: { totpSecret: encryptSecret(secret) },
    });

    return NextResponse.json({
      success: true,
      secret,
      qrCodeUrl,
      otpauthUrl,
    });
  } catch (error) {
    console.error('TOTP setup error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
