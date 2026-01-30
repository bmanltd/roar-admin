import { NextResponse } from 'next/server';
import { requirePermission, logAdminAction } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';

function generateSlug(title: string): string {
  return title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 100);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission(request, 'press.read');
  if (result instanceof NextResponse) return result;

  const { id } = await params;

  try {
    const article = await prisma.pressArticle.findUnique({
      where: { id },
    });

    if (!article) {
      return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: article });
  } catch (error) {
    console.error('Article detail error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission(request, 'press.write');
  if (result instanceof NextResponse) return result;

  const { id } = await params;

  try {
    const body = await request.json();
    const { title, content, excerpt, coverImage, category, status } = body;

    const article = await prisma.pressArticle.findUnique({ where: { id } });
    if (!article) {
      return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (title !== undefined) {
      updateData.title = title;
      updateData.slug = generateSlug(title);
    }
    if (content !== undefined) updateData.content = content;
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (coverImage !== undefined) updateData.coverImage = coverImage;
    if (category !== undefined) updateData.category = category;
    if (status !== undefined) {
      updateData.status = status;
      // Set publishedAt when status changes to published and it wasn't already set
      if (status === 'published' && article.publishedAt === null) {
        updateData.publishedAt = new Date();
      }
    }

    const updatedArticle = await prisma.pressArticle.update({
      where: { id },
      data: updateData,
    });

    await logAdminAction(result.session.adminId, 'press.update', 'press_article', id, updateData, request);

    return NextResponse.json({ success: true, data: updatedArticle });
  } catch (error) {
    console.error('Article update error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission(request, 'press.delete');
  if (result instanceof NextResponse) return result;

  const { id } = await params;

  try {
    const article = await prisma.pressArticle.findUnique({ where: { id } });

    if (!article) {
      return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 });
    }

    await prisma.pressArticle.delete({ where: { id } });

    await logAdminAction(result.session.adminId, 'press.delete', 'press_article', id, { title: article.title }, request);

    return NextResponse.json({ success: true, message: 'Article deleted' });
  } catch (error) {
    console.error('Article delete error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
