import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/lib/api-config';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Eye,
  Building2
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

interface Admin {
  id: string;
  _id?: string;
  name: string;
  email: string;
  schoolName?: string;
}

export default function SuperAdminCalendar() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  // Fetch admins on component mount
  useEffect(() => {
    fetchAdmins();
  }, []);

  // Fetch events when admin is selected
  useEffect(() => {
    if (selectedAdminId) {
      fetchEvents(selectedAdminId);
    } else {
      setEvents([]);
    }
  }, [selectedAdminId]);

  const fetchAdmins = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/super-admin/admins`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const adminsList = Array.isArray(data) ? data : (data.data || []);
        setAdmins(adminsList);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch schools",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast({
        title: "Error",
        description: "Failed to fetch schools",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEvents = async (adminId: string) => {
    try {
      setIsLoadingEvents(true);
      const token = localStorage.getItem('authToken');
      console.log('Fetching events for admin:', adminId);
      
      const response = await fetch(`${API_BASE_URL}/api/super-admin/events/${adminId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const eventsList = Array.isArray(data) ? data : (data.events || data.data || []);
        console.log(`Fetched ${eventsList.length} events for admin ${adminId}`, eventsList);
        setEvents(eventsList);
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Failed to fetch events:', response.status, errorData);
        toast({
          title: "Error",
          description: errorData.message || "Failed to fetch events",
          variant: "destructive",
        });
        setEvents([]);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to fetch events",
        variant: "destructive",
      });
      setEvents([]);
    } finally {
      setIsLoadingEvents(false);
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
      
      return eventDateStr === dateStr;
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

  // Handle view event
  const handleViewEvent = (event: Event) => {
    setSelectedEvent(event);
    setIsViewDialogOpen(true);
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

  const selectedAdmin = admins.find(admin => (admin.id || admin._id) === selectedAdminId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">School Calendar</h2>
          <p className="text-gray-600 mt-1">View events created by school admins</p>
        </div>
        <Button onClick={goToToday} variant="outline">
          Today
        </Button>
      </div>

      {/* School Selector */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <Building2 className="h-5 w-5 text-gray-500" />
            <div className="flex-1">
              <Label htmlFor="school-select">Select School</Label>
              <Select value={selectedAdminId} onValueChange={setSelectedAdminId}>
                <SelectTrigger id="school-select" className="w-full">
                  <SelectValue placeholder="Select a school to view events" />
                </SelectTrigger>
                <SelectContent>
                  {admins.map((admin) => {
                    const adminId = admin.id || admin._id || '';
                    console.log('Admin option:', { id: adminId, name: admin.schoolName || admin.name, email: admin.email });
                    return (
                      <SelectItem key={adminId} value={adminId}>
                        {admin.schoolName || admin.name || admin.email}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          {selectedAdmin && (
            <div className="mt-4 p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Viewing events for:</span> {selectedAdmin.schoolName || selectedAdmin.name}
              </p>
              <p className="text-xs text-gray-500 mt-1">{selectedAdmin.email}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendar Navigation */}
      {selectedAdminId && (
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

            {isLoadingEvents ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-pulse" />
                  <p className="text-gray-600">Loading events...</p>
                </div>
              </div>
            ) : (
              /* Calendar Grid */
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
                        min-h-[100px] border border-gray-200 rounded-lg p-2
                        transition-all
                        ${!isCurrentMonthDay ? 'bg-gray-50 opacity-50' : 'bg-white'}
                        ${isTodayDate ? 'ring-2 ring-orange-500' : ''}
                      `}
                      whileHover={{ scale: 1.02 }}
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
                        {dayEvents.slice(0, 3).map((event, eventIndex) => (
                          <div
                            key={event._id || event.id || eventIndex}
                            className={`
                              text-xs p-1 rounded truncate text-white cursor-pointer
                              ${getEventColor(eventIndex)}
                              hover:opacity-80
                            `}
                            onClick={() => handleViewEvent(event)}
                            title={event.name}
                          >
                            {event.name}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-gray-500 font-medium">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedAdminId && (
        <Card>
          <CardContent className="p-12 text-center">
            <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No School Selected</h3>
            <p className="text-gray-600">Please select a school from the dropdown above to view their calendar events.</p>
          </CardContent>
        </Card>
      )}

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
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Eye className="h-4 w-4" />
                <span>Read-only view</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

