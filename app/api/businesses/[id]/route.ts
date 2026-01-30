import { NextResponse } from 'next/server';
import { requirePermission, logAdminAction } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission(request, 'businesses.read');
  if (result instanceof NextResponse) return result;

  const { id } = await params;

  try {
    const business = await prisma.companySettings.findUnique({
      where: { id },
    });

    if (!business) {
      return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 });
    }

    // Fetch user info separately since there's no direct relation
    const user = await prisma.user.findUnique({
      where: { id: business.userId },
      select: {
        email: true,
        fullName: true,
        isActive: true,
        subscription: {
          select: {
            status: true,
            tier: { select: { displayName: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: { ...business, user } });
  } catch (error) {
    console.error('Business detail error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission(request, 'businesses.write');
  if (result instanceof NextResponse) return result;

  const { id } = await params;

  try {
    const body = await request.json();
    const {
      siteName,
      tin,
      contactEmail,
      contactPhone,
      address,
      currency,
      taxRate,
    } = body;

    const business = await prisma.companySettings.findUnique({ where: { id } });
    if (!business) {
      return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (siteName !== undefined) updateData.siteName = siteName;
    if (tin !== undefined) updateData.tin = tin;
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
    if (address !== undefined) updateData.address = address;
    if (currency !== undefined) updateData.currency = currency;
    if (taxRate !== undefined) updateData.taxRate = taxRate;

    const updatedBusiness = await prisma.companySettings.update({
      where: { id },
      data: updateData,
    });

    await logAdminAction(result.session.adminId, 'business.update', 'company_settings', id, updateData, request);

    return NextResponse.json({ success: true, data: updatedBusiness });
  } catch (error) {
    console.error('Business update error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
