'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { CreditCard, ChevronLeft, ChevronRight, Calendar, Pause, Play, X, ArrowUpDown, Plus, Search, Loader2 } from 'lucide-react';

interface SubData {
  id: string;
  status: string;
  billingCycle: string;
  expiresAt: string;
  startsAt: string;
  pricePaid: number;
  currency: string;
  autoRenew: boolean;
  user: { email: string; fullName: string; companyName: string | null };
  tier: { name: string; displayName: string; priceMonthly: number; priceYearly: number };
}

interface TierData {
  id: string;
  name: string;
  displayName: string;
  priceMonthly: number;
  priceYearly: number;
  maxDevices: number;
  maxProducts: number;
  maxUsers: number;
  cloudSync: boolean;
  backupEnabled: boolean;
  userManagement: boolean;
  prioritySupport: boolean;
  _count: { subscriptions: number; productKeys: number };
}

interface UserSearchResult {
  id: string;
  email: string;
  fullName: string;
  companyName: string | null;
  subscription: { status: string } | null;
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubData[]>([]);
  const [tiers, setTiers] = useState<TierData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showExtend, setShowExtend] = useState(false);
  const [selectedSub, setSelectedSub] = useState<SubData | null>(null);
  const [extendDays, setExtendDays] = useState('30');

  // Create subscription state
  const [showCreate, setShowCreate] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [selectedTier, setSelectedTier] = useState('');
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [validityDays, setValidityDays] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const fetchSubscriptions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/subscriptions?${params}`);
      const data = await res.json();
      if (data.success) {
        setSubscriptions(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      }
    } catch { toast.error('Failed to load subscriptions'); }
    finally { setIsLoading(false); }
  }, [page, statusFilter]);

  const fetchTiers = async () => {
    try {
      const res = await fetch('/api/subscriptions/tiers');
      const data = await res.json();
      if (data.success) setTiers(data.data);
    } catch { console.error('Failed to load tiers'); }
  };

  useEffect(() => { fetchSubscriptions(); fetchTiers(); }, [fetchSubscriptions]);

  const handleAction = async (subId: string, action: string, extra?: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/subscriptions/${subId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Subscription ${action}d`);
        fetchSubscriptions();
        setShowExtend(false);
      } else { toast.error(data.error); }
    } catch { toast.error('Action failed'); }
  };

  // Search users for subscription creation
  const searchUsers = async (query: string) => {
    if (!query || query.length < 2) {
      setUserResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(query)}&limit=10`);
      const data = await res.json();
      if (data.success) {
        // Show all matching users - API will validate subscription status
        setUserResults(data.data);
      }
    } catch {
      console.error('Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (userSearch) searchUsers(userSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch]);

  const handleCreateSubscription = async () => {
    if (!selectedUser || !selectedTier) {
      toast.error('Please select a user and tier');
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          tierId: selectedTier,
          billingCycle,
          validityDays: validityDays ? parseInt(validityDays) : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Subscription created successfully');
        setShowCreate(false);
        resetCreateForm();
        fetchSubscriptions();
      } else {
        toast.error(data.error || 'Failed to create subscription');
      }
    } catch {
      toast.error('Failed to create subscription');
    } finally {
      setIsCreating(false);
    }
  };

  const resetCreateForm = () => {
    setUserSearch('');
    setUserResults([]);
    setSelectedUser(null);
    setSelectedTier('');
    setBillingCycle('MONTHLY');
    setValidityDays('');
  };

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-500/10 text-green-400 border-green-500/30',
    PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    EXPIRED: 'bg-red-500/10 text-red-400 border-red-500/30',
    SUSPENDED: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    CANCELLED: 'bg-slate-500/10 text-neutral-400 border-slate-500/30',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Subscriptions & Tiers</h1>
        <p className="text-neutral-400 text-sm mt-1">{total} total subscriptions</p>
      </div>

      <Tabs defaultValue="subscriptions">
        <TabsList className="bg-neutral-800 border-neutral-700">
          <TabsTrigger value="subscriptions" className="data-[state=active]:bg-emerald-600">Subscriptions</TabsTrigger>
          <TabsTrigger value="tiers" className="data-[state=active]:bg-emerald-600">Tier Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[160px] bg-neutral-900/80 border-neutral-800/50 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900/80 border-neutral-800/50">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setShowCreate(true)} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Create Subscription
            </Button>
          </div>

          <Card className="bg-neutral-900/80 border-neutral-800/50">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-800">
                      <th className="text-left p-4 text-sm font-medium text-neutral-400">User</th>
                      <th className="text-left p-4 text-sm font-medium text-neutral-400">Tier</th>
                      <th className="text-left p-4 text-sm font-medium text-neutral-400">Status</th>
                      <th className="hidden md:table-cell text-left p-4 text-sm font-medium text-neutral-400">Cycle</th>
                      <th className="hidden md:table-cell text-left p-4 text-sm font-medium text-neutral-400">Expires</th>
                      <th className="text-right p-4 text-sm font-medium text-neutral-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      [...Array(5)].map((_, i) => (
                        <tr key={i} className="border-b border-neutral-800/50"><td colSpan={6} className="p-4"><Skeleton className="h-8 bg-neutral-800" /></td></tr>
                      ))
                    ) : subscriptions.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-neutral-500">No subscriptions found</td></tr>
                    ) : (
                      subscriptions.map((sub) => (
                        <tr key={sub.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30">
                          <td className="p-4">
                            <p className="text-sm font-medium text-white">{sub.user.fullName}</p>
                            <p className="text-xs text-neutral-500">{sub.user.email}</p>
                          </td>
                          <td className="p-4"><Badge variant="outline" className="border-emerald-500/50 text-emerald-400 text-xs">{sub.tier.displayName}</Badge></td>
                          <td className="p-4"><Badge variant="outline" className={`text-xs ${statusColors[sub.status] || ''}`}>{sub.status}</Badge></td>
                          <td className="hidden md:table-cell p-4 text-sm text-neutral-300">{sub.billingCycle}</td>
                          <td className="hidden md:table-cell p-4 text-sm text-neutral-400">{new Date(sub.expiresAt).toLocaleDateString()}</td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-emerald-400"
                                onClick={() => { setSelectedSub(sub); setShowExtend(true); }}>
                                <Calendar className="h-4 w-4" />
                              </Button>
                              {sub.status === 'ACTIVE' && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-orange-400"
                                  onClick={() => handleAction(sub.id, 'suspend')}>
                                  <Pause className="h-4 w-4" />
                                </Button>
                              )}
                              {sub.status === 'SUSPENDED' && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-green-400"
                                  onClick={() => handleAction(sub.id, 'activate')}>
                                  <Play className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
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
        </TabsContent>

        <TabsContent value="tiers" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tiers.map((tier) => (
              <Card key={tier.id} className="bg-neutral-900/80 border-neutral-800/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    {tier.displayName}
                    <Badge variant="outline" className="text-xs text-neutral-400">{tier._count.subscriptions} active</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-neutral-500">Monthly:</span> <span className="text-white ml-1">{tier.priceMonthly.toLocaleString()} RWF</span></div>
                    <div><span className="text-neutral-500">Yearly:</span> <span className="text-white ml-1">{tier.priceYearly.toLocaleString()} RWF</span></div>
                    <div><span className="text-neutral-500">Devices:</span> <span className="text-white ml-1">{tier.maxDevices}</span></div>
                    <div><span className="text-neutral-500">Users:</span> <span className="text-white ml-1">{tier.maxUsers === -1 ? 'Unlimited' : tier.maxUsers}</span></div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {tier.cloudSync && <Badge className="bg-emerald-500/10 text-emerald-400 text-xs">Cloud Sync</Badge>}
                    {tier.backupEnabled && <Badge className="bg-green-500/10 text-green-400 text-xs">Backup</Badge>}
                    {tier.userManagement && <Badge className="bg-purple-500/10 text-purple-400 text-xs">Team Mgmt</Badge>}
                    {tier.prioritySupport && <Badge className="bg-yellow-500/10 text-yellow-400 text-xs">Priority Support</Badge>}
                  </div>
                  <p className="text-xs text-neutral-500">{tier._count.productKeys} product keys generated</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Extend Dialog */}
      <Dialog open={showExtend} onOpenChange={setShowExtend}>
        <DialogContent className="bg-neutral-900/80 border-neutral-800/50 text-white">
          <DialogHeader>
            <DialogTitle>Extend Subscription</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Extend for {selectedSub?.user.fullName} ({selectedSub?.tier.displayName})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-neutral-300">Extend by (days)</Label>
              <Input type="number" value={extendDays} onChange={(e) => setExtendDays(e.target.value)} className="bg-neutral-800 border-neutral-700 text-white" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowExtend(false)} className="border-neutral-700 text-neutral-300">Cancel</Button>
              <Button onClick={() => {
                if (selectedSub) {
                  const newExpiry = new Date(selectedSub.expiresAt);
                  newExpiry.setDate(newExpiry.getDate() + parseInt(extendDays));
                  handleAction(selectedSub.id, 'extend', { expiresAt: newExpiry.toISOString() });
                }
              }} className="bg-emerald-600 hover:bg-emerald-700">Extend</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Subscription Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { setShowCreate(open); if (!open) resetCreateForm(); }}>
        <DialogContent className="bg-neutral-900/95 border-neutral-800/50 text-white max-w-md overflow-visible">
          <DialogHeader>
            <DialogTitle>Create Subscription</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Create a new subscription for a user
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* User Search */}
            <div className="space-y-2">
              <Label className="text-neutral-300">Search User</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <Input
                  placeholder="Search by email or name..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-10 bg-neutral-800 border-neutral-700 text-white"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 animate-spin" />
                )}

                {/* Search Results Dropdown - inside relative container */}
                {userResults.length > 0 && !selectedUser && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {userResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          setSelectedUser(user);
                          setUserSearch('');
                          setUserResults([]);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-neutral-700 transition-colors"
                      >
                        <p className="text-sm font-medium text-white">{user.fullName}</p>
                        <p className="text-xs text-neutral-400">
                          {user.email}
                          {user.subscription ? (
                            <span className={`ml-2 ${user.subscription.status === 'ACTIVE' ? 'text-green-400' : 'text-yellow-400'}`}>
                              ({user.subscription.status})
                            </span>
                          ) : (
                            <span className="ml-2 text-neutral-500">(No subscription)</span>
                          )}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected User */}
              {selectedUser && (
                <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-white">{selectedUser.fullName}</p>
                    <p className="text-xs text-neutral-400">{selectedUser.email}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedUser(null)}
                    className="h-8 w-8 text-neutral-400 hover:text-red-400"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Tier Selection */}
            <div className="space-y-2">
              <Label className="text-neutral-300">Subscription Tier</Label>
              <Select value={selectedTier} onValueChange={setSelectedTier}>
                <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                  <SelectValue placeholder="Select a tier" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700">
                  {tiers.map((tier) => (
                    <SelectItem key={tier.id} value={tier.id}>
                      {tier.displayName} - {billingCycle === 'YEARLY' ? tier.priceYearly.toLocaleString() : tier.priceMonthly.toLocaleString()} RWF/{billingCycle === 'YEARLY' ? 'yr' : 'mo'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Billing Cycle */}
            <div className="space-y-2">
              <Label className="text-neutral-300">Billing Cycle</Label>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={billingCycle === 'MONTHLY' ? 'default' : 'outline'}
                  onClick={() => setBillingCycle('MONTHLY')}
                  className={billingCycle === 'MONTHLY' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-neutral-700 text-neutral-300'}
                >
                  Monthly (30 days)
                </Button>
                <Button
                  type="button"
                  variant={billingCycle === 'YEARLY' ? 'default' : 'outline'}
                  onClick={() => setBillingCycle('YEARLY')}
                  className={billingCycle === 'YEARLY' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-neutral-700 text-neutral-300'}
                >
                  Yearly (365 days)
                </Button>
              </div>
            </div>

            {/* Validity Days Override */}
            <div className="space-y-2">
              <Label className="text-neutral-300">
                Custom Validity (days)
                <span className="text-neutral-500 text-xs ml-2">Optional</span>
              </Label>
              <Input
                type="number"
                placeholder={billingCycle === 'YEARLY' ? '365' : '30'}
                value={validityDays}
                onChange={(e) => setValidityDays(e.target.value)}
                className="bg-neutral-800 border-neutral-700 text-white"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => { setShowCreate(false); resetCreateForm(); }}
                className="border-neutral-700 text-neutral-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateSubscription}
                disabled={!selectedUser || !selectedTier || isCreating}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Subscription'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
