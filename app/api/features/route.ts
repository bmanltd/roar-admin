import { NextResponse } from 'next/server';
import { requirePermission, logAdminAction } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const result = await requirePermission(request, 'features.read');
  if (result instanceof NextResponse) return result;

  try {
    const flags = await prisma.globalFeatureFlag.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ success: true, data: flags });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const result = await requirePermission(request, 'features.write');
  if (result instanceof NextResponse) return result;

  try {
    const { name, displayName, description, tier } = await request.json();
    if (!name || !displayName) {
      return NextResponse.json({ success: false, error: 'Name and display name required' }, { status: 400 });
    }

    const flag = await prisma.globalFeatureFlag.create({
      data: { name, displayName, description, tier, isEnabled: false },
    });

    await logAdminAction(result.session.adminId, 'feature.create', 'feature_flag', flag.id, { name }, request);
    return NextResponse.json({ success: true, data: flag });
  } catch (error: any) {
    if (error?.code === 'P2002') return NextResponse.json({ success: false, error: 'Flag name already exists' }, { status: 400 });
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
