import { NextResponse } from 'next/server';
import { requirePermission, logAdminAction } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const result = await requirePermission(request, 'mailings.read');
  if (result instanceof NextResponse) return result;

  try {
    const templates = await prisma.emailTemplate.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        subject: true,
        category: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    console.error('Email templates list error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const result = await requirePermission(request, 'mailings.write');
  if (result instanceof NextResponse) return result;

  try {
    const body = await request.json();
    const { name, subject, htmlContent, category = 'general', variables = [] } = body;

    if (!name || !subject || !htmlContent) {
      return NextResponse.json(
        { success: false, error: 'Name, subject, and htmlContent are required' },
        { status: 400 }
      );
    }

    // Check if template with same name already exists
    const existingTemplate = await prisma.emailTemplate.findUnique({
      where: { name },
    });

    if (existingTemplate) {
      return NextResponse.json(
        { success: false, error: 'A template with this name already exists' },
        { status: 400 }
      );
    }

    const template = await prisma.emailTemplate.create({
      data: {
        name,
        subject,
        htmlContent,
        category,
        variables,
      },
    });

    await logAdminAction(
      result.session.adminId,
      'mailings.template.create',
      'email_template',
      template.id,
      { name, subject, category },
      request
    );

    return NextResponse.json({ success: true, data: template });
  } catch (error) {
    console.error('Email template create error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
