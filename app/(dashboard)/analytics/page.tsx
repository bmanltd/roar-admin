'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users, CreditCard, DollarSign, Monitor, TrendingUp, AlertTriangle, MessageSquare, Key,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';

interface OverviewData {
  totalUsers: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  activeDevices: number;
  pendingTickets: number;
  totalProductKeys: number;
  newUsersThisMonth: number;
  expiringSubscriptions: number;
}

interface TrendsData {
  monthlyRevenue: { month: string; revenue: number }[];
  userGrowth: { month: string; users: number }[];
  subscriptionsByTier: { name: string; value: number }[];
}

const EMERALD_COLORS = ['#10B981', '#059669', '#047857', '#065F46', '#064E3B'];

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [trends, setTrends] = useState<TrendsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewRes, trendsRes] = await Promise.all([
          fetch('/api/analytics/overview'),
          fetch('/api/analytics/trends'),
        ]);

        const overviewData = await overviewRes.json();
        const trendsData = await trendsRes.json();

        if (overviewData.success) setOverview(overviewData.data);
        if (trendsData.success) setTrends(trendsData.data);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M RWF`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K RWF`;
    return `${value.toLocaleString()} RWF`;
  };

  const formatNumber = (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-neutral-400 text-sm mt-1">Platform-wide analytics and insights</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-neutral-900/80 border-neutral-800/50">
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-24 bg-neutral-800 mb-2" />
                <Skeleton className="h-8 w-20 bg-neutral-800" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-neutral-900/80 border-neutral-800/50">
            <CardContent className="pt-6">
              <Skeleton className="h-[300px] bg-neutral-800" />
            </CardContent>
          </Card>
          <Card className="bg-neutral-900/80 border-neutral-800/50">
            <CardContent className="pt-6">
              <Skeleton className="h-[300px] bg-neutral-800" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-neutral-400 text-sm mt-1">Platform-wide analytics and insights</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Users"
          value={formatNumber(overview?.totalUsers || 0)}
          icon={Users}
          trend={overview?.newUsersThisMonth ? `+${overview.newUsersThisMonth} this month` : undefined}
          trendUp
        />
        <StatsCard
          title="Active Subscriptions"
          value={formatNumber(overview?.activeSubscriptions || 0)}
          icon={CreditCard}
          trend={overview?.expiringSubscriptions ? `${overview.expiringSubscriptions} expiring soon` : undefined}
          trendUp={false}
        />
        <StatsCard
          title="Monthly Revenue"
          value={formatCurrency(overview?.monthlyRevenue || 0)}
          icon={DollarSign}
          trend="This month"
          trendUp
        />
        <StatsCard
          title="Active Devices"
          value={formatNumber(overview?.activeDevices || 0)}
          icon={Monitor}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Trend */}
        <Card className="bg-neutral-900/80 border-neutral-800/50">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trends?.monthlyRevenue || []}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#F3F4F6' }}
                  formatter={(value) => [formatCurrency(Number(value) || 0), 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Subscriptions by Tier */}
        <Card className="bg-neutral-900/80 border-neutral-800/50">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-400" />
              Subscriptions by Tier
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trends?.subscriptionsByTier && trends.subscriptionsByTier.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={trends.subscriptionsByTier}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    labelLine={{ stroke: '#6B7280' }}
                  >
                    {trends.subscriptionsByTier.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={EMERALD_COLORS[index % EMERALD_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                    formatter={(value, name) => [value, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-neutral-500">
                No subscription data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* User Growth */}
        <Card className="bg-neutral-900/80 border-neutral-800/50">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-400" />
              User Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends?.userGrowth || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#F3F4F6' }}
                  formatter={(value) => [value, 'New Users']}
                />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#059669' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="bg-neutral-900/80 border-neutral-800/50">
          <CardHeader>
            <CardTitle className="text-white text-base">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <QuickStatItem
              icon={TrendingUp}
              label="New Users This Month"
              value={overview?.newUsersThisMonth || 0}
              color="text-emerald-400"
            />
            <QuickStatItem
              icon={AlertTriangle}
              label="Expiring Soon (7 days)"
              value={overview?.expiringSubscriptions || 0}
              color="text-yellow-400"
            />
            <QuickStatItem
              icon={MessageSquare}
              label="Pending Support Tickets"
              value={overview?.pendingTickets || 0}
              color="text-orange-400"
            />
            <QuickStatItem
              icon={Key}
              label="Total Product Keys"
              value={overview?.totalProductKeys || 0}
              color="text-purple-400"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  trendUp,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <Card className="bg-neutral-900/80 border-neutral-800/50">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-400">{title}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
            {trend && (
              <p className={`text-xs mt-1 ${trendUp ? 'text-emerald-400' : 'text-yellow-400'}`}>
                {trend}
              </p>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-emerald-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickStatItem({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-800/50">
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${color}`} />
        <span className="text-sm text-neutral-300">{label}</span>
      </div>
      <span className="text-lg font-semibold text-white">{value}</span>
    </div>
  );
}
