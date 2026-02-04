'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  User,
  Calendar,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { APPROVAL_ACTION_LABELS, type ApprovalActionType } from '@/lib/constants';

type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED' | 'EXECUTED' | 'FAILED';

interface ApprovalRequest {
  id: string;
  actionType: ApprovalActionType;
  resourceType: string;
  resourceId: string | null;
  payload: Record<string, unknown>;
  requesterId: string;
  requesterNote: string | null;
  status: ApprovalStatus;
  reviewerId: string | null;
  reviewerNote: string | null;
  reviewedAt: string | null;
  executionResult: Record<string, unknown> | null;
  executedAt: string | null;
  executionError: string | null;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  expiresAt: string | null;
  createdAt: string;
  requester: {
    fullName: string;
    email: string;
    role: string;
  };
  reviewer?: {
    fullName: string;
    email: string;
  };
}

const statusConfig: Record<ApprovalStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  PENDING: {
    label: 'Pending Review',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    icon: <Clock className="h-5 w-5 text-amber-400" />,
  },
  APPROVED: {
    label: 'Approved',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-400" />,
  },
  REJECTED: {
    label: 'Rejected',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
    icon: <XCircle className="h-5 w-5 text-red-400" />,
  },
  EXPIRED: {
    label: 'Expired',
    color: 'text-neutral-400',
    bg: 'bg-neutral-500/10 border-neutral-500/20',
    icon: <Clock className="h-5 w-5 text-neutral-400" />,
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'text-neutral-400',
    bg: 'bg-neutral-500/10 border-neutral-500/20',
    icon: <XCircle className="h-5 w-5 text-neutral-400" />,
  },
  EXECUTED: {
    label: 'Executed',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-400" />,
  },
  FAILED: {
    label: 'Failed',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
    icon: <AlertCircle className="h-5 w-5 text-red-400" />,
  },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Low', color: 'text-neutral-400' },
  NORMAL: { label: 'Normal', color: 'text-blue-400' },
  HIGH: { label: 'High', color: 'text-orange-400' },
  URGENT: { label: 'Urgent', color: 'text-red-400' },
};

export default function ApprovalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [request, setRequest] = useState<ApprovalRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [canApprove, setCanApprove] = useState(false);

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const fetchRequest = async () => {
    try {
      const response = await fetch(`/api/approvals/${id}`);
      const data = await response.json();

      if (data.success) {
        setRequest(data.data);
        setCanApprove(data.canApprove);
      } else {
        setError(data.error || 'Failed to load approval request');
      }
    } catch {
      setError('Failed to load approval request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && !reviewNote.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/approvals/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note: reviewNote }),
      });
      const data = await response.json();

      if (data.success) {
        await fetchRequest();
        setReviewNote('');
      } else {
        setError(data.error || `Failed to ${action} request`);
      }
    } catch {
      setError(`Failed to ${action} request`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatPayloadValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (error && !request) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-xl font-semibold text-white">Request Not Found</h1>
          <p className="text-neutral-400">{error}</p>
          <Button
            onClick={() => router.push('/approvals')}
            className="bg-neutral-800 hover:bg-neutral-700 text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Approvals
          </Button>
        </div>
      </div>
    );
  }

  if (!request) return null;

  const status = statusConfig[request.status];
  const priority = priorityConfig[request.priority];
  const actionLabel = APPROVAL_ACTION_LABELS[request.actionType] || request.actionType;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.push('/approvals')}
        className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Approvals</span>
      </button>

      {/* Header */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{actionLabel}</h1>
              <span className={cn('text-xs font-medium px-2 py-1 rounded-full border', status.bg, status.color)}>
                {status.label}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-neutral-400">
              <span className="flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                {request.resourceType}
              </span>
              {request.resourceId && (
                <>
                  <ChevronRight className="h-4 w-4" />
                  <span className="font-mono text-xs">{request.resourceId}</span>
                </>
              )}
            </div>
          </div>
          <span className={cn('text-sm font-medium', priority.color)}>{priority.label} Priority</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payload */}
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-800">
              <h2 className="text-lg font-semibold text-white">Request Details</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {Object.entries(request.payload).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-start gap-4">
                    <span className="text-neutral-400 text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="text-white text-sm text-right font-mono max-w-[60%] break-all">
                      {formatPayloadValue(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Requester Note */}
          {request.requesterNote && (
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
              <h3 className="text-sm font-medium text-neutral-300 mb-2">Requester&apos;s Note</h3>
              <p className="text-neutral-400 text-sm">{request.requesterNote}</p>
            </div>
          )}

          {/* Review Actions */}
          {request.status === 'PENDING' && canApprove && (
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">Review This Request</h2>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">
                  Note (required for rejection)
                </label>
                <Textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Add a note for the requester..."
                  className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 min-h-[100px]"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-lg">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={() => handleAction('approve')}
                  disabled={isSubmitting}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Approve
                </Button>
                <Button
                  onClick={() => handleAction('reject')}
                  disabled={isSubmitting}
                  variant="outline"
                  className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Reject
                </Button>
              </div>
            </div>
          )}

          {/* Review Result */}
          {request.reviewerNote && (
            <div className={cn(
              'border rounded-xl p-6',
              request.status === 'APPROVED' || request.status === 'EXECUTED'
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-red-500/5 border-red-500/20'
            )}>
              <h3 className="text-sm font-medium text-neutral-300 mb-2">Reviewer&apos;s Note</h3>
              <p className="text-neutral-400 text-sm">{request.reviewerNote}</p>
            </div>
          )}

          {/* Execution Error */}
          {request.executionError && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
              <h3 className="text-sm font-medium text-red-400 mb-2">Execution Error</h3>
              <p className="text-neutral-400 text-sm font-mono">{request.executionError}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Requester */}
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-medium text-neutral-300">Requested By</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
                <User className="h-5 w-5 text-neutral-400" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">{request.requester.fullName}</p>
                <p className="text-neutral-500 text-xs">{request.requester.email}</p>
              </div>
            </div>
            <div className="text-xs text-neutral-500">
              {request.requester.role.replace(/_/g, ' ')}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-medium text-neutral-300">Timeline</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-neutral-500" />
                <div>
                  <p className="text-neutral-400">Created</p>
                  <p className="text-white text-xs">{formatDate(request.createdAt)}</p>
                </div>
              </div>

              {request.expiresAt && request.status === 'PENDING' && (
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <div>
                    <p className="text-neutral-400">Expires</p>
                    <p className="text-amber-400 text-xs">{formatDate(request.expiresAt)}</p>
                  </div>
                </div>
              )}

              {request.reviewedAt && (
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-neutral-500" />
                  <div>
                    <p className="text-neutral-400">Reviewed</p>
                    <p className="text-white text-xs">{formatDate(request.reviewedAt)}</p>
                    {request.reviewer && (
                      <p className="text-neutral-500 text-xs">by {request.reviewer.fullName}</p>
                    )}
                  </div>
                </div>
              )}

              {request.executedAt && (
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <div>
                    <p className="text-neutral-400">Executed</p>
                    <p className="text-emerald-400 text-xs">{formatDate(request.executedAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Request ID */}
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
            <h3 className="text-sm font-medium text-neutral-300 mb-2">Request ID</h3>
            <p className="text-neutral-500 text-xs font-mono break-all">{request.id}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
