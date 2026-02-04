import prisma from '@/lib/prisma';
import type { ApprovalRequest, BillingCycle } from '@prisma/client';

/**
 * Execute an approved action based on its type
 */
export async function executeApprovedAction(
  approvalRequest: ApprovalRequest
): Promise<Record<string, unknown>> {
  const payload = approvalRequest.payload as Record<string, unknown>;

  switch (approvalRequest.actionType) {
    case 'PAYMENT_CREATE':
      return executePaymentCreate(payload);

    case 'SUBSCRIPTION_EXTEND':
      return executeSubscriptionExtend(approvalRequest.resourceId!, payload);

    case 'SUBSCRIPTION_SUSPEND':
      return executeSubscriptionSuspend(approvalRequest.resourceId!);

    case 'SUBSCRIPTION_CANCEL':
      return executeSubscriptionCancel(approvalRequest.resourceId!);

    case 'SUBSCRIPTION_CHANGE_TIER':
      return executeSubscriptionChangeTier(approvalRequest.resourceId!, payload);

    case 'TIER_CREATE':
      return executeTierCreate(payload);

    case 'TIER_UPDATE':
      return executeTierUpdate(approvalRequest.resourceId!, payload);

    case 'TIER_DELETE':
      return executeTierDelete(approvalRequest.resourceId!);

    case 'USER_SUSPEND':
      return executeUserSuspend(approvalRequest.resourceId!);

    case 'USER_DELETE':
      return executeUserDelete(approvalRequest.resourceId!);

    case 'ADMIN_ROLE_CHANGE':
      return executeAdminRoleChange(approvalRequest.resourceId!, payload);

    case 'ADMIN_DEACTIVATE':
      return executeAdminDeactivate(approvalRequest.resourceId!);

    default:
      throw new Error(`Unknown action type: ${approvalRequest.actionType}`);
  }
}

// Payment executor
async function executePaymentCreate(
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const {
    userId,
    amount,
    currency,
    paymentMethod,
    planTier,
    billingCycle,
    notes,
    extendSubscription,
  } = payload;

  const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
  const txRef = `APPROVED-${Date.now()}-${randomPart}`;

  const methodMapping: Record<string, 'MOMO' | 'CARD' | 'BANK'> = {
    MANUAL: 'BANK',
    CASH: 'CARD',
    BANK_TRANSFER: 'BANK',
  };

  const payment = await prisma.payment.create({
    data: {
      userId: userId as string,
      txRef,
      amount: parseInt(amount as string),
      currency: (currency as string) || 'RWF',
      paymentMethod: methodMapping[paymentMethod as string] || 'BANK',
      status: 'SUCCESSFUL',
      planTier: planTier as string,
      billingCycle: billingCycle as BillingCycle,
      paidAt: new Date(),
      flwResponse: {
        approvalWorkflow: true,
        originalMethod: paymentMethod as string,
        notes: (notes as string) || null,
      },
    },
  });

  if (extendSubscription) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: userId as string },
    });

    if (subscription) {
      const daysToAdd =
        billingCycle === 'YEARLY' ? 365 : billingCycle === 'BIANNUAL' ? 180 : 30;
      const baseDate =
        subscription.expiresAt > new Date() ? subscription.expiresAt : new Date();
      const newExpiresAt = new Date(baseDate);
      newExpiresAt.setDate(newExpiresAt.getDate() + daysToAdd);

      await prisma.subscription.update({
        where: { userId: userId as string },
        data: { expiresAt: newExpiresAt, status: 'ACTIVE' },
      });
    }
  }

  return { paymentId: payment.id, txRef };
}

// Subscription executors
async function executeSubscriptionExtend(
  subscriptionId: string,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { expiresAt } = payload;
  const subscription = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { expiresAt: new Date(expiresAt as string), status: 'ACTIVE' },
  });
  return { subscriptionId: subscription.id, newExpiresAt: subscription.expiresAt };
}

async function executeSubscriptionSuspend(
  subscriptionId: string
): Promise<Record<string, unknown>> {
  const subscription = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status: 'SUSPENDED' },
  });
  return { subscriptionId: subscription.id, status: 'SUSPENDED' };
}

async function executeSubscriptionCancel(
  subscriptionId: string
): Promise<Record<string, unknown>> {
  const subscription = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
  });
  return { subscriptionId: subscription.id, status: 'CANCELLED' };
}

async function executeSubscriptionChangeTier(
  subscriptionId: string,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { tierId } = payload;
  const subscription = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { tierId: tierId as string },
  });
  return { subscriptionId: subscription.id, newTierId: tierId };
}

// Tier executors
async function executeTierCreate(
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const tier = await prisma.subscriptionTier.create({
    data: {
      name: payload.name as string,
      displayName: payload.displayName as string,
      priceMonthly: payload.priceMonthly as number,
      priceYearly: payload.priceYearly as number,
      maxDevices: (payload.maxDevices as number) || 1,
      maxProducts: (payload.maxProducts as number) || 100,
      maxUsers: (payload.maxUsers as number) || 1,
      offlineMode: (payload.offlineMode as boolean) ?? true,
      cloudSync: (payload.cloudSync as boolean) ?? false,
      backupEnabled: (payload.backupEnabled as boolean) ?? false,
      userManagement: (payload.userManagement as boolean) ?? false,
      accessLevels: (payload.accessLevels as boolean) ?? false,
      prioritySupport: (payload.prioritySupport as boolean) ?? false,
    },
  });
  return { tierId: tier.id, name: tier.name };
}

async function executeTierUpdate(
  tierId: string,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  // Only update fields that are explicitly provided
  const updateData: Record<string, unknown> = {};
  const allowedFields = [
    'name',
    'displayName',
    'priceMonthly',
    'priceYearly',
    'maxDevices',
    'maxProducts',
    'maxUsers',
    'offlineMode',
    'cloudSync',
    'backupEnabled',
    'userManagement',
    'accessLevels',
    'prioritySupport',
  ];

  for (const field of allowedFields) {
    if (payload[field] !== undefined) {
      updateData[field] = payload[field];
    }
  }

  const tier = await prisma.subscriptionTier.update({
    where: { id: tierId },
    data: updateData,
  });
  return { tierId: tier.id };
}

async function executeTierDelete(tierId: string): Promise<Record<string, unknown>> {
  // Check if any subscriptions use this tier
  const subscriptionCount = await prisma.subscription.count({
    where: { tierId },
  });

  if (subscriptionCount > 0) {
    throw new Error(
      `Cannot delete tier: ${subscriptionCount} subscriptions are still using it`
    );
  }

  await prisma.subscriptionTier.delete({ where: { id: tierId } });
  return { deleted: true };
}

// User executors
async function executeUserSuspend(userId: string): Promise<Record<string, unknown>> {
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });
  return { userId, suspended: true };
}

async function executeUserDelete(userId: string): Promise<Record<string, unknown>> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  await prisma.user.update({
    where: { id: userId },
    data: {
      isActive: false,
      email: `deleted_${userId}@deleted.local`,
      fullName: 'Deleted User',
      phone: null,
      companyName: null,
    },
  });
  return { userId, originalEmail: user?.email };
}

// Admin executors
async function executeAdminRoleChange(
  adminId: string,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { role, fullName, isActive, twoFactorEnabled } = payload;
  const updateData: Record<string, unknown> = {};

  if (role !== undefined) updateData.role = role;
  if (fullName !== undefined) updateData.fullName = fullName;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (twoFactorEnabled !== undefined) updateData.twoFactorEnabled = twoFactorEnabled;

  const admin = await prisma.adminUser.update({
    where: { id: adminId },
    data: updateData,
  });
  return { adminId: admin.id, role: admin.role };
}

async function executeAdminDeactivate(
  adminId: string
): Promise<Record<string, unknown>> {
  await prisma.adminUser.update({
    where: { id: adminId },
    data: { isActive: false },
  });
  // Invalidate all sessions
  await prisma.adminSession.deleteMany({ where: { adminId } });
  return { adminId, deactivated: true };
}
