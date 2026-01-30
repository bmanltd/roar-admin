import { NextResponse } from 'next/server';
import { clearSession, verifySession } from '@/lib/auth/session';
import { logAdminAction } from '@/lib/auth/admin-guard';

export async function POST(request: Request) {
  try {
    const session = await verifySession(request);
    if (session) {
      await logAdminAction(session.adminId, 'logout', 'admin_user', session.adminId, undefined, request);
    }
    await clearSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ success: true });
  }
}
