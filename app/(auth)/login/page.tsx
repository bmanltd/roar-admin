'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Loader2, Mail, Lock, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, verify2FA } = useAuth();

  const [step, setStep] = useState<'credentials' | '2fa'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [adminId, setAdminId] = useState('');
  const [twoFactorMethod, setTwoFactorMethod] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
        } else {
          router.push('/');
        }
      } else {
        setError(result.error || 'Login failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await verify2FA(adminId, code, twoFactorMethod);

      if (result.success) {
        router.push('/');
      } else {
        setError(result.error || 'Verification failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await fetch('/api/auth/send-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId }),
      });
      setError('');
    } catch {
      setError('Failed to resend code');
    }
  };

  return (
    <Card className="w-full max-w-md border-neutral-800 bg-neutral-900/80 backdrop-blur-sm">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-14 h-14 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
          <Shield className="w-7 h-7 text-white" />
        </div>
        <div>
          <CardTitle className="text-xl text-white">
            {step === 'credentials' ? 'BMan Admin' : 'Verification Required'}
          </CardTitle>
          <CardDescription className="text-neutral-400">
            {step === 'credentials'
              ? 'Sign in to the administration dashboard'
              : twoFactorMethod === 'TOTP'
              ? 'Enter the code from your authenticator app'
              : 'Enter the verification code sent to your email'}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {step === 'credentials' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-neutral-300">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@butman.rw"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-neutral-300">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
                  required
                />
              </div>
            </div>
            {error && (
              <p className="text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded-md">{error}</p>
            )}
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Sign In
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerify2FA} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code" className="text-neutral-300">Verification Code</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                <Input
                  id="code"
                  type="text"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="pl-9 bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 text-center text-lg tracking-widest"
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>
            </div>
            {error && (
              <p className="text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded-md">{error}</p>
            )}
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Verify
            </Button>
            {twoFactorMethod === 'EMAIL' && (
              <Button
                type="button"
                variant="ghost"
                className="w-full text-neutral-400 hover:text-white"
                onClick={handleResend}
              >
                Resend Code
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              className="w-full text-neutral-500 hover:text-neutral-300"
              onClick={() => { setStep('credentials'); setError(''); setCode(''); }}
            >
              Back to Login
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
