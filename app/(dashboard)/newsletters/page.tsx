'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Mail, Plus, Send, Users } from 'lucide-react';

interface CampaignData { id: string; subject: string; status: string; recipientCount: number; sentCount: number; openCount: number; sentAt: string | null; createdAt: string; }

export default function NewslettersPage() {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [subscribers, setSubscribers] = useState<{total: number; active: number}>({total: 0, active: 0});
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ subject: '', content: '' });

  const load = async () => {
    try {
      const [campRes, subRes] = await Promise.all([
        fetch('/api/newsletters'), fetch('/api/newsletters/subscribers'),
      ]);
      const campData = await campRes.json();
      const subData = await subRes.json();
      if (campData.success) setCampaigns(campData.data);
      if (subData.success) setSubscribers(subData.data);
    } catch {} finally { setIsLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    try {
      const res = await fetch('/api/newsletters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) { toast.success('Campaign created'); setShowCreate(false); setForm({ subject: '', content: '' }); load(); } else toast.error(data.error);
    } catch { toast.error('Failed'); }
  };

  const sendCampaign = async (id: string) => {
    try {
      const res = await fetch('/api/newsletters/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId: id }) });
      const data = await res.json();
      if (data.success) { toast.success(`Sending to ${data.data.recipientCount} subscribers`); load(); } else toast.error(data.error);
    } catch { toast.error('Send failed'); }
  };

  const statusColors: Record<string, string> = { draft: 'text-yellow-400 border-yellow-500/30', sending: 'text-emerald-400 border-emerald-500/30', sent: 'text-green-400 border-green-500/30', failed: 'text-red-400 border-red-500/30' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Newsletters</h1><p className="text-neutral-400 text-sm mt-1">Manage campaigns and subscribers</p></div>
        <Button onClick={() => setShowCreate(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-2" /> New Campaign</Button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-neutral-900/80 border-neutral-800/50"><CardContent className="p-4 flex items-center gap-3"><Users className="h-8 w-8 text-emerald-400" /><div><p className="text-2xl font-bold text-white">{subscribers.active}</p><p className="text-xs text-neutral-400">Active Subscribers</p></div></CardContent></Card>
        <Card className="bg-neutral-900/80 border-neutral-800/50"><CardContent className="p-4 flex items-center gap-3"><Send className="h-8 w-8 text-green-400" /><div><p className="text-2xl font-bold text-white">{campaigns.filter(c => c.status === 'sent').length}</p><p className="text-xs text-neutral-400">Campaigns Sent</p></div></CardContent></Card>
      </div>
      {isLoading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 bg-neutral-800" />)}</div> : (
        <div className="space-y-3">
          {campaigns.map(c => (
            <Card key={c.id} className="bg-neutral-900/80 border-neutral-800/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">{c.subject}</p>
                    <Badge variant="outline" className={`text-xs ${statusColors[c.status] || ''}`}>{c.status}</Badge>
                  </div>
                  <p className="text-xs text-neutral-500">
                    {c.sentAt ? `Sent ${new Date(c.sentAt).toLocaleDateString()} to ${c.sentCount} recipients` : `Created ${new Date(c.createdAt).toLocaleDateString()}`}
                    {c.openCount > 0 && ` | ${c.openCount} opens`}
                  </p>
                </div>
                {c.status === 'draft' && (
                  <Button size="sm" onClick={() => sendCampaign(c.id)} className="bg-emerald-600 hover:bg-emerald-700"><Send className="h-3 w-3 mr-1" /> Send</Button>
                )}
              </CardContent>
            </Card>
          ))}
          {campaigns.length === 0 && <p className="text-neutral-500 text-center py-12">No campaigns yet</p>}
        </div>
      )}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-neutral-900/80 border-neutral-800/50 text-white max-w-2xl">
          <DialogHeader><DialogTitle>Create Newsletter Campaign</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label className="text-neutral-300">Subject</Label><Input value={form.subject} onChange={e => setForm(p => ({...p, subject: e.target.value}))} className="bg-neutral-800 border-neutral-700 text-white" /></div>
            <div className="space-y-2"><Label className="text-neutral-300">Content (HTML)</Label><Textarea value={form.content} onChange={e => setForm(p => ({...p, content: e.target.value}))} rows={10} className="bg-neutral-800 border-neutral-700 text-white font-mono text-sm" /></div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreate(false)} className="border-neutral-700 text-neutral-300">Cancel</Button>
              <Button onClick={create} className="bg-emerald-600 hover:bg-emerald-700">Create Draft</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
