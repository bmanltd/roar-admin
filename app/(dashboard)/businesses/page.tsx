'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, MapPin, Phone, Mail, Globe, Edit2, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface BusinessData {
  id: string;
  userId: string;
  siteName: string;
  tin: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  currency: string;
  taxRate: number;
  updatedAt: string;
}

interface BusinessDetail extends BusinessData {
  user?: {
    email: string;
    fullName: string;
    isActive: boolean;
    subscription?: {
      status: string;
      tier?: { name: string; displayName: string };
    } | null;
  };
}

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<BusinessData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Detail Dialog state
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessDetail | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Edit Dialog state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    siteName: '',
    tin: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    currency: 'RWF',
    taxRate: '',
  });

  const fetchBusinesses = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/businesses');
      const data = await res.json();
      if (data.success) setBusinesses(data.data);
    } catch {
      toast.error('Failed to load businesses');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const viewBusiness = async (businessId: string) => {
    setDetailLoading(true);
    setShowDetailDialog(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedBusiness(data.data);
      } else {
        toast.error('Failed to load business details');
      }
    } catch {
      toast.error('Failed to load business details');
    } finally {
      setDetailLoading(false);
    }
  };

  const openEditDialog = (business: BusinessDetail) => {
    setEditForm({
      siteName: business.siteName || '',
      tin: business.tin || '',
      contactEmail: business.contactEmail || '',
      contactPhone: business.contactPhone || '',
      address: business.address || '',
      currency: business.currency || 'RWF',
      taxRate: business.taxRate !== undefined ? (business.taxRate * 100).toString() : '',
    });
    setShowEditDialog(true);
  };

  const handleUpdateBusiness = async () => {
    if (!selectedBusiness) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/businesses/${selectedBusiness.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteName: editForm.siteName,
          tin: editForm.tin || null,
          contactEmail: editForm.contactEmail || null,
          contactPhone: editForm.contactPhone || null,
          address: editForm.address || null,
          currency: editForm.currency,
          taxRate: editForm.taxRate ? parseFloat(editForm.taxRate) / 100 : 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Business updated successfully');
        setShowEditDialog(false);
        fetchBusinesses();
        // Update the selected business with new data
        setSelectedBusiness(prev => prev ? { ...prev, ...data.data } : null);
      } else {
        toast.error(data.error || 'Failed to update business');
      }
    } catch {
      toast.error('Failed to update business');
    } finally {
      setEditLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Businesses</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 bg-neutral-800" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Businesses</h1>
        <p className="text-neutral-400 text-sm mt-1">{businesses.length} registered businesses</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {businesses.length === 0 ? (
          <p className="text-neutral-500 col-span-full text-center py-12">No business data synced yet</p>
        ) : (
          businesses.map((biz) => (
            <Card
              key={biz.id}
              className="bg-neutral-900/80 border-neutral-800/50 cursor-pointer hover:border-neutral-700 transition-colors"
              onClick={() => viewBusiness(biz.id)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-emerald-400" />
                    {biz.siteName}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-neutral-400 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      viewBusiness(biz.id);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {biz.tin && <div className="flex items-center gap-2 text-neutral-400"><span className="text-neutral-500">TIN:</span> {biz.tin}</div>}
                {biz.contactEmail && <div className="flex items-center gap-2 text-neutral-400"><Mail className="h-3 w-3" /> {biz.contactEmail}</div>}
                {biz.contactPhone && <div className="flex items-center gap-2 text-neutral-400"><Phone className="h-3 w-3" /> {biz.contactPhone}</div>}
                {biz.address && <div className="flex items-center gap-2 text-neutral-400"><MapPin className="h-3 w-3" /> {biz.address}</div>}
                <div className="flex items-center gap-2 pt-2">
                  <Badge variant="outline" className="text-xs text-neutral-400">{biz.currency}</Badge>
                  <Badge variant="outline" className="text-xs text-neutral-400">Tax: {(biz.taxRate * 100).toFixed(0)}%</Badge>
                </div>
                <p className="text-xs text-neutral-600 pt-1">Last sync: {new Date(biz.updatedAt).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Business Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl bg-neutral-900 border-neutral-800 text-white max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-400" />
              {selectedBusiness?.siteName || 'Business Details'}
            </DialogTitle>
            <DialogDescription className="text-neutral-400">
              View and manage business information
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 bg-neutral-800" />)}
            </div>
          ) : selectedBusiness ? (
            <div className="space-y-6">
              {/* Business Info */}
              <div className="bg-neutral-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-white mb-3">Business Information</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-neutral-500">Name:</span>
                    <span className="text-neutral-300 ml-2">{selectedBusiness.siteName}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">TIN:</span>
                    <span className="text-neutral-300 ml-2">{selectedBusiness.tin || '-'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Email:</span>
                    <span className="text-neutral-300 ml-2">{selectedBusiness.contactEmail || '-'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Phone:</span>
                    <span className="text-neutral-300 ml-2">{selectedBusiness.contactPhone || '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-neutral-500">Address:</span>
                    <span className="text-neutral-300 ml-2">{selectedBusiness.address || '-'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Currency:</span>
                    <Badge variant="outline" className="ml-2 text-xs text-neutral-400">{selectedBusiness.currency}</Badge>
                  </div>
                  <div>
                    <span className="text-neutral-500">Tax Rate:</span>
                    <Badge variant="outline" className="ml-2 text-xs text-neutral-400">
                      {(selectedBusiness.taxRate * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="col-span-2">
                    <span className="text-neutral-500">Last Updated:</span>
                    <span className="text-neutral-300 ml-2">
                      {new Date(selectedBusiness.updatedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* User Info */}
              {selectedBusiness.user && (
                <div className="bg-neutral-800 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-white mb-3">Owner Information</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-neutral-500">Name:</span>
                      <span className="text-neutral-300 ml-2">{selectedBusiness.user.fullName}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500">Email:</span>
                      <span className="text-neutral-300 ml-2">{selectedBusiness.user.email}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500">Status:</span>
                      <Badge
                        variant="outline"
                        className={`ml-2 text-xs ${
                          selectedBusiness.user.isActive
                            ? 'text-green-400 border-green-500/30'
                            : 'text-red-400 border-red-500/30'
                        }`}
                      >
                        {selectedBusiness.user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {selectedBusiness.user.subscription && (
                      <div>
                        <span className="text-neutral-500">Subscription:</span>
                        <Badge
                          variant="outline"
                          className="ml-2 text-xs text-emerald-400 border-emerald-500/50"
                        >
                          {selectedBusiness.user.subscription.tier?.displayName || selectedBusiness.user.subscription.status}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={() => openEditDialog(selectedBusiness)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Business
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Edit Business Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md bg-neutral-900 border-neutral-800 text-white">
          <DialogHeader>
            <DialogTitle>Edit Business</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Update business information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-siteName" className="text-neutral-300">Business Name</Label>
              <Input
                id="edit-siteName"
                value={editForm.siteName}
                onChange={(e) => setEditForm(prev => ({ ...prev, siteName: e.target.value }))}
                className="bg-neutral-900 border-neutral-800 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-tin" className="text-neutral-300">TIN</Label>
              <Input
                id="edit-tin"
                value={editForm.tin}
                onChange={(e) => setEditForm(prev => ({ ...prev, tin: e.target.value }))}
                className="bg-neutral-900 border-neutral-800 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-contactEmail" className="text-neutral-300">Contact Email</Label>
              <Input
                id="edit-contactEmail"
                type="email"
                value={editForm.contactEmail}
                onChange={(e) => setEditForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                className="bg-neutral-900 border-neutral-800 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-contactPhone" className="text-neutral-300">Contact Phone</Label>
              <Input
                id="edit-contactPhone"
                value={editForm.contactPhone}
                onChange={(e) => setEditForm(prev => ({ ...prev, contactPhone: e.target.value }))}
                className="bg-neutral-900 border-neutral-800 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address" className="text-neutral-300">Address</Label>
              <Input
                id="edit-address"
                value={editForm.address}
                onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                className="bg-neutral-900 border-neutral-800 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-neutral-300">Currency</Label>
              <Select
                value={editForm.currency}
                onValueChange={(v) => setEditForm(prev => ({ ...prev, currency: v }))}
              >
                <SelectTrigger className="bg-neutral-900 border-neutral-800 text-white">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-neutral-800">
                  <SelectItem value="RWF">RWF - Rwandan Franc</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-taxRate" className="text-neutral-300">Tax Rate (%)</Label>
              <Input
                id="edit-taxRate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={editForm.taxRate}
                onChange={(e) => setEditForm(prev => ({ ...prev, taxRate: e.target.value }))}
                className="bg-neutral-900 border-neutral-800 text-white"
                placeholder="e.g., 18"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateBusiness}
              disabled={editLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {editLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
