import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const result = await requirePermission(request, 'newsletters.read');
  if (result instanceof NextResponse) return result;
  try {
    const [total, active] = await Promise.all([
      prisma.newsletterSubscriber.count(),
      prisma.newsletterSubscriber.count({ where: { isActive: true } }),
    ]);
    return NextResponse.json({ success: true, data: { total, active } });
  } catch { return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }); }
}
