import { NextResponse } from 'next/server';
import { requirePermission, logAdminAction } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const result = await requirePermission(request, 'versions.read');
  if (result instanceof NextResponse) return result;
  try {
    const versions = await prisma.appVersion.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ success: true, data: versions });
  } catch (error) { return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }); }
}

export async function POST(request: Request) {
  const result = await requirePermission(request, 'versions.write');
  if (result instanceof NextResponse) return result;
  try {
    const body = await request.json();
    const version = await prisma.appVersion.create({ data: { ...body, publishedAt: new Date() } });
    await logAdminAction(result.session.adminId, 'version.create', 'app_version', version.id, { version: body.version }, request);
    return NextResponse.json({ success: true, data: version });
  } catch (error: any) {
    if (error?.code === 'P2002') return NextResponse.json({ success: false, error: 'Version already exists' }, { status: 400 });
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
