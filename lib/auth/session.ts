import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateAccessToken, generateRefreshToken, verifyAccessToken } from './jwt';
import type { AdminRole } from '@prisma/client';
import type { AdminSessionData } from '@/types/auth';

const SESSION_COOKIE = 'bman_admin_session';
const REFRESH_COOKIE = 'bman_admin_refresh';

interface CreateSessionParams {
  adminId: string;
  email: string;
  role: AdminRole;
  ipAddress?: string;
  userAgent?: string;
}

export async function createSession({
  adminId,
  email,
  role,
  ipAddress,
  userAgent,
}: CreateSessionParams): Promise<{
  success: boolean;
  error?: string;
  sessionToken?: string;
  refreshToken?: string;
}> {
  try {
    const sessionToken = generateAccessToken(adminId, email, role);
    const sessionId = crypto.randomUUID();
    const refreshToken = generateRefreshToken(adminId, sessionId);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.adminSession.create({
      data: {
        adminId,
        token: sessionToken,
        expiresAt,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });

    return { success: true, sessionToken, refreshToken };
  } catch (error) {
    console.error('Create admin session error:', error);
    return { success: false, error: 'Failed to create session' };
  }
}

export function setSessionCookies(response: NextResponse, sessionToken: string, refreshToken: string): NextResponse {
  const isSecure = process.env.NODE_ENV === 'production';

  response.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60,
  });

  response.cookies.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });

  return response;
}

export async function getSession(): Promise<AdminSessionData | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

    console.log('[getSession] Cookie lookup for', SESSION_COOKIE, ':', sessionToken ? `found (${sessionToken.substring(0, 20)}...)` : 'NOT FOUND');

    if (!sessionToken) return null;

    const payload = verifyAccessToken(sessionToken);
    console.log('[getSession] JWT verify:', payload ? 'valid' : 'INVALID');
    if (!payload) return null;

    const dbSession = await prisma.adminSession.findUnique({
      where: { token: sessionToken },
      include: { admin: { select: { fullName: true, isActive: true } } },
    });

    console.log('[getSession] DB session:', dbSession ? `found (expires: ${dbSession.expiresAt})` : 'NOT FOUND');

    if (!dbSession || dbSession.expiresAt < new Date()) return null;
    if (!dbSession.admin.isActive) return null;

    return {
      adminId: payload.admin_id,
      email: payload.email,
      role: payload.role,
      fullName: dbSession.admin.fullName,
    };
  } catch (err) {
    console.error('[getSession] Error:', err);
    return null;
  }
}

export async function getSessionToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(SESSION_COOKIE)?.value || null;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

    if (sessionToken) {
      await prisma.adminSession.deleteMany({
        where: { token: sessionToken },
      });
    }

    cookieStore.delete(SESSION_COOKIE);
    cookieStore.delete(REFRESH_COOKIE);
  } catch (error) {
    console.error('Clear admin session error:', error);
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

export async function verifySession(request: Request): Promise<AdminSessionData | null> {
  try {
    const authHeader = request.headers.get('Authorization');
    let sessionToken: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      sessionToken = authHeader.slice(7);
    } else {
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        const parsedCookies = Object.fromEntries(
          cookieHeader.split('; ').map(c => {
            const [key, ...v] = c.split('=');
            return [key, v.join('=')];
          })
        );
        sessionToken = parsedCookies[SESSION_COOKIE];
      }
    }

    if (!sessionToken) return null;

    const payload = verifyAccessToken(sessionToken);
    if (!payload) return null;

    const dbSession = await prisma.adminSession.findUnique({
      where: { token: sessionToken },
      include: { admin: { select: { fullName: true, isActive: true } } },
    });

    if (!dbSession || dbSession.expiresAt < new Date()) return null;
    if (!dbSession.admin.isActive) return null;

    return {
      adminId: payload.admin_id,
      email: payload.email,
      role: payload.role,
      fullName: dbSession.admin.fullName,
    };
  } catch {
    return null;
  }
}
