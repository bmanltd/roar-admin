import { NextResponse } from 'next/server';
import { requirePermission, logAdminAction } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePermission(request, 'support.write');
  if (result instanceof NextResponse) return result;
  const { id } = await params;
  try {
    const { status } = await request.json();
    const ticket = await prisma.feedback.update({ where: { id }, data: { status } });
    await logAdminAction(result.session.adminId, 'support.update_status', 'feedback', id, { status }, request);
    return NextResponse.json({ success: true, data: ticket });
  } catch { return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }); }
}
