'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ToggleLeft, Plus } from 'lucide-react';

interface FeatureFlag {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  isEnabled: boolean;
  tier: string | null;
  createdAt: string;
}

export default function FeaturesPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newFlag, setNewFlag] = useState({ name: '', displayName: '', description: '', tier: 'all' });

  const loadFlags = async () => {
    try {
      const res = await fetch('/api/features');
      const data = await res.json();
      if (data.success) setFlags(data.data);
    } catch {} finally { setIsLoading(false); }
  };

  useEffect(() => { loadFlags(); }, []);

  const toggleFlag = async (id: string, isEnabled: boolean) => {
    try {
      const res = await fetch(`/api/features/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled }),
      });
      const data = await res.json();
      if (data.success) {
        setFlags(prev => prev.map(f => f.id === id ? { ...f, isEnabled } : f));
        toast.success(`Feature ${isEnabled ? 'enabled' : 'disabled'}`);
      }
    } catch { toast.error('Failed to toggle feature'); }
  };

  const createFlag = async () => {
    try {
      const res = await fetch('/api/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newFlag, tier: newFlag.tier === 'all' ? null : newFlag.tier }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Feature flag created');
        setShowCreate(false);
        setNewFlag({ name: '', displayName: '', description: '', tier: 'all' });
        loadFlags();
      } else { toast.error(data.error); }
    } catch { toast.error('Creation failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Feature Flags</h1>
          <p className="text-neutral-400 text-sm mt-1">Manage feature availability across the platform</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-2" /> Add Flag</Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 bg-neutral-800" />)}</div>
      ) : flags.length === 0 ? (
        <Card className="bg-neutral-900/80 border-neutral-800/50"><CardContent className="py-12 text-center text-neutral-500">No feature flags configured</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {flags.map((flag) => (
            <Card key={flag.id} className="bg-neutral-900/80 border-neutral-800/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">{flag.displayName}</p>
                    <code className="text-xs text-neutral-500 bg-neutral-800 px-1.5 py-0.5 rounded">{flag.name}</code>
                    {flag.tier && <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-500/30">{flag.tier}</Badge>}
                  </div>
                  {flag.description && <p className="text-xs text-neutral-400">{flag.description}</p>}
                </div>
                <Switch checked={flag.isEnabled} onCheckedChange={(checked) => toggleFlag(flag.id, checked)} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-white">
          <DialogHeader><DialogTitle>Create Feature Flag</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-neutral-300">Flag Name (key)</Label>
              <Input value={newFlag.name} onChange={e => setNewFlag(p => ({ ...p, name: e.target.value }))} placeholder="e.g. dark_mode_v2" className="bg-neutral-800 border-neutral-700 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-neutral-300">Display Name</Label>
              <Input value={newFlag.displayName} onChange={e => setNewFlag(p => ({ ...p, displayName: e.target.value }))} placeholder="Dark Mode V2" className="bg-neutral-800 border-neutral-700 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-neutral-300">Description</Label>
              <Textarea value={newFlag.description} onChange={e => setNewFlag(p => ({ ...p, description: e.target.value }))} className="bg-neutral-800 border-neutral-700 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-neutral-300">Tier Restriction</Label>
              <Select value={newFlag.tier} onValueChange={v => setNewFlag(p => ({ ...p, tier: v }))}>
                <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700">
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="starter">Starter Only</SelectItem>
                  <SelectItem value="standard">Standard Only</SelectItem>
                  <SelectItem value="pro">Pro Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreate(false)} className="border-neutral-700 text-neutral-300">Cancel</Button>
              <Button onClick={createFlag} className="bg-emerald-600 hover:bg-emerald-700">Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
