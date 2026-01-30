import { NextResponse } from 'next/server';
import { requirePermission, logAdminAction } from '@/lib/auth/admin-guard';
import prisma from '@/lib/prisma';
import { hashPassword, generateRandomPassword } from '@/lib/auth/password';
import { sendWelcomeEmail } from '@/lib/email/brevo';

export async function GET(request: Request) {
  const result = await requirePermission(request, 'users.read');
  if (result instanceof NextResponse) return result;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const tier = searchParams.get('tier');

    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;

    if (tier) {
      where.subscription = { tier: { name: tier } };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          companyName: true,
          phone: true,
          isActive: true,
          emailVerified: true,
          role: true,
          createdAt: true,
          lastLoginAt: true,
          subscription: {
            select: {
              status: true,
              billingCycle: true,
              expiresAt: true,
              tier: { select: { name: true, displayName: true } },
            },
          },
          _count: {
            select: { devices: true, teamUsers: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Users list error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const result = await requirePermission(request, 'users.write');
  if (result instanceof NextResponse) return result;

  try {
    const body = await request.json();
    const { email, fullName, companyName, phone, tierId, billingCycle, validityDays } = body;

    if (!email || !fullName) {
      return NextResponse.json({ success: false, error: 'Email and full name are required' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'User with this email already exists' }, { status: 400 });
    }

    // Generate random password
    const tempPassword = generateRandomPassword();
    const passwordHash = await hashPassword(tempPassword);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        fullName,
        companyName: companyName || null,
        phone: phone || null,
        passwordHash,
        emailVerified: false,
        isActive: true,
      },
    });

    // If tier is specified, create subscription
    if (tierId) {
      const tier = await prisma.subscriptionTier.findUnique({ where: { id: tierId } });
      if (tier) {
        const days = validityDays || 30;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);

        await prisma.subscription.create({
          data: {
            userId: user.id,
            tierId: tier.id,
            status: 'ACTIVE',
            billingCycle: billingCycle || 'MONTHLY',
            startsAt: new Date(),
            expiresAt,
            pricePaid: billingCycle === 'YEARLY' ? tier.priceYearly : tier.priceMonthly,
          },
        });
      }
    }

    // Send welcome email with temporary password
    await sendWelcomeEmail(email, fullName, tempPassword);

    await logAdminAction(result.session.adminId, 'user.create', 'user', user.id, { email, fullName }, request);

    return NextResponse.json({
      success: true,
      data: { id: user.id, email: user.email, fullName: user.fullName },
      message: 'User created. Welcome email sent with temporary password.',
    });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
