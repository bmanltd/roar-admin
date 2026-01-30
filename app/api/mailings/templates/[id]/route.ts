import { NextResponse } from 'next/server';
import { requirePermission, logAdminAction } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission(request, 'mailings.read');
  if (result instanceof NextResponse) return result;

  const { id } = await params;

  try {
    const template = await prisma.emailTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: template });
  } catch (error) {
    console.error('Email template detail error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission(request, 'mailings.write');
  if (result instanceof NextResponse) return result;

  const { id } = await params;

  try {
    const body = await request.json();
    const { name, subject, htmlContent, category, variables, isActive } = body;

    const template = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!template) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    // If name is being changed, check for uniqueness
    if (name !== undefined && name !== template.name) {
      const existingTemplate = await prisma.emailTemplate.findUnique({
        where: { name },
      });
      if (existingTemplate) {
        return NextResponse.json(
          { success: false, error: 'A template with this name already exists' },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (subject !== undefined) updateData.subject = subject;
    if (htmlContent !== undefined) updateData.htmlContent = htmlContent;
    if (category !== undefined) updateData.category = category;
    if (variables !== undefined) updateData.variables = variables;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedTemplate = await prisma.emailTemplate.update({
      where: { id },
      data: updateData,
    });

    await logAdminAction(
      result.session.adminId,
      'mailings.template.update',
      'email_template',
      id,
      updateData,
      request
    );

    return NextResponse.json({ success: true, data: updatedTemplate });
  } catch (error) {
    console.error('Email template update error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission(request, 'mailings.delete');
  if (result instanceof NextResponse) return result;

  const { id } = await params;

  try {
    const template = await prisma.emailTemplate.findUnique({ where: { id } });

    if (!template) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    await prisma.emailTemplate.delete({ where: { id } });

    await logAdminAction(
      result.session.adminId,
      'mailings.template.delete',
      'email_template',
      id,
      { name: template.name },
      request
    );

    return NextResponse.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    console.error('Email template delete error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
