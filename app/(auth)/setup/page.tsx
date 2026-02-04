'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Loader2,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Shield,
  Mail,
  Smartphone,
  Copy,
  Check,
  ArrowRight,
  PartyPopper,
} from 'lucide-react';
import Image from 'next/image';

type Step = 'loading' | 'welcome' | 'password' | '2fa-choice' | 'totp-setup' | 'success';

interface AdminInfo {
  email: string;
  fullName: string;
  role: string;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /[0-9]/.test(p) },
];

function SetupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [step, setStep] = useState<Step>('loading');
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Password state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 2FA state
  const [twoFactorMethod, setTwoFactorMethod] = useState<'EMAIL' | 'TOTP'>('EMAIL');
  const [totpData, setTotpData] = useState<{
    qrCode: string;
    secret: string;
    encryptedSecret: string;
  } | null>(null);
  const [totpCode, setTotpCode] = useState(['', '', '', '', '', '']);
  const [secretCopied, setSecretCopied] = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setError('No invitation token provided');
      setStep('loading');
      return;
    }

    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await fetch(`/api/auth/setup?token=${token}`);
      const data = await response.json();

      if (data.success) {
        setAdminInfo(data.data);
        setStep('welcome');
      } else {
        setError(data.error || 'Invalid invitation token');
      }
    } catch {
      setError('Failed to validate invitation token');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate all requirements are met
    const allMet = passwordRequirements.every((req) => req.test(password));
    if (!allMet) {
      setError('Please meet all password requirements');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setStep('2fa-choice');
  };

  const handleTwoFactorChoice = async (method: 'EMAIL' | 'TOTP') => {
    setTwoFactorMethod(method);

    if (method === 'TOTP') {
      setIsLoading(true);
      try {
        const response = await fetch('/api/auth/setup/totp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await response.json();

        if (data.success) {
          setTotpData(data.data);
          setStep('totp-setup');
        } else {
          setError(data.error || 'Failed to generate authenticator setup');
        }
      } catch {
        setError('Failed to generate authenticator setup');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Complete setup with email 2FA
      completeSetup('EMAIL');
    }
  };

  const handleTotpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = totpCode.join('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    completeSetup('TOTP', code);
  };

  const completeSetup = async (method: 'EMAIL' | 'TOTP', code?: string) => {
    setIsLoading(true);
    setError('');

    try {
      const body: Record<string, string | undefined> = {
        token: token || '',
        password,
        confirmPassword,
        twoFactorMethod: method,
      };

      if (method === 'TOTP' && totpData) {
        body.totpCode = code;
        body.totpSecret = totpData.encryptedSecret;
      }

      const response = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (data.success) {
        setStep('success');
      } else {
        setError(data.error || 'Failed to complete setup');
        if (method === 'TOTP') {
          setTotpCode(['', '', '', '', '', '']);
          otpRefs.current[0]?.focus();
        }
      }
    } catch {
      setError('Failed to complete setup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...totpCode];
    newOtp[index] = digit;
    setTotpCode(newOtp);

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !totpCode[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData) {
      const newOtp = pastedData.split('').concat(Array(6 - pastedData.length).fill(''));
      setTotpCode(newOtp.slice(0, 6));
      const nextEmpty = newOtp.findIndex((v) => !v);
      otpRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
    }
  };

  const copySecret = async () => {
    if (totpData?.secret) {
      await navigator.clipboard.writeText(totpData.secret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    }
  };

  const formatRole = (role: string) => {
    return role
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase());
  };

  // Loading state
  if (step === 'loading') {
    return (
      <div className="space-y-8 text-center">
        {error ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white">Invalid Invitation</h1>
              <p className="text-neutral-400">{error}</p>
            </div>
            <Button
              onClick={() => router.push('/login')}
              className={cn(
                'w-full h-12 text-[15px] font-medium',
                'bg-emerald-600 hover:bg-emerald-500 text-white',
                'transition-all duration-200'
              )}
            >
              Go to Login
            </Button>
          </>
        ) : (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
            <p className="text-neutral-400">Validating invitation...</p>
          </>
        )}
      </div>
    );
  }

  // Welcome step
  if (step === 'welcome') {
    return (
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8 text-emerald-400" />
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-white">
              Welcome, {adminInfo?.fullName}
            </h1>
            <p className="text-neutral-400">
              You&apos;ve been invited as <span className="text-emerald-400 font-medium">{formatRole(adminInfo?.role || '')}</span>
            </p>
          </div>
        </div>

        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-medium text-neutral-300">Setup your account</h3>
          <ul className="space-y-2 text-sm text-neutral-400">
            <li className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <span className="text-xs text-emerald-400">1</span>
              </div>
              Create a secure password
            </li>
            <li className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <span className="text-xs text-emerald-400">2</span>
              </div>
              Choose your 2FA method
            </li>
            <li className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <span className="text-xs text-emerald-400">3</span>
              </div>
              Start managing the platform
            </li>
          </ul>
        </div>

        <Button
          onClick={() => setStep('password')}
          className={cn(
            'w-full h-12 text-[15px] font-medium',
            'bg-emerald-600 hover:bg-emerald-500 text-white',
            'transition-all duration-200'
          )}
        >
          Get Started
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Password step
  if (step === 'password') {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Create your password</h1>
          <p className="text-neutral-400">Choose a strong password for your account</p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-5">
          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-neutral-300 text-sm font-medium">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-neutral-500" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(
                  'h-12 pl-11 pr-11 bg-neutral-900 border-neutral-800 text-white placeholder:text-neutral-600',
                  'focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-colors'
                )}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-[18px] w-[18px]" />
                ) : (
                  <Eye className="h-[18px] w-[18px]" />
                )}
              </button>
            </div>
          </div>

          {/* Password Requirements */}
          <div className="space-y-2">
            {passwordRequirements.map((req, index) => {
              const met = req.test(password);
              return (
                <div
                  key={index}
                  className={cn(
                    'flex items-center gap-2 text-sm transition-colors',
                    met ? 'text-emerald-400' : 'text-neutral-500'
                  )}
                >
                  <CheckCircle2
                    className={cn(
                      'h-4 w-4 transition-colors',
                      met ? 'text-emerald-400' : 'text-neutral-600'
                    )}
                  />
                  {req.label}
                </div>
              );
            })}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-neutral-300 text-sm font-medium">
              Confirm Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-neutral-500" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={cn(
                  'h-12 pl-11 pr-11 bg-neutral-900 border-neutral-800 text-white placeholder:text-neutral-600',
                  'focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-colors',
                  confirmPassword && password !== confirmPassword && 'border-red-500/50'
                )}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-[18px] w-[18px]" />
                ) : (
                  <Eye className="h-[18px] w-[18px]" />
                )}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-sm text-red-400">Passwords do not match</p>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-lg">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            className={cn(
              'w-full h-12 text-[15px] font-medium',
              'bg-emerald-600 hover:bg-emerald-500 text-white',
              'transition-all duration-200'
            )}
            disabled={
              !passwordRequirements.every((req) => req.test(password)) ||
              password !== confirmPassword
            }
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
      </div>
    );
  }

  // 2FA Choice step
  if (step === '2fa-choice') {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Secure your account</h1>
          <p className="text-neutral-400">Choose how you&apos;ll verify your identity when logging in</p>
        </div>

        <div className="space-y-3">
          {/* Email Option */}
          <button
            onClick={() => handleTwoFactorChoice('EMAIL')}
            disabled={isLoading}
            className={cn(
              'w-full flex items-start gap-4 p-4 rounded-xl border transition-all text-left',
              'bg-neutral-900/50 border-neutral-800 hover:border-emerald-500/50 hover:bg-neutral-900'
            )}
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Mail className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium">Email Verification</h3>
              <p className="text-neutral-500 text-sm mt-1">
                Receive a 6-digit code via email each time you log in
              </p>
            </div>
          </button>

          {/* TOTP Option */}
          <button
            onClick={() => handleTwoFactorChoice('TOTP')}
            disabled={isLoading}
            className={cn(
              'w-full flex items-start gap-4 p-4 rounded-xl border transition-all text-left',
              'bg-neutral-900/50 border-neutral-800 hover:border-emerald-500/50 hover:bg-neutral-900'
            )}
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium flex items-center gap-2">
                Authenticator App
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                  Recommended
                </span>
              </h3>
              <p className="text-neutral-500 text-sm mt-1">
                Use Google Authenticator, Authy, or similar apps for faster login
              </p>
            </div>
          </button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 text-neutral-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Setting up...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-lg">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }

  // TOTP Setup step
  if (step === 'totp-setup') {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Setup Authenticator</h1>
          <p className="text-neutral-400">Scan the QR code with your authenticator app</p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center">
          <div className="bg-white p-4 rounded-2xl">
            {totpData?.qrCode && (
              <Image
                src={totpData.qrCode}
                alt="TOTP QR Code"
                width={200}
                height={200}
                className="rounded-lg"
              />
            )}
          </div>
        </div>

        {/* Manual Entry */}
        <div className="space-y-2">
          <p className="text-sm text-neutral-400 text-center">
            Or enter this code manually:
          </p>
          <div className="flex items-center gap-2 justify-center">
            <code className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-emerald-400 font-mono text-sm">
              {totpData?.secret}
            </code>
            <button
              onClick={copySecret}
              className={cn(
                'p-2 rounded-lg transition-colors',
                secretCopied
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              )}
            >
              {secretCopied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Verification */}
        <form onSubmit={handleTotpVerify} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-neutral-300 text-sm font-medium">
              Enter the 6-digit code from your app
            </Label>
            <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
              {totpCode.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    otpRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className={cn(
                    'w-12 h-14 text-center text-2xl font-semibold rounded-xl',
                    'bg-neutral-900 border-2 text-white',
                    'transition-all duration-200 outline-none',
                    digit
                      ? 'border-emerald-500/50'
                      : 'border-neutral-800 focus:border-emerald-500/50',
                    'focus:ring-2 focus:ring-emerald-500/20'
                  )}
                  autoFocus={index === 0}
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-lg">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            className={cn(
              'w-full h-12 text-[15px] font-medium',
              'bg-emerald-600 hover:bg-emerald-500 text-white',
              'transition-all duration-200'
            )}
            disabled={isLoading || totpCode.join('').length !== 6}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Verifying...
              </>
            ) : (
              <>
                Verify & Complete Setup
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </div>
    );
  }

  // Success step
  if (step === 'success') {
    return (
      <div className="space-y-8 text-center">
        <div className="space-y-4">
          <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <PartyPopper className="w-10 h-10 text-emerald-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">You&apos;re all set!</h1>
            <p className="text-neutral-400">
              Your account has been set up successfully.
              {twoFactorMethod === 'TOTP' && ' Authenticator app is now enabled.'}
            </p>
          </div>
        </div>

        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-neutral-400 text-sm">Email</span>
            <span className="text-white text-sm">{adminInfo?.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-400 text-sm">Role</span>
            <span className="text-emerald-400 text-sm">{formatRole(adminInfo?.role || '')}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-400 text-sm">2FA Method</span>
            <span className="text-white text-sm flex items-center gap-1.5">
              {twoFactorMethod === 'TOTP' ? (
                <>
                  <Smartphone className="h-3.5 w-3.5" />
                  Authenticator
                </>
              ) : (
                <>
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </>
              )}
            </span>
          </div>
        </div>

        <Button
          onClick={() => router.push('/login')}
          className={cn(
            'w-full h-12 text-[15px] font-medium',
            'bg-emerald-600 hover:bg-emerald-500 text-white',
            'transition-all duration-200'
          )}
        >
          Sign in to your account
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  return null;
}

export default function SetupPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
          <p className="text-neutral-400">Loading...</p>
        </div>
      }
    >
      <SetupPageContent />
    </Suspense>
  );
}
