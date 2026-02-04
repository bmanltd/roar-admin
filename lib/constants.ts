export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'BMan Admin';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';

// Admin Roles
export const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'MARKETING'] as const;
export type AdminRoleType = (typeof ADMIN_ROLES)[number];

// Role hierarchy (higher index = more permissions)
export const ROLE_HIERARCHY: Record<AdminRoleType, number> = {
  MARKETING: 0,
  SUPPORT: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

// Role permissions matrix
export const ROLE_PERMISSIONS: Record<AdminRoleType, string[]> = {
  SUPER_ADMIN: [
    'users.read', 'users.write', 'users.delete',
    'subscriptions.read', 'subscriptions.write', 'subscriptions.delete',
    'payments.read', 'payments.write',
    'product_keys.read', 'product_keys.write', 'product_keys.delete',
    'devices.read', 'devices.write', 'devices.delete', 'devices.commands',
    'businesses.read', 'businesses.write', 'businesses.delete',
    'features.read', 'features.write', 'features.delete',
    'versions.read', 'versions.write', 'versions.delete',
    'press.read', 'press.write', 'press.delete',
    'newsletters.read', 'newsletters.write', 'newsletters.send',
    'mailings.read', 'mailings.write', 'mailings.send',
    'support.read', 'support.write', 'support.reply',
    'admin_users.read', 'admin_users.write', 'admin_users.delete',
    'settings.read', 'settings.write',
    'activity.read',
    'analytics.read',
    'approvals.read', 'approvals.approve', 'approvals.bypass',
  ],
  ADMIN: [
    'users.read', 'users.write',
    'subscriptions.read', 'subscriptions.write',
    'payments.read', 'payments.write',
    'product_keys.read', 'product_keys.write',
    'devices.read', 'devices.write', 'devices.commands',
    'businesses.read', 'businesses.write',
    'features.read', 'features.write',
    'versions.read', 'versions.write',
    'press.read', 'press.write',
    'newsletters.read', 'newsletters.write', 'newsletters.send',
    'mailings.read', 'mailings.write', 'mailings.send',
    'support.read', 'support.write', 'support.reply',
    'admin_users.read',
    'settings.read',
    'activity.read',
    'analytics.read',
    'approvals.read',
  ],
  SUPPORT: [
    'users.read',
    'subscriptions.read', 'subscriptions.write',
    'payments.read',
    'product_keys.read',
    'devices.read', 'devices.commands',
    'businesses.read',
    'features.read',
    'versions.read',
    'support.read', 'support.write', 'support.reply',
    'activity.read',
    'analytics.read',
    'approvals.read',
  ],
  MARKETING: [
    'press.read', 'press.write', 'press.delete',
    'newsletters.read', 'newsletters.write', 'newsletters.send',
    'mailings.read', 'mailings.write', 'mailings.send',
    'analytics.read',
  ],
};

// Approval Workflow Configuration
export type ApprovalActionType =
  | 'PAYMENT_CREATE'
  | 'SUBSCRIPTION_EXTEND'
  | 'SUBSCRIPTION_SUSPEND'
  | 'SUBSCRIPTION_CANCEL'
  | 'SUBSCRIPTION_CHANGE_TIER'
  | 'TIER_CREATE'
  | 'TIER_UPDATE'
  | 'TIER_DELETE'
  | 'USER_SUSPEND'
  | 'USER_DELETE'
  | 'ADMIN_ROLE_CHANGE'
  | 'ADMIN_DEACTIVATE';

// Actions that require approval by role
export const APPROVAL_REQUIRED_ACTIONS: Record<string, ApprovalActionType[]> = {
  ADMIN: [
    'PAYMENT_CREATE',
    'SUBSCRIPTION_EXTEND',
    'SUBSCRIPTION_SUSPEND',
    'SUBSCRIPTION_CANCEL',
    'SUBSCRIPTION_CHANGE_TIER',
    'TIER_CREATE',
    'TIER_UPDATE',
    'TIER_DELETE',
    'USER_SUSPEND',
    'USER_DELETE',
    'ADMIN_ROLE_CHANGE',
    'ADMIN_DEACTIVATE',
  ],
  SUPPORT: [
    'PAYMENT_CREATE',
    'SUBSCRIPTION_EXTEND',
    'SUBSCRIPTION_SUSPEND',
    'SUBSCRIPTION_CANCEL',
    'USER_SUSPEND',
  ],
  MARKETING: [],
};

// SUPER_ADMIN bypasses approval workflow
export const SUPER_ADMIN_BYPASS_APPROVAL = true;

// Approval request expiration (in hours)
export const APPROVAL_EXPIRATION_HOURS = 72;

// Action type display labels
export const APPROVAL_ACTION_LABELS: Record<ApprovalActionType, string> = {
  PAYMENT_CREATE: 'Create Manual Payment',
  SUBSCRIPTION_EXTEND: 'Extend Subscription',
  SUBSCRIPTION_SUSPEND: 'Suspend Subscription',
  SUBSCRIPTION_CANCEL: 'Cancel Subscription',
  SUBSCRIPTION_CHANGE_TIER: 'Change Subscription Tier',
  TIER_CREATE: 'Create Subscription Tier',
  TIER_UPDATE: 'Update Subscription Tier',
  TIER_DELETE: 'Delete Subscription Tier',
  USER_SUSPEND: 'Suspend User',
  USER_DELETE: 'Delete User',
  ADMIN_ROLE_CHANGE: 'Change Admin Role',
  ADMIN_DEACTIVATE: 'Deactivate Admin User',
};

// 2FA
export const TWO_FA_CODE_LENGTH = 6;

// Session
export const SESSION_DURATION_HOURS = 24;
export const REFRESH_TOKEN_DAYS = 30;

// Subscription tiers (display names)
export const TIER_NAMES: Record<string, string> = {
  starter: 'Starter',
  standard: 'Standard',
  pro: 'Pro',
};

// Navigation items for sidebar
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  permission: string;
  badge?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/', icon: 'LayoutDashboard', permission: 'analytics.read' },
  { label: 'Approvals', href: '/approvals', icon: 'ClipboardCheck', permission: 'approvals.read' },
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
