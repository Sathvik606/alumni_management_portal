import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Gift, Users, CalendarDays, Briefcase, UserRound, LogOut, Menu, X } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import useAuthStore from '@/store/authStore';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const navItems = [
  { label: 'Dashboard', icon: Home, to: '/' },
  { label: 'Donations', icon: Gift, to: '/donations' },
  { label: 'Alumni', icon: Users, to: '/alumni' },
  { label: 'Events', icon: CalendarDays, to: '/events' },
  { label: 'Jobs', icon: Briefcase, to: '/jobs' },
  { label: 'Profile', icon: UserRound, to: '/profile' },
];

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout, fetchCurrent } = useAuthStore();

  // Fetch current user data on mount to ensure we have the latest profile info including picture
  useEffect(() => {
    fetchCurrent();
  }, []);

  const handleLogoutConfirm = async () => {
    setLogoutDialogOpen(false);
    setLoggingOut(true);
    
    // Show spinner for 2.5 seconds
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    logout();
    toast.success('Logged out successfully', {
      description: 'See you next time!',
    });
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside
        className={`${collapsed ? 'w-20' : 'w-64'} sticky top-0 hidden h-screen flex-col gap-4 border-r border-border/70 bg-sidebar/70 px-3 py-5 shadow-lg shadow-black/5 backdrop-blur lg:flex transition-all`}
      >
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <img src="/src/assets/logo2.png" alt="Alumni Link" className={`shrink-0 transition-all ${collapsed ? 'h-12' : 'h-14'} w-auto`} />
            {!collapsed && <span className="font-bold text-sm tracking-tight">ALUMNI LINK</span>}
          </div>
          <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={() => setCollapsed((v) => !v)}>
                {collapsed ? <Menu className="size-4" /> : <X className="size-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</TooltipContent>
          </Tooltip>
          </TooltipProvider>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map(({ label, icon: Icon, to }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-primary/10 ${
                  isActive ? 'bg-primary/15 text-primary' : 'text-foreground'
                }`
              }
            >
              <Icon className="size-4" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="flex flex-col gap-3 px-2">
          {!collapsed && (
            <div className="rounded-xl border border-border/70 bg-card/60 p-3 text-sm">
              <div className="flex items-center gap-3 mb-2">
                {user?.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={user.name}
                    className="size-10 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                  />
                ) : null}
                <div
                  className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-foreground"
                  style={{ display: user?.profilePicture ? 'none' : 'flex' }}
                >
                  {user?.name ? user.name.substring(0, 2).toUpperCase() : <UserRound className="size-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Signed in as</p>
                  <p className="font-semibold leading-tight truncate">{user?.name}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          )}
          <div className="flex items-center justify-between">
            {!collapsed && <ThemeToggle size="icon-sm" />}
            <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size={collapsed ? 'icon-sm' : 'sm'} disabled={loggingOut}>
                  <LogOut className="size-4" />
                  {!collapsed && <span>Logout</span>}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You'll need to sign in again to access your account.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogoutConfirm}>Logout</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </aside>

      {/* Mobile topbar */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center gap-2 border-b border-border/70 bg-background/95 px-4 py-3 backdrop-blur">
        <Button variant="outline" size="icon" onClick={() => setMobileOpen((v) => !v)}>
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
        <span className="text-sm font-semibold">Alumni Platform</span>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon-sm" disabled={loggingOut}>
                <LogOut className="size-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
                <AlertDialogDescription>
                  You'll need to sign in again to access your account.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogoutConfirm}>Logout</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="lg:hidden fixed inset-y-0 left-0 z-30 w-72 bg-sidebar/95 backdrop-blur p-4 border-r border-border/70"
        >
          <nav className="flex flex-col gap-2">
            {navItems.map(({ label, icon: Icon, to }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-primary/10 ${
                    isActive ? 'bg-primary/15 text-primary' : 'text-foreground'
                  }`
                }
                onClick={() => setMobileOpen(false)}
              >
                <Icon className="size-4" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </motion.div>
      )}

      <main className="flex-1 bg-linear-to-b from-background via-background to-accent/5">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>

      {/* Logout Overlay */}
      {loggingOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/70 bg-card/60 p-8 shadow-2xl">
            <Spinner className="size-12" />
            <div className="text-center">
              <p className="text-lg font-semibold">Logging out...</p>
              <p className="text-sm text-muted-foreground">Please wait</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
