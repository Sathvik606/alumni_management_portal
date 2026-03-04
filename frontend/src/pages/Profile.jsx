import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { alumniService } from '@/services/alumniService';
import useAuthStore from '@/store/authStore';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { Upload, User, X, Camera, Trash2, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, setUser, logout } = useAuthStore();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await alumniService.me();
      setForm(data);
    } catch (err) {
      setError('Unable to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file type', {
        description: 'Please select an image file (JPG, PNG, GIF, etc.)',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large', {
        description: 'Please select an image smaller than 5MB',
      });
      return;
    }

    setUploading(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setForm((p) => ({ ...p, profilePicture: base64String }));
        setShowPhotoDialog(false);
        toast.success('Image uploaded!', {
          description: 'Remember to save your changes.',
        });
        setUploading(false);
      };
      reader.onerror = () => {
        toast.error('Upload failed', {
          description: 'Could not read the image file.',
        });
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error('Upload failed', {
        description: 'An error occurred while uploading the image.',
      });
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setForm((p) => ({ ...p, profilePicture: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setShowPhotoDialog(false);
    toast.info('Profile picture removed', {
      description: 'Remember to save your changes.',
    });
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await alumniService.deleteAccount();
      logout();
      toast.success('Account deleted', { description: 'Your account has been permanently removed.' });
      navigate('/login');
    } catch (err) {
      toast.error('Failed to delete account', { description: err.response?.data?.message || 'Please try again.' });
      setDeletingAccount(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form) return;
    
    // Validation
    if (!form.name || form.name.trim().length < 2) {
      const errorMsg = 'Name must be at least 2 characters';
      setError(errorMsg);
      toast.error('Validation error', { description: errorMsg });
      return;
    }
    if (form.graduationYear && (form.graduationYear < 1950 || form.graduationYear > new Date().getFullYear() + 10)) {
      const errorMsg = `Graduation year must be between 1950 and ${new Date().getFullYear() + 10}`;
      setError(errorMsg);
      toast.error('Validation error', { description: errorMsg });
      return;
    }
    if (form.phone && form.phone.length > 0 && (form.phone.length < 10 || !/^[0-9+\-\s()]+$/.test(form.phone))) {
      const errorMsg = 'Please enter a valid phone number';
      setError(errorMsg);
      toast.error('Validation error', { description: errorMsg });
      return;
    }
    if (form.linkedin && form.linkedin.length > 0 && !form.linkedin.includes('linkedin.com')) {
      const errorMsg = 'Please enter a valid LinkedIn URL';
      setError(errorMsg);
      toast.error('Validation error', { description: errorMsg });
      return;
    }
    if (form.bio && form.bio.length > 500) {
      const errorMsg = 'Bio must be less than 500 characters';
      setError(errorMsg);
      toast.error('Validation error', { description: errorMsg });
      return;
    }
    
    try {
      const updated = await alumniService.update(form._id, form);
      setForm(updated);
      setUser({ ...user, ...updated });
      toast.success('Profile updated successfully!', {
        description: 'Your changes have been saved.',
      });
      setError('');
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Update failed';
      setError(errorMsg);
      toast.error('Failed to update profile', {
        description: errorMsg,
      });
    }
  };

  if (loading || !form) {
    return <Skeleton className="h-64 rounded-2xl" />;
  }

  return (
    <>
      <div className="space-y-8">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Profile</p>
          <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Your personal details</h1>
          <p className="text-sm text-muted-foreground">Update contact, work, and bio.</p>
        </div>

        <div className="space-y-6">
        {/* Profile Picture Card */}
        <Card className="max-w-sm mx-auto w-full rounded-2xl">
          <CardContent className="flex flex-col items-center pt-6 pb-6">
            <div className="relative group">
              <Avatar className="size-32 ring-4 ring-border/30">
                {form.profilePicture ? (
                  <img
                    src={form.profilePicture}
                    alt={form.name}
                    className="object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                  />
                ) : null}
                <div
                  className="flex h-full w-full items-center justify-center bg-primary/10 text-4xl font-medium text-foreground"
                  style={{ display: form.profilePicture ? 'none' : 'flex' }}
                >
                  {form.name ? form.name.substring(0, 2).toUpperCase() : <User className="size-12" />}
                </div>
              </Avatar>
              <button
                type="button"
                onClick={() => setShowPhotoDialog(true)}
                className="absolute bottom-0 right-0 flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <Camera className="size-5" />
              </button>
            </div>
            <h3 className="font-semibold text-xl mt-4 text-center">{form.name}</h3>
            <button
              type="button"
              onClick={() => setShowPhotoDialog(true)}
              className="mt-3 text-sm text-primary hover:underline font-medium transition-colors"
            >
              Change Photo
            </button>
          </CardContent>
        </Card>

        {/* Contact Info Card */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>Update your personal and professional details</CardDescription>
          </CardHeader>
          <CardContent>
            {error && <p className="text-sm text-destructive mb-4">{error}</p>}
            <form className="grid gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input required minLength={2} maxLength={100} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={form.email} disabled />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Input minLength={2} maxLength={100} value={form.department || ''} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Graduation Year</Label>
                <Input
                  type="number"
                  min={1950}
                  max={new Date().getFullYear() + 10}
                  value={form.graduationYear || ''}
                  onChange={(e) => setForm((p) => ({ ...p, graduationYear: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Input maxLength={100} value={form.company || ''} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Job title</Label>
                <Input maxLength={100} value={form.currentJobTitle || ''} onChange={(e) => setForm((p) => ({ ...p, currentJobTitle: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input maxLength={100} value={form.location || ''} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>LinkedIn</Label>
                <Input 
                  type="url" 
                  maxLength={200} 
                  placeholder="https://linkedin.com/in/yourprofile" 
                  value={form.linkedin || ''} 
                  onChange={(e) => setForm((p) => ({ ...p, linkedin: e.target.value }))} 
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input 
                  type="tel" 
                  maxLength={20} 
                  placeholder="+1 234 567 8900" 
                  value={form.phone || ''} 
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} 
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Bio</Label>
                <Input maxLength={500} placeholder="Tell us about yourself..." value={form.bio || ''} onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))} />
              </div>
              <div className="md:col-span-2 pt-2">
                <Button type="submit" className="w-full md:w-auto px-8">Save Changes</Button>
              </div>
            </form>
          </CardContent>
        </Card>
        </div>

        {/* Danger Zone */}
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <TriangleAlert className="size-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>Permanent actions that cannot be undone.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <div>
                <p className="font-medium text-sm">Delete my account</p>
                <p className="text-xs text-muted-foreground mt-0.5">Permanently removes your profile, data, and access. This cannot be reversed.</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={deletingAccount}>
                    <Trash2 className="size-4 mr-2" />
                    {deletingAccount ? 'Deleting...' : 'Delete Account'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Permanently delete your account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will immediately and permanently delete your profile, all your data, and revoke your access. <strong>This action cannot be undone.</strong>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Yes, permanently delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
        <DialogHeader>
          <DialogTitle>Change Profile Photo</DialogTitle>
          <DialogDescription>
            Upload a new photo or remove your current one
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
          disabled={uploading}
        />

        <div className="space-y-2">
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start text-primary font-semibold hover:bg-primary/10"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="size-4 mr-3" />
            {uploading ? 'Uploading...' : 'Upload Photo'}
          </Button>

          {form.profilePicture && (
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start text-destructive font-semibold hover:bg-destructive/10"
              onClick={handleRemoveImage}
              disabled={uploading}
            >
              <Trash2 className="size-4 mr-3" />
              Remove Current Photo
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            className="w-full justify-center"
            onClick={() => setShowPhotoDialog(false)}
          >
            Cancel
          </Button>
        </div>

        <div className="mt-4 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
          <p>• Supported: JPG, PNG, GIF, WebP</p>
          <p>• Max size: 5MB</p>
          <p>• Best results: Square image, 400x400px or larger</p>
        </div>
      </Dialog>
    </>
  );
}
