'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
  Smartphone,
  RefreshCw,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, verify2FA } = useAuth();

  const [step, setStep] = useState<'credentials' | '2fa'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [adminId, setAdminId] = useState('');
  const [twoFactorMethod, setTwoFactorMethod] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        if (result.requiresTwoFactor) {
          setAdminId(result.adminId || '');
          setTwoFactorMethod(result.twoFactorMethod || 'EMAIL');
          setStep('2fa');
          setResendCooldown(60);
        } else {
          router.push('/');
        }
      } else {
        setError(result.error || 'Invalid credentials');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const result = await verify2FA(adminId, code, twoFactorMethod);

      if (result.success) {
        router.push('/');
      } else {
        setError(result.error || 'Invalid verification code');
        setOtp(['', '', '', '', '', '']);
        otpRefs.current[0]?.focus();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);

    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-focus next input
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData) {
      const newOtp = pastedData.split('').concat(Array(6 - pastedData.length).fill(''));
      setOtp(newOtp.slice(0, 6));
      // Focus the next empty input or the last one
      const nextEmpty = newOtp.findIndex(v => !v);
      otpRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    try {
      await fetch('/api/auth/send-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId }),
      });
      setResendCooldown(60);
      setError('');
    } catch {
      setError('Failed to resend code');
    }
  };

  const handleBackToLogin = () => {
    setStep('credentials');
    setError('');
    setOtp(['', '', '', '', '', '']);
    setResendCooldown(0);
  };

  return (
    <div className="w-full">
      {step === 'credentials' ? (
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">Welcome back</h1>
            <p className="text-neutral-400">Sign in to your admin account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-neutral-300 text-sm font-medium">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-neutral-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(
                    'h-12 pl-11 bg-neutral-900 border-neutral-800 text-white placeholder:text-neutral-600',
                    'focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-colors'
                  )}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

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
                  autoComplete="current-password"
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

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className={cn(
                'w-full h-12 text-[15px] font-medium',
                'bg-emerald-600 hover:bg-emerald-500 text-white',
                'transition-all duration-200'
              )}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center',
                'bg-emerald-500/10 border border-emerald-500/20'
              )}>
                {twoFactorMethod === 'TOTP' ? (
                  <Smartphone className="w-6 h-6 text-emerald-400" />
                ) : (
                  <Mail className="w-6 h-6 text-emerald-400" />
                )}
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white">Verification required</h1>
            <p className="text-neutral-400">
              {twoFactorMethod === 'TOTP'
                ? 'Enter the 6-digit code from your authenticator app'
                : 'We sent a verification code to your email'}
            </p>
          </div>

          {/* OTP Form */}
          <form onSubmit={handleVerify2FA} className="space-y-6">
            {/* OTP Input Boxes */}
            <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { otpRefs.current[index] = el; }}
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

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Verify Button */}
            <Button
              type="submit"
              className={cn(
                'w-full h-12 text-[15px] font-medium',
                'bg-emerald-600 hover:bg-emerald-500 text-white',
                'transition-all duration-200'
              )}
              disabled={isLoading || otp.join('').length !== 6}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                'Verify code'
              )}
            </Button>

            {/* Resend & Back */}
            <div className="space-y-3">
              {twoFactorMethod === 'EMAIL' && (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 h-10 text-sm font-medium rounded-lg',
                    'transition-colors duration-200',
                    resendCooldown > 0
                      ? 'text-neutral-600 cursor-not-allowed'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                  )}
                >
                  <RefreshCw className={cn('h-4 w-4', resendCooldown > 0 && 'animate-pulse')} />
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                </button>
              )}

              <button
                type="button"
                onClick={handleBackToLogin}
                className="w-full flex items-center justify-center gap-2 h-10 text-sm font-medium text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
