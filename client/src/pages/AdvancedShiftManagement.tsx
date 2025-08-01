import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock, Users, AlertTriangle, CheckCircle, Settings, Plus, Save, RotateCcw, Zap, GripVertical, Eye, Edit, Trash2, Copy, Target, BarChart3, TrendingUp, Calendar as CalendarIcon, Bot, Shuffle, Filter, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addDays, subDays, parseISO, isWithinInterval } from 'date-fns';

interface Employee {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  department: string;
  shiftId?: number;
  workTeam?: string;
  designation?: string;
  nonBio?: boolean;
}

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
  createdAt?: string;
  updatedAt?: string;
}

interface ShiftAssignment {
  id: number;
  employeeId: number;
  shiftId: number;
  date: string;
  status: 'scheduled' | 'completed' | 'missed' | 'cancelled';
  notes?: string;
  isOverride?: boolean;
  createdBy?: string;
}

interface Conflict {
  type: 'overlap' | 'understaffed' | 'overstaffed' | 'skill_mismatch' | 'workload';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  affectedEmployees: number[];
  suggestedAction?: string;
  date?: string;
  shiftId?: number;
}

interface AutoSchedulingRule {
  id: string;
  name: string;
  priority: number;
  enabled: boolean;
  conditions: {
    departments?: string[];
    workTeams?: string[];
    designations?: string[];
    minExperience?: number;
    maxConsecutiveDays?: number;
    preferredDaysOff?: string[];
  };
  actions: {
    assignToShift?: number;
    avoidConsecutive?: boolean;
    distributeEvenly?: boolean;
    respectPreferences?: boolean;
  };
}

// Draggable Employee Component
function DraggableEmployee({ employee, conflicts, onRemove }: { 
  employee: Employee; 
  conflicts: Conflict[]; 
  onRemove?: (employeeId: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: employee.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasConflicts = conflicts.some(c => c.affectedEmployees.includes(employee.id));

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 cursor-move hover:shadow-md transition-all ${
        isDragging ? 'opacity-50 rotate-2' : ''
      } ${hasConflicts ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-slate-400" />
          <div>
            <div className="font-medium text-sm">{employee.firstName} {employee.lastName}</div>
            <div className="text-xs text-slate-500">{employee.employeeCode} • {employee.department}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {employee.nonBio && <Badge variant="outline" className="text-xs">NonBio</Badge>}
          {hasConflicts && <AlertTriangle className="h-4 w-4 text-red-500" />}
          {onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(employee.id);
              }}
              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Droppable Shift Zone Component
function DroppableShiftZone({ shift, assignedEmployees, conflicts, onEmployeeAssign, onEmployeeRemove }: {
  shift: Shift;
  assignedEmployees: Employee[];
  conflicts: Conflict[];
  onEmployeeAssign: (employeeId: number, shiftId: number) => void;
  onEmployeeRemove: (employeeId: number, shiftId: number) => void;
}) {
  const formatTime = (hour: number, minute: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  const shiftConflicts = conflicts.filter(c => c.shiftId === shift.id);
  const hasCriticalConflicts = shiftConflicts.some(c => c.severity === 'critical');
  const hasWarnings = shiftConflicts.some(c => c.severity === 'medium' || c.severity === 'high');

  return (
    <Card className={`border-2 border-dashed transition-all hover:shadow-lg ${
      hasCriticalConflicts ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 
      hasWarnings ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10' : 
      'border-slate-300 dark:border-slate-600 hover:border-blue-400'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {shift.shiftName}
            </CardTitle>
            <CardDescription>
              {formatTime(shift.startHour, shift.startMinute)} - {formatTime(shift.endHour, shift.endMinute)}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={shift.isActive ? "default" : "secondary"}>
              {shift.isActive ? "Active" : "Inactive"}
            </Badge>
            {shiftConflicts.length > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {shiftConflicts.length}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Shift Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Project:</span> {shift.projectName}
            </div>
            <div>
              <span className="font-medium">Grace Period:</span> {shift.gracePeriodMinutes} mins
            </div>
            <div className="col-span-2">
              <span className="font-medium">Days:</span> {shift.daysOfWeek.join(', ')}
            </div>
          </div>

          {/* Conflicts Display */}
          {shiftConflicts.length > 0 && (
            <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {shiftConflicts.map((conflict, idx) => (
                    <div key={idx} className="text-sm">
                      <Badge variant="destructive" className="mr-2">{conflict.severity}</Badge>
                      {conflict.message}
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Assigned Employees */}
          <div className="min-h-[100px] border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Assigned Employees ({assignedEmployees.length})</span>
              <Users className="h-4 w-4 text-slate-400" />
            </div>
            <div className="space-y-2">
              {assignedEmployees.map(employee => (
                <DraggableEmployee 
                  key={employee.id} 
                  employee={employee} 
                  conflicts={conflicts} 
                  onRemove={(employeeId) => onEmployeeRemove(employeeId, shift.id)}
                />
              ))}
              {assignedEmployees.length === 0 && (
                <div className="text-center py-6 text-slate-500 text-sm">
                  Drop employees here to assign them to this shift
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Auto-Scheduling Rules Component
function AutoSchedulingRules({ rules, onRuleUpdate }: {
  rules: AutoSchedulingRule[];
  onRuleUpdate: (rules: AutoSchedulingRule[]) => void;
}) {
  const [selectedRule, setSelectedRule] = useState<AutoSchedulingRule | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const defaultRule: AutoSchedulingRule = {
    id: `rule_${Date.now()}`,
    name: 'New Rule',
    priority: 1,
    enabled: true,
    conditions: {},
    actions: {}
  };

  const addRule = () => {
    setSelectedRule(defaultRule);
    setIsDialogOpen(true);
  };

  const saveRule = (rule: AutoSchedulingRule) => {
    const updatedRules = selectedRule?.id === rule.id 
      ? rules.map(r => r.id === rule.id ? rule : r)
      : [...rules, rule];
    onRuleUpdate(updatedRules);
    setIsDialogOpen(false);
    setSelectedRule(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Auto-Scheduling Rules</h3>
        <Button onClick={addRule} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </div>

      <div className="space-y-3">
        {rules.map(rule => (
          <Card key={rule.id} className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{rule.name}</div>
                  <div className="text-sm text-slate-500">Priority: {rule.priority}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={rule.enabled} 
                    onCheckedChange={(enabled) => {
                      const updatedRules = rules.map(r => 
                        r.id === rule.id ? { ...r, enabled } : r
                      );
                      onRuleUpdate(updatedRules);
                    }}
                  />
                  <Button variant="ghost" size="sm" onClick={() => {
                    setSelectedRule(rule);
                    setIsDialogOpen(true);
                  }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedRule?.id.startsWith('rule_') ? 'Create' : 'Edit'} Auto-Scheduling Rule
            </DialogTitle>
          </DialogHeader>
          {selectedRule && (
            <div className="space-y-4">
              <div>
                <Label>Rule Name</Label>
                <Input 
                  value={selectedRule.name}
                  onChange={(e) => setSelectedRule({...selectedRule, name: e.target.value})}
                />
              </div>
              <div>
                <Label>Priority (1-10)</Label>
                <Input 
                  type="number"
                  min="1"
                  max="10"
                  value={selectedRule.priority}
                  onChange={(e) => setSelectedRule({...selectedRule, priority: parseInt(e.target.value)})}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  checked={selectedRule.enabled}
                  onCheckedChange={(enabled) => setSelectedRule({...selectedRule, enabled})}
                />
                <Label>Enabled</Label>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => saveRule(selectedRule)}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Rule
                </Button>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdvancedShiftManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [autoSchedulingEnabled, setAutoSchedulingEnabled] = useState(false);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [schedulingRules, setSchedulingRules] = useState<AutoSchedulingRule[]>([]);
  const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null);
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch data
  const { data: employeesResponse } = useQuery<{ employees: Employee[]; total: number }>({
    queryKey: ['/api/employees?isActive=true&limit=1000'],
  });

  const { data: shifts } = useQuery<Shift[]>({
    queryKey: ['/api/shifts'],
  });

  const { data: departments } = useQuery<string[]>({
    queryKey: ['/api/employees/departments'],
  });

  const employees = employeesResponse?.employees || [];

  // Mutations
  const assignShiftMutation = useMutation({
    mutationFn: async ({ employeeId, shiftId }: { employeeId: number; shiftId: number }) => {
      const employee = employees.find(emp => emp.id === employeeId);
      const oldShift = employee?.shiftId ? shifts?.find(s => s.id === employee.shiftId) : null;
      const newShift = shifts?.find(s => s.id === shiftId);
      
      const result = await apiRequest({
        url: `/api/employees/${employeeId}`,
        method: 'PUT',
        data: { shiftId },
      });
      
      return { result, oldShift, newShift, employee };
    },
    onSuccess: ({ oldShift, newShift, employee }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      
      if (oldShift && newShift) {
        toast({ 
          title: 'Employee transferred successfully', 
          description: `${employee?.firstName} ${employee?.lastName} moved from ${oldShift.shiftName} to ${newShift.shiftName}` 
        });
      } else if (newShift) {
        toast({ 
          title: 'Employee assigned successfully', 
          description: `${employee?.firstName} ${employee?.lastName} assigned to ${newShift.shiftName}` 
        });
      }
    },
    onError: (error) => {
      toast({ title: 'Error', description: 'Failed to update shift assignment', variant: 'destructive' });
    },
  });

  // Remove employee from shift mutation
  const removeEmployeeFromShiftMutation = useMutation({
    mutationFn: async ({ employeeId }: { employeeId: number }) => {
      return apiRequest({
        url: `/api/employees/${employeeId}`,
        method: 'PUT',
        data: { shiftId: null },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      toast({ title: 'Success', description: 'Employee removed from shift successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: 'Failed to remove employee from shift', variant: 'destructive' });
    },
  });

  // Conflict Detection
  const detectConflicts = () => {
    const newConflicts: Conflict[] = [];
    
    // Check for understaffed shifts
    shifts?.forEach(shift => {
      const assignedCount = employees.filter(emp => emp.shiftId === shift.id).length;
      if (assignedCount < 2) {
        newConflicts.push({
          type: 'understaffed',
          severity: 'medium',
          message: `${shift.shiftName} is understaffed (${assignedCount} employees)`,
          affectedEmployees: employees.filter(emp => emp.shiftId === shift.id).map(emp => emp.id),
          shiftId: shift.id,
          suggestedAction: 'Assign more employees to this shift'
        });
      }
    });

    // Check for employees without shifts
    const unassignedEmployees = employees.filter(emp => !emp.shiftId);
    if (unassignedEmployees.length > 0) {
      newConflicts.push({
        type: 'understaffed',
        severity: 'high',
        message: `${unassignedEmployees.length} employees are not assigned to any shift`,
        affectedEmployees: unassignedEmployees.map(emp => emp.id),
        suggestedAction: 'Assign these employees to appropriate shifts'
      });
    }

    setConflicts(newConflicts);
  };

  // Auto-scheduling function
  const runAutoScheduling = () => {
    const unassignedEmployees = employees.filter(emp => !emp.shiftId);
    
    unassignedEmployees.forEach(employee => {
      // Simple algorithm: assign to shift with least employees
      const shiftCounts = shifts?.map(shift => ({
        shift,
        count: employees.filter(emp => emp.shiftId === shift.id).length
      })) || [];
      
      const targetShift = shiftCounts.sort((a, b) => a.count - b.count)[0]?.shift;
      
      if (targetShift) {
        assignShiftMutation.mutate({ employeeId: employee.id, shiftId: targetShift.id });
      }
    });
  };

  // Handler for removing employees from shifts
  const handleRemoveEmployeeFromShift = (employeeId: number, shiftId: number) => {
    removeEmployeeFromShiftMutation.mutate({ employeeId });
  };

  // Drag and drop handling
  const handleDragStart = (event: DragStartEvent) => {
    const employee = employees.find(emp => emp.id === event.active.id);
    setActiveEmployee(employee || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const employeeId = active.id as number;
      const shiftId = over.id as number;
      
      // Check if over.id is a shift
      const targetShift = shifts?.find(shift => shift.id === shiftId);
      if (targetShift) {
        assignShiftMutation.mutate({ employeeId, shiftId });
      }
    }
    
    setActiveEmployee(null);
  };

  // Filter employees
  const filteredEmployees = employees.filter(employee => {
    const matchesDepartment = filterDepartment === 'all' || employee.department === filterDepartment;
    const matchesSearch = !searchQuery || 
      employee.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.employeeCode.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesDepartment && matchesSearch;
  });

  // Group employees by shift
  const groupedEmployees = {
    unassigned: filteredEmployees.filter(emp => !emp.shiftId),
    assigned: shifts?.map(shift => ({
      shift,
      employees: filteredEmployees.filter(emp => emp.shiftId === shift.id)
    })) || []
  };

  // Conflict detection on data changes
  useEffect(() => {
    if (employees.length > 0 && shifts?.length) {
      detectConflicts();
    }
  }, [employees, shifts]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1A1B3E' }}>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Target className="h-8 w-8 text-purple-400" />
                Advanced Shift Management
              </h1>
              <p className="text-gray-300 mt-2">
                Intelligent scheduling with conflict detection and automatic assignment
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={runAutoScheduling}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                disabled={assignShiftMutation.isPending}
              >
                <Bot className="h-4 w-4 mr-2" />
                Auto-Schedule
              </Button>
              <Button 
                onClick={() => queryClient.invalidateQueries()}
                variant="outline"
                className="border-purple-500 text-purple-400 hover:bg-purple-500/10"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Conflicts Alert */}
        {conflicts.length > 0 && (
          <Alert className="mb-6 border-red-500 bg-red-900/20 text-red-100">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {conflicts.length} scheduling conflicts detected
                </span>
                <Badge variant="destructive" className="ml-2">
                  {conflicts.filter(c => c.severity === 'critical').length} Critical
                </Badge>
              </div>
              <div className="mt-2 space-y-1">
                {conflicts.slice(0, 3).map((conflict, idx) => (
                  <div key={idx} className="text-sm">
                    • {conflict.message}
                  </div>
                ))}
                {conflicts.length > 3 && (
                  <div className="text-sm text-red-300">
                    ... and {conflicts.length - 3} more
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <Tabs defaultValue="schedule" className="space-y-6">
          <TabsList className="bg-[#2A2B5E] border-purple-500/20">
            <TabsTrigger value="schedule" className="text-white data-[state=active]:bg-purple-600">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="rules" className="text-white data-[state=active]:bg-purple-600">
              <Settings className="h-4 w-4 mr-2" />
              Rules
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-white data-[state=active]:bg-purple-600">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-6">
            {/* Employee Assignment Interface */}
            <Card className="border-purple-500/20 mb-6" style={{ backgroundColor: '#2A2B5E' }}>
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Employee Assignment Manager
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Search ALL employees and transfer them between shifts. System automatically handles shift transfers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Quick Assignment */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Quick Assignment</h3>
                      <p className="text-sm text-green-400 mt-1">✓ Shows ALL employees (assigned and unassigned) • Supports shift transfers</p>
                    </div>
                    <div className="space-y-3">
                      <Input
                        placeholder="Search employee by name or code..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-[#1A1B3E] border-purple-500/30 text-white"
                      />
                      <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                        <SelectTrigger className="bg-[#1A1B3E] border-purple-500/30 text-white">
                          <SelectValue placeholder="Filter by department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Departments</SelectItem>
                          {departments?.map(dept => (
                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {/* Filtered Employee List */}
                      <div className="max-h-[300px] overflow-y-auto space-y-2">
                        {filteredEmployees.slice(0, 15).map(employee => (
                          <div key={employee.id} className="flex items-center justify-between p-3 bg-[#1A1B3E] rounded-lg border border-purple-500/30">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm">
                                  {employee.firstName[0]}{employee.lastName[0]}
                                </div>
                                <div>
                                  <p className="text-white font-medium">{employee.firstName} {employee.lastName}</p>
                                  <p className="text-gray-400 text-sm">{employee.employeeCode} • {employee.department}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {employee.shiftId ? (
                                <Badge variant="secondary" className="text-xs bg-green-600/20 text-green-400 border-green-500/30">
                                  Currently: {shifts?.find(s => s.id === employee.shiftId)?.shiftName || 'Unknown Shift'}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs bg-orange-600/20 text-orange-400 border-orange-500/30">
                                  Unassigned
                                </Badge>
                              )}
                              <Select
                                value={employee.shiftId?.toString() || "none"}
                                onValueChange={(value) => {
                                  if (value === "none") {
                                    removeEmployeeFromShiftMutation.mutate({ employeeId: employee.id });
                                  } else {
                                    assignShiftMutation.mutate({ employeeId: employee.id, shiftId: parseInt(value) });
                                  }
                                }}
                              >
                                <SelectTrigger className="w-[140px] bg-[#1A1B3E] border-purple-500/30 text-white">
                                  <SelectValue placeholder="Change shift" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Remove from shift</SelectItem>
                                  {shifts?.map(shift => (
                                    <SelectItem key={shift.id} value={shift.id.toString()}>
                                      {shift.shiftName} ({employees.filter(emp => emp.shiftId === shift.id).length} assigned)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ))}
                        {filteredEmployees.length === 0 && (
                          <div className="text-center py-4 text-gray-400">
                            No employees found matching your search
                          </div>
                        )}
                        {filteredEmployees.length > 15 && (
                          <div className="text-center py-2 text-gray-400 text-sm">
                            Showing first 15 results. Use search to narrow down.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Shift Overview */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Shift Overview</h3>
                    <div className="space-y-3">
                      {shifts?.map(shift => (
                        <div key={shift.id} className="p-3 bg-[#1A1B3E] rounded-lg border border-purple-500/30">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white font-medium">{shift.shiftName}</p>
                              <p className="text-gray-400 text-sm">
                                {String(shift.startHour).padStart(2, '0')}:{String(shift.startMinute).padStart(2, '0')} - 
                                {String(shift.endHour).padStart(2, '0')}:{String(shift.endMinute).padStart(2, '0')}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-white border-purple-500">
                              {employees.filter(emp => emp.shiftId === shift.id).length} employees
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Unassigned Employees */}
                <Card className="border-purple-500/20" style={{ backgroundColor: '#2A2B5E' }}>
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Unassigned Employees ({groupedEmployees.unassigned.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      <SortableContext items={groupedEmployees.unassigned.map(emp => emp.id)} strategy={verticalListSortingStrategy}>
                        {groupedEmployees.unassigned.map(employee => (
                          <DraggableEmployee key={employee.id} employee={employee} conflicts={conflicts} />
                        ))}
                      </SortableContext>
                      {groupedEmployees.unassigned.length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                          All employees are assigned to shifts
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Shift Assignments */}
                <div className="lg:col-span-2 space-y-6">
                  {groupedEmployees.assigned.map(({ shift, employees: shiftEmployees }) => (
                    <SortableContext key={shift.id} items={[shift.id]} strategy={verticalListSortingStrategy}>
                      <DroppableShiftZone
                        shift={shift}
                        assignedEmployees={shiftEmployees}
                        conflicts={conflicts}
                        onEmployeeAssign={(employeeId, shiftId) => {
                          assignShiftMutation.mutate({ employeeId, shiftId });
                        }}
                        onEmployeeRemove={handleRemoveEmployeeFromShift}
                      />
                    </SortableContext>
                  ))}
                </div>
              </div>

              <DragOverlay>
                {activeEmployee && (
                  <DraggableEmployee employee={activeEmployee} conflicts={conflicts} />
                )}
              </DragOverlay>
            </DndContext>
          </TabsContent>

          <TabsContent value="rules" className="space-y-6">
            <AutoSchedulingRules rules={schedulingRules} onRuleUpdate={setSchedulingRules} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-purple-500/20" style={{ backgroundColor: '#2A2B5E' }}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-purple-400" />
                    <div>
                      <p className="text-sm text-gray-300">Total Employees</p>
                      <p className="text-2xl font-bold text-white">{employees.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-purple-500/20" style={{ backgroundColor: '#2A2B5E' }}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-8 w-8 text-green-400" />
                    <div>
                      <p className="text-sm text-gray-300">Assigned</p>
                      <p className="text-2xl font-bold text-white">{employees.filter(emp => emp.shiftId).length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-purple-500/20" style={{ backgroundColor: '#2A2B5E' }}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-8 w-8 text-red-400" />
                    <div>
                      <p className="text-sm text-gray-300">Conflicts</p>
                      <p className="text-2xl font-bold text-white">{conflicts.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-purple-500/20" style={{ backgroundColor: '#2A2B5E' }}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Clock className="h-8 w-8 text-blue-400" />
                    <div>
                      <p className="text-sm text-gray-300">Active Shifts</p>
                      <p className="text-2xl font-bold text-white">{shifts?.filter(s => s.isActive).length || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}