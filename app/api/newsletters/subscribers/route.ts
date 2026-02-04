import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const result = await requirePermission(request, 'newsletters.read');
  if (result instanceof NextResponse) return result;

  try {
    const { searchParams } = new URL(request.url);
    const list = searchParams.get('list') === 'true';

    // Return full list of active subscribers for mailing
    if (list) {
      const subscribers = await prisma.newsletterSubscriber.findMany({
        where: { isActive: true },
        select: { id: true, email: true },
        orderBy: { subscribedAt: 'desc' }, 
      });
      return NextResponse.json({ success: true, data: subscribers });
    }

    // Return counts only
    const [total, active] = await Promise.all([
      prisma.newsletterSubscriber.count(),
      prisma.newsletterSubscriber.count({ where: { isActive: true } }),
    ]);
    return NextResponse.json({ success: true, data: { total, active } });
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
