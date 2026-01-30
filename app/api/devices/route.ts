import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const result = await requirePermission(request, 'devices.read');
  if (result instanceof NextResponse) return result;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const platform = searchParams.get('platform');
    const status = searchParams.get('status');

    const where: any = {};
    if (platform) where.platform = platform;
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;

    const [devices, total] = await Promise.all([
      prisma.deviceRegistry.findMany({
        where,
        include: {
          user: { select: { email: true, fullName: true, companyName: true } },
          productKey: { select: { key: true } },
        },
        orderBy: { lastSeenAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.deviceRegistry.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: devices,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Devices list error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
