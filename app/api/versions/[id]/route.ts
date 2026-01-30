import { NextResponse } from 'next/server';
import { requirePermission, logAdminAction } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission(request, 'versions.read');
  if (result instanceof NextResponse) return result;

  const { id } = await params;

  try {
    const version = await prisma.appVersion.findUnique({
      where: { id },
    });

    if (!version) {
      return NextResponse.json({ success: false, error: 'Version not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: version });
  } catch (error) {
    console.error('Version detail error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission(request, 'versions.write');
  if (result instanceof NextResponse) return result;

  const { id } = await params;

  try {
    const body = await request.json();
    const {
      releaseNotes,
      downloadUrl,
      isMandatory,
      isActive,
      minOsVersion,
      channel,
    } = body;

    const version = await prisma.appVersion.findUnique({ where: { id } });
    if (!version) {
      return NextResponse.json({ success: false, error: 'Version not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (releaseNotes !== undefined) updateData.releaseNotes = releaseNotes;
    if (downloadUrl !== undefined) updateData.downloadUrl = downloadUrl;
    if (isMandatory !== undefined) updateData.isMandatory = isMandatory;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (minOsVersion !== undefined) updateData.minOsVersion = minOsVersion;
    if (channel !== undefined) updateData.channel = channel;

    // If setting isActive to true and publishedAt is null, set publishedAt to now
    if (isActive === true && version.publishedAt === null) {
      updateData.publishedAt = new Date();
    }

    const updatedVersion = await prisma.appVersion.update({
      where: { id },
      data: updateData,
    });

    await logAdminAction(result.session.adminId, 'version.update', 'app_version', id, updateData, request);

    return NextResponse.json({ success: true, data: updatedVersion });
  } catch (error) {
    console.error('Version update error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission(request, 'versions.delete');
  if (result instanceof NextResponse) return result;

  const { id } = await params;

  try {
    const version = await prisma.appVersion.findUnique({
      where: { id },
    });

    if (!version) {
      return NextResponse.json({ success: false, error: 'Version not found' }, { status: 404 });
    }

    // Archive instead of delete (soft delete)
    await prisma.appVersion.update({
      where: { id },
      data: { isActive: false },
    });

    await logAdminAction(result.session.adminId, 'version.archive', 'app_version', id, { version: version.version }, request);

    return NextResponse.json({ success: true, message: 'Version archived' });
  } catch (error) {
    console.error('Version archive error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
