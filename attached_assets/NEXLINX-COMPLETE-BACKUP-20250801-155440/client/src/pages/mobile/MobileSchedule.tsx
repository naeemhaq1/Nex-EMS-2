import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MobileLayout } from "@/components/MobileLayout";
import { useLocation } from 'wouter';
import { 
  Calendar,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  TrendingUp,
  Trophy,
  Settings
} from "lucide-react";
import MobileFooter from '@/components/mobile/MobileFooter';
import { format, addDays, isToday, isSameDay, getMonth, getYear } from "date-fns";

export default function MobileSchedule() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  
  const { data: shifts } = useQuery({
    queryKey: ["/api/shifts"],
  });

  const { data: assignments } = useQuery({
    queryKey: ["/api/shift-assignments"],
  });

  // Sample shift data for demonstration - extended to cover 30 days
  const sampleShiftData = [
    { date: new Date(), shiftName: "Morning", startTime: "09:00", endTime: "17:00", location: "Main Office", color: "bg-blue-500" },
    { date: addDays(new Date(), 1), shiftName: "Evening", startTime: "15:00", endTime: "23:00", location: "Branch Office", color: "bg-purple-500" },
    { date: addDays(new Date(), 2), shiftName: "Morning", startTime: "09:00", endTime: "17:00", location: "Main Office", color: "bg-blue-500" },
    { date: addDays(new Date(), 3), shiftName: "Day", startTime: "08:00", endTime: "16:00", location: "Field Site", color: "bg-yellow-500" },
    { date: addDays(new Date(), 4), shiftName: "Morning", startTime: "09:00", endTime: "17:00", location: "Main Office", color: "bg-blue-500" },
    { date: addDays(new Date(), 7), shiftName: "Evening", startTime: "15:00", endTime: "23:00", location: "Branch Office", color: "bg-purple-500" },
    { date: addDays(new Date(), 8), shiftName: "Night", startTime: "23:00", endTime: "07:00", location: "Security Post", color: "bg-blue-500" },
    { date: addDays(new Date(), 10), shiftName: "Morning", startTime: "09:00", endTime: "17:00", location: "Main Office", color: "bg-blue-500" },
    { date: addDays(new Date(), 14), shiftName: "Day", startTime: "08:00", endTime: "16:00", location: "Field Site", color: "bg-yellow-500" },
    { date: addDays(new Date(), 15), shiftName: "Evening", startTime: "15:00", endTime: "23:00", location: "Branch Office", color: "bg-purple-500" },
    { date: addDays(new Date(), 17), shiftName: "Morning", startTime: "09:00", endTime: "17:00", location: "Main Office", color: "bg-blue-500" },
    { date: addDays(new Date(), 18), shiftName: "Night", startTime: "23:00", endTime: "07:00", location: "Security Post", color: "bg-blue-500" },
    { date: addDays(new Date(), 21), shiftName: "Day", startTime: "08:00", endTime: "16:00", location: "Field Site", color: "bg-yellow-500" },
    { date: addDays(new Date(), 22), shiftName: "Evening", startTime: "15:00", endTime: "23:00", location: "Branch Office", color: "bg-purple-500" },
    { date: addDays(new Date(), 24), shiftName: "Morning", startTime: "09:00", endTime: "17:00", location: "Main Office", color: "bg-blue-500" },
    { date: addDays(new Date(), 25), shiftName: "Day", startTime: "08:00", endTime: "16:00", location: "Field Site", color: "bg-yellow-500" },
    { date: addDays(new Date(), 28), shiftName: "Evening", startTime: "15:00", endTime: "23:00", location: "Branch Office", color: "bg-purple-500" },
    { date: addDays(new Date(), 29), shiftName: "Night", startTime: "23:00", endTime: "07:00", location: "Security Post", color: "bg-blue-500" },
  ];

  const getShiftColor = (shiftName: string) => {
    const colors: Record<string, string> = {
      "Morning": "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-400",
      "Evening": "bg-gradient-to-r from-purple-500 to-purple-600 text-white border-purple-400",
      "Night": "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-400",
      "Day": "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-yellow-400"
    };
    return colors[shiftName] || "bg-gradient-to-r from-gray-500 to-gray-600 text-white border-gray-400";
  };

  const getAssignmentsForDay = (date: Date) => {
    // Use sample data for demonstration
    return sampleShiftData.filter(shift => 
      shift.date.toDateString() === date.toDateString()
    );
  };

  // Generate 30 days starting from today (0-29 days into the future)
  const generateCalendarDays = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      days.push(addDays(today, i));
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();
  const selectedAssignments = getAssignmentsForDay(selectedDate);

  const scrollToDate = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const currentMonth = monthNames[getMonth(selectedDate)];
  const currentYear = getYear(selectedDate);

  return (
    <MobileLayout showMenu={false}>
      <div className="h-screen flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-scroll overflow-x-hidden mobile-content-scroll p-4 space-y-4 pb-20">
          {/* Page Title with Month Display */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg p-4 text-center">
            <h1 className="text-2xl font-bold text-white mb-1">My Schedule</h1>
            <p className="text-blue-100 text-lg font-medium">{currentMonth} {currentYear}</p>
          </div>

          {/* Calendar Days Scroller */}
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-400" />
                  Calendar Days
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => scrollToDate('left')}
                    className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4 text-white" />
                  </button>
                  <button
                    onClick={() => scrollToDate('right')}
                    className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    <ChevronRight className="h-4 w-4 text-white" />
                  </button>
                </div>
              </div>
              
              {/* Calendar Style Day Panels */}
              <div 
                ref={scrollRef}
                className="flex gap-3 overflow-x-auto pb-2 mobile-scroll"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {calendarDays.map((day) => {
                  const dayAssignments = getAssignmentsForDay(day);
                  const isSelected = isSameDay(day, selectedDate);
                  const isCurrentDay = isToday(day);
                
                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={`
                        flex-shrink-0 w-20 h-24 rounded-xl cursor-pointer transition-all duration-200
                        ${isSelected 
                          ? 'bg-gradient-to-br from-green-500 to-green-600 shadow-lg shadow-green-500/30 transform scale-105' 
                          : isCurrentDay 
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30' 
                            : 'bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 shadow-md'
                        }
                      `}
                    >
                      <div className="h-full flex flex-col items-center justify-center text-center p-2">
                        <div className="text-xs text-gray-300 font-medium mb-1">
                          {format(day, 'EEE')}
                        </div>
                        <div className={`text-lg font-bold ${isSelected || isCurrentDay ? 'text-white' : 'text-gray-200'}`}>
                          {format(day, 'd')}
                        </div>
                        
                        {/* Shift Indicators */}
                        <div className="flex gap-1 mt-1">
                          {dayAssignments.map((assignment, index) => (
                            <div
                              key={index}
                              className={`w-2 h-2 rounded-full ${assignment.color} opacity-80`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Selected Date Details */}
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-400" />
                  <span className="text-lg">
                    {format(selectedDate, 'EEEE, MMMM d')}
                  </span>
                </div>
                {isToday(selectedDate) && (
                  <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white border-green-400">
                    Today
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedAssignments.length > 0 ? (
                <div className="space-y-4">
                  {selectedAssignments.map((assignment, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gradient-to-r from-slate-700 to-slate-800 rounded-lg border border-slate-600 shadow-md"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <Badge className={getShiftColor(assignment.shiftName)}>
                          {assignment.shiftName} Shift
                        </Badge>
                        <div className="flex items-center gap-1 text-sm text-gray-300">
                          <Clock className="h-4 w-4" />
                          {assignment.startTime} - {assignment.endTime}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <MapPin className="h-4 w-4 text-blue-400" />
                        {assignment.location}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Calendar className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-300 font-medium">No shifts scheduled</p>
                  <p className="text-gray-500 text-sm mt-1">
                    {isToday(selectedDate) ? 'Enjoy your day off!' : 'Free day'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Weekly Overview */}
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-400" />
                This Week Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }, (_, i) => addDays(new Date(), i)).map((day) => {
                  const dayAssignments = getAssignmentsForDay(day);
                  const isCurrentDay = isToday(day);
                  
                  return (
                    <div
                      key={day.toISOString()}
                      className={`
                        text-center p-2 rounded-lg
                        ${isCurrentDay 
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                          : 'bg-gradient-to-br from-slate-700 to-slate-800'
                        }
                      `}
                    >
                      <div className="text-xs text-gray-300 font-medium">
                        {format(day, 'EEE')}
                      </div>
                      <div className={`text-sm font-bold ${isCurrentDay ? 'text-white' : 'text-gray-200'}`}>
                        {format(day, 'd')}
                      </div>
                      <div className="flex justify-center gap-1 mt-1">
                        {dayAssignments.map((assignment, index) => (
                          <div
                            key={index}
                            className={`w-1.5 h-1.5 rounded-full ${assignment.color}`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Navigation */}
        <MobileFooter currentPage="schedule" />
      </div>
    </MobileLayout>
  );
}