import { NextResponse } from 'next/server';
import { requirePermission, logAdminAction } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const result = await requirePermission(request, 'settings.read');
  if (result instanceof NextResponse) return result;
  try {
    let settings = await prisma.adminSystemSettings.findUnique({ where: { id: 'default' } });
    if (!settings) {
      settings = await prisma.adminSystemSettings.create({ data: { id: 'default' } });
    }
    return NextResponse.json({ success: true, data: settings });
  } catch { return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  const result = await requirePermission(request, 'settings.write');
  if (result instanceof NextResponse) return result;
  try {
    const body = await request.json();
    const { maintenanceMode, registrationOpen, maxFreeTrialDays, supportEmail } = body;
    const settings = await prisma.adminSystemSettings.update({
      where: { id: 'default' },
      data: { maintenanceMode, registrationOpen, maxFreeTrialDays, supportEmail },
    });
    await logAdminAction(result.session.adminId, 'settings.update', 'system_settings', 'default', body, request);
    return NextResponse.json({ success: true, data: settings });
  } catch { return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }); }
}
