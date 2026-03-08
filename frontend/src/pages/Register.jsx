import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ThemeToggle from '@/components/ThemeToggle';
import useAuthStore from '@/store/authStore';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import logo from '@/assets/logo2.png';

export default function RegisterPage() {
  const { register, loading } = useAuthStore();
  const [form, setForm] = useState({ name: '', email: '', password: '', graduationYear: '', department: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (!form.name || form.name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    if (!form.email || !form.email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (!form.password || form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    const currentYear = new Date().getFullYear();
    if (!form.graduationYear || form.graduationYear < 1950 || form.graduationYear > currentYear + 10) {
      setError(`Graduation year must be between 1950 and ${currentYear + 10}`);
      return;
    }
    if (!form.department || form.department.trim().length < 2) {
      setError('Department is required');
      return;
    }
    
    try {
      await register(form);
      toast.success('Account created!', {
        description: 'Please check your email to verify your account.',
      });
      navigate('/');
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Registration failed';
      setError(errorMsg);
      toast.error('Registration failed', {
        description: errorMsg,
      });
    }
  };

  useEffect(() => {
    if (useAuthStore.getState().token && useAuthStore.getState().user) {
      navigate('/');
    }
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-background via-background to-secondary/10 px-4 py-8">
      <div className="absolute right-6 top-6"><ThemeToggle /></div>
      <motion.div
        className="w-full max-w-2xl rounded-3xl border border-border/70 bg-card/90 p-8 sm:p-10 shadow-2xl shadow-secondary/10 backdrop-blur"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <img src={logo} alt="Alumni Link" className="h-20 w-auto" />
              <h1 className="text-2xl font-bold tracking-tight">ALUMNI LINK</h1>
            </div>
            <h2 className="text-2xl font-semibold">Create your account</h2>
            <p className="text-sm text-muted-foreground">Stay connected with events, jobs, and donations.</p>
          </div>
        </div>

        <form className="grid gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              required
              minLength={2}
              maxLength={100}
              placeholder="Alex Alumni"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="graduationYear">Graduation Year</Label>
            <Input
              id="graduationYear"
              type="number"
              required
              min={1950}
              max={new Date().getFullYear() + 10}
              placeholder="2024"
              value={form.graduationYear}
              onChange={(e) => setForm((prev) => ({ ...prev, graduationYear: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              required
              minLength={2}
              maxLength={100}
              placeholder="Computer Science"
              value={form.department}
              onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
            />
          </div>
          {error && <p className="md:col-span-2 text-sm text-destructive">{error}</p>}
          <Button type="submit" className="md:col-span-2 h-11" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full h-11"
          onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/google`}
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
          </svg>
          Sign up with Google
        </Button>

        <p className="mt-7 text-center text-sm text-muted-foreground">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
