import { NextResponse } from 'next/server';
import { requirePermission, logAdminAction } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePermission(request, 'support.read');
  if (result instanceof NextResponse) return result;
  const { id } = await params;
  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        responses: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: ticket });
  } catch { return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePermission(request, 'support.write');
  if (result instanceof NextResponse) return result;
  const { id } = await params;
  try {
    const { status } = await request.json();
    const ticket = await prisma.supportTicket.update({ where: { id }, data: { status } });
    await logAdminAction(result.session.adminId, 'support.update_status', 'support_ticket', id, { status }, request);
    return NextResponse.json({ success: true, data: ticket });
  } catch { return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }); }
}
