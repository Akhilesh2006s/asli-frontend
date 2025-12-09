import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/lib/api-config';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon,
  X,
  Image as ImageIcon,
  Edit,
  Trash2
} from 'lucide-react';

interface Event {
  _id?: string;
  id?: string;
  name: string;
  date: string;
  photo?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function AdminCalendar() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const [eventForm, setEventForm] = useState({
    name: '',
    date: '',
    photo: null as File | null,
    photoUrl: '',
    description: ''
  });

  // Fetch events on component mount
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/events`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(Array.isArray(data) ? data : (data.events || data.data || []));
      } else {
        console.error('Failed to fetch events');
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get first day of month
  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  // Get last day of month
  const getLastDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDay = getFirstDayOfMonth(currentDate);
    const lastDay = getLastDayOfMonth(currentDate);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from Sunday
    
    const days: Date[] = [];
    const current = new Date(startDate);
    
    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [currentDate]);

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    // Normalize date to midnight in local timezone for accurate comparison
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dateStr = `${normalizedDate.getFullYear()}-${String(normalizedDate.getMonth() + 1).padStart(2, '0')}-${String(normalizedDate.getDate()).padStart(2, '0')}`;
    
    return events.filter(event => {
      // Normalize event date to midnight in local timezone
      const eventDateObj = new Date(event.date);
      const normalizedEventDate = new Date(
        eventDateObj.getFullYear(), 
        eventDateObj.getMonth(), 
        eventDateObj.getDate()
      );
      const eventDateStr = `${normalizedEventDate.getFullYear()}-${String(normalizedEventDate.getMonth() + 1).padStart(2, '0')}-${String(normalizedEventDate.getDate()).padStart(2, '0')}`;
      
      const matches = eventDateStr === dateStr;
      if (matches) {
        console.log('Event matched for date:', {
          calendarDate: dateStr,
          eventDate: eventDateStr,
          eventName: event.name,
          eventId: event._id || event.id
        });
      }
      return matches;
    });
  };

  // Check if date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Check if date is in current month
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth() && 
           date.getFullYear() === currentDate.getFullYear();
  };

  // Navigate months
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Handle date click
  const handleDateClick = (date: Date) => {
    // Normalize date to local timezone to avoid timezone issues
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const year = normalizedDate.getFullYear();
    const month = String(normalizedDate.getMonth() + 1).padStart(2, '0');
    const day = String(normalizedDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    console.log('Date clicked:', {
      originalDate: date,
      normalizedDate: normalizedDate,
      dateString: dateString,
      dayOfMonth: date.getDate()
    });
    
    setSelectedDate(normalizedDate);
    setEventForm({
      name: '',
      date: dateString,
      photo: null,
      photoUrl: '',
      description: ''
    });
    setIsEditMode(false);
    setEditingEvent(null);
    setIsEventDialogOpen(true);
  };

  // Handle event form submit
  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!eventForm.name || !eventForm.date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const formData = new FormData();
      formData.append('name', eventForm.name);
      formData.append('date', eventForm.date);
      formData.append('description', eventForm.description);
      
      if (eventForm.photo) {
        formData.append('photo', eventForm.photo);
      }

      const url = isEditMode && editingEvent
        ? `${API_BASE_URL}/api/admin/events/${editingEvent._id || editingEvent.id}`
        : `${API_BASE_URL}/api/admin/events`;

      const response = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: isEditMode ? "Event updated successfully" : "Event created successfully",
        });
        setIsEventDialogOpen(false);
        resetForm();
        fetchEvents();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to save event",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving event:', error);
      toast({
        title: "Error",
        description: "Failed to save event",
        variant: "destructive",
      });
    }
  };

  // Handle delete event
  const handleDeleteEvent = async (event: Event) => {
    if (!confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/events/${event._id || event.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Event deleted successfully",
        });
        fetchEvents();
      } else {
        toast({
          title: "Error",
          description: "Failed to delete event",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
    }
  };

  // Handle edit event
  const handleEditEvent = (event: Event, e?: React.MouseEvent) => {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    setEditingEvent(event);
    setIsEditMode(true);
    setEventForm({
      name: event.name,
      date: new Date(event.date).toISOString().split('T')[0],
      photo: null,
      photoUrl: event.photo || '',
      description: event.description || ''
    });
    setSelectedDate(new Date(event.date));
    setIsEventDialogOpen(true);
  };

  // Handle view event
  const handleViewEvent = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Viewing event:', {
      eventId: event._id || event.id,
      eventName: event.name,
      eventDate: event.date,
      eventDateFormatted: new Date(event.date).toLocaleDateString()
    });
    setSelectedEvent(event);
    setIsViewDialogOpen(true);
  };

  // Reset form
  const resetForm = () => {
    setEventForm({
      name: '',
      date: selectedDate ? selectedDate.toISOString().split('T')[0] : '',
      photo: null,
      photoUrl: '',
      description: ''
    });
    setIsEditMode(false);
    setEditingEvent(null);
  };

  // Handle photo change
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEventForm({
        ...eventForm,
        photo: file,
        photoUrl: URL.createObjectURL(file)
      });
    }
  };

  // Get month name
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Color coding for events (cycling through colors)
  const eventColors = [
    'bg-green-500',
    'bg-blue-500',
    'bg-pink-500',
    'bg-purple-500',
    'bg-yellow-500',
    'bg-orange-500',
  ];

  const getEventColor = (index: number) => {
    return eventColors[index % eventColors.length];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Calendar</h2>
          <p className="text-gray-600 mt-1">Manage and view your events</p>
        </div>
        <Button onClick={goToToday} variant="outline">
          Today
        </Button>
      </div>

      {/* Calendar Navigation */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="text-2xl font-semibold text-gray-900">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h3>
              <Button variant="outline" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Day Headers */}
            {dayNames.map(day => (
              <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}

            {/* Calendar Days */}
            {calendarDays.map((date, index) => {
              const dayEvents = getEventsForDate(date);
              const isCurrentMonthDay = isCurrentMonth(date);
              const isTodayDate = isToday(date);

              return (
                <motion.div
                  key={index}
                  className={`
                    min-h-[100px] border border-gray-200 rounded-lg p-2 cursor-pointer
                    transition-all hover:bg-gray-50 relative
                    ${!isCurrentMonthDay ? 'bg-gray-50 opacity-50' : 'bg-white'}
                    ${isTodayDate ? 'ring-2 ring-orange-500' : ''}
                  `}
                  onClick={() => handleDateClick(date)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={`
                    text-sm font-medium mb-1
                    ${isTodayDate ? 'text-orange-600 font-bold' : 'text-gray-700'}
                    ${!isCurrentMonthDay ? 'text-gray-400' : ''}
                  `}>
                    {date.getDate()}
                  </div>
                  
                  {/* Events */}
                  <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event, eventIndex) => {
                        const eventId = event._id || event.id || `event-${eventIndex}`;
                        return (
                          <div
                            key={eventId}
                            className={`
                              text-xs p-1 rounded truncate text-white cursor-pointer
                              ${getEventColor(eventIndex)}
                              hover:opacity-80
                            `}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewEvent(event, e);
                            }}
                            title={event.name}
                          >
                            {event.name}
                          </div>
                        );
                      })}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-gray-500 font-medium">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                    {dayEvents.length === 0 && (
                      <div className="text-xs text-gray-400 text-center py-1">
                        Click to add
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Event Dialog */}
      <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Event' : 'Add Event'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEventSubmit} className="space-y-4">
            <div>
              <Label htmlFor="event-name">Event Name *</Label>
              <Input
                id="event-name"
                value={eventForm.name}
                onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                placeholder="Enter event name"
                required
              />
            </div>

            <div>
              <Label htmlFor="event-photo">Photo</Label>
              <div className="space-y-2">
                {eventForm.photoUrl && (
                  <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                    <img
                      src={eventForm.photoUrl}
                      alt="Event preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setEventForm({ ...eventForm, photo: null, photoUrl: '' })}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <Input
                  id="event-photo"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="cursor-pointer"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                placeholder="Enter event description"
                rows={4}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEventDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {isEditMode ? 'Update Event' : 'Create Event'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Event Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.name}</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              {selectedEvent.photo && (
                <div className="w-full h-64 rounded-lg overflow-hidden">
                  <img
                    src={selectedEvent.photo}
                    alt={selectedEvent.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div>
                <Label>Date</Label>
                <p className="text-gray-700">
                  {new Date(selectedEvent.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              {selectedEvent.description && (
                <div>
                  <Label>Description</Label>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedEvent.description}</p>
                </div>
              )}
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsViewDialogOpen(false);
                    handleEditEvent(selectedEvent);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setIsViewDialogOpen(false);
                    handleDeleteEvent(selectedEvent);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

