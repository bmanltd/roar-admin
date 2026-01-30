import type { AdminRole } from '@prisma/client';

export interface AdminUserInfo {
  id: string;
  email: string;
  fullName: string;
  role: AdminRole;
  isActive: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AdminDashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  activeDevices: number;
  pendingTickets: number;
  totalProductKeys: number;
  newUsersThisMonth: number;
  expiringSubscriptions: number;
}
