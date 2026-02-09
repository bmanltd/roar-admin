'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Monitor, ChevronLeft, ChevronRight, Laptop, Smartphone, Globe } from 'lucide-react';

interface DeviceData {
  id: string;
  deviceId: string;
  deviceName: string | null;
  platform: string | null;
  tier: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  registeredAt: string;
  lastSeenAt: string;
  user: { email: string; fullName: string; companyName: string | null };
  productKey: { key: string } | null;
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchDevices = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (platformFilter !== 'all') params.set('platform', platformFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/devices?${params}`);
      const data = await res.json();
      if (data.success) {
        setDevices(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      }
    } catch { toast.error('Failed to load devices'); }
    finally { setIsLoading(false); }
  }, [page, platformFilter, statusFilter]);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  const getPlatformIcon = (platform: string | null) => {
    switch (platform?.toLowerCase()) {
      case 'windows': return <Laptop className="h-4 w-4" />;
      case 'mac': case 'macos': return <Laptop className="h-4 w-4" />;
      case 'linux': return <Monitor className="h-4 w-4" />;
      default: return <Globe className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Devices</h1>
        <p className="text-neutral-400 text-sm mt-1">{total} registered devices</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={platformFilter} onValueChange={(v) => { setPlatformFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[140px] bg-neutral-900/80 border-neutral-800/50 text-white"><SelectValue placeholder="Platform" /></SelectTrigger>
          <SelectContent className="bg-neutral-900/80 border-neutral-800/50">
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="windows">Windows</SelectItem>
            <SelectItem value="mac">macOS</SelectItem>
            <SelectItem value="linux">Linux</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[140px] bg-neutral-900/80 border-neutral-800/50 text-white"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent className="bg-neutral-900/80 border-neutral-800/50">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-neutral-900/80 border-neutral-800/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="text-left p-4 text-sm font-medium text-neutral-400">Device</th>
                  <th className="text-left p-4 text-sm font-medium text-neutral-400 hidden md:table-cell">User</th>
                  <th className="text-left p-4 text-sm font-medium text-neutral-400 hidden md:table-cell">Platform</th>
                  <th className="text-left p-4 text-sm font-medium text-neutral-400 hidden md:table-cell">Tier</th>
                  <th className="text-left p-4 text-sm font-medium text-neutral-400">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-neutral-400">Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => <tr key={i} className="border-b border-neutral-800/50"><td colSpan={6} className="p-4"><Skeleton className="h-8 bg-neutral-800" /></td></tr>)
                ) : devices.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-neutral-500">No devices found</td></tr>
                ) : (
                  devices.map((d) => (
                    <tr key={d.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-neutral-400">{getPlatformIcon(d.platform)}</span>
                          <div>
                            <p className="text-sm font-medium text-white">{d.deviceName || 'Unknown Device'}</p>
                            <p className="text-xs text-neutral-500 font-mono">{d.deviceId.slice(0, 16)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        <p className="text-sm text-white">{d.user.fullName}</p>
                        <p className="text-xs text-neutral-500">{d.user.email}</p>
                      </td>
                      <td className="p-4 text-sm text-neutral-300 capitalize hidden md:table-cell">{d.platform || 'Unknown'}</td>
                      <td className="p-4 hidden md:table-cell"><Badge variant="outline" className="text-xs border-emerald-500/50 text-emerald-400">{d.tier}</Badge></td>
                      <td className="p-4">
                        <Badge variant="outline" className={`text-xs ${d.isActive ? 'text-green-400 border-green-500/30' : 'text-red-400 border-red-500/30'}`}>
                          {d.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-neutral-400">{new Date(d.lastSeenAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-neutral-800">
              <p className="text-sm text-neutral-400">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="border-neutral-700 text-neutral-300"><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="border-neutral-700 text-neutral-300"><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
