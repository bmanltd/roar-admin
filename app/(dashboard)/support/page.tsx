'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { MessageSquare, ChevronLeft, ChevronRight, Send, Eye, X } from 'lucide-react';

interface TicketResponse {
  id: string;
  message: string;
  isStaff: boolean;
  createdAt: string;
  responderId: string | null;
}

interface TicketData {
  id: string;
  ticketNumber: string;
  email: string;
  name: string | null;
  userId: string | null;
  category: string;
  priority: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
  responses?: TicketResponse[];
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Dialog state
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoadingTicket, setIsLoadingTicket] = useState(false);

  // Reply form state
  const [replyMessage, setReplyMessage] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [isSendingReply, setIsSendingReply] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/support?${params}`);
      const data = await res.json();
      if (data.success) { setTickets(data.data); setTotalPages(data.pagination.totalPages); setTotal(data.pagination.total); }
    } catch {} finally { setIsLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const loadTicketDetails = async (ticketId: string) => {
    setIsLoadingTicket(true);
    try {
      const res = await fetch(`/api/support/${ticketId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedTicket(data.data);
      }
    } catch {
      toast.error('Failed to load ticket details');
    } finally {
      setIsLoadingTicket(false);
    }
  };

  const openTicketDialog = (ticket: TicketData) => {
    setSelectedTicket(ticket);
    setIsDialogOpen(true);
    setReplyMessage('');
    setSendEmail(true);
    loadTicketDetails(ticket.id);
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/support/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      const data = await res.json();
      if (data.success) {
        toast.success('Status updated');
        load();
        if (selectedTicket?.id === id) {
          setSelectedTicket(prev => prev ? { ...prev, status } : null);
        }
      }
    } catch { toast.error('Failed'); }
  };

  const closeTicket = async (id: string) => {
    await updateStatus(id, 'CLOSED');
  };

  const sendReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) {
      toast.error('Please enter a reply message');
      return;
    }

    setIsSendingReply(true);
    try {
      const res = await fetch(`/api/support/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyMessage.trim(), sendEmail }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.emailSent ? 'Reply sent and emailed' : 'Reply sent');
        setReplyMessage('');
        loadTicketDetails(selectedTicket.id);
        load();
      } else {
        toast.error(data.error || 'Failed to send reply');
      }
    } catch {
      toast.error('Failed to send reply');
    } finally {
      setIsSendingReply(false);
    }
  };

  const categoryColors: Record<string, string> = { BILLING: 'text-amber-400 border-amber-500/30', TECHNICAL: 'text-blue-400 border-blue-500/30', ACCOUNT: 'text-purple-400 border-purple-500/30', FEATURE_REQUEST: 'text-emerald-400 border-emerald-500/30', OTHER: 'text-neutral-400 border-neutral-500/30' };
  const statusColors: Record<string, string> = { OPEN: 'text-emerald-400 border-emerald-500/30', IN_PROGRESS: 'text-yellow-400 border-yellow-500/30', WAITING_ON_CUSTOMER: 'text-orange-400 border-orange-500/30', RESOLVED: 'text-green-400 border-green-500/30', CLOSED: 'text-neutral-400 border-neutral-500/30' };
  const priorityColors: Record<string, string> = { LOW: 'text-neutral-400 border-neutral-500/30', MEDIUM: 'text-blue-400 border-blue-500/30', HIGH: 'text-orange-400 border-orange-500/30', URGENT: 'text-red-400 border-red-500/30' };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-white">Support Tickets</h1><p className="text-neutral-400 text-sm mt-1">{total} tickets</p></div>
      <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
        <SelectTrigger className="w-full sm:w-[180px] bg-neutral-900/80 border-neutral-800/50 text-white"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent className="bg-neutral-900/80 border-neutral-800/50">
          <SelectItem value="all">All Status</SelectItem><SelectItem value="OPEN">Open</SelectItem><SelectItem value="IN_PROGRESS">In Progress</SelectItem><SelectItem value="WAITING_ON_CUSTOMER">Waiting on Customer</SelectItem><SelectItem value="RESOLVED">Resolved</SelectItem><SelectItem value="CLOSED">Closed</SelectItem>
        </SelectContent>
      </Select>
      <div className="space-y-3">
        {isLoading ? [...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 bg-neutral-800" />) : tickets.length === 0 ? <p className="text-neutral-500 text-center py-12">No tickets</p> : tickets.map(t => (
          <Card key={t.id} className="bg-neutral-900/80 border-neutral-800/50 cursor-pointer hover:border-emerald-500/30 transition-colors" onClick={() => openTicketDialog(t)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500 font-mono">#{t.ticketNumber}</span>
                    <p className="text-sm font-medium text-white">{t.subject}</p>
                    <Badge variant="outline" className={`text-xs ${categoryColors[t.category] || ''}`}>{t.category.replace('_', ' ')}</Badge>
                    <Badge variant="outline" className={`text-xs ${statusColors[t.status] || ''}`}>{t.status.replace(/_/g, ' ')}</Badge>
                    <Badge variant="outline" className={`text-xs ${priorityColors[t.priority] || ''}`}>{t.priority}</Badge>
                  </div>
                  <p className="text-xs text-neutral-400 line-clamp-2">{t.message}</p>
                  <p className="text-xs text-neutral-500">{t.name ? `${t.name} (${t.email})` : t.email || 'Anonymous'} | {new Date(t.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" onClick={() => openTicketDialog(t)} className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Select value={t.status} onValueChange={(v) => updateStatus(t.id, v)}>
                    <SelectTrigger className="w-full sm:w-[150px] bg-neutral-800 border-neutral-700 text-white text-xs h-8"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-neutral-800 border-neutral-700">
                      <SelectItem value="OPEN">Open</SelectItem><SelectItem value="IN_PROGRESS">In Progress</SelectItem><SelectItem value="WAITING_ON_CUSTOMER">Waiting on Customer</SelectItem><SelectItem value="RESOLVED">Resolved</SelectItem><SelectItem value="CLOSED">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-400">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="border-neutral-700 text-neutral-300"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="border-neutral-700 text-neutral-300"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Ticket Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-400" />
              {selectedTicket?.subject || 'Loading...'}
            </DialogTitle>
            <DialogDescription className="text-neutral-400">
              {selectedTicket?.ticketNumber && <span className="font-mono text-emerald-400">#{selectedTicket.ticketNumber}</span>}
              {selectedTicket?.ticketNumber && ' | '}
              {selectedTicket?.name ? `${selectedTicket.name} (${selectedTicket.email})` : selectedTicket?.email || 'Anonymous'} | {selectedTicket && new Date(selectedTicket.createdAt).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          {isLoadingTicket ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-20 bg-neutral-800" />
              <Skeleton className="h-16 bg-neutral-800" />
            </div>
          ) : selectedTicket && (
            <div className="flex-1 overflow-y-auto space-y-4 py-4">
              {/* Ticket Info */}
              <div className="bg-neutral-800/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-xs ${categoryColors[selectedTicket.category] || ''}`}>{selectedTicket.category.replace('_', ' ')}</Badge>
                  <Badge variant="outline" className={`text-xs ${statusColors[selectedTicket.status] || ''}`}>{selectedTicket.status.replace(/_/g, ' ')}</Badge>
                  <Badge variant="outline" className={`text-xs ${priorityColors[selectedTicket.priority] || ''}`}>{selectedTicket.priority}</Badge>
                </div>
                <p className="text-sm text-neutral-300 whitespace-pre-wrap">{selectedTicket.message}</p>
              </div>

              {/* Conversation Thread */}
              {selectedTicket.responses && selectedTicket.responses.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-neutral-400">Conversation</h4>
                  {selectedTicket.responses.map((response) => (
                    <div
                      key={response.id}
                      className={`rounded-lg p-3 ${
                        response.isStaff
                          ? 'bg-emerald-500/10 border border-emerald-500/30 ml-4'
                          : 'bg-neutral-800/50 border border-neutral-700/50 mr-4'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium ${response.isStaff ? 'text-emerald-400' : 'text-neutral-400'}`}>
                          {response.isStaff ? 'Staff Response' : 'User'}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {new Date(response.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-300 whitespace-pre-wrap">{response.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Form */}
              {selectedTicket.status !== 'CLOSED' && (
                <div className="space-y-3 border-t border-neutral-800 pt-4">
                  <h4 className="text-sm font-medium text-neutral-400">Send Reply</h4>
                  <Textarea
                    placeholder="Type your reply..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 min-h-[100px] focus:border-emerald-500"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="send-email"
                        checked={sendEmail}
                        onCheckedChange={setSendEmail}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                      <Label htmlFor="send-email" className="text-sm text-neutral-400 cursor-pointer">
                        Send email to user
                      </Label>
                    </div>
                    <Button
                      onClick={sendReply}
                      disabled={isSendingReply || !replyMessage.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {isSendingReply ? (
                        'Sending...'
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Reply
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex items-center gap-2 border-t border-neutral-800 pt-4">
                {selectedTicket.status !== 'CLOSED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => closeTicket(selectedTicket.id)}
                    className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Close Ticket
                  </Button>
                )}
                <Select value={selectedTicket.status} onValueChange={(v) => updateStatus(selectedTicket.id, v)}>
                  <SelectTrigger className="w-full sm:w-[170px] bg-neutral-800 border-neutral-700 text-white text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-800 border-neutral-700">
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="WAITING_ON_CUSTOMER">Waiting on Customer</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
