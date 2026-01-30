import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth/session';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Debug: log all cookies
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    console.log('[SESSION DEBUG] All cookies:', allCookies.map(c => `${c.name}=${c.value.substring(0, 20)}...`));
    console.log('[SESSION DEBUG] Cookie count:', allCookies.length);

    const session = await getSession();
    console.log('[SESSION DEBUG] getSession result:', session ? 'found' : 'null');

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const admin = await prisma.adminUser.findUnique({
      where: { id: session.adminId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        twoFactorEnabled: true,
        twoFactorMethod: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!admin || !admin.isActive) {
      return NextResponse.json(
        { success: false, error: 'Account not found or deactivated' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      admin,
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
