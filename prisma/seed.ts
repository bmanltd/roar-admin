import { PrismaClient, AdminRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';

// Load env vars for seed script
function loadEnvFile(): void {
  const envFiles = [
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '..', '.env.local'),
  ];
  for (const filePath of envFiles) {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        let value = trimmed.slice(eqIdx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

loadEnvFile();

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding admin database...');

  // Create super admin
  const passwordHash = await bcrypt.hash('BManAdmin2026!', 12);

  const superAdmin = await prisma.adminUser.upsert({
    where: { email: 'butmanltd@gmail.com' },
    update: {},
    create: {
      email: 'butmanltd@gmail.com',
      passwordHash,
      fullName: 'BMan Admin',
      role: AdminRole.SUPER_ADMIN,
      isActive: true,
      twoFactorEnabled: true,
      twoFactorMethod: 'EMAIL',
      mustChangePassword: true,
    },
  });

  console.log(`Super admin created: ${superAdmin.email} (${superAdmin.id})`);

  // Create default system settings
  await prisma.adminSystemSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      maintenanceMode: false,
      registrationOpen: true,
      maxFreeTrialDays: 0,
      supportEmail: 'support@butman.rw',
    },
  });

  console.log('System settings created');

  // Ensure subscription tiers exist
  const tiers = [
    {
      name: 'starter',
      displayName: 'Starter',
      priceMonthly: 15000,
      priceYearly: 150000,
      maxDevices: 1,
      maxProducts: 100,
      maxUsers: 1,
      offlineMode: true,
      cloudSync: false,
      backupEnabled: false,
      userManagement: false,
      accessLevels: false,
      prioritySupport: false,
    },
    {
      name: 'standard',
      displayName: 'Standard',
      priceMonthly: 25000,
      priceYearly: 250000,
      maxDevices: 3,
      maxProducts: -1,
      maxUsers: 2,
      offlineMode: true,
      cloudSync: true,
      backupEnabled: true,
      userManagement: true,
      accessLevels: false,
      prioritySupport: false,
    },
    {
      name: 'pro',
      displayName: 'Pro',
      priceMonthly: 45000,
      priceYearly: 450000,
      maxDevices: 5,
      maxProducts: -1,
      maxUsers: -1,
      offlineMode: true,
      cloudSync: true,
      backupEnabled: true,
      userManagement: true,
      accessLevels: true,
      prioritySupport: true,
    },
  ];

  for (const tier of tiers) {
    await prisma.subscriptionTier.upsert({
      where: { name: tier.name },
      update: tier,
      create: tier,
    });
    console.log(`Tier created/updated: ${tier.displayName}`);
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
