'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Wallet, Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface PaymentData {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  planTier: string;
  billingCycle: string;
  status: string;
  notes: string | null;
  createdAt: string;
  user: {
    email: string;
    fullName: string;
  };
}

interface Tier {
  id: string;
  name: string;
  displayName: string;
}

interface UserSearchResult {
  id: string;
  email: string;
  fullName: string;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Record Payment Dialog State
  const [showRecordDialog, setShowRecordDialog] = useState(false);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'RWF',
    paymentMethod: 'MANUAL',
    planTier: '',
    billingCycle: 'MONTHLY',
    notes: '',
    extendSubscription: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/payments?${params}`);
      const data = await res.json();
      if (data.success) {
        setPayments(data.data);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotal(data.pagination?.total || 0);
      }
    } catch (error) {
      toast.error('Failed to load payments');
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, startDate, endDate]);

  const fetchTiers = async () => {
    try {
      const res = await fetch('/api/subscriptions/tiers');
      const data = await res.json();
      if (data.success) {
        setTiers(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch tiers');
    }
  };

  const searchUsers = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setUserSearchResults([]);
      return;
    }
    setIsSearchingUsers(true);
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(query)}&limit=10`);
      const data = await res.json();
      if (data.success) {
        setUserSearchResults(data.data.map((u: any) => ({
          id: u.id,
          email: u.email,
          fullName: u.fullName,
        })));
      }
    } catch (error) {
      console.error('Failed to search users');
    } finally {
      setIsSearchingUsers(false);
    }
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      searchUsers(userSearch);
    }, 300);
    return () => clearTimeout(debounce);
  }, [userSearch, searchUsers]);

  useEffect(() => {
    if (showRecordDialog) {
      fetchTiers();
    }
  }, [showRecordDialog]);

  const handleRecordPayment = async () => {
    if (!selectedUser) {
      toast.error('Please select a user');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!formData.planTier) {
      toast.error('Please select a plan tier');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          amount: parseFloat(formData.amount),
          currency: formData.currency,
          paymentMethod: formData.paymentMethod,
          planTier: formData.planTier,
          billingCycle: formData.billingCycle,
          notes: formData.notes || null,
          extendSubscription: formData.extendSubscription,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Payment recorded successfully');
        setShowRecordDialog(false);
        resetForm();
        fetchPayments();
      } else {
        toast.error(data.error || 'Failed to record payment');
      }
    } catch (error) {
      toast.error('Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedUser(null);
    setUserSearch('');
    setUserSearchResults([]);
    setFormData({
      amount: '',
      currency: 'RWF',
      paymentMethod: 'MANUAL',
      planTier: '',
      billingCycle: 'MONTHLY',
      notes: '',
      extendSubscription: false,
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'SUCCESSFUL':
        return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'PENDING':
      case 'PROCESSING':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'FAILED':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'CANCELLED':
      case 'REFUNDED':
        return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/30';
      default:
        return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/30';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Payments</h1>
          <p className="text-neutral-400 text-sm mt-1">{total} total payments</p>
        </div>
        <Button onClick={() => setShowRecordDialog(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" /> Record Payment
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[160px] bg-neutral-900 border-neutral-800 text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-neutral-900 border-neutral-800">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="SUCCESSFUL">Successful</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PROCESSING">Processing</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
            <SelectItem value="REFUNDED">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="w-full sm:w-[160px] bg-neutral-900 border-neutral-800 text-white"
            placeholder="Start Date"
          />
          <span className="text-neutral-500 hidden sm:block">to</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="w-full sm:w-[160px] bg-neutral-900 border-neutral-800 text-white"
            placeholder="End Date"
          />
        </div>
      </div>

      {/* Table */}
      <Card className="bg-neutral-900/80 border-neutral-800/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="text-left p-4 text-sm font-medium text-neutral-400">User</th>
                  <th className="text-left p-4 text-sm font-medium text-neutral-400">Amount</th>
                  <th className="text-left p-4 text-sm font-medium text-neutral-400 hidden md:table-cell">Method</th>
                  <th className="text-left p-4 text-sm font-medium text-neutral-400 hidden md:table-cell">Tier</th>
                  <th className="text-left p-4 text-sm font-medium text-neutral-400">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-neutral-400 hidden md:table-cell">Date</th>
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
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-neutral-500">
                      <Wallet className="h-12 w-12 mx-auto mb-2 text-neutral-600" />
                      No payments found
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30">
                      <td className="p-4">
                        <div>
                          <p className="text-sm font-medium text-white">{payment.user.fullName}</p>
                          <p className="text-xs text-neutral-500">{payment.user.email}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-medium text-white">
                          {payment.amount.toLocaleString()} {payment.currency}
                        </p>
                      </td>
                      <td className="p-4 text-sm text-neutral-300 hidden md:table-cell">{payment.paymentMethod}</td>
                      <td className="p-4 hidden md:table-cell">
                        <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 text-xs">
                          {payment.planTier}
                        </Badge>
                        <span className="text-xs text-neutral-500 ml-1">({payment.billingCycle})</span>
                      </td>
                      <td className="p-4">
                        <Badge className={getStatusBadgeClass(payment.status)} variant="outline">
                          {payment.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-neutral-400 hidden md:table-cell">
                        {new Date(payment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-white">
                          View
                        </Button>
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

      {/* Record Payment Dialog */}
      <Dialog open={showRecordDialog} onOpenChange={(open) => { setShowRecordDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg bg-neutral-900 border-neutral-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-400" />
              Record Payment
            </DialogTitle>
            <DialogDescription className="text-neutral-400">
              Manually record a payment for a user
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* User Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">User</label>
              {selectedUser ? (
                <div className="flex items-center justify-between bg-neutral-800 rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium text-white">{selectedUser.fullName}</p>
                    <p className="text-xs text-neutral-500">{selectedUser.email}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedUser(null); setUserSearch(''); }}
                    className="text-neutral-400 hover:text-white">Change</Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                  <Input
                    placeholder="Search by email or name..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-9 bg-neutral-800 border-neutral-700 text-white"
                  />
                  {userSearchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {userSearchResults.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => { setSelectedUser(user); setUserSearchResults([]); setUserSearch(''); }}
                          className="w-full text-left px-3 py-2 hover:bg-neutral-700 transition-colors"
                        >
                          <p className="text-sm font-medium text-white">{user.fullName}</p>
                          <p className="text-xs text-neutral-500">{user.email}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {isSearchingUsers && userSearch.length >= 2 && (
                    <div className="absolute z-10 w-full mt-1 bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-center text-neutral-400 text-sm">
                      Searching...
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Amount and Currency */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">Amount</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="bg-neutral-800 border-neutral-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">Currency</label>
                <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                  <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-800 border-neutral-700">
                    <SelectItem value="RWF">RWF</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Payment Method</label>
              <Select value={formData.paymentMethod} onValueChange={(v) => setFormData({ ...formData, paymentMethod: v })}>
                <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700">
                  <SelectItem value="MANUAL">Manual</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Plan Tier and Billing Cycle */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">Plan Tier</label>
                <Select value={formData.planTier} onValueChange={(v) => setFormData({ ...formData, planTier: v })}>
                  <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                    <SelectValue placeholder="Select tier" />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-800 border-neutral-700">
                    {tiers.map((tier) => (
                      <SelectItem key={tier.id} value={tier.name}>{tier.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">Billing Cycle</label>
                <Select value={formData.billingCycle} onValueChange={(v) => setFormData({ ...formData, billingCycle: v })}>
                  <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-800 border-neutral-700">
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Notes</label>
              <textarea
                placeholder="Optional notes about this payment..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full min-h-[80px] px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Extend Subscription Checkbox */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.extendSubscription}
                onChange={(e) => setFormData({ ...formData, extendSubscription: e.target.checked })}
                className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
              />
              <span className="text-sm text-neutral-300">Extend subscription upon successful payment</span>
            </label>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t border-neutral-800">
              <Button variant="outline" onClick={() => { setShowRecordDialog(false); resetForm(); }}
                className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">
                Cancel
              </Button>
              <Button onClick={handleRecordPayment} disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {isSubmitting ? 'Recording...' : 'Record Payment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
