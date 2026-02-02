import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const result = await requirePermission(request, 'mailings.read');
  if (result instanceof NextResponse) return result;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const recipientEmail = searchParams.get('recipientEmail');
    const templateId = searchParams.get('templateId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Build where clause
    const where: any = {};

    if (recipientEmail) {
      where.recipientEmail = {
        contains: recipientEmail,
        mode: 'insensitive',
      };
    }

    if (templateId) {
      where.templateId = templateId;
    }

    if (dateFrom || dateTo) {
      where.sentAt = {};
      if (dateFrom) {
        where.sentAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.sentAt.lte = new Date(dateTo);
      }
    }

    const [logs, total] = await Promise.all([
      prisma.emailSendLog.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          templateId: true,
          recipientEmail: true,
          subject: true,
          status: true,
          sentBy: true,
          sentAt: true,
        },
      }),
      prisma.emailSendLog.count({ where }),
    ]);

    // Fetch admin names for sentBy IDs
    const adminIds = [...new Set(logs.map(log => log.sentBy).filter(Boolean))] as string[];
    const admins = adminIds.length > 0
      ? await prisma.adminUser.findMany({
          where: { id: { in: adminIds } },
          select: { id: true, fullName: true },
        })
      : [];
    const adminMap = new Map(admins.map(a => [a.id, a.fullName]));

    // Transform logs to include admin name
    const transformedLogs = logs.map(log => ({
      ...log,
      sentByName: log.sentBy ? adminMap.get(log.sentBy) || 'Unknown' : null,
      sentAt: log.sentAt?.toISOString() || null,
    }));

    return NextResponse.json({
      success: true,
      data: transformedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Mailing history error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
