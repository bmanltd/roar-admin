'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar, Topbar } from '@/components/dashboard';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error('useSidebar must be used within DashboardLayout');
  return context;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 bg-grid-emerald">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-2xl bg-emerald-500/30 blur-xl" />
            <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/40">
              <span className="text-white font-bold text-2xl">B</span>
            </div>
          </div>
          <h2 className="text-white font-semibold text-lg mb-2">BMan Admin</h2>
          <p className="text-neutral-500 text-sm mb-6">Loading dashboard...</p>
          <Loader2 className="h-5 w-5 animate-spin text-emerald-500 mx-auto" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <SidebarContext.Provider value={{ isCollapsed: sidebarCollapsed, setIsCollapsed: setSidebarCollapsed }}>
      <div className="min-h-screen bg-neutral-950 bg-grid-emerald">
        <Sidebar
          isCollapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />
        <div
          className={cn(
            'min-h-screen flex flex-col transition-all duration-300',
            'ml-0',
            sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[260px]'
          )}
        >
          <Topbar onMenuToggle={() => setMobileMenuOpen(true)} />
          <main className="flex-1 p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
