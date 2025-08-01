import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Calendar, 
  Plus, 
  Edit2, 
  Trash2, 
  Users,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  UserPlus,
  Settings,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';

interface Shift {
  id: number;
  projectName: string;
  shiftName: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  daysOfWeek: string[];
  gracePeriodMinutes: number;
  isActive: boolean;
}

interface Employee {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  department: string;
  shiftId?: number;
  shiftName?: string;
}

interface ShiftAssignment {
  id: number;
  employeeId: number;
  shiftId: number;
  date: string;
  status: 'scheduled' | 'completed' | 'missed' | 'cancelled';
  notes?: string;
  employee: Employee;
  shift: Shift;
}

const formatTime = (hour: number, minute: number): string => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
};

const getShiftColor = (shiftName: string): string => {
  const colors = {
    'Morning': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'Afternoon': 'bg-orange-100 text-orange-800 border-orange-300',
    'Evening': 'bg-purple-100 text-purple-800 border-purple-300',
    'Night': 'bg-indigo-100 text-indigo-800 border-indigo-300',
    'SYS-EARLY': 'bg-green-100 text-green-800 border-green-300',
    'SYS-STANDARD': 'bg-blue-100 text-blue-800 border-blue-300',
    'SYS-LATE-MORNING': 'bg-amber-100 text-amber-800 border-amber-300',
    'SYS-AFTERNOON': 'bg-rose-100 text-rose-800 border-rose-300',
    'SYS-TECH': 'bg-violet-100 text-violet-800 border-violet-300',
  };
  return colors[shiftName as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-300';
};

const getStatusColor = (status: string): string => {
  const colors = {
    'scheduled': 'bg-blue-100 text-blue-800 border-blue-300',
    'completed': 'bg-green-100 text-green-800 border-green-300',
    'missed': 'bg-red-100 text-red-800 border-red-300',
    'cancelled': 'bg-gray-100 text-gray-800 border-gray-300',
  };
  return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-300';
};

export default function Schedule() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedShift, setSelectedShift] = useState('all');
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const { data: shifts } = useQuery<Shift[]>({
    queryKey: ['/api/shifts'],
  });

  const { data: employeesResponse } = useQuery<{ employees: Employee[]; total: number }>({
    queryKey: ['/api/employees?isActive=true&limit=1000'],
  });

  const employees = employeesResponse?.employees || [];

  const { data: shiftAssignments } = useQuery<ShiftAssignment[]>({
    queryKey: ['/api/shift-assignments', { 
      startDate: format(weekStart, 'yyyy-MM-dd'),
      endDate: format(weekEnd, 'yyyy-MM-dd')
    }],
  });

  const { data: departments } = useQuery<string[]>({
    queryKey: ['/api/employees/departments'],
  });

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1));
  };

  const getAssignmentsForDay = (date: Date) => {
    return shiftAssignments?.filter(assignment => 
      isSameDay(parseISO(assignment.date), date)
    ) || [];
  };

  const getEmployeesForShift = (shiftId: number) => {
    return employees?.filter(emp => emp.shiftId === shiftId) || [];
  };

  const filteredEmployees = employees?.filter(emp => {
    const matchesDepartment = selectedDepartment === 'all' || emp.department === selectedDepartment;
    const matchesShift = selectedShift === 'all' || emp.shiftId?.toString() === selectedShift;
    return matchesDepartment && matchesShift;
  }) || [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Calendar className="h-7 w-7 text-blue-600" />
                Schedule Calendar
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                View and manage employee schedules
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={viewMode} onValueChange={(value: 'week' | 'month') => setViewMode(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Week View</SelectItem>
                  <SelectItem value="month">Month View</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments?.map(dept => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedShift} onValueChange={setSelectedShift}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shifts</SelectItem>
                  {shifts?.map(shift => (
                    <SelectItem key={shift.id} value={shift.id.toString()}>
                      {shift.shiftName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Schedule Calendar */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Week of {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => navigateWeek('prev')}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentWeek(new Date())}
                    >
                      Today
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => navigateWeek('next')}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className="text-center font-medium text-slate-600 dark:text-slate-400 py-2">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {weekDays.map(day => {
                    const dayAssignments = getAssignmentsForDay(day);
                    const isToday = isSameDay(day, new Date());
                    
                    return (
                      <div 
                        key={day.toISOString()}
                        className={`
                          min-h-32 p-2 border border-slate-200 dark:border-slate-700 rounded-lg
                          ${isToday ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' : 'bg-white dark:bg-slate-800'}
                        `}
                      >
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                          {format(day, 'd')}
                        </div>
                        <div className="space-y-1">
                          {dayAssignments.slice(0, 3).map(assignment => (
                            <div 
                              key={assignment.id}
                              className={`
                                text-xs px-2 py-1 rounded border
                                ${getShiftColor(assignment.shift.shiftName)}
                              `}
                            >
                              <div className="font-medium truncate">
                                {assignment.employee.firstName} {assignment.employee.lastName}
                              </div>
                              <div className="truncate">
                                {assignment.shift.shiftName}
                              </div>
                            </div>
                          ))}
                          {dayAssignments.length > 3 && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              +{dayAssignments.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Shift Legend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Active Shifts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {shifts?.filter(shift => shift.isActive).map(shift => (
                    <div key={shift.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getShiftColor(shift.shiftName).split(' ')[0]}`} />
                        <span className="text-sm font-medium">{shift.shiftName}</span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {formatTime(shift.startHour, shift.startMinute)} - {formatTime(shift.endHour, shift.endMinute)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Weekly Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  This Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Total Assignments</span>
                    <span className="font-medium">{shiftAssignments?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Completed</span>
                    <span className="font-medium text-green-600">
                      {shiftAssignments?.filter(a => a.status === 'completed').length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Scheduled</span>
                    <span className="font-medium text-blue-600">
                      {shiftAssignments?.filter(a => a.status === 'scheduled').length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Missed</span>
                    <span className="font-medium text-red-600">
                      {shiftAssignments?.filter(a => a.status === 'missed').length || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Employee Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Employees ({filteredEmployees.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {filteredEmployees.slice(0, 10).map(employee => (
                    <div key={employee.id} className="flex items-center justify-between py-1">
                      <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {employee.firstName} {employee.lastName}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {employee.department}
                        </div>
                      </div>
                      {employee.shiftName && (
                        <Badge variant="outline" className="text-xs">
                          {employee.shiftName}
                        </Badge>
                      )}
                    </div>
                  ))}
                  {filteredEmployees.length > 10 && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 pt-2">
                      +{filteredEmployees.length - 10} more employees
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}