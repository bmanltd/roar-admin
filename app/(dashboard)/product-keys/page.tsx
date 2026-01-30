'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Key, Plus, ChevronLeft, ChevronRight, Copy } from 'lucide-react';

interface KeyData {
  id: string;
  key: string;
  isUsed: boolean;
  usedAt: string | null;
  maxDevices: number;
  devicesRegistered: number;
  validityDays: number;
  expiresAt: string | null;
  createdAt: string;
  tier: { name: string; displayName: string };
  user: { email: string; fullName: string } | null;
}

interface TierOption {
  id: string;
  name: string;
  displayName: string;
}

export default function ProductKeysPage() {
  const [keys, setKeys] = useState<KeyData[]>([]);
  const [tiers, setTiers] = useState<TierOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showGenerate, setShowGenerate] = useState(false);
  const [genTier, setGenTier] = useState('');
  const [genCount, setGenCount] = useState('1');
  const [genValidity, setGenValidity] = useState('30');
  const [genMaxDevices, setGenMaxDevices] = useState('1');
  const [generating, setGenerating] = useState(false);

  const fetchKeys = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (tierFilter !== 'all') params.set('tier', tierFilter);
      const res = await fetch(`/api/product-keys?${params}`);
      const data = await res.json();
      if (data.success) {
        setKeys(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      }
    } catch { toast.error('Failed to load keys'); }
    finally { setIsLoading(false); }
  }, [page, statusFilter, tierFilter]);

  useEffect(() => {
    fetchKeys();
    fetch('/api/subscriptions/tiers').then(r => r.json()).then(d => { if (d.success) setTiers(d.data); });
  }, [fetchKeys]);

  const generateKeys = async () => {
    if (!genTier) { toast.error('Select a tier'); return; }
    setGenerating(true);
    try {
      const res = await fetch('/api/product-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId: genTier, count: parseInt(genCount), validityDays: parseInt(genValidity), maxDevices: parseInt(genMaxDevices) }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${data.data.length} key(s) generated`);
        setShowGenerate(false);
        fetchKeys();
      } else { toast.error(data.error); }
    } catch { toast.error('Generation failed'); }
    finally { setGenerating(false); }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('Key copied to clipboard');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Product Keys</h1>
          <p className="text-neutral-400 text-sm mt-1">{total} total keys</p>
        </div>
        <Button onClick={() => setShowGenerate(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" /> Generate Keys
        </Button>
      </div>

      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px] bg-neutral-900/80 border-neutral-800/50 text-white"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent className="bg-neutral-900/80 border-neutral-800/50">
            <SelectItem value="all">All Keys</SelectItem>
            <SelectItem value="unused">Unused</SelectItem>
            <SelectItem value="used">Used</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tierFilter} onValueChange={(v) => { setTierFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px] bg-neutral-900/80 border-neutral-800/50 text-white"><SelectValue placeholder="Tier" /></SelectTrigger>
          <SelectContent className="bg-neutral-900/80 border-neutral-800/50">
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-neutral-900/80 border-neutral-800/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="text-left p-4 text-sm font-medium text-neutral-400">Key</th>
                  <th className="text-left p-4 text-sm font-medium text-neutral-400">Tier</th>
                  <th className="text-left p-4 text-sm font-medium text-neutral-400">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-neutral-400">User</th>
                  <th className="text-left p-4 text-sm font-medium text-neutral-400">Devices</th>
                  <th className="text-left p-4 text-sm font-medium text-neutral-400">Created</th>
                  <th className="text-right p-4 text-sm font-medium text-neutral-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => <tr key={i} className="border-b border-neutral-800/50"><td colSpan={7} className="p-4"><Skeleton className="h-8 bg-neutral-800" /></td></tr>)
                ) : keys.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-neutral-500">No product keys found</td></tr>
                ) : (
                  keys.map((k) => (
                    <tr key={k.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30">
                      <td className="p-4"><code className="text-sm text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded font-mono">{k.key}</code></td>
                      <td className="p-4"><Badge variant="outline" className="text-xs border-emerald-500/50 text-emerald-400">{k.tier.displayName}</Badge></td>
                      <td className="p-4">
                        <Badge variant="outline" className={`text-xs ${k.isUsed ? 'text-green-400 border-green-500/30' : 'text-neutral-400 border-slate-500/30'}`}>
                          {k.isUsed ? 'Used' : 'Unused'}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-neutral-300">{k.user?.fullName || '-'}</td>
                      <td className="p-4 text-sm text-neutral-300">{k.devicesRegistered}/{k.maxDevices}</td>
                      <td className="p-4 text-sm text-neutral-400">{new Date(k.createdAt).toLocaleDateString()}</td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-white" onClick={() => copyKey(k.key)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </td>
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

      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent className="bg-neutral-900/80 border-neutral-800/50 text-white">
          <DialogHeader>
            <DialogTitle>Generate Product Keys</DialogTitle>
            <DialogDescription className="text-neutral-400">Create new product keys for distribution</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-neutral-300">Tier</Label>
              <Select value={genTier} onValueChange={setGenTier}>
                <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white"><SelectValue placeholder="Select tier" /></SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700">
                  {tiers.map(t => <SelectItem key={t.id} value={t.id}>{t.displayName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-neutral-300">Count</Label>
                <Input type="number" value={genCount} onChange={e => setGenCount(e.target.value)} min="1" max="100" className="bg-neutral-800 border-neutral-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-neutral-300">Validity (days)</Label>
                <Input type="number" value={genValidity} onChange={e => setGenValidity(e.target.value)} className="bg-neutral-800 border-neutral-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-neutral-300">Max Devices</Label>
                <Input type="number" value={genMaxDevices} onChange={e => setGenMaxDevices(e.target.value)} className="bg-neutral-800 border-neutral-700 text-white" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowGenerate(false)} className="border-neutral-700 text-neutral-300">Cancel</Button>
              <Button onClick={generateKeys} disabled={generating} className="bg-emerald-600 hover:bg-emerald-700">
                {generating ? 'Generating...' : `Generate ${genCount} Key(s)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
