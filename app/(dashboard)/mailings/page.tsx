'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { FileText, Send, History, Plus, Edit2, Trash2, Search, ChevronLeft, ChevronRight, Users, UserPlus, Loader2, X } from 'lucide-react';

// Types
interface Template {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  category: string;
  variables: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  email: string;
  fullName: string;
}

interface HistoryItem {
  id: string;
  recipientEmail: string;
  subject: string;
  templateId: string | null;
  status: string;
  sentBy: string | null;
  sentByName: string | null;
  sentAt: string | null;
}

export default function MailingsPage() {
  // Templates State
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    htmlContent: '',
    category: 'general',
    variables: '',
  });
  const [templateSaving, setTemplateSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<Template | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Send Email State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('none');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [manualEmail, setManualEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [sendingEmail, setSendingEmail] = useState(false);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [loadingSubscribers, setLoadingSubscribers] = useState(false);
  const [loadingAllUsers, setLoadingAllUsers] = useState(false);
  const [subscriberEmails, setSubscriberEmails] = useState<string[]>([]);
  const [bulkUserEmails, setBulkUserEmails] = useState<string[]>([]);

  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historySearch, setHistorySearch] = useState('');
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);

  // Fetch Templates
  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const res = await fetch('/api/mailings/templates');
      const data = await res.json();
      if (data.success) {
        setTemplates(data.data);
      } else {
        toast.error(data.error || 'Failed to load templates');
      }
    } catch {
      toast.error('Failed to load templates');
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  // Fetch History
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({ page: historyPage.toString(), limit: '20' });
      if (historySearch) params.set('search', historySearch);
      if (historyDateFrom) params.set('from', historyDateFrom);
      if (historyDateTo) params.set('to', historyDateTo);

      const res = await fetch(`/api/mailings/history?${params}`);
      const data = await res.json();
      if (data.success) {
        setHistory(data.data);
        setHistoryTotalPages(data.pagination?.totalPages || 1);
      } else {
        toast.error(data.error || 'Failed to load history');
      }
    } catch {
      toast.error('Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage, historySearch, historyDateFrom, historyDateTo]);

  // Search Users
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchingUsers(true);
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(query)}&limit=10`);
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.data.filter((u: User) => !selectedUsers.find(s => s.id === u.id)));
      }
    } catch {
      console.error('Failed to search users');
    } finally {
      setSearchingUsers(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchHistory();
  }, [fetchTemplates, fetchHistory]);

  // Template selection effect
  useEffect(() => {
    if (selectedTemplateId && selectedTemplateId !== 'none') {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template) {
        setSelectedTemplate(template);
        setEmailSubject(template.subject);
        setEmailContent(template.htmlContent);
        const vars: Record<string, string> = {};
        template.variables.forEach(v => { vars[v] = ''; });
        setVariableValues(vars);
      }
    } else {
      setSelectedTemplate(null);
      setEmailSubject('');
      setEmailContent('');
      setVariableValues({});
    }
  }, [selectedTemplateId, templates]);

  // User search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(userSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch]);

  // Template Dialog Handlers
  const openCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({ name: '', subject: '', htmlContent: '', category: 'general', variables: '' });
    setShowTemplateDialog(true);
  };

  const openEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      subject: template.subject,
      htmlContent: template.htmlContent,
      category: template.category,
      variables: template.variables.join(', '),
    });
    setShowTemplateDialog(true);
  };

  const saveTemplate = async () => {
    if (!templateForm.name || !templateForm.subject || !templateForm.htmlContent) {
      toast.error('Name, subject, and content are required');
      return;
    }

    setTemplateSaving(true);
    try {
      const variables = templateForm.variables
        .split(',')
        .map(v => v.trim())
        .filter(v => v);

      const body = {
        name: templateForm.name,
        subject: templateForm.subject,
        htmlContent: templateForm.htmlContent,
        category: templateForm.category,
        variables,
      };

      const url = editingTemplate
        ? `/api/mailings/templates/${editingTemplate.id}`
        : '/api/mailings/templates';
      const method = editingTemplate ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(editingTemplate ? 'Template updated' : 'Template created');
        setShowTemplateDialog(false);
        fetchTemplates();
      } else {
        toast.error(data.error || 'Failed to save template');
      }
    } catch {
      toast.error('Failed to save template');
    } finally {
      setTemplateSaving(false);
    }
  };

  const confirmDeleteTemplate = (template: Template) => {
    setDeletingTemplate(template);
    setShowDeleteDialog(true);
  };

  const deleteTemplate = async () => {
    if (!deletingTemplate) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/mailings/templates/${deletingTemplate.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Template deleted');
        setShowDeleteDialog(false);
        setDeletingTemplate(null);
        fetchTemplates();
      } else {
        toast.error(data.error || 'Failed to delete template');
      }
    } catch {
      toast.error('Failed to delete template');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Send Email Handler
  const handleSendEmail = async () => {
    // Combine all recipient sources and deduplicate
    const allEmails = new Set([
      ...selectedUsers.map(u => u.email),
      ...subscriberEmails,
      ...bulkUserEmails,
      ...(manualEmail ? manualEmail.split(',').map(e => e.trim()).filter(e => e) : []),
    ]);
    const recipients = Array.from(allEmails);

    if (recipients.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    if (!emailSubject.trim()) {
      toast.error('Subject is required');
      return;
    }

    if (!emailContent.trim()) {
      toast.error('Email content is required');
      return;
    }

    setSendingEmail(true);
    try {
      const res = await fetch('/api/mailings/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients,
          subject: emailSubject,
          htmlContent: emailContent,
          templateId: selectedTemplateId !== 'none' ? selectedTemplateId : undefined,
          variables: variableValues,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Email sent to ${data.sentCount || recipients.length} recipient(s)`);
        // Reset form
        setSelectedUsers([]);
        setSubscriberEmails([]);
        setBulkUserEmails([]);
        setManualEmail('');
        setSelectedTemplateId('none');
        fetchHistory();
      } else {
        toast.error(data.error || 'Failed to send email');
      }
    } catch {
      toast.error('Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const addUser = (user: User) => {
    setSelectedUsers(prev => [...prev, user]);
    setSearchResults(prev => prev.filter(u => u.id !== user.id));
    setUserSearch('');
  };

  const removeUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  };

  // Add all newsletter subscribers
  const addAllSubscribers = async () => {
    setLoadingSubscribers(true);
    try {
      const res = await fetch('/api/newsletters/subscribers?list=true');
      const data = await res.json();
      if (data.success && data.data) {
        const emails = data.data.map((s: { email: string }) => s.email);
        setSubscriberEmails(emails);
        toast.success(`Added ${emails.length} newsletter subscribers`);
      } else {
        toast.error('Failed to load subscribers');
      }
    } catch {
      toast.error('Failed to load subscribers');
    } finally {
      setLoadingSubscribers(false);
    }
  };

  // Add all users
  const addAllUsers = async () => {
    setLoadingAllUsers(true);
    try {
      const res = await fetch('/api/users?limit=1000&status=active');
      const data = await res.json();
      if (data.success && data.data) {
        const emails = data.data.map((u: { email: string }) => u.email);
        setBulkUserEmails(emails);
        toast.success(`Added ${emails.length} users`);
      } else {
        toast.error('Failed to load users');
      }
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoadingAllUsers(false);
    }
  };

  // Clear all recipients
  const clearAllRecipients = () => {
    setSelectedUsers([]);
    setSubscriberEmails([]);
    setBulkUserEmails([]);
    setManualEmail('');
    toast.success('All recipients cleared');
  };

  // Get total recipient count
  const getTotalRecipientCount = () => {
    const manualEmails = manualEmail.split(',').map(e => e.trim()).filter(e => e);
    const allEmails = new Set([
      ...selectedUsers.map(u => u.email),
      ...subscriberEmails,
      ...bulkUserEmails,
      ...manualEmails,
    ]);
    return allEmails.size;
  };

  const categoryColors: Record<string, string> = {
    general: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/30',
    transactional: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    marketing: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  };

  const statusColors: Record<string, string> = {
    active: 'bg-green-500/10 text-green-400 border-green-500/30',
    draft: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    archived: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/30',
    sent: 'bg-green-500/10 text-green-400 border-green-500/30',
    failed: 'bg-red-500/10 text-red-400 border-red-500/30',
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Mailings</h1>
        <p className="text-neutral-400 text-sm mt-1">Manage email templates and send emails</p>
      </div>

      <Tabs defaultValue="templates">
        <TabsList className="bg-neutral-800 border-neutral-700">
          <TabsTrigger value="templates" className="data-[state=active]:bg-emerald-600">
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="send" className="data-[state=active]:bg-emerald-600">
            <Send className="h-4 w-4 mr-2" />
            Send Email
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-emerald-600">
            <History className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={openCreateTemplate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>

          <Card className="bg-neutral-900/80 border-neutral-800/50">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-800">
                      <th className="text-left p-4 text-sm font-medium text-neutral-400">Name</th>
                      <th className="hidden md:table-cell text-left p-4 text-sm font-medium text-neutral-400">Subject</th>
                      <th className="hidden md:table-cell text-left p-4 text-sm font-medium text-neutral-400">Category</th>
                      <th className="text-left p-4 text-sm font-medium text-neutral-400">Status</th>
                      <th className="text-right p-4 text-sm font-medium text-neutral-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templatesLoading ? (
                      [...Array(5)].map((_, i) => (
                        <tr key={i} className="border-b border-neutral-800/50">
                          <td colSpan={5} className="p-4"><Skeleton className="h-8 bg-neutral-800" /></td>
                        </tr>
                      ))
                    ) : templates.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-neutral-500">No templates found</td>
                      </tr>
                    ) : (
                      templates.map((template) => (
                        <tr key={template.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30">
                          <td className="p-4">
                            <p className="text-sm font-medium text-white">{template.name}</p>
                          </td>
                          <td className="hidden md:table-cell p-4 text-sm text-neutral-300">{template.subject}</td>
                          <td className="hidden md:table-cell p-4">
                            <Badge variant="outline" className={`text-xs ${categoryColors[template.category] || ''}`}>
                              {template.category}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className={`text-xs ${statusColors[template.status] || ''}`}>
                              {template.status}
                            </Badge>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-neutral-400 hover:text-emerald-400"
                                onClick={() => openEditTemplate(template)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-neutral-400 hover:text-red-400"
                                onClick={() => confirmDeleteTemplate(template)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Send Email Tab */}
        <TabsContent value="send" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Form */}
            <Card className="bg-neutral-900/80 border-neutral-800/50">
              <CardContent className="p-6 space-y-6">
                {/* Template Selection */}
                <div className="space-y-2">
                  <Label className="text-neutral-300">Use Template (optional)</Label>
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger className="bg-neutral-900/80 border-neutral-800/50 text-white">
                      <SelectValue placeholder="Select a template..." />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-900 border-neutral-800">
                      <SelectItem value="none">None</SelectItem>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Recipients */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-neutral-300">Recipients</Label>
                    {getTotalRecipientCount() > 0 && (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                        {getTotalRecipientCount()} total
                      </Badge>
                    )}
                  </div>

                  {/* Quick Selection Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addAllSubscribers}
                      disabled={loadingSubscribers || subscriberEmails.length > 0}
                      className="bg-neutral-800/50 border-neutral-700/50 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400"
                    >
                      {loadingSubscribers ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Users className="h-4 w-4 mr-2" />
                      )}
                      {subscriberEmails.length > 0 ? `${subscriberEmails.length} Subscribers` : 'All Subscribers'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addAllUsers}
                      disabled={loadingAllUsers || bulkUserEmails.length > 0}
                      className="bg-neutral-800/50 border-neutral-700/50 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400"
                    >
                      {loadingAllUsers ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4 mr-2" />
                      )}
                      {bulkUserEmails.length > 0 ? `${bulkUserEmails.length} Users` : 'All Users'}
                    </Button>
                    {getTotalRecipientCount() > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={clearAllRecipients}
                        className="bg-neutral-800/50 border-neutral-700/50 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear All
                      </Button>
                    )}
                  </div>

                  {/* Status badges for bulk selections */}
                  {(subscriberEmails.length > 0 || bulkUserEmails.length > 0) && (
                    <div className="flex flex-wrap gap-2">
                      {subscriberEmails.length > 0 && (
                        <Badge variant="outline" className="border-purple-500/50 text-purple-400">
                          <Users className="h-3 w-3 mr-1" />
                          {subscriberEmails.length} newsletter subscribers
                        </Badge>
                      )}
                      {bulkUserEmails.length > 0 && (
                        <Badge variant="outline" className="border-blue-500/50 text-blue-400">
                          <UserPlus className="h-3 w-3 mr-1" />
                          {bulkUserEmails.length} users
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Manual User Search */}
                  <div className="space-y-2">
                    <Label className="text-neutral-400 text-xs">Or search individual users</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                      <Input
                        placeholder="Search users..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="pl-9 bg-neutral-900/80 border-neutral-800/50 text-white"
                      />
                    </div>
                    {searchingUsers && <p className="text-xs text-neutral-500">Searching...</p>}
                    {searchResults.length > 0 && (
                      <div className="bg-neutral-800 rounded-lg border border-neutral-700 max-h-40 overflow-y-auto">
                        {searchResults.map((user) => (
                          <div
                            key={user.id}
                            className="p-2 hover:bg-neutral-700 cursor-pointer flex items-center justify-between"
                            onClick={() => addUser(user)}
                          >
                            <div>
                              <p className="text-sm text-white">{user.fullName}</p>
                              <p className="text-xs text-neutral-400">{user.email}</p>
                            </div>
                            <Plus className="h-4 w-4 text-emerald-400" />
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedUsers.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedUsers.map((user) => (
                          <Badge
                            key={user.id}
                            variant="outline"
                            className="border-emerald-500/50 text-emerald-400 pr-1 flex items-center gap-1"
                          >
                            {user.email}
                            <button
                              onClick={() => removeUser(user.id)}
                              className="ml-1 hover:text-red-400"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Manual Email Input */}
                <div className="space-y-2">
                  <Label className="text-neutral-300">Or enter emails manually (comma-separated)</Label>
                  <Input
                    placeholder="email@example.com, another@example.com"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    className="bg-neutral-900/80 border-neutral-800/50 text-white"
                  />
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <Label className="text-neutral-300">Subject</Label>
                  <Input
                    placeholder="Email subject..."
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="bg-neutral-900/80 border-neutral-800/50 text-white"
                  />
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <Label className="text-neutral-300">HTML Content</Label>
                  <Textarea
                    placeholder="<html>...</html>"
                    value={emailContent}
                    onChange={(e) => setEmailContent(e.target.value)}
                    className="bg-neutral-900/80 border-neutral-800/50 text-white min-h-[200px] font-mono text-sm"
                  />
                </div>

                {/* Variables */}
                {selectedTemplate && selectedTemplate.variables.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-neutral-300">Template Variables</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedTemplate.variables.map((variable) => (
                        <div key={variable} className="space-y-1">
                          <Label className="text-xs text-neutral-400">{variable}</Label>
                          <Input
                            placeholder={`Value for ${variable}`}
                            value={variableValues[variable] || ''}
                            onChange={(e) => setVariableValues(prev => ({ ...prev, [variable]: e.target.value }))}
                            className="bg-neutral-800 border-neutral-700 text-white text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Send Button */}
                <Button
                  onClick={handleSendEmail}
                  disabled={sendingEmail}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {sendingEmail ? 'Sending...' : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Email
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Right Column - Preview */}
            <Card className="bg-neutral-900/80 border-neutral-800/50">
              <CardContent className="p-6">
                <Label className="text-neutral-300 mb-4 block">Preview</Label>
                {selectedTemplate ? (
                  <div className="space-y-4">
                    <div className="bg-neutral-800 rounded-lg p-4">
                      <p className="text-xs text-neutral-500 mb-1">Template</p>
                      <p className="text-sm text-white font-medium">{selectedTemplate.name}</p>
                    </div>
                    <div className="bg-neutral-800 rounded-lg p-4">
                      <p className="text-xs text-neutral-500 mb-1">Subject</p>
                      <p className="text-sm text-white">{emailSubject}</p>
                    </div>
                    <div className="bg-neutral-800 rounded-lg p-4 max-h-[400px] overflow-y-auto">
                      <p className="text-xs text-neutral-500 mb-2">Content Preview</p>
                      <div
                        className="text-sm text-neutral-300 prose prose-invert prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: emailContent }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-neutral-500 text-sm">
                    Select a template to preview
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
              <Input
                placeholder="Search by recipient email..."
                value={historySearch}
                onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                className="pl-9 bg-neutral-900/80 border-neutral-800/50 text-white"
              />
            </div>
            <Input
              type="date"
              value={historyDateFrom}
              onChange={(e) => { setHistoryDateFrom(e.target.value); setHistoryPage(1); }}
              className="w-full sm:w-[160px] bg-neutral-900/80 border-neutral-800/50 text-white"
              placeholder="From date"
            />
            <Input
              type="date"
              value={historyDateTo}
              onChange={(e) => { setHistoryDateTo(e.target.value); setHistoryPage(1); }}
              className="w-full sm:w-[160px] bg-neutral-900/80 border-neutral-800/50 text-white"
              placeholder="To date"
            />
          </div>

          <Card className="bg-neutral-900/80 border-neutral-800/50">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-800">
                      <th className="text-left p-4 text-sm font-medium text-neutral-400">Recipient</th>
                      <th className="hidden md:table-cell text-left p-4 text-sm font-medium text-neutral-400">Subject</th>
                      <th className="hidden md:table-cell text-left p-4 text-sm font-medium text-neutral-400">Template</th>
                      <th className="text-left p-4 text-sm font-medium text-neutral-400">Status</th>
                      <th className="hidden md:table-cell text-left p-4 text-sm font-medium text-neutral-400">Sent By</th>
                      <th className="text-left p-4 text-sm font-medium text-neutral-400">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyLoading ? (
                      [...Array(5)].map((_, i) => (
                        <tr key={i} className="border-b border-neutral-800/50">
                          <td colSpan={6} className="p-4"><Skeleton className="h-8 bg-neutral-800" /></td>
                        </tr>
                      ))
                    ) : history.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-neutral-500">No email history found</td>
                      </tr>
                    ) : (
                      history.map((item) => (
                        <tr key={item.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30">
                          <td className="p-4 text-sm text-white">{item.recipientEmail}</td>
                          <td className="hidden md:table-cell p-4 text-sm text-neutral-300 max-w-[200px] truncate">{item.subject}</td>
                          <td className="hidden md:table-cell p-4 text-sm text-neutral-400">{item.templateId ? 'Template' : '-'}</td>
                          <td className="p-4">
                            <Badge variant="outline" className={`text-xs ${statusColors[item.status.toLowerCase()] || ''}`}>
                              {item.status}
                            </Badge>
                          </td>
                          <td className="hidden md:table-cell p-4 text-sm text-neutral-400">{item.sentByName || '-'}</td>
                          <td className="p-4 text-sm text-neutral-400">
                            {item.sentAt ? new Date(item.sentAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }) : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {historyTotalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-neutral-800">
                  <p className="text-sm text-neutral-400">Page {historyPage} of {historyTotalPages}</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                      disabled={historyPage === 1}
                      className="border-neutral-700 text-neutral-300"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))}
                      disabled={historyPage === historyTotalPages}
                      className="border-neutral-700 text-neutral-300"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl bg-neutral-900 border-neutral-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
            <DialogDescription className="text-neutral-400">
              {editingTemplate ? 'Update the email template' : 'Create a new email template'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-neutral-300">Name <span className="text-red-400">*</span></Label>
              <Input
                placeholder="Welcome Email"
                value={templateForm.name}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                className="bg-neutral-900/80 border-neutral-800/50 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-neutral-300">Subject <span className="text-red-400">*</span></Label>
              <Input
                placeholder="Welcome to our platform!"
                value={templateForm.subject}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, subject: e.target.value }))}
                className="bg-neutral-900/80 border-neutral-800/50 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-neutral-300">HTML Content <span className="text-red-400">*</span></Label>
              <Textarea
                placeholder="<html>...</html>"
                value={templateForm.htmlContent}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, htmlContent: e.target.value }))}
                className="bg-neutral-900/80 border-neutral-800/50 text-white min-h-[300px] font-mono text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-neutral-300">Category</Label>
                <Select
                  value={templateForm.category}
                  onValueChange={(v) => setTemplateForm(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger className="bg-neutral-900/80 border-neutral-800/50 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-900 border-neutral-800">
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="transactional">Transactional</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-neutral-300">Variables (comma-separated)</Label>
                <Input
                  placeholder="userName, companyName"
                  value={templateForm.variables}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, variables: e.target.value }))}
                  className="bg-neutral-900/80 border-neutral-800/50 text-white"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowTemplateDialog(false)}
              className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
            >
              Cancel
            </Button>
            <Button
              onClick={saveTemplate}
              disabled={templateSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {templateSaving ? 'Saving...' : (editingTemplate ? 'Update' : 'Create')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md bg-neutral-900 border-neutral-800 text-white">
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Are you sure you want to delete &quot;{deletingTemplate?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
            >
              Cancel
            </Button>
            <Button
              onClick={deleteTemplate}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
