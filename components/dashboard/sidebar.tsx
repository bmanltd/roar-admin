'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  LayoutDashboard, Users, CreditCard, Key, Monitor, Building2,
  BarChart3, ToggleLeft, Package, Newspaper, Mail, Send,
  MessageSquare, Shield, Activity, Settings, ChevronLeft,
  ChevronRight, LogOut, Wallet,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, Users, CreditCard, Key, Monitor, Building2,
  BarChart3, ToggleLeft, Package, Newspaper, Mail, Send,
  MessageSquare, Shield, Activity, Settings, Wallet,
};

interface NavItem {
  label: string;
  href: string;
  icon: string;
  permission: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/', icon: 'LayoutDashboard', permission: 'analytics.read' },
  { label: 'Users', href: '/users', icon: 'Users', permission: 'users.read' },
  { label: 'Subscriptions', href: '/subscriptions', icon: 'CreditCard', permission: 'subscriptions.read' },
  { label: 'Payments', href: '/payments', icon: 'Wallet', permission: 'payments.read' },
  { label: 'Product Keys', href: '/product-keys', icon: 'Key', permission: 'product_keys.read' },
  { label: 'Devices', href: '/devices', icon: 'Monitor', permission: 'devices.read' },
  { label: 'Businesses', href: '/businesses', icon: 'Building2', permission: 'businesses.read' },
  { label: 'Analytics', href: '/analytics', icon: 'BarChart3', permission: 'analytics.read' },
  { label: 'Features', href: '/features', icon: 'ToggleLeft', permission: 'features.read' },
  { label: 'Versions', href: '/versions', icon: 'Package', permission: 'versions.read' },
  { label: 'Press & News', href: '/press', icon: 'Newspaper', permission: 'press.read' },
  { label: 'Newsletters', href: '/newsletters', icon: 'Mail', permission: 'newsletters.read' },
  { label: 'Mailings', href: '/mailings', icon: 'Send', permission: 'mailings.read' },
  { label: 'Support', href: '/support', icon: 'MessageSquare', permission: 'support.read' },
  { label: 'Admin Users', href: '/admin-users', icon: 'Shield', permission: 'admin_users.read' },
  { label: 'Activity Log', href: '/activity', icon: 'Activity', permission: 'activity.read' },
  { label: 'Settings', href: '/settings', icon: 'Settings', permission: 'settings.read' },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { hasPermission, logout, admin } = useAuth();

  const filteredItems = NAV_ITEMS.filter(item => hasPermission(item.permission));

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen bg-neutral-900/80 backdrop-blur-xl border-r border-neutral-800/50 transition-all duration-300 flex flex-col',
          isCollapsed ? 'w-[68px]' : 'w-64'
        )}
      >
        {/* Header */}
        <div className={cn(
          'flex items-center h-16 px-4 border-b border-neutral-800/50',
          isCollapsed ? 'justify-center' : 'justify-between'
        )}>
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-lg bg-emerald-500/20 blur-md" />
                <div className="relative w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <span className="text-white font-bold text-sm">B</span>
                </div>
              </div>
              <div>
                <h1 className="text-sm font-semibold text-white">BMan Admin</h1>
                <p className="text-[10px] text-neutral-500 capitalize">{admin?.role?.replace('_', ' ').toLowerCase()}</p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="relative">
              <div className="absolute inset-0 rounded-lg bg-emerald-500/20 blur-md" />
              <div className="relative w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <span className="text-white font-bold text-sm">B</span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-2">
          <nav className="space-y-1 px-2">
            {filteredItems.map((item) => {
              const Icon = iconMap[item.icon] || LayoutDashboard;
              const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

              if (isCollapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center justify-center h-10 w-10 mx-auto rounded-lg transition-colors',
                          isActive
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                            : 'text-neutral-400 hover:bg-emerald-500/10 hover:text-emerald-400'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-neutral-800 text-white border-neutral-700">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 h-10 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-300 font-medium border border-emerald-500/25'
                      : 'text-neutral-400 hover:bg-emerald-500/10 hover:text-emerald-400'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-neutral-800/50 p-2">
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={logout}
                  className="flex items-center justify-center h-10 w-10 mx-auto rounded-lg text-neutral-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-neutral-800 text-white border-neutral-700">
                Logout
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={logout}
              className="flex items-center gap-3 px-3 h-10 w-full rounded-lg text-sm text-neutral-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Logout</span>
            </button>
          )}
        </div>

        {/* Toggle Button */}
        <button
          onClick={onToggle}
          className="absolute -right-3 top-20 w-6 h-6 bg-neutral-800 border border-neutral-700 rounded-full flex items-center justify-center text-neutral-400 hover:text-emerald-400 hover:bg-neutral-700 transition-colors"
        >
          {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>
    </TooltipProvider>
  );
}
