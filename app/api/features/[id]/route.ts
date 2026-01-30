import { NextResponse } from 'next/server';
import { requirePermission, logAdminAction } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePermission(request, 'features.write');
  if (result instanceof NextResponse) return result;

  const { id } = await params;
  try {
    const body = await request.json();
    const flag = await prisma.globalFeatureFlag.update({ where: { id }, data: body });
    await logAdminAction(result.session.adminId, 'feature.update', 'feature_flag', id, body, request);
    return NextResponse.json({ success: true, data: flag });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePermission(request, 'features.delete');
  if (result instanceof NextResponse) return result;

  const { id } = await params;
  try {
    await prisma.globalFeatureFlag.delete({ where: { id } });
    await logAdminAction(result.session.adminId, 'feature.delete', 'feature_flag', id, undefined, request);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
