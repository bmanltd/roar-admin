'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, ChevronLeft, ChevronRight, Search } from 'lucide-react';

interface LogEntry { id: string; action: string; resource: string; resourceId: string | null; details: any; ipAddress: string | null; createdAt: string; admin: { fullName: string; email: string } | null; }

export default function ActivityPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '30' });
      if (search) params.set('action', search);
      const res = await fetch(`/api/activity?${params}`);
      const data = await res.json();
      if (data.success) { setLogs(data.data); setTotalPages(data.pagination.totalPages); }
    } catch {} finally { setIsLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-white">Activity Log</h1><p className="text-neutral-400 text-sm mt-1">Admin audit trail</p></div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
        <Input placeholder="Filter by action..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9 bg-neutral-900/80 border-neutral-800/50 text-white" />
      </div>
      <Card className="bg-neutral-900/80 border-neutral-800/50">
        <CardContent className="p-0 divide-y divide-neutral-800">
          {isLoading ? [...Array(10)].map((_, i) => <div key={i} className="p-4"><Skeleton className="h-10 bg-neutral-800" /></div>) : logs.length === 0 ? (
            <p className="text-neutral-500 text-center py-12">No activity logs</p>
          ) : logs.map(log => (
            <div key={log.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-neutral-800 flex items-center justify-center shrink-0">
                  <span className="text-xs text-neutral-400">{log.admin?.fullName?.charAt(0) || '?'}</span>
                </div>
                <div>
                  <p className="text-sm text-white"><span className="font-medium">{log.admin?.fullName || 'System'}</span> <span className="text-neutral-400">{log.action}</span></p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[10px] text-neutral-500 border-neutral-700">{log.resource}</Badge>
                    {log.resourceId && <span className="text-[10px] text-neutral-600 font-mono">{log.resourceId.slice(0, 8)}</span>}
                    {log.ipAddress && <span className="text-[10px] text-neutral-600">{log.ipAddress}</span>}
                  </div>
                </div>
              </div>
              <span className="text-xs text-neutral-500 shrink-0">{new Date(log.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-400">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="border-neutral-700 text-neutral-300"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="border-neutral-700 text-neutral-300"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
