'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Package, Plus, Download, Edit2, Archive, Eye } from 'lucide-react';

interface VersionData {
  id: string;
  version: string;
  platform: string;
  channel: string;
  releaseNotes: string | null;
  downloadUrl: string | null;
  fileSize: number | null;
  checksum: string | null;
  minOsVersion: string | null;
  isActive: boolean;
  isMandatory: boolean;
  publishedAt: string | null;
  createdAt: string;
}

export default function VersionsPage() {
  const [versions, setVersions] = useState<VersionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ version: '', platform: 'all', channel: 'stable', releaseNotes: '', downloadUrl: '', isMandatory: false });

  // Edit dialog state
  const [showEdit, setShowEdit] = useState(false);
  const [editingVersion, setEditingVersion] = useState<VersionData | null>(null);
  const [editForm, setEditForm] = useState({
    releaseNotes: '',
    downloadUrl: '',
    isMandatory: false,
    isActive: true,
    minOsVersion: '',
    channel: 'stable'
  });

  // Archive dialog state
  const [showArchive, setShowArchive] = useState(false);
  const [archivingVersion, setArchivingVersion] = useState<VersionData | null>(null);

  // Detail dialog state
  const [showDetail, setShowDetail] = useState(false);
  const [detailVersion, setDetailVersion] = useState<VersionData | null>(null);

  const loadVersions = async () => { try { const r = await fetch('/api/versions'); const d = await r.json(); if (d.success) setVersions(d.data); } catch {} finally { setIsLoading(false); } };
  useEffect(() => { loadVersions(); }, []);

  const createVersion = async () => {
    try {
      const res = await fetch('/api/versions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) { toast.success('Version created'); setShowCreate(false); loadVersions(); } else toast.error(data.error);
    } catch { toast.error('Failed to create version'); }
  };

  const openEditDialog = (version: VersionData) => {
    setEditingVersion(version);
    setEditForm({
      releaseNotes: version.releaseNotes || '',
      downloadUrl: version.downloadUrl || '',
      isMandatory: version.isMandatory,
      isActive: version.isActive,
      minOsVersion: version.minOsVersion || '',
      channel: version.channel
    });
    setShowEdit(true);
  };

  const updateVersion = async () => {
    if (!editingVersion) return;
    try {
      const res = await fetch(`/api/versions/${editingVersion.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Version updated successfully');
        setShowEdit(false);
        setEditingVersion(null);
        loadVersions();
      } else {
        toast.error(data.error || 'Failed to update version');
      }
    } catch {
      toast.error('Failed to update version');
    }
  };

  const openArchiveDialog = (version: VersionData) => {
    setArchivingVersion(version);
    setShowArchive(true);
  };

  const archiveVersion = async () => {
    if (!archivingVersion) return;
    try {
      const res = await fetch(`/api/versions/${archivingVersion.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Version archived successfully');
        setShowArchive(false);
        setArchivingVersion(null);
        loadVersions();
      } else {
        toast.error(data.error || 'Failed to archive version');
      }
    } catch {
      toast.error('Failed to archive version');
    }
  };

  const openDetailDialog = (version: VersionData) => {
    setDetailVersion(version);
    setShowDetail(true);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Version Control</h1>
          <p className="text-neutral-400 text-sm mt-1">Manage app versions and releases</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-2" /> New Version</Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 bg-neutral-800" />)}</div>
      ) : (
        <div className="space-y-3">
          {versions.map((v) => (
            <Card key={v.id} className="bg-neutral-900/80 border-neutral-800/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-emerald-400" />
                      <span className="text-lg font-semibold text-white">v{v.version}</span>
                      <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-500/30">{v.channel}</Badge>
                      <Badge variant="outline" className="text-xs text-neutral-400">{v.platform}</Badge>
                      {v.isMandatory && <Badge className="bg-red-500/10 text-red-400 text-xs">Mandatory</Badge>}
                      {v.isActive && <Badge className="bg-green-500/10 text-green-400 text-xs">Active</Badge>}
                    </div>
                    {v.releaseNotes && <p className="text-sm text-neutral-400 mt-1">{v.releaseNotes.slice(0, 200)}</p>}
                    <p className="text-xs text-neutral-500">{v.publishedAt ? `Published ${new Date(v.publishedAt).toLocaleDateString()}` : `Created ${new Date(v.createdAt).toLocaleDateString()}`}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDetailDialog(v)}
                      className="text-neutral-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(v)}
                      className="text-neutral-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    {v.isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openArchiveDialog(v)}
                        className="text-neutral-400 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {versions.length === 0 && <p className="text-neutral-500 text-center py-12">No versions published yet</p>}
        </div>
      )}

      {/* Create Version Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-neutral-900/80 border-neutral-800/50 text-white">
          <DialogHeader><DialogTitle>Create New Version</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label className="text-neutral-300">Version</Label><Input value={form.version} onChange={e => setForm(p => ({...p, version: e.target.value}))} placeholder="2.1.0" className="bg-neutral-800 border-neutral-700 text-white" /></div>
              <div className="space-y-2"><Label className="text-neutral-300">Platform</Label>
                <Select value={form.platform} onValueChange={v => setForm(p => ({...p, platform: v}))}><SelectTrigger className="bg-neutral-800 border-neutral-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-neutral-800 border-neutral-700"><SelectItem value="all">All</SelectItem><SelectItem value="windows">Windows</SelectItem><SelectItem value="macos">macOS</SelectItem><SelectItem value="linux">Linux</SelectItem></SelectContent></Select>
              </div>
            </div>
            <div className="space-y-2"><Label className="text-neutral-300">Channel</Label>
              <Select value={form.channel} onValueChange={v => setForm(p => ({...p, channel: v}))}><SelectTrigger className="bg-neutral-800 border-neutral-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700"><SelectItem value="stable">Stable</SelectItem><SelectItem value="beta">Beta</SelectItem><SelectItem value="alpha">Alpha</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-2"><Label className="text-neutral-300">Release Notes</Label><Textarea value={form.releaseNotes} onChange={e => setForm(p => ({...p, releaseNotes: e.target.value}))} className="bg-neutral-800 border-neutral-700 text-white" /></div>
            <div className="space-y-2"><Label className="text-neutral-300">Download URL</Label><Input value={form.downloadUrl} onChange={e => setForm(p => ({...p, downloadUrl: e.target.value}))} className="bg-neutral-800 border-neutral-700 text-white" /></div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreate(false)} className="border-neutral-700 text-neutral-300">Cancel</Button>
              <Button onClick={createVersion} className="bg-emerald-600 hover:bg-emerald-700">Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Version Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="bg-neutral-900/80 border-neutral-800/50 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Version {editingVersion?.version}</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Update version settings and configuration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-neutral-300">Release Notes</Label>
              <Textarea
                value={editForm.releaseNotes}
                onChange={e => setEditForm(p => ({...p, releaseNotes: e.target.value}))}
                placeholder="Enter release notes..."
                rows={4}
                className="bg-neutral-800 border-neutral-700 text-white resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-neutral-300">Download URL</Label>
              <Input
                value={editForm.downloadUrl}
                onChange={e => setEditForm(p => ({...p, downloadUrl: e.target.value}))}
                placeholder="https://..."
                className="bg-neutral-800 border-neutral-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-neutral-300">Min OS Version</Label>
              <Input
                value={editForm.minOsVersion}
                onChange={e => setEditForm(p => ({...p, minOsVersion: e.target.value}))}
                placeholder="e.g., 10.0, 11.0"
                className="bg-neutral-800 border-neutral-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-neutral-300">Channel</Label>
              <Select value={editForm.channel} onValueChange={v => setEditForm(p => ({...p, channel: v}))}>
                <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700">
                  <SelectItem value="stable">Stable</SelectItem>
                  <SelectItem value="beta">Beta</SelectItem>
                  <SelectItem value="alpha">Alpha</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between py-2">
              <Label className="text-neutral-300">Is Mandatory</Label>
              <Switch
                checked={editForm.isMandatory}
                onCheckedChange={checked => setEditForm(p => ({...p, isMandatory: checked}))}
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <Label className="text-neutral-300">Is Active</Label>
              <Switch
                checked={editForm.isActive}
                onCheckedChange={checked => setEditForm(p => ({...p, isActive: checked}))}
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowEdit(false)} className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">
                Cancel
              </Button>
              <Button onClick={updateVersion} className="bg-emerald-600 hover:bg-emerald-700">
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog open={showArchive} onOpenChange={setShowArchive}>
        <DialogContent className="bg-neutral-900/80 border-neutral-800/50 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-400">Archive Version</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Are you sure you want to archive version {archivingVersion?.version}? This will deactivate the version and it will no longer be available for updates.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setShowArchive(false)} className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">
              Cancel
            </Button>
            <Button onClick={archiveVersion} className="bg-red-600 hover:bg-red-700 text-white">
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="bg-neutral-900/80 border-neutral-800/50 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-emerald-400" />
              Version {detailVersion?.version} Details
            </DialogTitle>
          </DialogHeader>
          {detailVersion && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-neutral-500 uppercase tracking-wide">Platform</p>
                  <p className="text-sm text-white">{detailVersion.platform}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-neutral-500 uppercase tracking-wide">Channel</p>
                  <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-500/30">{detailVersion.channel}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-neutral-500 uppercase tracking-wide">Status</p>
                  <div className="flex gap-2">
                    {detailVersion.isActive ? (
                      <Badge className="bg-green-500/10 text-green-400 text-xs">Active</Badge>
                    ) : (
                      <Badge className="bg-neutral-500/10 text-neutral-400 text-xs">Inactive</Badge>
                    )}
                    {detailVersion.isMandatory && <Badge className="bg-red-500/10 text-red-400 text-xs">Mandatory</Badge>}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-neutral-500 uppercase tracking-wide">File Size</p>
                  <p className="text-sm text-white">{formatFileSize(detailVersion.fileSize)}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-neutral-500 uppercase tracking-wide">Download URL</p>
                {detailVersion.downloadUrl ? (
                  <a
                    href={detailVersion.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-emerald-400 hover:text-emerald-300 break-all flex items-center gap-1"
                  >
                    <Download className="h-3 w-3 flex-shrink-0" />
                    {detailVersion.downloadUrl}
                  </a>
                ) : (
                  <p className="text-sm text-neutral-500">Not specified</p>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs text-neutral-500 uppercase tracking-wide">Checksum (SHA-256)</p>
                <p className="text-xs text-neutral-400 font-mono break-all bg-neutral-800/50 p-2 rounded">
                  {detailVersion.checksum || 'Not available'}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-neutral-500 uppercase tracking-wide">Min OS Version</p>
                <p className="text-sm text-white">{detailVersion.minOsVersion || 'Not specified'}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-neutral-500 uppercase tracking-wide">Release Notes</p>
                <div className="text-sm text-neutral-300 bg-neutral-800/50 p-3 rounded max-h-32 overflow-y-auto">
                  {detailVersion.releaseNotes || 'No release notes'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-800">
                <div className="space-y-1">
                  <p className="text-xs text-neutral-500 uppercase tracking-wide">Created</p>
                  <p className="text-sm text-neutral-400">{new Date(detailVersion.createdAt).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-neutral-500 uppercase tracking-wide">Published</p>
                  <p className="text-sm text-neutral-400">
                    {detailVersion.publishedAt ? new Date(detailVersion.publishedAt).toLocaleString() : 'Not published'}
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setShowDetail(false)} className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
