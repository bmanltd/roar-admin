'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2,
  Smartphone,
  QrCode,
  Copy,
  Check,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

interface TotpSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type Step = 'intro' | 'scan' | 'verify' | 'success';

export function TotpSetupModal({ open, onOpenChange, onSuccess }: TotpSetupModalProps) {
  const { setupTotp, verifyTotpSetup } = useAuth();

  const [step, setStep] = useState<Step>('intro');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [copied, setCopied] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('intro');
        setError('');
        setQrCodeUrl('');
        setSecret('');
        setOtp(['', '', '', '', '', '']);
        setCopied(false);
      }, 200);
    }
  }, [open]);

  const handleStartSetup = async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = await setupTotp();

      if (result.success && result.qrCodeUrl && result.secret) {
        setQrCodeUrl(result.qrCodeUrl);
        setSecret(result.secret);
        setStep('scan');
      } else {
        setError(result.error || 'Failed to generate TOTP secret');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await verifyTotpSetup(code);

      if (result.success) {
        setStep('success');
        onSuccess?.();
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
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

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
      const nextEmpty = newOtp.findIndex(v => !v);
      otpRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
    }
  };

  const handleCopySecret = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatSecret = (s: string) => {
    return s.match(/.{1,4}/g)?.join(' ') || s;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        'sm:max-w-md p-0 gap-0 overflow-hidden',
        'bg-gradient-to-b from-neutral-900 to-neutral-950',
        'border-neutral-800/60'
      )}>
        {/* Subtle glow effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative p-6">
          {/* Step: Intro */}
          {step === 'intro' && (
            <div className="space-y-6">
              <DialogHeader className="space-y-4">
                <div className={cn(
                  'w-14 h-14 rounded-2xl flex items-center justify-center mx-auto',
                  'bg-gradient-to-br from-emerald-500/20 to-emerald-500/5',
                  'border border-emerald-500/20',
                  'shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)]'
                )}>
                  <Smartphone className="w-7 h-7 text-emerald-400" />
                </div>
                <DialogTitle className="text-xl font-bold text-white text-center">
                  Set up Authenticator App
                </DialogTitle>
              </DialogHeader>

              <p className="text-neutral-400 text-center text-sm leading-relaxed">
                Add an extra layer of security to your account by using a time-based one-time password (TOTP) from an authenticator app.
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-800/30 border border-neutral-800/50">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-400 text-sm font-semibold">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-200">Download an authenticator app</p>
                    <p className="text-xs text-neutral-500 mt-0.5">Google Authenticator, Authy, or 1Password</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-800/30 border border-neutral-800/50">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-400 text-sm font-semibold">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-200">Scan the QR code</p>
                    <p className="text-xs text-neutral-500 mt-0.5">Or enter the secret key manually</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-800/30 border border-neutral-800/50">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-400 text-sm font-semibold">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-200">Enter verification code</p>
                    <p className="text-xs text-neutral-500 mt-0.5">Confirm the 6-digit code from your app</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleStartSetup}
                disabled={isLoading}
                className={cn(
                  'w-full h-12 text-[15px] font-medium',
                  'bg-emerald-600 hover:bg-emerald-500 text-white',
                  'transition-all duration-200'
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Step: Scan QR Code */}
          {step === 'scan' && (
            <div className="space-y-6">
              <DialogHeader className="space-y-4">
                <div className={cn(
                  'w-14 h-14 rounded-2xl flex items-center justify-center mx-auto',
                  'bg-gradient-to-br from-emerald-500/20 to-emerald-500/5',
                  'border border-emerald-500/20'
                )}>
                  <QrCode className="w-7 h-7 text-emerald-400" />
                </div>
                <DialogTitle className="text-xl font-bold text-white text-center">
                  Scan QR Code
                </DialogTitle>
              </DialogHeader>

              <p className="text-neutral-400 text-center text-sm">
                Open your authenticator app and scan this QR code
              </p>

              {/* QR Code */}
              <div className="flex justify-center">
                <div className={cn(
                  'p-4 rounded-2xl bg-white',
                  'ring-4 ring-neutral-800/50',
                  'shadow-[0_0_40px_-10px_rgba(16,185,129,0.3)]'
                )}>
                  {qrCodeUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrCodeUrl}
                      alt="TOTP QR Code"
                      className="w-48 h-48"
                    />
                  )}
                </div>
              </div>

              {/* Manual Entry */}
              <div className="space-y-2">
                <p className="text-xs text-neutral-500 text-center">
                  Or enter this code manually:
                </p>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'flex-1 px-4 py-3 rounded-xl text-center',
                    'bg-neutral-800/50 border border-neutral-700/50',
                    'font-mono text-sm text-neutral-300 tracking-wider'
                  )}>
                    {formatSecret(secret)}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopySecret}
                    className={cn(
                      'h-11 w-11 flex-shrink-0',
                      'bg-neutral-800/50 border-neutral-700/50',
                      'hover:bg-neutral-700/50 hover:border-neutral-600/50',
                      'text-neutral-400 hover:text-white'
                    )}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep('intro')}
                  className={cn(
                    'flex-1 h-12',
                    'bg-transparent border-neutral-700/50',
                    'hover:bg-neutral-800/50 text-neutral-300'
                  )}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep('verify')}
                  className={cn(
                    'flex-1 h-12 text-[15px] font-medium',
                    'bg-emerald-600 hover:bg-emerald-500 text-white'
                  )}
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step: Verify */}
          {step === 'verify' && (
            <div className="space-y-6">
              <DialogHeader className="space-y-4">
                <div className={cn(
                  'w-14 h-14 rounded-2xl flex items-center justify-center mx-auto',
                  'bg-gradient-to-br from-emerald-500/20 to-emerald-500/5',
                  'border border-emerald-500/20'
                )}>
                  <ShieldCheck className="w-7 h-7 text-emerald-400" />
                </div>
                <DialogTitle className="text-xl font-bold text-white text-center">
                  Verify Setup
                </DialogTitle>
              </DialogHeader>

              <p className="text-neutral-400 text-center text-sm">
                Enter the 6-digit code from your authenticator app to complete setup
              </p>

              {/* OTP Input */}
              <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
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

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-lg">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep('scan')}
                  disabled={isLoading}
                  className={cn(
                    'flex-1 h-12',
                    'bg-transparent border-neutral-700/50',
                    'hover:bg-neutral-800/50 text-neutral-300'
                  )}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleVerify}
                  disabled={isLoading || otp.join('').length !== 6}
                  className={cn(
                    'flex-1 h-12 text-[15px] font-medium',
                    'bg-emerald-600 hover:bg-emerald-500 text-white'
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Enable'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="space-y-6 py-4">
              <div className="flex flex-col items-center space-y-4">
                <div className={cn(
                  'w-20 h-20 rounded-full flex items-center justify-center',
                  'bg-gradient-to-br from-emerald-500/30 to-emerald-500/10',
                  'border border-emerald-500/30',
                  'shadow-[0_0_40px_-5px_rgba(16,185,129,0.4)]',
                  'animate-in zoom-in-50 duration-300'
                )}>
                  <Check className="w-10 h-10 text-emerald-400" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-white">
                    Authenticator Enabled!
                  </h3>
                  <p className="text-neutral-400 text-sm max-w-xs">
                    Your account is now protected with two-factor authentication using your authenticator app.
                  </p>
                </div>
              </div>

              <Button
                onClick={() => onOpenChange(false)}
                className={cn(
                  'w-full h-12 text-[15px] font-medium',
                  'bg-emerald-600 hover:bg-emerald-500 text-white'
                )}
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
