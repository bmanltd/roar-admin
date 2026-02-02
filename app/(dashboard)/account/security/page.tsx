'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { TotpSetupModal } from '@/components/account/totp-setup-modal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Shield,
  Smartphone,
  Mail,
  Check,
  ChevronRight,
  AlertTriangle,
  Loader2,
  KeyRound,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SecurityPage() {
  const { admin, disableTotp } = useAuth();
  const [showTotpSetup, setShowTotpSetup] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  const isTotp = admin?.twoFactorMethod === 'TOTP';

  const handleDisableTotp = async () => {
    if (!confirm('Are you sure you want to disable authenticator app? You will receive email codes instead.')) {
      return;
    }

    setIsDisabling(true);
    try {
      const result = await disableTotp();
      if (result.success) {
        toast.success('Authenticator app disabled', {
          description: 'You will now receive verification codes via email.',
        });
      } else {
        toast.error('Failed to disable authenticator', {
          description: result.error || 'Please try again.',
        });
      }
    } finally {
      setIsDisabling(false);
    }
  };

  const handleTotpSuccess = () => {
    toast.success('Authenticator app enabled', {
      description: 'You will now use your authenticator app for verification.',
    });
  };

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/3 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              'bg-gradient-to-br from-emerald-500/20 to-emerald-500/5',
              'border border-emerald-500/20'
            )}>
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Security</h1>
              <p className="text-sm text-neutral-500">Manage your account security settings</p>
            </div>
          </div>
        </div>

        {/* Two-Factor Authentication Section */}
        <div className={cn(
          'rounded-2xl overflow-hidden',
          'bg-gradient-to-b from-neutral-900/80 to-neutral-900/40',
          'border border-neutral-800/50',
          'shadow-xl shadow-black/20'
        )}>
          {/* Section Header */}
          <div className="px-6 py-5 border-b border-neutral-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <KeyRound className="w-5 h-5 text-neutral-400" />
                <div>
                  <h2 className="text-[15px] font-semibold text-white">Two-Factor Authentication</h2>
                  <p className="text-xs text-neutral-500 mt-0.5">Add an extra layer of security to your account</p>
                </div>
              </div>
              <div className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium',
                admin?.twoFactorEnabled
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              )}>
                {admin?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="p-4 space-y-3">
            {/* Email Option */}
            <div className={cn(
              'group relative flex items-center gap-4 p-4 rounded-xl transition-all duration-200',
              !isTotp
                ? 'bg-emerald-500/5 border border-emerald-500/20 ring-1 ring-emerald-500/10'
                : 'bg-neutral-800/30 border border-neutral-800/50 hover:border-neutral-700/50'
            )}>
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                !isTotp
                  ? 'bg-emerald-500/10'
                  : 'bg-neutral-800/80'
              )}>
                <Mail className={cn(
                  'w-6 h-6',
                  !isTotp ? 'text-emerald-400' : 'text-neutral-500'
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-medium text-white">Email Verification</h3>
                  {!isTotp && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                      <Check className="w-3 h-3" />
                      Active
                    </span>
                  )}
                </div>
                <p className="text-sm text-neutral-500 mt-0.5">
                  Receive a 6-digit code via email when you sign in
                </p>
              </div>
              {!isTotp && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                </div>
              )}
            </div>

            {/* Authenticator App Option */}
            <div className={cn(
              'group relative flex items-center gap-4 p-4 rounded-xl transition-all duration-200',
              isTotp
                ? 'bg-emerald-500/5 border border-emerald-500/20 ring-1 ring-emerald-500/10'
                : 'bg-neutral-800/30 border border-neutral-800/50 hover:border-neutral-700/50'
            )}>
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                isTotp
                  ? 'bg-emerald-500/10'
                  : 'bg-neutral-800/80'
              )}>
                <Smartphone className={cn(
                  'w-6 h-6',
                  isTotp ? 'text-emerald-400' : 'text-neutral-500'
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-medium text-white">Authenticator App</h3>
                  {isTotp && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                      <Check className="w-3 h-3" />
                      Active
                    </span>
                  )}
                </div>
                <p className="text-sm text-neutral-500 mt-0.5">
                  Use Google Authenticator, Authy, or similar apps
                </p>
              </div>
              <div>
                {isTotp ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisableTotp}
                    disabled={isDisabling}
                    className={cn(
                      'bg-transparent border-neutral-700/50',
                      'hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400',
                      'text-neutral-400'
                    )}
                  >
                    {isDisabling ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Disable'
                    )}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setShowTotpSetup(true)}
                    className={cn(
                      'bg-emerald-600 hover:bg-emerald-500 text-white'
                    )}
                  >
                    Enable
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
              {isTotp && (
                <div className="absolute right-4 top-4">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                </div>
              )}
            </div>
          </div>

          {/* Security Note */}
          <div className="px-6 py-4 border-t border-neutral-800/50 bg-neutral-900/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-neutral-500 leading-relaxed">
                <span className="text-amber-400 font-medium">Recommended:</span> Use an authenticator app for better security.
                It provides time-based codes that are more secure than email verification.
              </p>
            </div>
          </div>
        </div>

        {/* Account Info Card */}
        <div className={cn(
          'mt-6 rounded-2xl overflow-hidden',
          'bg-gradient-to-b from-neutral-900/60 to-neutral-900/30',
          'border border-neutral-800/40'
        )}>
          <div className="px-6 py-5">
            <h3 className="text-sm font-medium text-neutral-400 mb-4">Account Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-neutral-500 mb-1">Email</p>
                <p className="text-sm text-white">{admin?.email}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-1">Role</p>
                <p className="text-sm text-white capitalize">{admin?.role?.replace('_', ' ').toLowerCase()}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-1">Last Login</p>
                <p className="text-sm text-white">
                  {admin?.lastLoginAt
                    ? new Date(admin.lastLoginAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Never'
                  }
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-1">Account Created</p>
                <p className="text-sm text-white">
                  {admin?.createdAt
                    ? new Date(admin.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '-'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TOTP Setup Modal */}
      <TotpSetupModal
        open={showTotpSetup}
        onOpenChange={setShowTotpSetup}
        onSuccess={handleTotpSuccess}
      />
    </div>
  );
}
