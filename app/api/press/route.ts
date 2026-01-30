import { NextResponse } from 'next/server';
import { requirePermission, logAdminAction } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const result = await requirePermission(request, 'press.read');
  if (result instanceof NextResponse) return result;
  try {
    const articles = await prisma.pressArticle.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ success: true, data: articles });
  } catch (error) { return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }); }
}

export async function POST(request: Request) {
  const result = await requirePermission(request, 'press.write');
  if (result instanceof NextResponse) return result;
  try {
    const body = await request.json();
    const article = await prisma.pressArticle.create({
      data: { ...body, authorId: result.session.adminId, publishedAt: body.status === 'published' ? new Date() : null },
    });
    await logAdminAction(result.session.adminId, 'press.create', 'press_article', article.id, { title: body.title }, request);
    return NextResponse.json({ success: true, data: article });
  } catch (error: any) {
    if (error?.code === 'P2002') return NextResponse.json({ success: false, error: 'Slug already exists' }, { status: 400 });
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
