'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Shield, Plus, UserPlus, Edit2, UserX, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

interface AdminData { id: string; email: string; fullName: string; role: string; isActive: boolean; twoFactorEnabled?: boolean; lastLoginAt: string | null; createdAt: string; invitedBy?: { fullName: string; email: string } | null; }

export default function AdminUsersPage() {
  const { admin } = useAuth();
  const [admins, setAdmins] = useState<AdminData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', fullName: '', role: 'SUPPORT' });

  // Edit Admin State
  const [showEdit, setShowEdit] = useState(false);
  const [editAdmin, setEditAdmin] = useState<AdminData | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', role: '', isActive: true, twoFactorEnabled: false });
  const [isUpdating, setIsUpdating] = useState(false);

  // View Detail State
  const [showDetail, setShowDetail] = useState(false);
  const [detailAdmin, setDetailAdmin] = useState<AdminData | null>(null);

  // Deactivate State
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [deactivateAdmin, setDeactivateAdmin] = useState<AdminData | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const load = async () => { try { const r = await fetch('/api/admin-users'); const d = await r.json(); if (d.success) setAdmins(d.data); } catch {} finally { setIsLoading(false); } };
  useEffect(() => { load(); }, []);

  const invite = async () => {
    try {
      const res = await fetch('/api/admin-users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(inviteForm) });
      const data = await res.json();
      if (data.success) { toast.success('Invitation sent'); setShowInvite(false); setInviteForm({ email: '', fullName: '', role: 'SUPPORT' }); load(); } else toast.error(data.error);
    } catch { toast.error('Failed'); }
  };

  // Open Edit Dialog
  const openEdit = (a: AdminData) => {
    setEditAdmin(a);
    setEditForm({ fullName: a.fullName, role: a.role, isActive: a.isActive, twoFactorEnabled: a.twoFactorEnabled || false });
    setShowEdit(true);
  };

  // Update Admin
  const updateAdmin = async () => {
    if (!editAdmin) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin-users/${editAdmin.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) });
      const data = await res.json();
      if (data.success) { toast.success('Admin updated successfully'); setShowEdit(false); setEditAdmin(null); load(); } else toast.error(data.error || 'Failed to update');
    } catch { toast.error('Failed to update admin'); }
    finally { setIsUpdating(false); }
  };

  // Open View Detail Dialog
  const openDetail = (a: AdminData) => {
    setDetailAdmin(a);
    setShowDetail(true);
  };

  // Open Deactivate Confirm
  const openDeactivate = (a: AdminData) => {
    setDeactivateAdmin(a);
    setShowDeactivate(true);
  };

  // Deactivate Admin (soft delete)
  const confirmDeactivate = async () => {
    if (!deactivateAdmin) return;
    setIsDeactivating(true);
    try {
      const res = await fetch(`/api/admin-users/${deactivateAdmin.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { toast.success('Admin deactivated successfully'); setShowDeactivate(false); setDeactivateAdmin(null); load(); } else toast.error(data.error || 'Failed to deactivate');
    } catch { toast.error('Failed to deactivate admin'); }
    finally { setIsDeactivating(false); }
  };

  const roleColors: Record<string, string> = { SUPER_ADMIN: 'text-red-400 border-red-500/30', ADMIN: 'text-emerald-400 border-emerald-500/30', SUPPORT: 'text-green-400 border-green-500/30', MARKETING: 'text-purple-400 border-purple-500/30' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Admin Users</h1><p className="text-neutral-400 text-sm mt-1">Manage admin team access</p></div>
        {admin?.role === 'SUPER_ADMIN' && (
          <Button onClick={() => setShowInvite(true)} className="bg-emerald-600 hover:bg-emerald-700"><UserPlus className="h-4 w-4 mr-2" /> Invite Admin</Button>
        )}
      </div>
      <Card className="bg-neutral-900/80 border-neutral-800/50">
        <CardContent className="p-0">
          <table className="w-full">
            <thead><tr className="border-b border-neutral-800">
              <th className="text-left p-4 text-sm font-medium text-neutral-400">Admin</th>
              <th className="text-left p-4 text-sm font-medium text-neutral-400">Role</th>
              <th className="text-left p-4 text-sm font-medium text-neutral-400">Status</th>
              <th className="text-left p-4 text-sm font-medium text-neutral-400">Last Login</th>
              <th className="text-left p-4 text-sm font-medium text-neutral-400">Joined</th>
              <th className="text-right p-4 text-sm font-medium text-neutral-400">Actions</th>
            </tr></thead>
            <tbody>
              {isLoading ? [...Array(3)].map((_, i) => <tr key={i} className="border-b border-neutral-800/50"><td colSpan={6} className="p-4"><Skeleton className="h-8 bg-neutral-800" /></td></tr>) : admins.map(a => (
                <tr key={a.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30">
                  <td className="p-4"><p className="text-sm font-medium text-white">{a.fullName}</p><p className="text-xs text-neutral-500">{a.email}</p></td>
                  <td className="p-4"><Badge variant="outline" className={`text-xs ${roleColors[a.role] || ''}`}>{a.role.replace('_', ' ')}</Badge></td>
                  <td className="p-4"><Badge variant="outline" className={`text-xs ${a.isActive ? 'text-green-400 border-green-500/30' : 'text-red-400 border-red-500/30'}`}>{a.isActive ? 'Active' : 'Inactive'}</Badge></td>
                  <td className="p-4 text-sm text-neutral-400">{a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleDateString() : 'Never'}</td>
                  <td className="p-4 text-sm text-neutral-400">{new Date(a.createdAt).toLocaleDateString()}</td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openDetail(a)} className="text-neutral-400 hover:text-emerald-400 hover:bg-emerald-500/10"><Eye className="h-4 w-4" /></Button>
                      {admin?.role === 'SUPER_ADMIN' && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(a)} className="text-neutral-400 hover:text-emerald-400 hover:bg-emerald-500/10"><Edit2 className="h-4 w-4" /></Button>
                          {a.isActive && a.id !== admin?.id && (
                            <Button variant="ghost" size="sm" onClick={() => openDeactivate(a)} className="text-neutral-400 hover:text-red-400 hover:bg-red-500/10"><UserX className="h-4 w-4" /></Button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="bg-neutral-900/80 border-neutral-800/50 text-white">
          <DialogHeader><DialogTitle>Invite Admin User</DialogTitle><DialogDescription className="text-neutral-400">Send an invitation to join the admin team</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label className="text-neutral-300">Email</Label><Input value={inviteForm.email} onChange={e => setInviteForm(p => ({...p, email: e.target.value}))} className="bg-neutral-800 border-neutral-700 text-white" /></div>
            <div className="space-y-2"><Label className="text-neutral-300">Full Name</Label><Input value={inviteForm.fullName} onChange={e => setInviteForm(p => ({...p, fullName: e.target.value}))} className="bg-neutral-800 border-neutral-700 text-white" /></div>
            <div className="space-y-2"><Label className="text-neutral-300">Role</Label>
              <Select value={inviteForm.role} onValueChange={v => setInviteForm(p => ({...p, role: v}))}>
                <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700"><SelectItem value="ADMIN">Admin</SelectItem><SelectItem value="SUPPORT">Support</SelectItem><SelectItem value="MARKETING">Marketing</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowInvite(false)} className="border-neutral-700 text-neutral-300">Cancel</Button>
              <Button onClick={invite} className="bg-emerald-600 hover:bg-emerald-700">Send Invitation</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Admin Dialog */}
      <Dialog open={showEdit} onOpenChange={(open) => { setShowEdit(open); if (!open) setEditAdmin(null); }}>
        <DialogContent className="bg-neutral-900/95 border-neutral-800/50 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Admin User</DialogTitle>
            <DialogDescription className="text-neutral-400">Update admin information and permissions</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-neutral-300">Full Name</Label>
              <Input
                value={editForm.fullName}
                onChange={e => setEditForm(p => ({ ...p, fullName: e.target.value }))}
                className="bg-neutral-800 border-neutral-700 text-white focus:border-emerald-500/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-neutral-300">Role</Label>
              <Select value={editForm.role} onValueChange={v => setEditForm(p => ({ ...p, role: v }))}>
                <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700">
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="SUPPORT">Support</SelectItem>
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <Label className="text-neutral-300">Is Active</Label>
                <p className="text-xs text-neutral-500">Allow admin to access the system</p>
              </div>
              <Switch
                checked={editForm.isActive}
                onCheckedChange={c => setEditForm(p => ({ ...p, isActive: c }))}
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <Label className="text-neutral-300">2FA Enabled</Label>
                <p className="text-xs text-neutral-500">Two-factor authentication status</p>
              </div>
              <Switch
                checked={editForm.twoFactorEnabled}
                onCheckedChange={c => setEditForm(p => ({ ...p, twoFactorEnabled: c }))}
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => { setShowEdit(false); setEditAdmin(null); }} className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">Cancel</Button>
              <Button onClick={updateAdmin} disabled={isUpdating} className="bg-emerald-600 hover:bg-emerald-700">
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={(open) => { setShowDetail(open); if (!open) setDetailAdmin(null); }}>
        <DialogContent className="bg-neutral-900/95 border-neutral-800/50 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Admin Details</DialogTitle>
            <DialogDescription className="text-neutral-400">View admin user information</DialogDescription>
          </DialogHeader>
          {detailAdmin && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-neutral-500 uppercase tracking-wide">Full Name</p>
                  <p className="text-sm text-white font-medium">{detailAdmin.fullName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-neutral-500 uppercase tracking-wide">Email</p>
                  <p className="text-sm text-white">{detailAdmin.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-neutral-500 uppercase tracking-wide">Role</p>
                  <Badge variant="outline" className={`text-xs ${roleColors[detailAdmin.role] || ''}`}>{detailAdmin.role.replace('_', ' ')}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-neutral-500 uppercase tracking-wide">Status</p>
                  <Badge variant="outline" className={`text-xs ${detailAdmin.isActive ? 'text-green-400 border-green-500/30' : 'text-red-400 border-red-500/30'}`}>{detailAdmin.isActive ? 'Active' : 'Inactive'}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-neutral-500 uppercase tracking-wide">2FA Status</p>
                  <Badge variant="outline" className={`text-xs ${detailAdmin.twoFactorEnabled ? 'text-emerald-400 border-emerald-500/30' : 'text-neutral-400 border-neutral-500/30'}`}>{detailAdmin.twoFactorEnabled ? 'Enabled' : 'Disabled'}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-neutral-500 uppercase tracking-wide">Last Login</p>
                  <p className="text-sm text-white">{detailAdmin.lastLoginAt ? new Date(detailAdmin.lastLoginAt).toLocaleString() : 'Never'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-neutral-500 uppercase tracking-wide">Created</p>
                  <p className="text-sm text-white">{new Date(detailAdmin.createdAt).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-neutral-500 uppercase tracking-wide">Invited By</p>
                  <p className="text-sm text-white">{detailAdmin.invitedBy ? `${detailAdmin.invitedBy.fullName} (${detailAdmin.invitedBy.email})` : 'N/A'}</p>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => { setShowDetail(false); setDetailAdmin(null); }} className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={showDeactivate} onOpenChange={(open) => { setShowDeactivate(open); if (!open) setDeactivateAdmin(null); }}>
        <AlertDialogContent className="bg-neutral-900/95 border-neutral-800/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Deactivate Admin User</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              Are you sure you want to deactivate <span className="text-white font-medium">{deactivateAdmin?.fullName}</span>?
              They will no longer be able to access the admin panel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeactivate} disabled={isDeactivating} className="bg-red-600 hover:bg-red-700 text-white">
              {isDeactivating ? 'Deactivating...' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
