'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  LayoutDashboard, Users, CreditCard, Key, Monitor, Building2,
  BarChart3, ToggleLeft, Package, Newspaper, Mail, Send,
  MessageSquare, Shield, Activity, Settings, ChevronLeft,
  ChevronRight, LogOut, Wallet, Sparkles, KeyRound, ClipboardCheck,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, Users, CreditCard, Key, Monitor, Building2,
  BarChart3, ToggleLeft, Package, Newspaper, Mail, Send,
  MessageSquare, Shield, Activity, Settings, Wallet, KeyRound, ClipboardCheck,
};

interface NavItem {
  label: string;
  href: string;
  icon: string;
  permission: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Main',
    items: [
      { label: 'Overview', href: '/', icon: 'LayoutDashboard', permission: 'analytics.read' },
      { label: 'Analytics', href: '/analytics', icon: 'BarChart3', permission: 'analytics.read' },
    ],
  },
  {
    title: 'Management',
    items: [
      { label: 'Users', href: '/users', icon: 'Users', permission: 'users.read' },
      { label: 'Businesses', href: '/businesses', icon: 'Building2', permission: 'businesses.read' },
      { label: 'Devices', href: '/devices', icon: 'Monitor', permission: 'devices.read' },
    ],
  },
  {
    title: 'Billing',
    items: [
      { label: 'Subscriptions', href: '/subscriptions', icon: 'CreditCard', permission: 'subscriptions.read' },
      { label: 'Payments', href: '/payments', icon: 'Wallet', permission: 'payments.read' },
      { label: 'Product Keys', href: '/product-keys', icon: 'Key', permission: 'product_keys.read' },
    ],
  },
  {
    title: 'Product',
    items: [
      { label: 'Features', href: '/features', icon: 'ToggleLeft', permission: 'features.read' },
      { label: 'Versions', href: '/versions', icon: 'Package', permission: 'versions.read' },
    ],
  },
  {
    title: 'Communications',
    items: [
      { label: 'Press & News', href: '/press', icon: 'Newspaper', permission: 'press.read' },
      { label: 'Newsletters', href: '/newsletters', icon: 'Mail', permission: 'newsletters.read' },
      { label: 'Mailings', href: '/mailings', icon: 'Send', permission: 'mailings.read' },
      { label: 'Support', href: '/support', icon: 'MessageSquare', permission: 'support.read' },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Approvals', href: '/approvals', icon: 'ClipboardCheck', permission: 'approvals.read' },
      { label: 'Admin Users', href: '/admin-users', icon: 'Shield', permission: 'admin_users.read' },
      { label: 'Activity Log', href: '/activity', icon: 'Activity', permission: 'activity.read' },
      { label: 'Settings', href: '/settings', icon: 'Settings', permission: 'settings.read' },
    ],
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ isCollapsed, onToggle, mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { hasPermission, logout, admin } = useAuth();

  // On mobile, always show expanded sidebar
  const showCollapsed = isCollapsed && !mobileOpen;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredSections = NAV_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item => !item.permission || hasPermission(item.permission)),
  })).filter(section => section.items.length > 0);

  return (
    <TooltipProvider delayDuration={0}>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={onMobileClose}
        />
      )}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen flex flex-col transition-all duration-300 ease-out',
          'bg-gradient-to-b from-neutral-950 via-neutral-950 to-neutral-900/95',
          'border-r border-neutral-800/40',
          // Mobile: always w-[260px], hidden off-screen unless mobileOpen
          'w-[260px] -translate-x-full md:translate-x-0',
          mobileOpen && 'translate-x-0',
          // Desktop: respect collapsed state
          !mobileOpen && showCollapsed && 'md:w-[72px]',
          !mobileOpen && !showCollapsed && 'md:w-[260px]'
        )}
      >
        {/* Subtle background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-emerald-500/[0.02] to-transparent" />
        </div>

        {/* Header */}
        <div className={cn(
          'relative flex items-center h-16 px-5 border-b border-neutral-800/40',
          showCollapsed ? 'justify-center px-3' : 'gap-3'
        )}>
          <div className={cn(
            'relative flex-shrink-0',
            'before:absolute before:-inset-1 before:bg-emerald-500/20 before:rounded-xl before:blur-md before:opacity-0',
            'hover:before:opacity-100 before:transition-opacity before:duration-500'
          )}>
            <Image
              src="/logo.png"
              alt="BMan"
              width={36}
              height={36}
              className="relative rounded-lg ring-1 ring-neutral-800/50"
            />
          </div>
          {!showCollapsed && (
            <div className="min-w-0">
              <h1 className="text-[15px] font-semibold text-white tracking-tight flex items-center gap-1.5">
                BMan
                <Sparkles className="h-3 w-3 text-emerald-400/60" />
              </h1>
              <p className="text-[11px] text-neutral-500 font-medium">Admin Console</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="relative flex-1 min-h-0 overflow-hidden px-3 py-4">
          <nav className="space-y-6">
            {filteredSections.map((section) => (
              <div key={section.title}>
                {!showCollapsed && (
                  <h2 className="px-3 mb-2.5 text-[10px] font-semibold text-neutral-500/80 uppercase tracking-[0.1em]">
                    {section.title}
                  </h2>
                )}
                {showCollapsed && (
                  <div className="w-8 h-px bg-gradient-to-r from-transparent via-neutral-700/50 to-transparent mx-auto mb-3" />
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = iconMap[item.icon] || LayoutDashboard;
                    const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

                    if (showCollapsed) {
                      return (
                        <Tooltip key={item.href}>
                          <TooltipTrigger asChild>
                            <Link
                              href={item.href}
                              className={cn(
                                'relative flex items-center justify-center w-11 h-11 mx-auto rounded-xl transition-all duration-200',
                                isActive
                                  ? 'bg-gradient-to-b from-emerald-500/20 to-emerald-500/10 text-emerald-400 shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)]'
                                  : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200'
                              )}
                            >
                              {isActive && (
                                <div className="absolute inset-0 rounded-xl ring-1 ring-emerald-500/20" />
                              )}
                              <Icon className="relative h-[18px] w-[18px]" strokeWidth={isActive ? 2 : 1.5} />
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent
                            side="right"
                            sideOffset={12}
                            className="bg-neutral-900/95 backdrop-blur-sm text-neutral-100 border-neutral-800/60 text-xs font-medium px-3 py-1.5 shadow-xl"
                          >
                            {item.label}
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onMobileClose}
                        className={cn(
                          'group relative flex items-center gap-3 px-3 h-10 rounded-xl text-[13px] font-medium transition-all duration-200',
                          isActive
                            ? 'bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 text-emerald-400'
                            : 'text-neutral-400 hover:bg-neutral-800/40 hover:text-neutral-200'
                        )}
                      >
                        {isActive && (
                          <>
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <div className="absolute inset-0 rounded-xl ring-1 ring-emerald-500/10" />
                          </>
                        )}
                        <Icon
                          className={cn(
                            'relative h-[18px] w-[18px] flex-shrink-0 transition-all duration-200',
                            isActive
                              ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.4)]'
                              : 'text-neutral-500 group-hover:text-neutral-300'
                          )}
                          strokeWidth={isActive ? 2 : 1.5}
                        />
                        <span className="relative truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* User Profile & Logout */}
        <div className="relative border-t border-neutral-800/40 p-3 space-y-2">
          {/* User Profile */}
          {showCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center">
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <Avatar className="relative h-9 w-9 ring-2 ring-neutral-800/80 ring-offset-2 ring-offset-neutral-950">
                      <AvatarFallback className="bg-gradient-to-br from-neutral-800 to-neutral-900 text-neutral-300 text-xs font-semibold">
                        {admin?.fullName ? getInitials(admin.fullName) : 'AD'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                sideOffset={12}
                className="bg-neutral-900/95 backdrop-blur-sm text-neutral-100 border-neutral-800/60 shadow-xl"
              >
                <div className="text-xs py-0.5">
                  <p className="font-medium">{admin?.fullName || 'Admin'}</p>
                  <p className="text-neutral-500 capitalize">{admin?.role?.replace('_', ' ').toLowerCase()}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="group relative flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-neutral-900/80 to-neutral-900/40 border border-neutral-800/40 hover:border-neutral-700/50 transition-all duration-300">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Avatar className="relative h-9 w-9 ring-2 ring-neutral-700/50">
                  <AvatarFallback className="bg-gradient-to-br from-neutral-700 to-neutral-800 text-neutral-200 text-xs font-semibold">
                    {admin?.fullName ? getInitials(admin.fullName) : 'AD'}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="relative min-w-0 flex-1">
                <p className="text-[13px] font-medium text-neutral-200 truncate">
                  {admin?.fullName || 'Admin'}
                </p>
                <p className="text-[11px] text-neutral-500 capitalize truncate">
                  {admin?.role?.replace('_', ' ').toLowerCase()}
                </p>
              </div>
              <div className="relative w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]">
                <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
              </div>
            </div>
          )}

          {/* Logout Button */}
          {showCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={logout}
                  className="group relative flex items-center justify-center w-11 h-11 mx-auto rounded-xl text-neutral-500 hover:text-red-400 transition-all duration-200 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/10 to-red-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <LogOut className="relative h-[18px] w-[18px]" strokeWidth={1.5} />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                sideOffset={12}
                className="bg-neutral-900/95 backdrop-blur-sm text-neutral-100 border-neutral-800/60 text-xs font-medium px-3 py-1.5 shadow-xl"
              >
                Logout
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={logout}
              className="group relative flex items-center gap-3 px-3 h-10 w-full rounded-xl text-[13px] font-medium text-neutral-500 hover:text-red-400 transition-all duration-200 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/10 to-red-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
              <LogOut className="relative h-[18px] w-[18px] flex-shrink-0" strokeWidth={1.5} />
              <span className="relative">Logout</span>
            </button>
          )}

          {/* Version */}
          {!showCollapsed && (
            <div className="pt-2 mt-2 border-t border-neutral-800/30">
              <p className="text-[10px] text-neutral-600 text-center tracking-wide">
                v1.0.0
              </p>
            </div>
          )}
        </div>

        {/* Toggle Button — desktop only */}
        <button
          onClick={onToggle}
          className={cn(
            'group absolute -right-4 top-1/2 -translate-y-1/2 z-50',
            'hidden md:flex w-8 h-8 rounded-full items-center justify-center',
            'bg-gradient-to-br from-neutral-800 via-neutral-850 to-neutral-900',
            'border border-neutral-700/60',
            'text-neutral-400 hover:text-emerald-400',
            'shadow-xl shadow-black/40',
            'transition-all duration-300 ease-out',
            'hover:scale-110 hover:border-emerald-500/40',
            'hover:shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)]'
          )}
        >
          {/* Glow effect */}
          <div className={cn(
            'absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300',
            'bg-gradient-to-br from-emerald-500/20 to-transparent'
          )} />
          {/* Inner ring */}
          <div className={cn(
            'absolute inset-1 rounded-full',
            'bg-gradient-to-br from-neutral-700/50 to-neutral-900/50',
            'group-hover:from-emerald-500/10 group-hover:to-transparent',
            'transition-all duration-300'
          )} />
          {isCollapsed ? (
            <ChevronRight className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2} />
          ) : (
            <ChevronLeft className="relative h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" strokeWidth={2} />
          )}
        </button>
      </aside>
    </TooltipProvider>
  );
}
