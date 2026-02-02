'use client';

import Image from 'next/image';
import { Shield, Lock, Activity } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Brand Showcase */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-gradient-to-br from-neutral-950 via-emerald-950 to-emerald-900 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(16,185,129,0.15)_1px,transparent_0)] bg-[length:32px_32px]" />

        {/* Gradient Orbs */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-emerald-500/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-emerald-600/15 rounded-full blur-[120px]" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo & Brand */}
          <div>
            <div className="flex items-center gap-4">
              <Image
                src="/logo.png"
                alt="BMan"
                width={56}
                height={56}
                className="rounded-xl shadow-2xl"
              />
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">BMan</h1>
                <p className="text-emerald-400/80 text-sm font-medium">Admin Console</p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-white leading-tight mb-4">
                Powerful admin tools<br />
                <span className="text-emerald-400">at your fingertips</span>
              </h2>
              <p className="text-neutral-400 text-lg max-w-md">
                Manage users, subscriptions, analytics, and more from one unified dashboard.
              </p>
            </div>

            {/* Feature List */}
            <div className="space-y-4">
              <FeatureItem
                icon={Shield}
                title="Secure Access"
                description="Two-factor authentication & role-based permissions"
              />
              <FeatureItem
                icon={Activity}
                title="Real-time Analytics"
                description="Monitor performance and user activity live"
              />
              <FeatureItem
                icon={Lock}
                title="Full Control"
                description="Comprehensive management for all aspects"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="text-neutral-500 text-sm">
            <p>&copy; {new Date().getFullYear()} BMan. All rights reserved.</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Form Area */}
      <div className="flex-1 flex items-center justify-center bg-neutral-950 p-6 lg:p-12">
        {/* Mobile Logo */}
        <div className="lg:hidden absolute top-8 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="BMan"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <h1 className="text-lg font-bold text-white">BMan</h1>
          </div>
        </div>

        {/* Background subtle grid */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.03)_1px,transparent_0)] bg-[length:24px_24px] lg:left-[45%]" />

        <div className="relative z-10 w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}

function FeatureItem({
  icon: Icon,
  title,
  description
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-emerald-400" />
      </div>
      <div>
        <h3 className="text-white font-medium">{title}</h3>
        <p className="text-neutral-500 text-sm">{description}</p>
      </div>
    </div>
  );
}
