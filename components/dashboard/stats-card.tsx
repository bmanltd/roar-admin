'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatsCard({ title, value, description, icon: Icon, trend, className }: StatsCardProps) {
  return (
    <Card className={cn('bg-neutral-900/80 backdrop-blur-xl border-neutral-800/50 hover:border-emerald-500/30 transition-colors group', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-neutral-400">{title}</p>
            <p className="text-2xl font-bold text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
            {description && <p className="text-xs text-neutral-500">{description}</p>}
            {trend && (
              <p className={cn('text-xs font-medium', trend.isPositive ? 'text-emerald-400' : 'text-red-400')}>
                {trend.isPositive ? '+' : ''}{trend.value}% from last month
              </p>
            )}
          </div>
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-emerald-500/10 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Icon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
