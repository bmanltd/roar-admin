import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const result = await requirePermission(request, 'support.read');
  if (result instanceof NextResponse) return result;
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const status = searchParams.get('status');
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          responses: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      prisma.supportTicket.count({ where }),
    ]);
    return NextResponse.json({ success: true, data: tickets, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch { return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }); }
}
