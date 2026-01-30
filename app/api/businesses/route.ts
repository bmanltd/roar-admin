import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const result = await requirePermission(request, 'businesses.read');
  if (result instanceof NextResponse) return result;

  try {
    const businesses = await prisma.companySettings.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: businesses });
  } catch (error) {
    console.error('Businesses error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
