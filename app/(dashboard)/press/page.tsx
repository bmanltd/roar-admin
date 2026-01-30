'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Newspaper, Plus, Edit2, Trash2, Eye } from 'lucide-react';

interface ArticleData { id: string; title: string; slug: string; content?: string; excerpt: string | null; coverImage?: string | null; category: string; status: string; publishedAt: string | null; createdAt: string; }

export default function PressPage() {
  const [articles, setArticles] = useState<ArticleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', excerpt: '', coverImage: '', category: 'news', status: 'draft' });

  // Edit state
  const [showEdit, setShowEdit] = useState(false);
  const [editingArticle, setEditingArticle] = useState<ArticleData | null>(null);
  const [editForm, setEditForm] = useState({ title: '', content: '', excerpt: '', coverImage: '', category: 'news', status: 'draft' });

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingArticle, setDeletingArticle] = useState<ArticleData | null>(null);

  // Detail view state
  const [showDetail, setShowDetail] = useState(false);
  const [viewingArticle, setViewingArticle] = useState<ArticleData | null>(null);

  const load = async () => { try { const r = await fetch('/api/press'); const d = await r.json(); if (d.success) setArticles(d.data); } catch {} finally { setIsLoading(false); } };
  useEffect(() => { load(); }, []);

  const create = async () => {
    const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    try {
      const res = await fetch('/api/press', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, slug }) });
      const data = await res.json();
      if (data.success) { toast.success('Article created'); setShowCreate(false); setForm({ title: '', content: '', excerpt: '', coverImage: '', category: 'news', status: 'draft' }); load(); } else toast.error(data.error);
    } catch { toast.error('Failed'); }
  };

  const statusColors: Record<string, string> = { draft: 'text-yellow-400 border-yellow-500/30', published: 'text-green-400 border-green-500/30', archived: 'text-neutral-400 border-neutral-500/30' };

  // Edit article handler
  const openEdit = (article: ArticleData) => {
    setEditingArticle(article);
    setEditForm({
      title: article.title,
      content: article.content || '',
      excerpt: article.excerpt || '',
      coverImage: article.coverImage || '',
      category: article.category,
      status: article.status
    });
    setShowEdit(true);
  };

  const updateArticle = async () => {
    if (!editingArticle) return;
    try {
      const res = await fetch(`/api/press/${editingArticle.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Article updated successfully');
        setShowEdit(false);
        setEditingArticle(null);
        load();
      } else {
        toast.error(data.error || 'Failed to update article');
      }
    } catch {
      toast.error('Failed to update article');
    }
  };

  // Delete article handler
  const openDeleteConfirm = (article: ArticleData) => {
    setDeletingArticle(article);
    setShowDeleteConfirm(true);
  };

  const deleteArticle = async () => {
    if (!deletingArticle) return;
    try {
      const res = await fetch(`/api/press/${deletingArticle.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Article deleted successfully');
        setShowDeleteConfirm(false);
        setDeletingArticle(null);
        load();
      } else {
        toast.error(data.error || 'Failed to delete article');
      }
    } catch {
      toast.error('Failed to delete article');
    }
  };

  // View article detail
  const openDetail = async (article: ArticleData) => {
    try {
      const res = await fetch(`/api/press/${article.id}`);
      const data = await res.json();
      if (data.success) {
        setViewingArticle(data.data);
        setShowDetail(true);
      } else {
        toast.error('Failed to load article');
      }
    } catch {
      toast.error('Failed to load article');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Press & News</h1><p className="text-neutral-400 text-sm mt-1">Manage articles and announcements</p></div>
        <Button onClick={() => setShowCreate(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-2" /> New Article</Button>
      </div>
      {isLoading ? <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 bg-neutral-800" />)}</div> : (
        <div className="space-y-3">
          {articles.map(a => (
            <Card key={a.id} className="bg-neutral-900/80 border-neutral-800/50 hover:border-emerald-600/30 transition-colors cursor-pointer" onClick={() => openDetail(a)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">{a.title}</p>
                    <Badge variant="outline" className={`text-xs ${statusColors[a.status] || ''}`}>{a.status}</Badge>
                    <Badge variant="outline" className="text-xs text-neutral-400">{a.category}</Badge>
                  </div>
                  {a.excerpt && <p className="text-xs text-neutral-400">{a.excerpt.slice(0, 120)}</p>}
                  <p className="text-xs text-neutral-500">{a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : new Date(a.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2 ml-4" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" onClick={() => openDetail(a)} className="h-8 w-8 text-neutral-400 hover:text-emerald-400 hover:bg-emerald-500/10">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(a)} className="h-8 w-8 text-neutral-400 hover:text-emerald-400 hover:bg-emerald-500/10">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openDeleteConfirm(a)} className="h-8 w-8 text-neutral-400 hover:text-red-400 hover:bg-red-500/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {articles.length === 0 && <p className="text-neutral-500 text-center py-12">No articles yet</p>}
        </div>
      )}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-neutral-900/80 border-neutral-800/50 text-white max-w-2xl">
          <DialogHeader><DialogTitle>Create Article</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label className="text-neutral-300">Title</Label><Input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} className="bg-neutral-800 border-neutral-700 text-white" /></div>
            <div className="space-y-2"><Label className="text-neutral-300">Excerpt</Label><Input value={form.excerpt} onChange={e => setForm(p => ({...p, excerpt: e.target.value}))} className="bg-neutral-800 border-neutral-700 text-white" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label className="text-neutral-300">Category</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({...p, category: v}))}><SelectTrigger className="bg-neutral-800 border-neutral-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-neutral-800 border-neutral-700"><SelectItem value="news">News</SelectItem><SelectItem value="press">Press Release</SelectItem><SelectItem value="announcement">Announcement</SelectItem><SelectItem value="update">Update</SelectItem></SelectContent></Select>
              </div>
              <div className="space-y-2"><Label className="text-neutral-300">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({...p, status: v}))}><SelectTrigger className="bg-neutral-800 border-neutral-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-neutral-800 border-neutral-700"><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Published</SelectItem></SelectContent></Select>
              </div>
            </div>
            <div className="space-y-2"><Label className="text-neutral-300">Content</Label><Textarea value={form.content} onChange={e => setForm(p => ({...p, content: e.target.value}))} rows={8} className="bg-neutral-800 border-neutral-700 text-white" /></div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreate(false)} className="border-neutral-700 text-neutral-300">Cancel</Button>
              <Button onClick={create} className="bg-emerald-600 hover:bg-emerald-700">Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Article Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="bg-neutral-900/80 border-neutral-800/50 text-white max-w-2xl">
          <DialogHeader><DialogTitle className="text-emerald-400">Edit Article</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-neutral-300">Title</Label>
              <Input value={editForm.title} onChange={e => setEditForm(p => ({...p, title: e.target.value}))} className="bg-neutral-800 border-neutral-700 text-white focus:border-emerald-500" />
            </div>
            <div className="space-y-2">
              <Label className="text-neutral-300">Content</Label>
              <Textarea value={editForm.content} onChange={e => setEditForm(p => ({...p, content: e.target.value}))} rows={10} className="bg-neutral-800 border-neutral-700 text-white focus:border-emerald-500" />
            </div>
            <div className="space-y-2">
              <Label className="text-neutral-300">Excerpt</Label>
              <Textarea value={editForm.excerpt} onChange={e => setEditForm(p => ({...p, excerpt: e.target.value}))} rows={3} className="bg-neutral-800 border-neutral-700 text-white focus:border-emerald-500" />
            </div>
            <div className="space-y-2">
              <Label className="text-neutral-300">Cover Image URL</Label>
              <Input value={editForm.coverImage} onChange={e => setEditForm(p => ({...p, coverImage: e.target.value}))} placeholder="https://example.com/image.jpg" className="bg-neutral-800 border-neutral-700 text-white focus:border-emerald-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-neutral-300">Category</Label>
                <Select value={editForm.category} onValueChange={v => setEditForm(p => ({...p, category: v}))}>
                  <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-neutral-800 border-neutral-700">
                    <SelectItem value="news">News</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-neutral-300">Status</Label>
                <Select value={editForm.status} onValueChange={v => setEditForm(p => ({...p, status: v}))}>
                  <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-neutral-800 border-neutral-700">
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowEdit(false)} className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">Cancel</Button>
              <Button onClick={updateArticle} className="bg-emerald-600 hover:bg-emerald-700">Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-neutral-900 border-neutral-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Article</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              Are you sure you want to delete this article? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteArticle} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Article Detail View Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="bg-neutral-900/80 border-neutral-800/50 text-white max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={`text-xs ${statusColors[viewingArticle?.status || ''] || ''}`}>{viewingArticle?.status}</Badge>
              <Badge variant="outline" className="text-xs text-neutral-400">{viewingArticle?.category}</Badge>
            </div>
            <DialogTitle className="text-xl text-white">{viewingArticle?.title}</DialogTitle>
            <p className="text-xs text-neutral-500 mt-1">
              {viewingArticle?.publishedAt ? `Published on ${new Date(viewingArticle.publishedAt).toLocaleDateString()}` : `Created on ${new Date(viewingArticle?.createdAt || '').toLocaleDateString()}`}
            </p>
          </DialogHeader>
          {viewingArticle?.coverImage && (
            <div className="mt-4 rounded-lg overflow-hidden border border-neutral-800">
              <img src={viewingArticle.coverImage} alt={viewingArticle.title} className="w-full h-48 object-cover" />
            </div>
          )}
          {viewingArticle?.excerpt && (
            <div className="mt-4 p-3 bg-neutral-800/50 rounded-lg border border-neutral-700">
              <p className="text-sm text-neutral-300 italic">{viewingArticle.excerpt}</p>
            </div>
          )}
          <div className="mt-4 prose prose-invert prose-sm max-w-none">
            <div className="text-neutral-300 whitespace-pre-wrap">{viewingArticle?.content || 'No content available.'}</div>
          </div>
          <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-neutral-800">
            <Button variant="outline" onClick={() => setShowDetail(false)} className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">Close</Button>
            <Button onClick={() => { setShowDetail(false); if (viewingArticle) openEdit(viewingArticle); }} className="bg-emerald-600 hover:bg-emerald-700">
              <Edit2 className="h-4 w-4 mr-2" /> Edit Article
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
