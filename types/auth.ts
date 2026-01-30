import type { AdminRole } from '@prisma/client';

export interface AdminTokenPayload {
  admin_id: string;
  email: string;
  role: AdminRole;
  iat?: number;
  exp?: number;
}

export interface AdminRefreshTokenPayload {
  admin_id: string;
  session_id: string;
  iat?: number;
  exp?: number;
}

export interface AdminSessionData {
  adminId: string;
  email: string;
  role: AdminRole;
  fullName?: string;
}
