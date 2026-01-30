'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Settings, Shield, Database, Mail } from 'lucide-react';

interface SystemSettings { maintenanceMode: boolean; registrationOpen: boolean; maxFreeTrialDays: number; supportEmail: string; }

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.success) setSettings(data.data);
      } catch {} finally { setIsLoading(false); }
    }
    load();
  }, []);

  const saveSettings = async () => {
    try {
      const res = await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
      const data = await res.json();
      if (data.success) toast.success('Settings saved');
      else toast.error(data.error);
    } catch { toast.error('Failed to save'); }
  };

  if (isLoading) return <div className="space-y-6"><h1 className="text-2xl font-bold text-white">Settings</h1>{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 bg-neutral-800" />)}</div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-white">Settings</h1><p className="text-neutral-400 text-sm mt-1">System configuration</p></div>
      {settings && (
        <>
          <Card className="bg-neutral-900/80 border-neutral-800/50">
            <CardHeader><CardTitle className="text-white flex items-center gap-2"><Shield className="h-5 w-5 text-emerald-400" /> System Controls</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-white">Maintenance Mode</p><p className="text-xs text-neutral-500">Disable all user access to bman-web</p></div>
                <Switch checked={settings.maintenanceMode} onCheckedChange={(v) => setSettings(p => p ? {...p, maintenanceMode: v} : null)} />
              </div>
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-white">Open Registration</p><p className="text-xs text-neutral-500">Allow new user sign-ups</p></div>
                <Switch checked={settings.registrationOpen} onCheckedChange={(v) => setSettings(p => p ? {...p, registrationOpen: v} : null)} />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-neutral-900/80 border-neutral-800/50">
            <CardHeader><CardTitle className="text-white flex items-center gap-2"><Mail className="h-5 w-5 text-green-400" /> Support</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-neutral-300">Support Email</Label>
                <Input value={settings.supportEmail} onChange={e => setSettings(p => p ? {...p, supportEmail: e.target.value} : null)} className="bg-neutral-800 border-neutral-700 text-white max-w-md" />
              </div>
              <div className="space-y-2">
                <Label className="text-neutral-300">Free Trial Days</Label>
                <Input type="number" value={settings.maxFreeTrialDays} onChange={e => setSettings(p => p ? {...p, maxFreeTrialDays: parseInt(e.target.value) || 0} : null)} className="bg-neutral-800 border-neutral-700 text-white max-w-[120px]" />
              </div>
            </CardContent>
          </Card>
          <Button onClick={saveSettings} className="bg-emerald-600 hover:bg-emerald-700">Save Settings</Button>
        </>
      )}
    </div>
  );
}
