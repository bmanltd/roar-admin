import { generateSecret as otpGenerateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';
import prisma from '@/lib/prisma';

const APP_NAME = process.env.APP_NAME || 'BMan Admin';
const TWO_FA_CODE_LENGTH = 6;

export function generateEmailCode(length: number = TWO_FA_CODE_LENGTH): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

export function isValidCodeFormat(code: string, length: number = TWO_FA_CODE_LENGTH): boolean {
  if (!code || typeof code !== 'string') return false;
  if (code.length !== length) return false;
  return /^\d+$/.test(code);
}

export function getCodeExpiryTime(minutes: number = 5): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export function isCodeExpired(expiresAt: Date | string): boolean {
  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  return expiry < new Date();
}

export async function storeAdmin2FACode(adminId: string, code: string): Promise<void> {
  await prisma.adminTwoFactorCode.updateMany({
    where: {
      adminId: adminId,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  });

  await prisma.adminTwoFactorCode.create({
    data: {
      adminId: adminId,
      code: code,
      expiresAt: getCodeExpiryTime(5),
    },
  });
}

export function generateTOTPSecret(): string {
  return otpGenerateSecret({ length: 20 });
}

export function generateTOTPUri(email: string, secret: string): string {
  return generateURI({
    issuer: APP_NAME,
    label: email,
    secret: secret,
  });
}

export async function generateQRCodeDataURL(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl, {
    width: 256,
    margin: 2,
    color: {
      dark: '#10b981',
      light: '#171717',
    },
  });
}

export function verifyTOTPToken(token: string, secret: string): boolean {
  try {
    const result = verifySync({ token, secret });
    return result.valid;
  } catch {
    return false;
  }
}

const ENCRYPTION_KEY = process.env.TOTP_ENCRYPTION_KEY || 'bman-admin-totp-key-secure-2026';

export function encryptSecret(secret: string): string {
  let result = '';
  for (let i = 0; i < secret.length; i++) {
    const charCode = secret.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
    result += String.fromCharCode(charCode);
  }
  return Buffer.from(result).toString('base64');
}

export function decryptSecret(encrypted: string): string {
  const decoded = Buffer.from(encrypted, 'base64').toString();
  let result = '';
  for (let i = 0; i < decoded.length; i++) {
    const charCode = decoded.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
    result += String.fromCharCode(charCode);
  }
  return result;
}
