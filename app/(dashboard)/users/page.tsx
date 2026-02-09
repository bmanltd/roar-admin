'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Search, Users, ChevronLeft, ChevronRight, Eye, Ban, CheckCircle, Mail, Monitor, CreditCard, Plus, Edit2, RefreshCw } from 'lucide-react';

interface SubscriptionTier {
  id: string;
  name: string;
  displayName: string;
}

interface UserData {
  id: string;
  email: string;
  fullName: string;
  companyName: string | null;
  phone: string | null;
  isActive: boolean;
  emailVerified: boolean;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
  subscription: {
    status: string;
    billingCycle: string;
    expiresAt: string;
    tier: { name: string; displayName: string };
  } | null;
  _count: { devices: number; teamUsers: number };
}

interface UserDetail {
  id: string;
  email: string;
  fullName: string;
  companyName: string | null;
  phone: string | null;
  isActive: boolean;
  emailVerified: boolean;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
  subscription: any;
  devices: any[];
  payments: any[];
  productKeys: any[];
  teamUsers: any[];
  activityLogs: any[];
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create User Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [subscriptionTiers, setSubscriptionTiers] = useState<SubscriptionTier[]>([]);
  const [createForm, setCreateForm] = useState({
    email: '',
    fullName: '',
    companyName: '',
    phone: '',
    tierId: '',
    autoGeneratePassword: true,
  });

  // Edit User Dialog state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    companyName: '',
    phone: '',
    emailVerified: false,
  });

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (tierFilter !== 'all') params.set('tier', tierFilter);

      const res = await fetch(`/api/users?${params}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      }
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter, tierFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const viewUser = async (userId: string) => {
    setDetailLoading(true);
    setShowDetail(true);
    try {
      const res = await fetch(`/api/users/${userId}`);
      const data = await res.json();
      if (data.success) setSelectedUser(data.data);
    } catch {
      toast.error('Failed to load user details');
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, activate: boolean) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: activate ? 'activate' : 'suspend' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(activate ? 'User activated' : 'User suspended');
        fetchUsers();
        if (selectedUser?.id === userId) {
          setSelectedUser(prev => prev ? { ...prev, isActive: activate } : null);
        }
      }
    } catch {
      toast.error('Failed to update user');
    }
  };

  // Fetch subscription tiers for create dialog
  const fetchSubscriptionTiers = async () => {
    try {
      const res = await fetch('/api/subscriptions/tiers');
      const data = await res.json();
      if (data.success) {
        setSubscriptionTiers(data.data);
      }
    } catch {
      console.error('Failed to fetch subscription tiers');
    }
  };

  // Open create dialog
  const openCreateDialog = () => {
    fetchSubscriptionTiers();
    setCreateForm({
      email: '',
      fullName: '',
      companyName: '',
      phone: '',
      tierId: '',
      autoGeneratePassword: true,
    });
    setShowCreateDialog(true);
  };

  // Create user
  const handleCreateUser = async () => {
    if (!createForm.email || !createForm.fullName) {
      toast.error('Email and Full Name are required');
      return;
    }
    setCreateLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: createForm.email,
          fullName: createForm.fullName,
          companyName: createForm.companyName || undefined,
          phone: createForm.phone || undefined,
          tierId: createForm.tierId || undefined,
          autoGeneratePassword: createForm.autoGeneratePassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.data.generatedPassword) {
          toast.success(`User created! Password: ${data.data.generatedPassword}`, { duration: 10000 });
        } else {
          toast.success('User created successfully');
        }
        setShowCreateDialog(false);
        fetchUsers();
      } else {
        toast.error(data.error || 'Failed to create user');
      }
    } catch {
      toast.error('Failed to create user');
    } finally {
      setCreateLoading(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (user: UserData) => {
    setEditingUser(user);
    setEditForm({
      fullName: user.fullName,
      companyName: user.companyName || '',
      phone: user.phone || '',
      emailVerified: user.emailVerified,
    });
    setShowEditDialog(true);
  };

  // Update user
  const handleUpdateUser = async () => {
    if (!editingUser) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_profile',
          fullName: editForm.fullName,
          companyName: editForm.companyName || null,
          phone: editForm.phone || null,
          emailVerified: editForm.emailVerified,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('User updated successfully');
        setShowEditDialog(false);
        fetchUsers();
      } else {
        toast.error(data.error || 'Failed to update user');
      }
    } catch {
      toast.error('Failed to update user');
    } finally {
      setEditLoading(false);
    }
  };

  // Send password reset
  const handleSendPasswordReset = async () => {
    if (!editingUser) return;
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_password' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Password reset email sent');
      } else {
        toast.error(data.error || 'Failed to send password reset');
      }
    } catch {
      toast.error('Failed to send password reset');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-neutral-400 text-sm mt-1">{total} total users</p>
        </div>
        <Button onClick={openCreateDialog} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Create User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
          <Input
            placeholder="Search by email, name, or company..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 bg-neutral-900 border-neutral-800 text-white"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[140px] bg-neutral-900 border-neutral-800 text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-neutral-900 border-neutral-800">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tierFilter} onValueChange={(v) => { setTierFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[140px] bg-neutral-900 border-neutral-800 text-white">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent className="bg-neutral-900 border-neutral-800">
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="bg-neutral-900/80 border-neutral-800/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="text-left p-4 text-sm font-medium text-neutral-400">User</th>
                  <th className="text-left p-4 text-sm font-medium text-neutral-400 hidden md:table-cell">Company</th>
                  <th className="text-left p-4 text-sm font-medium text-neutral-400 hidden md:table-cell">Tier</th>
                  <th className="text-left p-4 text-sm font-medium text-neutral-400">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-neutral-400 hidden md:table-cell">Devices</th>
                  <th className="text-left p-4 text-sm font-medium text-neutral-400 hidden md:table-cell">Joined</th>
                  <th className="text-right p-4 text-sm font-medium text-neutral-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-neutral-800/50">
                      <td colSpan={7} className="p-4"><Skeleton className="h-8 bg-neutral-800" /></td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-neutral-500">No users found</td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30">
                      <td className="p-4">
                        <div>
                          <p className="text-sm font-medium text-white">{user.fullName}</p>
                          <p className="text-xs text-neutral-500">{user.email}</p>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-neutral-300 hidden md:table-cell">{user.companyName || '-'}</td>
                      <td className="p-4 hidden md:table-cell">
                        {user.subscription ? (
                          <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 text-xs">
                            {user.subscription.tier.displayName}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-neutral-600 text-neutral-400 text-xs">None</Badge>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge className={user.isActive ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'} variant="outline">
                          {user.isActive ? 'Active' : 'Suspended'}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-neutral-300 hidden md:table-cell">{user._count.devices}</td>
                      <td className="p-4 text-sm text-neutral-400 hidden md:table-cell">
                        {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-white" onClick={() => viewUser(user.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-emerald-400" onClick={() => openEditDialog(user)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className={`h-8 w-8 ${user.isActive ? 'text-neutral-400 hover:text-red-400' : 'text-neutral-400 hover:text-green-400'}`}
                            onClick={() => toggleUserStatus(user.id, !user.isActive)}>
                            {user.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-neutral-800">
              <p className="text-sm text-neutral-400">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="border-neutral-700 text-neutral-300"><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="border-neutral-700 text-neutral-300"><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-3xl bg-neutral-900 border-neutral-800 text-white max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedUser?.fullName || 'User Details'}</DialogTitle>
            <DialogDescription className="text-neutral-400">{selectedUser?.email}</DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 bg-neutral-800" />)}
            </div>
          ) : selectedUser ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-neutral-800 rounded-lg p-3">
                  <p className="text-xs text-neutral-500">Status</p>
                  <p className={`text-sm font-medium ${selectedUser.isActive ? 'text-green-400' : 'text-red-400'}`}>
                    {selectedUser.isActive ? 'Active' : 'Suspended'}
                  </p>
                </div>
                <div className="bg-neutral-800 rounded-lg p-3">
                  <p className="text-xs text-neutral-500">Tier</p>
                  <p className="text-sm font-medium text-white">{selectedUser.subscription?.tier?.displayName || 'None'}</p>
                </div>
                <div className="bg-neutral-800 rounded-lg p-3">
                  <p className="text-xs text-neutral-500">Devices</p>
                  <p className="text-sm font-medium text-white">{selectedUser.devices?.length || 0}</p>
                </div>
                <div className="bg-neutral-800 rounded-lg p-3">
                  <p className="text-xs text-neutral-500">Team Members</p>
                  <p className="text-sm font-medium text-white">{selectedUser.teamUsers?.length || 0}</p>
                </div>
              </div>

              <div className="bg-neutral-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-white mb-3">Account Info</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-neutral-500">Company:</span> <span className="text-neutral-300 ml-2">{selectedUser.companyName || '-'}</span></div>
                  <div><span className="text-neutral-500">Phone:</span> <span className="text-neutral-300 ml-2">{selectedUser.phone || '-'}</span></div>
                  <div><span className="text-neutral-500">Email Verified:</span> <span className={`ml-2 ${selectedUser.emailVerified ? 'text-green-400' : 'text-yellow-400'}`}>{selectedUser.emailVerified ? 'Yes' : 'No'}</span></div>
                  <div><span className="text-neutral-500">Last Login:</span> <span className="text-neutral-300 ml-2">{selectedUser.lastLoginAt ? new Date(selectedUser.lastLoginAt).toLocaleString() : 'Never'}</span></div>
                  <div><span className="text-neutral-500">Joined:</span> <span className="text-neutral-300 ml-2">{new Date(selectedUser.createdAt).toLocaleDateString()}</span></div>
                </div>
              </div>

              {selectedUser.subscription && (
                <div className="bg-neutral-800 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-white mb-3">Subscription</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-neutral-500">Status:</span> <Badge variant="outline" className="ml-2 text-xs">{selectedUser.subscription.status}</Badge></div>
                    <div><span className="text-neutral-500">Cycle:</span> <span className="text-neutral-300 ml-2">{selectedUser.subscription.billingCycle}</span></div>
                    <div><span className="text-neutral-500">Expires:</span> <span className="text-neutral-300 ml-2">{new Date(selectedUser.subscription.expiresAt).toLocaleDateString()}</span></div>
                    <div><span className="text-neutral-500">Auto-Renew:</span> <span className="text-neutral-300 ml-2">{selectedUser.subscription.autoRenew ? 'Yes' : 'No'}</span></div>
                  </div>
                </div>
              )}

              {selectedUser.payments && selectedUser.payments.length > 0 && (
                <div className="bg-neutral-800 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-white mb-3">Recent Payments ({selectedUser.payments.length})</h4>
                  <div className="space-y-2">
                    {selectedUser.payments.slice(0, 5).map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-neutral-300">{p.amount.toLocaleString()} {p.currency}</span>
                          <span className="text-neutral-500 ml-2">({p.planTier})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs ${p.status === 'SUCCESSFUL' ? 'text-green-400 border-green-500/30' : 'text-yellow-400 border-yellow-500/30'}`}>
                            {p.status}
                          </Badge>
                          <span className="text-xs text-neutral-500">{new Date(p.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={() => toggleUserStatus(selectedUser.id, !selectedUser.isActive)} variant={selectedUser.isActive ? 'destructive' : 'default'} size="sm">
                  {selectedUser.isActive ? <><Ban className="h-4 w-4 mr-1" /> Suspend</> : <><CheckCircle className="h-4 w-4 mr-1" /> Activate</>}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md bg-neutral-900 border-neutral-800 text-white">
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription className="text-neutral-400">Add a new user to the system</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-email" className="text-neutral-300">Email <span className="text-red-400">*</span></Label>
              <Input
                id="create-email"
                type="email"
                placeholder="user@example.com"
                value={createForm.email}
                onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                className="bg-neutral-900 border-neutral-800 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-name" className="text-neutral-300">Full Name <span className="text-red-400">*</span></Label>
              <Input
                id="create-name"
                placeholder="John Doe"
                value={createForm.fullName}
                onChange={(e) => setCreateForm(prev => ({ ...prev, fullName: e.target.value }))}
                className="bg-neutral-900 border-neutral-800 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-company" className="text-neutral-300">Company Name</Label>
              <Input
                id="create-company"
                placeholder="Acme Inc."
                value={createForm.companyName}
                onChange={(e) => setCreateForm(prev => ({ ...prev, companyName: e.target.value }))}
                className="bg-neutral-900 border-neutral-800 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-phone" className="text-neutral-300">Phone</Label>
              <Input
                id="create-phone"
                placeholder="+1 234 567 890"
                value={createForm.phone}
                onChange={(e) => setCreateForm(prev => ({ ...prev, phone: e.target.value }))}
                className="bg-neutral-900 border-neutral-800 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-neutral-300">Subscription Tier</Label>
              <Select value={createForm.tierId} onValueChange={(v) => setCreateForm(prev => ({ ...prev, tierId: v }))}>
                <SelectTrigger className="bg-neutral-900 border-neutral-800 text-white">
                  <SelectValue placeholder="Select a tier (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-neutral-800">
                  {subscriptionTiers.map((tier) => (
                    <SelectItem key={tier.id} value={tier.id}>{tier.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-password" className="text-neutral-300">Auto-generate password</Label>
              <Switch
                id="auto-password"
                checked={createForm.autoGeneratePassword}
                onCheckedChange={(checked) => setCreateForm(prev => ({ ...prev, autoGeneratePassword: checked }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">
              Cancel
            </Button>
            <Button onClick={handleCreateUser} disabled={createLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {createLoading ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md bg-neutral-900 border-neutral-800 text-white">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription className="text-neutral-400">{editingUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-neutral-300">Full Name</Label>
              <Input
                id="edit-name"
                value={editForm.fullName}
                onChange={(e) => setEditForm(prev => ({ ...prev, fullName: e.target.value }))}
                className="bg-neutral-900 border-neutral-800 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-company" className="text-neutral-300">Company Name</Label>
              <Input
                id="edit-company"
                value={editForm.companyName}
                onChange={(e) => setEditForm(prev => ({ ...prev, companyName: e.target.value }))}
                className="bg-neutral-900 border-neutral-800 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone" className="text-neutral-300">Phone</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                className="bg-neutral-900 border-neutral-800 text-white"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="email-verified" className="text-neutral-300">Email Verified</Label>
              <Switch
                id="email-verified"
                checked={editForm.emailVerified}
                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, emailVerified: checked }))}
              />
            </div>
          </div>
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleSendPasswordReset}
              className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Send Password Reset
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)} className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">
                Cancel
              </Button>
              <Button onClick={handleUpdateUser} disabled={editLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {editLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
