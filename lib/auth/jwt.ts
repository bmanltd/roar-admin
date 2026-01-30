import jwt from 'jsonwebtoken';
import type { AdminTokenPayload, AdminRefreshTokenPayload } from '@/types/auth';
import type { AdminRole } from '@prisma/client';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'admin-default-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.ADMIN_JWT_REFRESH_SECRET || 'admin-default-refresh-secret';

const ACCESS_TOKEN_EXPIRY = '24h';
const REFRESH_TOKEN_EXPIRY = '30d';

export function generateAccessToken(
  adminId: string,
  email: string,
  role: AdminRole
): string {
  const payload: Omit<AdminTokenPayload, 'iat' | 'exp'> = {
    admin_id: adminId,
    email,
    role,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function generateRefreshToken(adminId: string, sessionId: string): string {
  const payload: Omit<AdminRefreshTokenPayload, 'iat' | 'exp'> = {
    admin_id: adminId,
    session_id: sessionId,
  };

  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function verifyAccessToken(token: string): AdminTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminTokenPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): AdminRefreshTokenPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as AdminRefreshTokenPayload;
  } catch {
    return null;
  }
}

export function decodeToken(token: string): AdminTokenPayload | null {
  try {
    return jwt.decode(token) as AdminTokenPayload;
  } catch {
    return null;
  }
}

export function getTokenExpiryDate(hours: number = 24): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export function getRefreshTokenExpiryDate(days: number = 30): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  return decoded.exp * 1000 < Date.now();
}
