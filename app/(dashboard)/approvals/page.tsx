'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import {
  ClipboardCheck,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Ban,
  Play,
  X,
} from 'lucide-react';
import { APPROVAL_ACTION_LABELS, type ApprovalActionType } from '@/lib/constants';

interface ApprovalRequest {
  id: string;
  actionType: ApprovalActionType;
  resourceType: string;
  resourceId: string | null;
  payload: Record<string, unknown>;
  status: string;
  priority: string;
  requesterNote: string | null;
  reviewerNote: string | null;
  expiresAt: string | null;
  createdAt: string;
  reviewedAt: string | null;
  executedAt: string | null;
  executionError: string | null;
  requester: { fullName: string; email: string; role: string };
  reviewer: { fullName: string; email: string } | null;
}

const STATUS_CONFIG: Record<
  string,
  { color: string; bgColor: string; icon: React.ElementType }
> = {
  PENDING: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10 border-yellow-500/30',
    icon: Clock,
  },
  APPROVED: {
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/30',
    icon: CheckCircle,
  },
  EXECUTED: {
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/30',
    icon: CheckCircle,
  },
  REJECTED: {
    color: 'text-red-400',
    bgColor: 'bg-red-500/10 border-red-500/30',
    icon: XCircle,
  },
  EXPIRED: {
    color: 'text-neutral-400',
    bgColor: 'bg-neutral-500/10 border-neutral-500/30',
    icon: AlertTriangle,
  },
  CANCELLED: {
    color: 'text-neutral-400',
    bgColor: 'bg-neutral-500/10 border-neutral-500/30',
    icon: Ban,
  },
  FAILED: {
    color: 'text-red-400',
    bgColor: 'bg-red-500/10 border-red-500/30',
    icon: AlertTriangle,
  },
};

const PRIORITY_CONFIG: Record<string, { color: string; bgColor: string }> = {
  LOW: { color: 'text-neutral-400', bgColor: 'bg-neutral-500/10 border-neutral-500/30' },
  NORMAL: { color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/30' },
  HIGH: { color: 'text-orange-400', bgColor: 'bg-orange-500/10 border-orange-500/30' },
  URGENT: { color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/30' },
};

export default function ApprovalsPage() {
  const { admin, hasPermission } = useAuth();
  const canApprove = hasPermission('approvals.approve');

  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pendingCount, setPendingCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionTypeFilter, setActionTypeFilter] = useState('all');

  // Review dialog state
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail dialog state
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailRequest, setDetailRequest] = useState<ApprovalRequest | null>(null);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (actionTypeFilter !== 'all') params.set('actionType', actionTypeFilter);

      const res = await fetch(`/api/approvals?${params}`);
      const data = await res.json();
      if (data.success) {
        setRequests(data.data);
        setTotalPages(data.pagination?.totalPages || 1);
        setPendingCount(data.pendingCount || 0);
      }
    } catch {
      toast.error('Failed to load approval requests');
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, actionTypeFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleReview = async () => {
    if (!selectedRequest || !reviewAction) return;
    if (reviewAction === 'reject' && !reviewNote.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/approvals/${selectedRequest.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: reviewAction, note: reviewNote }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          reviewAction === 'approve'
            ? 'Request approved and executed'
            : 'Request rejected'
        );
        setShowReviewDialog(false);
        setSelectedRequest(null);
        setReviewAction(null);
        setReviewNote('');
        fetchRequests();
      } else {
        toast.error(data.error || 'Failed to process request');
      }
    } catch {
      toast.error('Failed to process request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (requestId: string) => {
    try {
      const res = await fetch(`/api/approvals/${requestId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Request cancelled');
        fetchRequests();
      } else {
        toast.error(data.error || 'Failed to cancel request');
      }
    } catch {
      toast.error('Failed to cancel request');
    }
  };

  const openReviewDialog = (request: ApprovalRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setReviewAction(action);
    setReviewNote('');
    setShowReviewDialog(true);
  };

  const openDetailDialog = (request: ApprovalRequest) => {
    setDetailRequest(request);
    setShowDetailDialog(true);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRole = (role: string) => {
    return role.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <ClipboardCheck className="h-5 w-5 text-emerald-400" />
            </div>
            Approval Queue
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            {canApprove
              ? 'Review and approve pending requests'
              : 'Track your approval requests'}
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 px-3 py-1.5">
            {pendingCount} pending
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px] bg-neutral-900 border-neutral-800 text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-neutral-900 border-neutral-800">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="EXECUTED">Executed</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={actionTypeFilter}
          onValueChange={(v) => {
            setActionTypeFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px] bg-neutral-900 border-neutral-800 text-white">
            <SelectValue placeholder="Action Type" />
          </SelectTrigger>
          <SelectContent className="bg-neutral-900 border-neutral-800">
            <SelectItem value="all">All Actions</SelectItem>
            {Object.entries(APPROVAL_ACTION_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Requests List */}
      <Card className="bg-neutral-900/80 border-neutral-800/50 backdrop-blur-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 bg-neutral-800" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-neutral-800/50 flex items-center justify-center mx-auto mb-4">
                <ClipboardCheck className="h-8 w-8 text-neutral-600" />
              </div>
              <p className="text-neutral-500 text-lg">No approval requests found</p>
              <p className="text-neutral-600 text-sm mt-1">
                {statusFilter !== 'all' || actionTypeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Requests will appear here when actions need approval'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-800/50">
              {requests.map((request) => {
                const StatusIcon = STATUS_CONFIG[request.status]?.icon || Clock;
                const statusConfig = STATUS_CONFIG[request.status];
                const priorityConfig = PRIORITY_CONFIG[request.priority];
                const isOwner = request.requester.email === admin?.email;
                const isPending = request.status === 'PENDING';

                return (
                  <div
                    key={request.id}
                    className="p-5 hover:bg-neutral-800/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-medium text-white text-[15px]">
                            {APPROVAL_ACTION_LABELS[request.actionType] ||
                              request.actionType}
                          </span>
                          <Badge
                            className={cn(
                              'border',
                              statusConfig?.bgColor,
                              statusConfig?.color
                            )}
                            variant="outline"
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {request.status}
                          </Badge>
                          {(request.priority === 'HIGH' ||
                            request.priority === 'URGENT') && (
                            <Badge
                              className={cn(
                                'border',
                                priorityConfig?.bgColor,
                                priorityConfig?.color
                              )}
                              variant="outline"
                            >
                              {request.priority}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-neutral-400 mb-1">
                          <span className="text-neutral-500">Requested by</span>{' '}
                          <span className="text-neutral-300">
                            {request.requester.fullName}
                          </span>
                          <span className="text-neutral-600 mx-2">•</span>
                          <span className="text-neutral-500">
                            {formatRole(request.requester.role)}
                          </span>
                          <span className="text-neutral-600 mx-2">•</span>
                          <span className="text-neutral-500">
                            {formatDate(request.createdAt)}
                          </span>
                        </div>
                        {request.requesterNote && (
                          <p className="text-sm text-neutral-500 italic mt-2">
                            &ldquo;{request.requesterNote}&rdquo;
                          </p>
                        )}
                        {request.reviewerNote && request.reviewer && (
                          <div className="mt-2 text-sm">
                            <span className="text-neutral-500">
                              Review by {request.reviewer.fullName}:
                            </span>{' '}
                            <span className="text-neutral-400">
                              {request.reviewerNote}
                            </span>
                          </div>
                        )}
                        {request.executionError && (
                          <div className="mt-2 text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
                            Error: {request.executionError}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isPending && canApprove && (
                          <>
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-500 text-white h-9"
                              onClick={() => openReviewDialog(request, 'approve')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1.5" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500/50 text-red-400 hover:bg-red-500/10 h-9"
                              onClick={() => openReviewDialog(request, 'reject')}
                            >
                              <XCircle className="h-4 w-4 mr-1.5" />
                              Reject
                            </Button>
                          </>
                        )}
                        {isPending && isOwner && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-neutral-400 hover:text-white h-9"
                            onClick={() => handleCancel(request.id)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-neutral-400 hover:text-white h-9 w-9 p-0"
                          onClick={() => openDetailDialog(request)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-neutral-800/50">
              <p className="text-sm text-neutral-400">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="border-neutral-700 text-neutral-300 h-9"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="border-neutral-700 text-neutral-300 h-9"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reviewAction === 'approve' ? (
                <>
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                  Approve Request
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-400" />
                  Reject Request
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-neutral-400">
              {selectedRequest && (
                <>
                  {APPROVAL_ACTION_LABELS[selectedRequest.actionType] ||
                    selectedRequest.actionType}{' '}
                  • Requested by {selectedRequest.requester.fullName}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              {/* Payload Preview */}
              <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700/50">
                <p className="text-xs text-neutral-500 uppercase font-medium mb-2">
                  Request Details
                </p>
                <pre className="text-xs text-neutral-300 overflow-auto max-h-48 font-mono">
                  {JSON.stringify(selectedRequest.payload, null, 2)}
                </pre>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">
                  {reviewAction === 'reject'
                    ? 'Rejection Reason (Required)'
                    : 'Note (Optional)'}
                </label>
                <Textarea
                  placeholder={
                    reviewAction === 'reject'
                      ? 'Please explain why this request is being rejected...'
                      : 'Add any notes for the requester...'
                  }
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 min-h-[100px]"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowReviewDialog(false)}
              className="border-neutral-700 text-neutral-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReview}
              disabled={isSubmitting || (reviewAction === 'reject' && !reviewNote.trim())}
              className={cn(
                reviewAction === 'approve'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-red-600 hover:bg-red-500',
                'text-white'
              )}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {reviewAction === 'approve' ? (
                <>
                  <Play className="h-4 w-4 mr-1.5" />
                  Approve & Execute
                </>
              ) : (
                'Reject Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>

          {detailRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-neutral-500 uppercase font-medium mb-1">
                    Action
                  </p>
                  <p className="text-sm text-white">
                    {APPROVAL_ACTION_LABELS[detailRequest.actionType] ||
                      detailRequest.actionType}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 uppercase font-medium mb-1">
                    Status
                  </p>
                  <Badge
                    className={cn(
                      'border',
                      STATUS_CONFIG[detailRequest.status]?.bgColor,
                      STATUS_CONFIG[detailRequest.status]?.color
                    )}
                    variant="outline"
                  >
                    {detailRequest.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 uppercase font-medium mb-1">
                    Requester
                  </p>
                  <p className="text-sm text-white">{detailRequest.requester.fullName}</p>
                  <p className="text-xs text-neutral-500">{detailRequest.requester.email}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 uppercase font-medium mb-1">
                    Created
                  </p>
                  <p className="text-sm text-white">{formatDate(detailRequest.createdAt)}</p>
                </div>
                {detailRequest.reviewer && (
                  <>
                    <div>
                      <p className="text-xs text-neutral-500 uppercase font-medium mb-1">
                        Reviewer
                      </p>
                      <p className="text-sm text-white">{detailRequest.reviewer.fullName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500 uppercase font-medium mb-1">
                        Reviewed
                      </p>
                      <p className="text-sm text-white">
                        {detailRequest.reviewedAt
                          ? formatDate(detailRequest.reviewedAt)
                          : '-'}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {detailRequest.requesterNote && (
                <div>
                  <p className="text-xs text-neutral-500 uppercase font-medium mb-1">
                    Requester Note
                  </p>
                  <p className="text-sm text-neutral-300 bg-neutral-800/50 rounded-lg p-3">
                    {detailRequest.requesterNote}
                  </p>
                </div>
              )}

              {detailRequest.reviewerNote && (
                <div>
                  <p className="text-xs text-neutral-500 uppercase font-medium mb-1">
                    Reviewer Note
                  </p>
                  <p className="text-sm text-neutral-300 bg-neutral-800/50 rounded-lg p-3">
                    {detailRequest.reviewerNote}
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs text-neutral-500 uppercase font-medium mb-2">
                  Payload
                </p>
                <pre className="text-xs text-neutral-300 bg-neutral-800/50 rounded-lg p-4 overflow-auto max-h-48 font-mono">
                  {JSON.stringify(detailRequest.payload, null, 2)}
                </pre>
              </div>

              {detailRequest.executionError && (
                <div>
                  <p className="text-xs text-neutral-500 uppercase font-medium mb-1">
                    Execution Error
                  </p>
                  <p className="text-sm text-red-400 bg-red-500/10 rounded-lg p-3">
                    {detailRequest.executionError}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDetailDialog(false)}
              className="border-neutral-700 text-neutral-300"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
