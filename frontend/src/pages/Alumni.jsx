import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { alumniService } from '@/services/alumniService';
import useAuthStore from '@/store/authStore';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Pencil, Trash2, User, ChevronLeft, ChevronRight, Download, Shield, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { exportAlumni } from '@/utils/exportUtils';

const filterDefaults = { name: '', department: '', graduationYear: '' };
const ITEMS_PER_PAGE = 20;

export default function AlumniPage() {
  const { user } = useAuthStore();
  const [filters, setFilters] = useState(filterDefaults);
  const [alumni, setAlumni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState({ open: false, record: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });
  const [currentPage, setCurrentPage] = useState(1);
  const isAdmin = user?.role === 'admin';

  // Calculate pagination
  const totalPages = Math.ceil(alumni.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedAlumni = alumni.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const fetchAlumni = async () => {
    setLoading(true);
    setError('');
    try {
      // Strip empty string values so backend doesn't filter on blank fields
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== '')
      );
      const data = await alumniService.list(cleanFilters);
      setAlumni(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Unable to load alumni.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlumni();
  }, []);

  const onFilterChange = (key, value) => {
    setFilters((p) => ({ ...p, [key]: value }));
    setCurrentPage(1);
  };

  const handleReset = async () => {
    setFilters(filterDefaults);
    setCurrentPage(1);
    setLoading(true);
    setError('');
    try {
      const data = await alumniService.list({});
      setAlumni(data);
    } catch {
      setError('Unable to load alumni.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!modal.record) return;
    
    // Validation
    if (!modal.record.name || modal.record.name.trim().length < 2) {
      const errorMsg = 'Name must be at least 2 characters';
      setError(errorMsg);
      toast.error('Validation error', { description: errorMsg });
      return;
    }
    if (modal.record.graduationYear && (modal.record.graduationYear < 1950 || modal.record.graduationYear > new Date().getFullYear() + 10)) {
      const errorMsg = `Graduation year must be between 1950 and ${new Date().getFullYear() + 10}`;
      setError(errorMsg);
      toast.error('Validation error', { description: errorMsg });
      return;
    }
    if (modal.record.bio && modal.record.bio.length > 500) {
      const errorMsg = 'Bio must be less than 500 characters';
      setError(errorMsg);
      toast.error('Validation error', { description: errorMsg });
      return;
    }
    
    try {
      const updated = await alumniService.update(modal.record._id, modal.record);
      setAlumni((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
      setModal({ open: false, record: null });
      toast.success('Profile updated!', {
        description: 'Alumni information has been saved successfully.',
      });
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Update failed';
      setError(errorMsg);
      toast.error('Failed to update profile', {
        description: errorMsg,
      });
    }
  };

  const handleDelete = async (id) => {
    try {
      await alumniService.remove(id);
      setAlumni((prev) => prev.filter((a) => a._id !== id));
      setDeleteDialog({ open: false, id: null });
      toast.success('Alumni profile deleted', {
        description: 'The profile has been removed from the directory.',
      });
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Delete failed';
      setError(errorMsg);
      toast.error('Failed to delete profile', {
        description: errorMsg,
      });
    }
  };

  const handleRoleChange = async (id, currentRole) => {
    const newRole = currentRole === 'admin' ? 'alumni' : 'admin';
    try {
      const updated = await alumniService.updateRole(id, newRole);
      setAlumni((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
      toast.success('Role updated', {
        description: `User role changed to ${newRole}`,
      });
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Role update failed';
      setError(errorMsg);
      toast.error('Failed to update role', {
        description: errorMsg,
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Alumni</p>
          <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Community directory</h1>
          <p className="text-sm text-muted-foreground">Search, update your profile, or manage the network.</p>
        </div>
        <Users className="size-6 text-primary" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search by name, department, or year.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={filters.name} onChange={(e) => onFilterChange('name', e.target.value)} placeholder="Name" />
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Input value={filters.department} onChange={(e) => onFilterChange('department', e.target.value)} placeholder="Dept" />
          </div>
          <div className="space-y-2">
            <Label>Graduation year</Label>
            <Input
              value={filters.graduationYear}
              onChange={(e) => onFilterChange('graduationYear', e.target.value)}
              placeholder="2021"
            />
          </div>
          <div className="flex items-end gap-3">
            <Button onClick={fetchAlumni} className="flex-1">Apply</Button>
            <Button variant="ghost" onClick={handleReset}>Reset</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Directory</CardTitle>
              <CardDescription>Update allowed for your profile{isAdmin ? ' and admin overrides' : ''}.</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                exportAlumni(alumni);
                toast.success('Export started', { description: 'Downloading alumni data as CSV...' });
              }}
              disabled={alumni.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : alumni.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-8 text-center text-sm text-muted-foreground">
              No profiles found with current filters.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Photo</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Company</TableHead>
                    {isAdmin && <TableHead>Role</TableHead>}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAlumni.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell>
                        <Avatar className="size-9">
                          {item.profilePicture ? (
                            <img
                              src={item.profilePicture}
                              alt={item.name}
                              className="object-cover"
                              referrerPolicy="no-referrer"
                              onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                            />
                          ) : null}
                          <div
                            className="flex h-full w-full items-center justify-center bg-primary/10 text-sm font-medium text-foreground"
                            style={{ display: item.profilePicture ? 'none' : 'flex' }}
                          >
                            {item.name ? item.name.substring(0, 2).toUpperCase() : <User className="size-4" />}
                          </div>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-semibold">{item.name}</TableCell>
                      <TableCell>{item.department}</TableCell>
                      <TableCell>{item.graduationYear}</TableCell>
                      <TableCell>{item.company || '—'}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Badge 
                            variant={item.role === 'admin' ? 'default' : 'secondary'}
                            className="gap-1"
                          >
                            {item.role === 'admin' ? (
                              <><ShieldCheck className="h-3 w-3" /> Admin</>
                            ) : (
                              <><User className="h-3 w-3" /> Alumni</>
                            )}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isAdmin && item._id !== user?._id && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleRoleChange(item._id, item.role)}
                              title={`Change role to ${item.role === 'admin' ? 'alumni' : 'admin'}`}
                              aria-label={`Change ${item.name}'s role to ${item.role === 'admin' ? 'alumni' : 'admin'}`}
                            >
                              <Shield className="size-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setModal({ open: true, record: item })}
                            disabled={!isAdmin && item._id !== user?._id}
                            aria-label={`Edit ${item.name}'s profile`}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          {isAdmin && (
                            <AlertDialog open={deleteDialog.open && deleteDialog.id === item._id} onOpenChange={(open) => setDeleteDialog({ open, id: open ? item._id : null })}>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon-sm" aria-label={`Delete ${item.name}'s profile`}>
                                  <Trash2 className="size-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete alumni profile?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently remove <strong>{item.name}</strong>'s profile from the directory. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(item._id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Pagination Controls */}
          {!loading && alumni.length > ITEMS_PER_PAGE && (
            <nav className="mt-4 flex items-center justify-between" aria-label="Alumni pagination">
              <div className="text-sm text-muted-foreground" role="status" aria-live="polite">
                Showing {startIndex + 1}-{Math.min(endIndex, alumni.length)} of {alumni.length} alumni
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Go to previous page"
                >
                  <ChevronLeft className="size-4 mr-1" />
                  Previous
                </Button>
                <div className="text-sm text-muted-foreground" aria-current="page">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="Go to next page"
                >
                  Next
                  <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            </nav>
          )}
        </CardContent>
      </Card>

      <Dialog open={modal.open} onOpenChange={(open) => setModal((p) => ({ ...p, open }))}>
        {modal.record && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit profile</DialogTitle>
              <DialogDescription>Only your own profile can be edited unless you are an admin.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-1">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    required
                    minLength={2}
                    maxLength={100}
                    value={modal.record.name}
                    onChange={(e) => setModal((p) => ({ ...p, record: { ...p.record, name: e.target.value } }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input
                    minLength={2}
                    maxLength={100}
                    value={modal.record.department}
                    onChange={(e) => setModal((p) => ({ ...p, record: { ...p.record, department: e.target.value } }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Graduation Year</Label>
                  <Input
                    type="number"
                    min={1950}
                    max={new Date().getFullYear() + 10}
                    value={modal.record.graduationYear}
                    onChange={(e) => setModal((p) => ({ ...p, record: { ...p.record, graduationYear: e.target.value } }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input
                    maxLength={100}
                    value={modal.record.company || ''}
                    onChange={(e) => setModal((p) => ({ ...p, record: { ...p.record, company: e.target.value } }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    maxLength={100}
                    value={modal.record.location || ''}
                    onChange={(e) => setModal((p) => ({ ...p, record: { ...p.record, location: e.target.value } }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Bio</Label>
                <Input
                  maxLength={500}
                  placeholder="Tell us about this person..."
                  value={modal.record.bio || ''}
                  onChange={(e) => setModal((p) => ({ ...p, record: { ...p.record, bio: e.target.value } }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setModal({ open: false, record: null })}>Cancel</Button>
              <Button onClick={handleUpdate}>Save</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
