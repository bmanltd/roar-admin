'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { AdminRole } from '@prisma/client';
import { ROLE_PERMISSIONS } from '@/lib/constants';

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: AdminRole;
  isActive: boolean;
  twoFactorEnabled: boolean;
  twoFactorMethod: string;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface AuthContextType {
  admin: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; requiresTwoFactor?: boolean; twoFactorMethod?: string; adminId?: string; error?: string }>;
  verify2FA: (adminId: string, code: string, method?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.admin) {
          setAdmin(data.admin);
          return;
        }
      }
      setAdmin(null);
    } catch {
      setAdmin(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success && !data.requiresTwoFactor) {
        setAdmin(data.admin);
      }

      return data;
    } catch {
      return { success: false, error: 'Network error' };
    }
  };

  const verify2FA = async (adminId: string, code: string, method?: string) => {
    try {
      const res = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId, code, method }),
      });

      const data = await res.json();

      if (data.success) {
        setAdmin(data.admin);
      }

      return data;
    } catch {
      return { success: false, error: 'Network error' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setAdmin(null);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!admin) return false;
    const rolePerms = ROLE_PERMISSIONS[admin.role as keyof typeof ROLE_PERMISSIONS];
    return rolePerms?.includes(permission) ?? false;
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        isLoading,
        isAuthenticated: !!admin,
        hasPermission,
        login,
        verify2FA,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
