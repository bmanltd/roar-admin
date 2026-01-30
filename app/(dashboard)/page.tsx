'use client';

import { useEffect, useState } from 'react';
import { StatsCard } from '@/components/dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, CreditCard, Monitor, Key, MessageSquare, TrendingUp, Clock, AlertTriangle } from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  activeDevices: number;
  pendingTickets: number;
  totalProductKeys: number;
  newUsersThisMonth: number;
  expiringSubscriptions: number;
}

interface RecentActivity {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  admin: { fullName: string; email: string } | null;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, activityRes] = await Promise.all([
          fetch('/api/analytics/overview'),
          fetch('/api/activity?limit=10'),
        ]);

        if (statsRes.ok) {
          const data = await statsRes.json();
          if (data.success) setStats(data.data);
        }

        if (activityRes.ok) {
          const data = await activityRes.json();
          if (data.success) setActivities(data.data || []);
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
          <p className="text-neutral-400 text-sm mt-1">BMan Stock ecosystem at a glance</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32 bg-neutral-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
        <p className="text-neutral-400 text-sm mt-1">BMan Stock ecosystem at a glance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Users"
          value={stats?.totalUsers ?? 0}
          icon={Users}
          description={`${stats?.newUsersThisMonth ?? 0} new this month`}
        />
        <StatsCard
          title="Active Subscriptions"
          value={stats?.activeSubscriptions ?? 0}
          icon={CreditCard}
        />
        <StatsCard
          title="Monthly Revenue"
          value={`${(stats?.monthlyRevenue ?? 0).toLocaleString()} RWF`}
          icon={TrendingUp}
        />
        <StatsCard
          title="Active Devices"
          value={stats?.activeDevices ?? 0}
          icon={Monitor}
        />
        <StatsCard
          title="Product Keys"
          value={stats?.totalProductKeys ?? 0}
          icon={Key}
        />
        <StatsCard
          title="Pending Tickets"
          value={stats?.pendingTickets ?? 0}
          icon={MessageSquare}
        />
        <StatsCard
          title="Expiring Soon"
          value={stats?.expiringSubscriptions ?? 0}
          icon={AlertTriangle}
          description="Within 7 days"
        />
        <StatsCard
          title="New This Month"
          value={stats?.newUsersThisMonth ?? 0}
          icon={Clock}
        />
      </div>

      {/* Recent Activity */}
      <Card className="bg-neutral-900/80 border-neutral-800/50">
        <CardHeader>
          <CardTitle className="text-white">Recent Admin Activity</CardTitle>
          <CardDescription className="text-neutral-400">Latest actions by admin team</CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-neutral-500 text-sm text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-2 border-b border-neutral-800 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-neutral-800 flex items-center justify-center">
                      <span className="text-xs text-neutral-400">
                        {activity.admin?.fullName?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-white">
                        <span className="font-medium">{activity.admin?.fullName || 'System'}</span>
                        {' '}
                        <span className="text-neutral-400">{activity.action.replace(/\./g, ' ')}</span>
                      </p>
                      <p className="text-xs text-neutral-500">
                        {activity.resource}{activity.resourceId ? ` #${activity.resourceId.slice(0, 8)}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-neutral-500">
                    {new Date(activity.createdAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
