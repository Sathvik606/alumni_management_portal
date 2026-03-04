import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty } from '@/components/ui/combobox';
import { donationService } from '@/services/donationService';
import useAuthStore from '@/store/authStore';
import { Skeleton } from '@/components/ui/skeleton';
import { Gift, Pencil, Trash2, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { exportDonations } from '@/utils/exportUtils';

const defaultForm = {
  amount: '',
  currency: 'INR',
  purpose: '',
  message: '',
  paymentMethod: 'online',
  status: 'completed',
};
const ITEMS_PER_PAGE = 20;

export default function DonationsPage() {
  const { user } = useAuthStore();
  const [donations, setDonations] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modal, setModal] = useState({ open: false, donation: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });
  const [currentPage, setCurrentPage] = useState(1);

  const isAdmin = user?.role === 'admin';

  // Calculate pagination
  const totalPages = Math.ceil(donations.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedDonations = donations.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const fetchDonations = async () => {
    setError('');
    setLoading(true);
    try {
      const data = await donationService.list(isAdmin ? 'admin' : 'alumni');
      setDonations(data);
    } catch (err) {
      setError('Unable to load donations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMutating(true);
    setError('');
    setSuccess('');
    
    // Validation
    if (!form.amount || Number(form.amount) <= 0) {
      setError('Amount must be greater than 0');
      setMutating(false);
      return;
    }
    if (!form.purpose || form.purpose.trim().length < 3) {
      setError('Purpose must be at least 3 characters');
      setMutating(false);
      return;
    }
    if (form.message && form.message.length > 500) {
      setError('Message must be less than 500 characters');
      setMutating(false);
      return;
    }
    
    try {
      const optimistic = { ...form, _id: Math.random().toString(36), donatedBy: user, createdAt: new Date().toISOString() };
      setDonations((prev) => [optimistic, ...prev]);
      const saved = await donationService.create({ ...form, amount: Number(form.amount) });
      setDonations((prev) => [saved, ...prev.filter((d) => d._id !== optimistic._id)]);
      setForm(defaultForm);
      setSuccess('Donation recorded successfully.');
      toast.success('Donation recorded successfully!', {
        description: `${form.currency} ${form.amount} for ${form.purpose}`,
      });
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to record donation';
      setError(errorMsg);
      setDonations((prev) => prev.filter((d) => !d._id?.startsWith('0.')));
      toast.error('Failed to record donation', {
        description: errorMsg,
      });
    } finally {
      setMutating(false);
    }
  };

  const openEdit = (donation) => {
    if (!isAdmin) return;
    setModal({ open: true, donation });
  };

  const handleUpdate = async () => {
    if (!modal.donation || !isAdmin) return;
    setMutating(true);
    setError('');
    setSuccess('');
    
    // Validation
    if (!modal.donation.amount || Number(modal.donation.amount) <= 0) {
      setError('Amount must be greater than 0');
      setMutating(false);
      return;
    }
    if (!modal.donation.purpose || modal.donation.purpose.trim().length < 3) {
      setError('Purpose must be at least 3 characters');
      setMutating(false);
      return;
    }
    if (modal.donation.message && modal.donation.message.length > 500) {
      setError('Message must be less than 500 characters');
      setMutating(false);
      return;
    }
    
    try {
      const updated = await donationService.update(modal.donation._id, {
        amount: Number(modal.donation.amount),
        currency: modal.donation.currency,
        purpose: modal.donation.purpose,
        message: modal.donation.message,
        paymentMethod: modal.donation.paymentMethod,
        status: modal.donation.status,
      });
      setDonations((prev) => prev.map((d) => (d._id === updated._id ? updated : d)));
      setModal({ open: false, donation: null });
      setSuccess('Donation updated.');
      toast.success('Donation updated!', {
        description: 'Changes have been saved successfully.',
      });
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to update donation';
      setError(errorMsg);
      toast.error('Failed to update donation', {
        description: errorMsg,
      });
    } finally {
      setMutating(false);
    }
  };

  const handleDelete = async (id) => {
    setMutating(true);
    setError('');
    setSuccess('');
    try {
      await donationService.remove(id);
      setDonations((prev) => prev.filter((d) => d._id !== id));
      setDeleteDialog({ open: false, id: null });
      setSuccess('Donation deleted.');
      toast.success('Donation deleted', {
        description: 'The donation record has been removed.',
      });
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to delete donation';
      setError(errorMsg);
      toast.error('Failed to delete donation', {
        description: errorMsg,
      });
    } finally {
      setMutating(false);
    }
  };

  const totalAmount = useMemo(() => donations.reduce((sum, d) => sum + (d.amount || 0), 0), [donations]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Donations</p>
          <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Track contributions in real time</h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Record donation</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Combobox value={form.currency} onValueChange={(value) => setForm((p) => ({ ...p, currency: value }))}>
                    <ComboboxInput placeholder="Select currency" />
                    <ComboboxContent>
                      <ComboboxList>
                        <ComboboxItem value="INR">INR (Indian Rupee)</ComboboxItem>
                        <ComboboxItem value="USD">USD (US Dollar)</ComboboxItem>
                      </ComboboxList>
                      <ComboboxEmpty>No currency found.</ComboboxEmpty>
                    </ComboboxContent>
                  </Combobox>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Combobox value={form.status} onValueChange={(value) => setForm((p) => ({ ...p, status: value }))}>
                    <ComboboxInput placeholder="Select status" />
                    <ComboboxContent>
                      <ComboboxList>
                        <ComboboxItem value="completed">Completed</ComboboxItem>
                        <ComboboxItem value="pledged">Pledged</ComboboxItem>
                        <ComboboxItem value="cancelled">Cancelled</ComboboxItem>
                      </ComboboxList>
                      <ComboboxEmpty>No status found.</ComboboxEmpty>
                    </ComboboxContent>
                  </Combobox>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Purpose</Label>
                <Input
                  required
                  minLength={3}
                  maxLength={100}
                  placeholder="Scholarship fund"
                  value={form.purpose}
                  onChange={(e) => setForm((p) => ({ ...p, purpose: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Message (optional)</Label>
                <Textarea
                  rows={3}
                  maxLength={500}
                  placeholder="Notes for the admin"
                  value={form.message}
                  onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Payment method</Label>
                <Combobox value={form.paymentMethod} onValueChange={(value) => setForm((p) => ({ ...p, paymentMethod: value }))}>
                  <ComboboxInput placeholder="Select payment method" />
                  <ComboboxContent>
                    <ComboboxList>
                      <ComboboxItem value="online">Online</ComboboxItem>
                      <ComboboxItem value="bank-transfer">Bank Transfer</ComboboxItem>
                      <ComboboxItem value="cash">Cash</ComboboxItem>
                      <ComboboxItem value="other">Other</ComboboxItem>
                    </ComboboxList>
                    <ComboboxEmpty>No payment method found.</ComboboxEmpty>
                  </ComboboxContent>
                </Combobox>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {success && <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p>}
              <Button type="submit" className="w-full" disabled={mutating}>
                {mutating ? 'Saving…' : 'Submit donation'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Donation records</CardTitle>
              <CardDescription>Displays {isAdmin ? 'all donations (admin only)' : 'your submissions'}.</CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="text-right">
                <p className="text-2xl font-semibold">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalAmount)}
                </p>
                <p className="text-xs text-muted-foreground">Total amount</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  exportDonations(donations);
                  toast.success('Export started', { description: 'Downloading donations data as CSV...' });
                }}
                disabled={donations.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : donations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                No donations yet. Add your first contribution.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border/70">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Method</TableHead>
                      {isAdmin && <TableHead>Donor</TableHead>}
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedDonations.map((donation) => (
                      <TableRow key={donation._id}>
                        <TableCell className="font-semibold">{donation.purpose}</TableCell>
                        <TableCell>
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: donation.currency || 'INR' }).format(
                            donation.amount || 0,
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(donation.status)}>{donation.status}</Badge>
                        </TableCell>
                        <TableCell className="capitalize">{donation.paymentMethod}</TableCell>
                        {isAdmin && (
                          <TableCell>{donation.donatedBy?.name || '—'}</TableCell>
                        )}
                        <TableCell>{new Date(donation.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <TooltipProvider>
                            {isAdmin && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => openEdit(donation)}
                                    disabled={mutating}
                                  >
                                    <Pencil className="size-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit donation</TooltipContent>
                              </Tooltip>
                            )}
                            {isAdmin && (
                              <AlertDialog open={deleteDialog.open && deleteDialog.id === donation._id} onOpenChange={(open) => setDeleteDialog({ open, id: open ? donation._id : null })}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon-sm" disabled={mutating}>
                                        <Trash2 className="size-4 text-destructive" />
                                      </Button>
                                    </AlertDialogTrigger>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete donation</TooltipContent>
                                </Tooltip>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete donation record?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently remove the donation of <strong>{donation.currency} {donation.amount}</strong> for <strong>{donation.purpose}</strong>. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(donation._id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {/* Pagination Controls */}
            {!loading && donations.length > ITEMS_PER_PAGE && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, donations.length)} of {donations.length} donations
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="size-4 mr-1" />
                    Previous
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="size-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={modal.open} onOpenChange={(open) => setModal((p) => ({ ...p, open }))}>
        {modal.donation && (
          <div>
            <DialogHeader>
              <DialogTitle>Edit donation</DialogTitle>
              <DialogDescription>Updates persist to backend immediately.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={modal.donation.amount}
                    onChange={(e) => setModal((p) => ({ ...p, donation: { ...p.donation, amount: Number(e.target.value) } }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Combobox value={modal.donation.status} onValueChange={(value) => setModal((p) => ({ ...p, donation: { ...p.donation, status: value } }))}>
                    <ComboboxInput placeholder="Select status" />
                    <ComboboxContent>
                      <ComboboxList>
                        <ComboboxItem value="completed">Completed</ComboboxItem>
                        <ComboboxItem value="pledged">Pledged</ComboboxItem>
                        <ComboboxItem value="cancelled">Cancelled</ComboboxItem>
                      </ComboboxList>
                      <ComboboxEmpty>No status found.</ComboboxEmpty>
                    </ComboboxContent>
                  </Combobox>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Purpose</Label>
                <Input
                  required
                  minLength={3}
                  maxLength={100}
                  value={modal.donation.purpose}
                  onChange={(e) => setModal((p) => ({ ...p, donation: { ...p.donation, purpose: e.target.value } }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  rows={3}
                  maxLength={500}
                  value={modal.donation.message || ''}
                  onChange={(e) => setModal((p) => ({ ...p, donation: { ...p.donation, message: e.target.value } }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setModal({ open: false, donation: null })}>Cancel</Button>
              <Button onClick={handleUpdate} disabled={mutating}>Save changes</Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>
    </div>
  );
}

function statusVariant(status) {
  switch (status) {
    case 'completed':
      return 'success';
    case 'pledged':
      return 'warning';
    case 'cancelled':
      return 'danger';
    default:
      return 'muted';
  }
}
