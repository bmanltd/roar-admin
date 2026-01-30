import { NextResponse } from 'next/server';
import { requirePermission, logAdminAction } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

function generateProductKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segments = [];
  for (let s = 0; s < 4; s++) {
    let segment = '';
    for (let i = 0; i < 4; i++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }
  return segments.join('-');
}

export async function GET(request: Request) {
  const result = await requirePermission(request, 'product_keys.read');
  if (result instanceof NextResponse) return result;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const status = searchParams.get('status');
    const tier = searchParams.get('tier');

    const where: any = {};
    if (status === 'used') where.isUsed = true;
    if (status === 'unused') where.isUsed = false;
    if (tier) where.tier = { name: tier };

    const [keys, total] = await Promise.all([
      prisma.productKey.findMany({
        where,
        include: {
          tier: { select: { name: true, displayName: true } },
          user: { select: { email: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.productKey.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: keys,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Product keys list error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const result = await requirePermission(request, 'product_keys.write');
  if (result instanceof NextResponse) return result;

  try {
    const body = await request.json();
    const { tierId, count = 1, validityDays = 30, maxDevices = 1 } = body;

    if (!tierId) {
      return NextResponse.json({ success: false, error: 'Tier ID is required' }, { status: 400 });
    }

    const tierExists = await prisma.subscriptionTier.findUnique({ where: { id: tierId } });
    if (!tierExists) {
      return NextResponse.json({ success: false, error: 'Invalid tier' }, { status: 400 });
    }

    const generatedKeys = [];
    const batchCount = Math.min(count, 100);

    for (let i = 0; i < batchCount; i++) {
      const key = generateProductKey();
      const created = await prisma.productKey.create({
        data: {
          key,
          tierId,
          validityDays,
          maxDevices,
        },
        include: { tier: { select: { name: true, displayName: true } } },
      });
      generatedKeys.push(created);
    }

    await logAdminAction(
      result.session.adminId,
      'product_key.generate',
      'product_key',
      undefined,
      { count: batchCount, tierId, validityDays },
      request
    );

    return NextResponse.json({ success: true, data: generatedKeys });
  } catch (error) {
    console.error('Product key generation error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
