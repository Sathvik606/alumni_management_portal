import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty } from '@/components/ui/combobox';
import { Calendar } from '@/components/ui/calendar';
import { Spinner } from '@/components/ui/spinner';
import { Avatar, AvatarFallback, AvatarImage, AvatarGroup, AvatarGroupCount } from '@/components/ui/avatar';
import { eventService } from '@/services/eventService';
import { alumniService } from '@/services/alumniService';
import useAuthStore from '@/store/authStore';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, CalendarIcon, Pencil, Trash2, CheckCircle2, Clock, UserPlus, X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { exportEvents } from '@/utils/exportUtils';

const defaultEvent = { title: '', description: '', date: '', startTime: '09:00', endTime: '17:00', location: '', mode: 'online', maxAttendees: '', isPublic: true, guests: [] };
const ITEMS_PER_PAGE = 20;

// Helper function to convert 24-hour time to 12-hour format
const convertTo12Hour = (time24) => {
  if (!time24) return { hours: '9', minutes: '00', period: 'AM' };
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return { hours: hour12.toString(), minutes, period };
};

// Helper function to convert 12-hour time to 24-hour format
const convertTo24Hour = (hours, minutes, period) => {
  let hour = parseInt(hours, 10);
  if (period === 'AM' && hour === 12) hour = 0;
  if (period === 'PM' && hour !== 12) hour += 12;
  return `${hour.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`;
};

// Helper function to format 24-hour time for display in 12-hour format
const formatTime12Hour = (time24) => {
  if (!time24) return '';
  const converted = convertTo12Hour(time24);
  return `${converted.hours}:${converted.minutes} ${converted.period}`;
};

export default function EventsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(defaultEvent);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState({ open: false, record: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [modalCalendarOpen, setModalCalendarOpen] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  const [modalGuestEmail, setModalGuestEmail] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [eventFilter, setEventFilter] = useState('upcoming'); // 'all', 'upcoming', 'past'
  const calendarRef = useRef(null);
  const modalCalendarRef = useRef(null);

  // Filter events based on selected filter
  const filteredEvents = events.filter((event) => {
    if (!event.date) return eventFilter === 'all';
    const eventDate = new Date(event.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (eventFilter === 'upcoming') {
      return eventDate >= today;
    } else if (eventFilter === 'past') {
      return eventDate < today;
    }
    return true; // 'all'
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredEvents.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // 12-hour time format state for create form
  const [startTime12, setStartTime12] = useState(convertTo12Hour('09:00'));
  const [endTime12, setEndTime12] = useState(convertTo12Hour('17:00'));

  // 12-hour time format state for edit modal
  const [modalStartTime12, setModalStartTime12] = useState(convertTo12Hour('09:00'));
  const [modalEndTime12, setModalEndTime12] = useState(convertTo12Hour('17:00'));

  // Update 24-hour time in form when 12-hour components change
  useEffect(() => {
    const time24 = convertTo24Hour(startTime12.hours, startTime12.minutes, startTime12.period);
    setForm(p => ({ ...p, startTime: time24 }));
  }, [startTime12]);

  useEffect(() => {
    const time24 = convertTo24Hour(endTime12.hours, endTime12.minutes, endTime12.period);
    setForm(p => ({ ...p, endTime: time24 }));
  }, [endTime12]);

  // Update 24-hour time in modal when 12-hour components change
  useEffect(() => {
    if (modal.record) {
      const time24 = convertTo24Hour(modalStartTime12.hours, modalStartTime12.minutes, modalStartTime12.period);
      setModal(p => ({ ...p, record: { ...p.record, startTime: time24 } }));
    }
  }, [modalStartTime12]);

  useEffect(() => {
    if (modal.record) {
      const time24 = convertTo24Hour(modalEndTime12.hours, modalEndTime12.minutes, modalEndTime12.period);
      setModal(p => ({ ...p, record: { ...p.record, endTime: time24 } }));
    }
  }, [modalEndTime12]);

  // Initialize modal times when modal opens
  useEffect(() => {
    if (modal.open && modal.record) {
      setModalStartTime12(convertTo12Hour(modal.record.startTime));
      setModalEndTime12(convertTo12Hour(modal.record.endTime));
    }
  }, [modal.open]);

  // Close calendar on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setCalendarOpen(false);
      }
      if (modalCalendarRef.current && !modalCalendarRef.current.contains(event.target)) {
        setModalCalendarOpen(false);
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        setCalendarOpen(false);
        setModalCalendarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await eventService.list();
      setEvents(data);
    } catch (err) {
      setError('Unable to load events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Helper function to fetch guest data by email
  const fetchGuestByEmail = async (email) => {
    try {
      const alumni = await alumniService.list({ email });
      if (alumni && alumni.length > 0) {
        const alumniData = alumni[0];
        return {
          email: alumniData.email,
          name: alumniData.name,
          profilePicture: alumniData.profilePicture,
          isAlumni: true
        };
      }
    } catch (err) {
      console.log('Guest not found in alumni database');
    }
    // Return basic guest object if not found (external guest)
    return { email, isAlumni: false };
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    
    // Validation
    if (!form.title || form.title.trim().length < 3) {
      const errorMsg = 'Title must be at least 3 characters';
      setError(errorMsg);
      toast.error('Validation error', { description: errorMsg });
      return;
    }
    if (form.title.length > 100) {
      const errorMsg = 'Title must be less than 100 characters';
      setError(errorMsg);
      toast.error('Validation error', { description: errorMsg });
      return;
    }
    if (!form.date) {
      const errorMsg = 'Date is required';
      setError(errorMsg);
      toast.error('Validation error', { description: errorMsg });
      return;
    }
    if (!form.startTime) {
      const errorMsg = 'Start time is required';
      setError(errorMsg);
      toast.error('Validation error', { description: errorMsg });
      return;
    }
    if (!form.endTime) {
      const errorMsg = 'End time is required';
      setError(errorMsg);
      toast.error('Validation error', { description: errorMsg });
      return;
    }
    // Validate end time is after start time
    if (form.startTime >= form.endTime) {
      const errorMsg = 'End time must be after start time';
      setError(errorMsg);
      toast.error('Validation error', { description: errorMsg });
      return;
    }
    if (form.maxAttendees && Number(form.maxAttendees) <= 0) {
      const errorMsg = 'Capacity must be greater than 0';
      setError(errorMsg);
      toast.error('Validation error', { description: errorMsg });
      return;
    }
    if (form.description && form.description.length > 500) {
      const errorMsg = 'Description must be less than 500 characters';
      setError(errorMsg);
      toast.error('Validation error', { description: errorMsg });
      return;
    }
    
    // Combine date and time (still using date for date component, but sending startTime/endTime separately)
    const dateTime = new Date(form.date);
    
    setCreating(true);
    try {
      const created = await eventService.create({ 
        ...form, 
        date: dateTime.toISOString().split('T')[0], // Send just the date part
        startTime: form.startTime,
        endTime: form.endTime
      });
      
      // Show spinner for 1.5 seconds
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setEvents((prev) => [created, ...prev]);
      setForm(defaultEvent);
      setStartTime12(convertTo12Hour('09:00'));
      setEndTime12(convertTo12Hour('17:00'));
      toast.success('Event created!', {
        description: `${form.title} has been added to the calendar.`,
      });
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to create event';
      setError(errorMsg);
      toast.error('Failed to create event', {
        description: errorMsg,
      });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!modal.record) return;
    
    // Validation
    if (!modal.record.title || modal.record.title.trim().length < 3) {
      const errorMsg = 'Title must be at least 3 characters';
      setError(errorMsg);
      toast.error('Validation error', { description: errorMsg });
      return;
    }
    if (modal.record.title.length > 100) {
      const errorMsg = 'Title must be less than 100 characters';
      setError(errorMsg);
      toast.error('Validation error', { description: errorMsg });
      return;
    }
    if (!modal.record.startTime) {
      const errorMsg = 'Start time is required';
      setError(errorMsg);
      toast.error('Validation error', { description: errorMsg });
      return;
    }
    if (!modal.record.endTime) {
      const errorMsg = 'End time is required';
      setError(errorMsg);
      toast.error('Validation error', { description: errorMsg });
      return;
    }
    // Validate end time is after start time
    if (modal.record.startTime >= modal.record.endTime) {
      const errorMsg = 'End time must be after start time';
      setError(errorMsg);
      toast.error('Validation error', { description: errorMsg });
      return;
    }
    if (modal.record.maxAttendees && Number(modal.record.maxAttendees) <= 0) {
      const errorMsg = 'Capacity must be greater than 0';
      setError(errorMsg);
      toast.error('Validation error', { description: errorMsg });
      return;
    }
    if (modal.record.description && modal.record.description.length > 500) {
      const errorMsg = 'Description must be less than 500 characters';
      setError(errorMsg);
      toast.error('Validation error', { description: errorMsg });
      return;
    }
    
    // Combine date and time
    const dateTime = new Date(modal.record.date);
    
    try {
      const updated = await eventService.update(modal.record._id, { 
        ...modal.record, 
        date: dateTime.toISOString().split('T')[0],
        startTime: modal.record.startTime,
        endTime: modal.record.endTime
      });
      setEvents((prev) => prev.map((e) => (e._id === updated._id ? updated : e)));
      setModal({ open: false, record: null });
      toast.success('Event updated!', {
        description: 'Event details have been saved successfully.',
      });
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Update failed';
      setError(errorMsg);
      toast.error('Failed to update event', {
        description: errorMsg,
      });
    }
  };

  const handleDelete = async (id) => {
    try {
      await eventService.remove(id);
      setEvents((prev) => prev.filter((e) => e._id !== id));
      setDeleteDialog({ open: false, id: null });
      toast.success('Event deleted', {
        description: 'The event has been removed from the calendar.',
      });
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Delete failed';
      setError(errorMsg);
      toast.error('Failed to delete event', {
        description: errorMsg,
      });
    }
  };

  const handleRsvp = async (eventId, joined) => {
    try {
      if (joined) {
        await eventService.unrsvp(eventId);
        toast.success('RSVP cancelled', {
          description: 'You have been removed from the attendee list.',
        });
      } else {
        await eventService.rsvp(eventId);
        toast.success('RSVP confirmed!', {
          description: 'You have been added to the attendee list.',
        });
      }
      fetchEvents();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Unable to update RSVP';
      setError(errorMsg);
      toast.error('RSVP failed', {
        description: errorMsg,
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Events</p>
          <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Plan, RSVP, attend</h1>
          <p className="text-sm text-muted-foreground">Admins can create, everyone can RSVP.</p>
        </div>
        <CalendarDays className="size-6 text-primary" />
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Create event</CardTitle>
            <CardDescription>Visible to authenticated alumni.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleCreate}>
              {/* Title Row */}
              <div className="space-y-2">
                <Label>Title</Label>
                <Input 
                  required 
                  minLength={3} 
                  maxLength={100} 
                  value={form.title} 
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} 
                  placeholder="Event title"
                  className="text-base"
                />
              </div>

              {/* Date and Time Row */}
              <div className="space-y-3">
                {/* Date */}
                <div className="space-y-2">
                  <Label className="text-sm">Date</Label>
                  <div className="relative" ref={calendarRef}>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start text-left font-normal h-10 px-3"
                      onClick={() => setCalendarOpen(!calendarOpen)}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.date ? format(new Date(form.date), 'MMM dd, yyyy') : <span className="text-muted-foreground">Pick date</span>}
                    </Button>
                    {calendarOpen && (
                      <div className="absolute z-9999 mt-2 rounded-2xl border border-border/70 bg-popover shadow-2xl p-3 overflow-hidden max-w-70">
                        <Calendar
                          mode="single"
                          selected={form.date ? new Date(form.date) : undefined}
                          onSelect={(date) => {
                            setForm((p) => ({ ...p, date: date ? date.toISOString() : '' }));
                            setCalendarOpen(false);
                          }}
                          disabled={{ before: new Date() }}
                          initialFocus
                          className="rounded-xl"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Start Time, End Time, Capacity Row */}
                <div className="grid gap-3 sm:grid-cols-3">
                  {/* Start Time */}
                  <div className="space-y-2">
                    <Label className="text-sm">Start Time</Label>
                    <div className="flex gap-1">
                      <div className="relative flex-1">
                        <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          min="1"
                          max="12"
                          required
                          value={startTime12.hours}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 12)) {
                              setStartTime12(p => ({ ...p, hours: val }));
                            }
                          }}
                          placeholder="HH"
                          className="h-10 pl-7 pr-1 text-center"
                        />
                      </div>
                      <span className="flex items-center text-muted-foreground">:</span>
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        required
                        value={startTime12.minutes}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 59)) {
                            setStartTime12(p => ({ ...p, minutes: val.padStart(2, '0') }));
                          }
                        }}
                        placeholder="MM"
                        className="h-10 flex-1 px-1 text-center"
                      />
                      <Combobox value={startTime12.period} onValueChange={(value) => setStartTime12(p => ({ ...p, period: value }))}>
                        <ComboboxInput placeholder="AM" className="h-10 w-20" />
                        <ComboboxContent>
                          <ComboboxList>
                            <ComboboxItem value="AM">AM</ComboboxItem>
                            <ComboboxItem value="PM">PM</ComboboxItem>
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                    </div>
                  </div>

                  {/* End Time */}
                  <div className="space-y-2">
                    <Label className="text-sm">End Time</Label>
                    <div className="flex gap-1">
                      <div className="relative flex-1">
                        <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          min="1"
                          max="12"
                          required
                          value={endTime12.hours}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 12)) {
                              setEndTime12(p => ({ ...p, hours: val }));
                            }
                          }}
                          placeholder="HH"
                          className="h-10 pl-7 pr-1 text-center"
                        />
                      </div>
                      <span className="flex items-center text-muted-foreground">:</span>
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        required
                        value={endTime12.minutes}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 59)) {
                            setEndTime12(p => ({ ...p, minutes: val.padStart(2, '0') }));
                          }
                        }}
                        placeholder="MM"
                        className="h-10 flex-1 px-1 text-center"
                      />
                      <Combobox value={endTime12.period} onValueChange={(value) => setEndTime12(p => ({ ...p, period: value }))}>
                        <ComboboxInput placeholder="PM" className="h-10 w-20" />
                        <ComboboxContent>
                          <ComboboxList>
                            <ComboboxItem value="AM">AM</ComboboxItem>
                            <ComboboxItem value="PM">PM</ComboboxItem>
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                    </div>
                  </div>

                  {/* Capacity */}
                  <div className="space-y-2">
                    <Label className="text-sm">Capacity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={form.maxAttendees}
                      onChange={(e) => setForm((p) => ({ ...p, maxAttendees: e.target.value }))}
                      placeholder="Max (optional)"
                      className="h-10"
                    />
                  </div>
                </div>

                {/* Helper Text */}
                {form.date && form.startTime && form.endTime && (
                  <div className="flex items-start gap-2 rounded-lg bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <p>
                      This event will take place on <span className="font-medium text-foreground">{format(new Date(form.date), 'MMMM dd, yyyy')}</span> from{' '}
                      <span className="font-medium text-foreground">{startTime12.hours}:{startTime12.minutes} {startTime12.period}</span> until{' '}
                      <span className="font-medium text-foreground">{endTime12.hours}:{endTime12.minutes} {endTime12.period}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Location and Mode Row */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input 
                    value={form.location} 
                    onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} 
                    placeholder="Enter location"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mode</Label>
                  <Combobox value={form.mode} onValueChange={(value) => setForm((p) => ({ ...p, mode: value }))}>
                    <ComboboxInput placeholder="Select mode" />
                    <ComboboxContent>
                      <ComboboxList>
                        <ComboboxItem value="offline">Offline</ComboboxItem>
                        <ComboboxItem value="online">Online</ComboboxItem>
                        <ComboboxItem value="hybrid">Hybrid</ComboboxItem>
                      </ComboboxList>
                      <ComboboxEmpty>No mode found.</ComboboxEmpty>
                    </ComboboxContent>
                  </Combobox>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  maxLength={500}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="What should attendees know?"
                />
              </div>

              {/* Add Guests */}
              <div className="space-y-3">
                <Label>Add guests</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="Guest email"
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (guestEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
                            if (form.guests.some(g => g.email === guestEmail)) {
                              toast.error('Guest already added');
                              return;
                            }
                            const guestData = await fetchGuestByEmail(guestEmail);
                            setForm((p) => ({ ...p, guests: [...p.guests, guestData] }));
                            setGuestEmail('');
                            if (guestData.isAlumni) {
                              toast.success('Guest added - Registered Alumni ✓', {
                                description: `${guestData.name || guestData.email} is in your alumni database.`
                              });
                            } else {
                              toast.success('External guest added', {
                                description: `${guestData.email} will be invited as an external guest.`
                              });
                            }
                          } else {
                            toast.error('Please enter a valid email');
                          }
                        }
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={async () => {
                      if (guestEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
                        if (form.guests.some(g => g.email === guestEmail)) {
                          toast.error('Guest already added');
                          return;
                        }
                        const guestData = await fetchGuestByEmail(guestEmail);
                        setForm((p) => ({ ...p, guests: [...p.guests, guestData] }));
                        setGuestEmail('');
                        if (guestData.isAlumni) {
                          toast.success('Guest added - Registered Alumni ✓', {
                            description: `${guestData.name || guestData.email} is in your alumni database.`
                          });
                        } else {
                          toast.success('External guest added', {
                            description: `${guestData.email} will be invited as an external guest.`
                          });
                        }
                      } else {
                        toast.error('Please enter a valid email');
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
                
                {/* Guest List */}
                {form.guests.length > 0 && (
                  <AvatarGroup>
                    {form.guests.slice(0, 4).map((guest, index) => {
                      const displayName = guest.name || guest.email.split('@')[0];
                      const initials = guest.name 
                        ? guest.name.substring(0, 2).toUpperCase()
                        : guest.email.substring(0, 2).toUpperCase();
                      
                      return (
                        <HoverCard key={index}>
                          <HoverCardTrigger asChild>
                            <div className="relative group cursor-pointer">
                              <Avatar size="lg">
                                {guest.profilePicture ? (
                                  <img src={guest.profilePicture} alt={displayName} className="object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-primary/10 text-sm font-medium text-foreground">
                                    {initials}
                                  </div>
                                )}
                              </Avatar>
                              <button
                                type="button"
                                onClick={() => {
                                  setForm((p) => ({ ...p, guests: p.guests.filter((_, i) => i !== index) }));
                                  toast.success('Guest removed');
                                }}
                                className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-64">
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold">{guest.name || 'External Guest'}</h4>
                              <p className="text-sm text-muted-foreground">{guest.email}</p>
                              <Badge variant={guest.isAlumni ? "success" : "default"} className="text-xs">
                                {guest.isAlumni ? "Registered Alumni" : "External Guest"}
                              </Badge>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      );
                    })}
                    {form.guests.length > 4 && (
                      <AvatarGroupCount>+{form.guests.length - 4}</AvatarGroupCount>
                    )}
                  </AvatarGroup>
                )}
              </div>
              
              {/* Submit Button */}
              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? (
                  <>
                    <Spinner className="size-4 mr-2" />
                    Creating event...
                  </>
                ) : (
                  'Create event'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {eventFilter === 'upcoming' ? 'Upcoming events' : eventFilter === 'past' ? 'Past events' : 'All events'}
              </CardTitle>
              <CardDescription>Sorted by date.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  exportEvents(filteredEvents);
                  toast.success('Export started', { description: 'Downloading events data as CSV...' });
                }}
                disabled={filteredEvents.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button 
                variant={eventFilter === 'upcoming' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => {
                  setEventFilter('upcoming');
                  setCurrentPage(1);
                }}
              >
                Upcoming
              </Button>
              <Button 
                variant={eventFilter === 'past' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => {
                  setEventFilter('past');
                  setCurrentPage(1);
                }}
              >
                Past
              </Button>
              <Button 
                variant={eventFilter === 'all' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => {
                  setEventFilter('all');
                  setCurrentPage(1);
                }}
              >
                All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-8 text-center text-sm text-muted-foreground">
              No {eventFilter === 'upcoming' ? 'upcoming' : eventFilter === 'past' ? 'past' : ''} events found.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Attendees</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEvents.map((event) => {
                    const joined = event.attendees?.some((a) => a === user?._id || a?._id === user?._id);
                    const attendeeCount = event.attendees?.length || 0;
                    const maxAttendees = event.maxAttendees;
                    const isNearCapacity = maxAttendees && attendeeCount >= maxAttendees * 0.8;
                    const isFull = maxAttendees && attendeeCount >= maxAttendees;
                    
                    return (
                      <TableRow key={event._id}>
                        <TableCell className="font-semibold">{event.title}</TableCell>
                        <TableCell>{event.date ? new Date(event.date).toLocaleDateString() : '—'}</TableCell>
                        <TableCell>{event.startTime && event.endTime ? `${formatTime12Hour(event.startTime)} - ${formatTime12Hour(event.endTime)}` : '—'}</TableCell>
                        <TableCell>{event.location || '—'}</TableCell>
                        <TableCell className="capitalize">{event.mode}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{attendeeCount}{maxAttendees ? `/${maxAttendees}` : ''}</span>
                            {isFull && (
                              <Badge variant="destructive" className="text-xs">Full</Badge>
                            )}
                            {!isFull && isNearCapacity && (
                              <Badge variant="secondary" className="text-xs">Almost Full</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="secondary" size="sm" onClick={() => handleRsvp(event._id, joined)}>
                              <CheckCircle2 className="mr-1 size-4" /> {joined ? 'Cancel' : 'RSVP'}
                            </Button>
                            {isAdmin && (
                              <>
                                <Button variant="ghost" size="icon-sm" onClick={() => setModal({ open: true, record: { ...event, guests: event.guests || [] } })}>
                                  <Pencil className="size-4" />
                                </Button>
                                <AlertDialog open={deleteDialog.open && deleteDialog.id === event._id} onOpenChange={(open) => setDeleteDialog({ open, id: open ? event._id : null })}>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon-sm">
                                      <Trash2 className="size-4 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete event?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently remove <strong>{event.title}</strong> from the calendar. All attendees will lose access. This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDelete(event._id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                        Delete Event
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Pagination Controls */}
          {!loading && filteredEvents.length > ITEMS_PER_PAGE && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredEvents.length)} of {filteredEvents.length} events
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

      <Dialog open={modal.open} onOpenChange={(open) => {
        if (!open) {
          setModal({ open: false, record: null });
        }
      }}>
        {modal.record && (() => {
          // Extract start and end times
          if (!modal.record.startTime) {
            modal.record.startTime = '09:00';
          }
          if (!modal.record.endTime) {
            modal.record.endTime = '17:00';
          }
          return (
          <div>
            <DialogHeader>
              <DialogTitle>Edit event</DialogTitle>
              <DialogDescription>Changes are saved to backend.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-1">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    required
                    minLength={3}
                    maxLength={100}
                    value={modal.record.title}
                    onChange={(e) => setModal((p) => ({ ...p, record: { ...p.record, title: e.target.value } }))}
                  />
                </div>
                
                <div className="space-y-2 relative z-100">
                  <Label>Date</Label>
                  <div className="relative" ref={modalCalendarRef}>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start text-left font-normal h-11 px-4"
                      onClick={() => setModalCalendarOpen(!modalCalendarOpen)}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {modal.record.date ? format(new Date(modal.record.date), 'PPP') : <span className="text-muted-foreground">Pick a date</span>}
                    </Button>
                    {modalCalendarOpen && (
                      <div className="absolute z-9999 mt-2 rounded-2xl border border-border/70 bg-popover shadow-2xl p-3 overflow-hidden max-w-70">
                        <Calendar
                          mode="single"
                          selected={modal.record.date ? new Date(modal.record.date) : undefined}
                          onSelect={(date) => {
                            setModal((p) => ({ ...p, record: { ...p.record, date: date ? date.toISOString() : '' } }));
                            setModalCalendarOpen(false);
                          }}
                          disabled={{ before: new Date() }}
                          initialFocus
                          className="rounded-xl"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="modalStartTime" className="text-sm">Start Time</Label>
                    <div className="flex gap-1">
                      <div className="relative flex-1">
                        <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          min="1"
                          max="12"
                          required
                          value={modalStartTime12.hours}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 12)) {
                              setModalStartTime12(p => ({ ...p, hours: val }));
                            }
                          }}
                          placeholder="HH"
                          className="pl-7 pr-1 text-center"
                        />
                      </div>
                      <span className="flex items-center text-muted-foreground">:</span>
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        required
                        value={modalStartTime12.minutes}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 59)) {
                            setModalStartTime12(p => ({ ...p, minutes: val.padStart(2, '0') }));
                          }
                        }}
                        placeholder="MM"
                        className="flex-1 px-1 text-center"
                      />
                      <Combobox value={modalStartTime12.period} onValueChange={(value) => setModalStartTime12(p => ({ ...p, period: value }))}>
                        <ComboboxInput placeholder="AM" className="w-20" />
                        <ComboboxContent>
                          <ComboboxList>
                            <ComboboxItem value="AM">AM</ComboboxItem>
                            <ComboboxItem value="PM">PM</ComboboxItem>
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modalEndTime" className="text-sm">End Time</Label>
                    <div className="flex gap-1">
                      <div className="relative flex-1">
                        <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          min="1"
                          max="12"
                          required
                          value={modalEndTime12.hours}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 12)) {
                              setModalEndTime12(p => ({ ...p, hours: val }));
                            }
                          }}
                          placeholder="HH"
                          className="pl-7 pr-1 text-center"
                        />
                      </div>
                      <span className="flex items-center text-muted-foreground">:</span>
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        required
                        value={modalEndTime12.minutes}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 59)) {
                            setModalEndTime12(p => ({ ...p, minutes: val.padStart(2, '0') }));
                          }
                        }}
                        placeholder="MM"
                        className="flex-1 px-1 text-center"
                      />
                      <Combobox value={modalEndTime12.period} onValueChange={(value) => setModalEndTime12(p => ({ ...p, period: value }))}>
                        <ComboboxInput placeholder="PM" className="w-20" />
                        <ComboboxContent>
                          <ComboboxList>
                            <ComboboxItem value="AM">AM</ComboboxItem>
                            <ComboboxItem value="PM">PM</ComboboxItem>
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Capacity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={modal.record.maxAttendees || ''}
                      onChange={(e) => setModal((p) => ({ ...p, record: { ...p.record, maxAttendees: e.target.value } }))}
                      placeholder="Max"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      maxLength={100}
                      value={modal.record.location || ''}
                      onChange={(e) => setModal((p) => ({ ...p, record: { ...p.record, location: e.target.value } }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mode</Label>
                    <Combobox value={modal.record.mode} onValueChange={(value) => setModal((p) => ({ ...p, record: { ...p.record, mode: value } }))}>
                      <ComboboxInput placeholder="Select mode" />
                      <ComboboxContent>
                        <ComboboxList>
                          <ComboboxItem value="offline">Offline</ComboboxItem>
                          <ComboboxItem value="online">Online</ComboboxItem>
                          <ComboboxItem value="hybrid">Hybrid</ComboboxItem>
                        </ComboboxList>
                        <ComboboxEmpty>No mode found.</ComboboxEmpty>
                      </ComboboxContent>
                    </Combobox>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    maxLength={500}
                    value={modal.record.description || ''}
                    onChange={(e) => setModal((p) => ({ ...p, record: { ...p.record, description: e.target.value } }))}
                  />
                </div>
                
                {/* Add Guests in Modal */}
                <div className="space-y-3">
                  <Label>Add guests</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type="email"
                        value={modalGuestEmail}
                        onChange={(e) => setModalGuestEmail(e.target.value)}
                        placeholder="Guest email"
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (modalGuestEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(modalGuestEmail)) {
                              const guests = modal.record.guests || [];
                              if (guests.some(g => g.email === modalGuestEmail)) {
                                toast.error('Guest already added');
                                return;
                              }
                              const guestData = await fetchGuestByEmail(modalGuestEmail);
                              setModal((p) => ({ ...p, record: { ...p.record, guests: [...guests, guestData] } }));
                              setModalGuestEmail('');
                              if (guestData.isAlumni) {
                                toast.success('Guest added - Registered Alumni ✓', {
                                  description: `${guestData.name || guestData.email} is in your alumni database.`
                                });
                              } else {
                                toast.success('External guest added', {
                                  description: `${guestData.email} will be invited as an external guest.`
                                });
                              }
                            } else {
                              toast.error('Please enter a valid email');
                            }
                          }
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={async () => {
                        if (modalGuestEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(modalGuestEmail)) {
                          const guests = modal.record.guests || [];
                          if (guests.some(g => g.email === modalGuestEmail)) {
                            toast.error('Guest already added');
                            return;
                          }
                          const guestData = await fetchGuestByEmail(modalGuestEmail);
                          setModal((p) => ({ ...p, record: { ...p.record, guests: [...guests, guestData] } }));
                          setModalGuestEmail('');
                          if (guestData.isAlumni) {
                            toast.success('Guest added - Registered Alumni ✓', {
                              description: `${guestData.name || guestData.email} is in your alumni database.`
                            });
                          } else {
                            toast.success('External guest added', {
                              description: `${guestData.email} will be invited as an external guest.`
                            });
                          }
                        } else {
                          toast.error('Please enter a valid email');
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  
                  {/* Guest List in Modal */}
                  {modal.record.guests && modal.record.guests.length > 0 && (
                    <AvatarGroup>
                      {modal.record.guests.slice(0, 4).map((guest, index) => {
                        const displayName = guest.name || guest.email.split('@')[0];
                        const initials = guest.name 
                          ? guest.name.substring(0, 2).toUpperCase()
                          : guest.email.substring(0, 2).toUpperCase();
                        
                        return (
                          <HoverCard key={index}>
                            <HoverCardTrigger asChild>
                              <div className="relative group cursor-pointer">
                                <Avatar size="lg">
                                  {guest.profilePicture ? (
                                    <img src={guest.profilePicture} alt={displayName} className="object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-primary/10 text-sm font-medium text-foreground">
                                      {initials}
                                    </div>
                                  )}
                                </Avatar>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const guests = modal.record.guests || [];
                                    setModal((p) => ({ ...p, record: { ...p.record, guests: guests.filter((_, i) => i !== index) } }));
                                    toast.success('Guest removed');
                                  }}
                                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-64">
                              <div className="space-y-2">
                                <h4 className="text-sm font-semibold">{guest.name || 'External Guest'}</h4>
                                <p className="text-sm text-muted-foreground">{guest.email}</p>
                                <Badge variant={guest.isAlumni ? "success" : "default"} className="text-xs">
                                  {guest.isAlumni ? "Registered Alumni" : "External Guest"}
                                </Badge>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        );
                      })}
                      {modal.record.guests.length > 4 && (
                        <AvatarGroupCount>+{modal.record.guests.length - 4}</AvatarGroupCount>
                      )}
                    </AvatarGroup>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setModal({ open: false, record: null })}>Cancel</Button>
              <Button onClick={handleUpdate}>Save</Button>
            </DialogFooter>
          </div>
          );
        })()}
      </Dialog>
    </div>
  );
}
