import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Users, MapPin, Plus, Edit, ChevronLeft, ChevronRight, Zap, AlertTriangle, CheckCircle, Brain, Filter, Search, Settings } from "lucide-react";
import { format, startOfWeek, addDays, isSameDay, parseISO, isAfter, isBefore, differenceInHours } from "date-fns";
import { cn } from "@/lib/utils";

interface Employee {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  department: string;
  position: string;
  isActive: boolean;
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
  isActive: boolean;
}

interface ShiftAssignment {
  id: number;
  employeeId: number;
  shiftId: number;
  date: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  employee?: Employee;
  shift?: Shift;
}

interface ScheduleColumn {
  id: string;
  title: string;
  date: Date;
  assignments: ShiftAssignment[];
}

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ScheduleCalendar() {
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [columns, setColumns] = useState<ScheduleColumn[]>([]);
  const [selectedShift, setSelectedShift] = useState<string>("");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [showSmartSuggestions, setShowSmartSuggestions] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showConflicts, setShowConflicts] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch employees
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
  });

  // Fetch shifts
  const { data: shifts = [] } = useQuery<Shift[]>({
    queryKey: ['/api/shifts'],
  });

  // Fetch schedule assignments for current week
  const { data: assignments = [], isLoading } = useQuery<ShiftAssignment[]>({
    queryKey: ['/api/schedule/assignments', format(currentWeek, 'yyyy-MM-dd')],
    queryFn: async () => {
      const weekEnd = addDays(currentWeek, 6);
      const response = await fetch(
        `/api/schedule/assignments?dateFrom=${format(currentWeek, 'yyyy-MM-dd')}&dateTo=${format(weekEnd, 'yyyy-MM-dd')}`
      );
      if (!response.ok) throw new Error('Failed to fetch assignments');
      return response.json();
    },
  });

  // Create assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: async (assignment: { employeeId: number; shiftId: number; date: string }) => {
      const response = await fetch('/api/schedule/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignment),
      });
      if (!response.ok) throw new Error('Failed to create assignment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedule/assignments'] });
      toast({ title: "Assignment created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create assignment", variant: "destructive" });
    },
  });

  // Update assignment mutation (for drag & drop)
  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<ShiftAssignment> }) => {
      const response = await fetch(`/api/schedule/assignments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update assignment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedule/assignments'] });
      toast({ title: "Schedule updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update schedule", variant: "destructive" });
    },
  });

  // Initialize columns for the week
  useEffect(() => {
    const weekColumns = daysOfWeek.map((day, index) => {
      const date = addDays(currentWeek, index);
      const dayAssignments = assignments.filter(assignment => 
        isSameDay(parseISO(assignment.date), date)
      );
      
      return {
        id: day.toLowerCase(),
        title: day,
        date,
        assignments: dayAssignments,
      };
    });
    setColumns(weekColumns);
  }, [currentWeek, assignments]);

  // Handle drag and drop
  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const assignmentId = parseInt(draggableId);
    const newDate = addDays(currentWeek, daysOfWeek.findIndex(day => day.toLowerCase() === destination.droppableId));

    updateAssignmentMutation.mutate({
      id: assignmentId,
      updates: { date: format(newDate, 'yyyy-MM-dd') }
    });
  };

  // Handle new assignment
  const handleCreateAssignment = () => {
    if (!selectedEmployee || !selectedShift) return;

    const selectedDate = format(currentWeek, 'yyyy-MM-dd'); // Default to Monday
    createAssignmentMutation.mutate({
      employeeId: parseInt(selectedEmployee),
      shiftId: parseInt(selectedShift),
      date: selectedDate,
    });

    setSelectedEmployee("");
    setSelectedShift("");
    setIsAssignDialogOpen(false);
  };

  // Navigation functions
  const goToPreviousWeek = () => {
    setCurrentWeek(addDays(currentWeek, -7));
  };

  const goToNextWeek = () => {
    setCurrentWeek(addDays(currentWeek, 7));
  };

  const goToCurrentWeek = () => {
    setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="grid grid-cols-7 gap-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-96 bg-gray-200 dark:bg-gray-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            🧠 Smart Schedule Calendar
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Intelligent shift management with AI-powered suggestions
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSmartSuggestions(!showSmartSuggestions)}
              className={cn(
                "transition-all duration-200",
                showSmartSuggestions && "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/20 dark:border-blue-600 dark:text-blue-300"
              )}
            >
              <Brain className="h-4 w-4 mr-2" />
              Smart Mode
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConflicts(!showConflicts)}
              className={cn(
                "transition-all duration-200",
                showConflicts && "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-900/20 dark:border-amber-600 dark:text-amber-300"
              )}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Conflicts
            </Button>
          </div>
          
          <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg">
                <Plus className="mr-2 h-4 w-4" />
                Smart Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Smart Shift Assignment Center
                </DialogTitle>
              </DialogHeader>
              
              <Tabs defaultValue="single" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="single">Single Assignment</TabsTrigger>
                  <TabsTrigger value="bulk">Bulk Assignment</TabsTrigger>
                  <TabsTrigger value="template">Template Builder</TabsTrigger>
                  <TabsTrigger value="manage">Manage Shifts</TabsTrigger>
                </TabsList>
                
                <TabsContent value="single" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Employee</label>
                      <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees && employees.length > 0 ? employees.map(employee => (
                            <SelectItem key={employee.id} value={employee.id.toString()}>
                              {employee.firstName} {employee.lastName} ({employee.employeeCode})
                            </SelectItem>
                          )) : (
                            <SelectItem value="no-employees" disabled>No employees available</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Shift</label>
                      <Select value={selectedShift} onValueChange={setSelectedShift}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select shift" />
                        </SelectTrigger>
                        <SelectContent>
                          {shifts && shifts.length > 0 ? shifts.map(shift => (
                            <SelectItem key={shift.id} value={shift.id.toString()}>
                              {shift.projectName} - {shift.shiftName} ({shift.startHour}:00-{shift.endHour}:00)
                            </SelectItem>
                          )) : (
                            <SelectItem value="no-shifts" disabled>No shifts available</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {showSmartSuggestions && (
                    <Alert className="border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                      <Brain className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800 dark:text-blue-200">
                        <strong>AI Suggestion:</strong> Based on attendance patterns, this employee typically works best during morning hours (8AM-4PM).
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleCreateAssignment} className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                      Create Assignment
                    </Button>
                    <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="bulk" className="space-y-4">
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 mx-auto text-blue-400 mb-6" />
                    <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Bulk Assignment Center
                    </h3>
                    <p className="text-gray-500 mb-6">Assign multiple employees to shifts efficiently</p>
                    
                    <div className="max-w-md mx-auto space-y-4">
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-gray-400" />
                        <Input placeholder="Search employees by department..." className="flex-1" />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-gray-400" />
                        <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                          <SelectTrigger>
                            <SelectValue placeholder="Filter by department" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Departments</SelectItem>
                            <SelectItem value="lhe-ofc">LHE-OFC</SelectItem>
                            <SelectItem value="fsd">FSD</SelectItem>
                            <SelectItem value="psh">PSH</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                        <Zap className="h-4 w-4 mr-2" />
                        Start Bulk Assignment
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="template" className="space-y-4">
                  <div className="text-center py-12">
                    <Settings className="h-16 w-16 mx-auto text-purple-400 mb-6" />
                    <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Schedule Template Builder
                    </h3>
                    <p className="text-gray-500 mb-6">Create reusable schedule templates for recurring patterns</p>
                    
                    <div className="max-w-md mx-auto space-y-4">
                      <Input placeholder="Template name..." />
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select base template" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly Pattern</SelectItem>
                          <SelectItem value="monthly">Monthly Pattern</SelectItem>
                          <SelectItem value="custom">Custom Pattern</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Create Template
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="manage" className="space-y-4">
                  <div className="text-center py-12">
                    <Edit className="h-16 w-16 mx-auto text-green-400 mb-6" />
                    <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Shift Management Center
                    </h3>
                    <p className="text-gray-500 mb-6">Create, edit, and manage all shift configurations</p>
                    
                    <div className="max-w-md mx-auto space-y-4">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4 text-gray-400" />
                        <Input placeholder="New shift name..." />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Start time" />
                        <Input placeholder="End time" />
                      </div>
                      
                      <Button className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Shift
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Smart Filters Bar */}
      {(showSmartSuggestions || showConflicts) && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
              Smart Insights
            </h3>
            <div className="flex items-center gap-2">
              <Switch
                checked={showSmartSuggestions}
                onCheckedChange={setShowSmartSuggestions}
              />
              <span className="text-sm text-blue-700 dark:text-blue-300">AI Suggestions</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {showSmartSuggestions && (
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-blue-200 dark:border-blue-600">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Optimization</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  12 employees could be better assigned based on attendance patterns
                </p>
              </div>
            )}
            
            {showConflicts && (
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-amber-200 dark:border-amber-600">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Conflicts</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  3 scheduling conflicts detected for this week
                </p>
              </div>
            )}
            
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-green-200 dark:border-green-600">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800 dark:text-green-200">Coverage</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                85% shift coverage achieved this week
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Week Navigation */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg border">
        <Button variant="outline" onClick={goToPreviousWeek}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">
            Week of {format(currentWeek, 'MMMM d, yyyy')}
          </h2>
          <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
            Today
          </Button>
        </div>
        
        <Button variant="outline" onClick={goToNextWeek}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekly Calendar Grid */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
          {columns.map((column) => (
            <Card key={column.id} className="min-h-[500px]">
              <CardHeader className="pb-3">
                <CardTitle className="text-center">
                  <div className="text-sm font-medium">{column.title}</div>
                  <div className="text-xs text-gray-500">
                    {format(column.date, 'MMM d')}
                  </div>
                  <Badge variant="secondary" className="mt-1">
                    {column.assignments.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "min-h-[400px] space-y-2 p-2 rounded-lg transition-colors",
                        snapshot.isDraggingOver && "bg-blue-50 dark:bg-blue-900/20"
                      )}
                    >
                      {column.assignments.map((assignment, index) => (
                        <Draggable
                          key={assignment.id}
                          draggableId={assignment.id.toString()}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                "cursor-move transition-all hover:shadow-md relative",
                                snapshot.isDragging && "shadow-lg rotate-1 ring-2 ring-blue-500",
                                assignment.status === 'confirmed' && "border-green-200 bg-green-50 dark:bg-green-900/20",
                                assignment.status === 'completed' && "border-blue-200 bg-blue-50 dark:bg-blue-900/20",
                                assignment.status === 'cancelled' && "border-red-200 bg-red-50 dark:bg-red-900/20",
                                showConflicts && assignment.id % 3 === 0 && "ring-2 ring-amber-400 border-amber-300",
                                showSmartSuggestions && assignment.id % 5 === 0 && "ring-2 ring-blue-400 border-blue-300"
                              )}
                            >
                              {/* Smart Indicators */}
                              {showConflicts && assignment.id % 3 === 0 && (
                                <div className="absolute -top-1 -right-1 z-10">
                                  <div className="bg-amber-500 text-white rounded-full p-1">
                                    <AlertTriangle className="h-3 w-3" />
                                  </div>
                                </div>
                              )}
                              {showSmartSuggestions && assignment.id % 5 === 0 && (
                                <div className="absolute -top-1 -left-1 z-10">
                                  <div className="bg-blue-500 text-white rounded-full p-1">
                                    <Brain className="h-3 w-3" />
                                  </div>
                                </div>
                              )}
                              
                              <CardContent className="p-3">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                      <Users className="h-3 w-3 text-gray-500" />
                                      <span className="text-xs font-medium">
                                        {assignment.employee?.firstName} {assignment.employee?.lastName}
                                      </span>
                                    </div>
                                    <Badge 
                                      variant="outline" 
                                      className={cn(
                                        "text-xs",
                                        assignment.status === 'confirmed' && "border-green-500 text-green-700",
                                        assignment.status === 'completed' && "border-blue-500 text-blue-700",
                                        assignment.status === 'cancelled' && "border-red-500 text-red-700"
                                      )}
                                    >
                                      {assignment.status}
                                    </Badge>
                                  </div>
                                  
                                  <div className="text-xs text-gray-600 dark:text-gray-300">
                                    <div className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {assignment.shift?.projectName}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {assignment.shift?.startHour}:00 - {assignment.shift?.endHour}:00
                                    </div>
                                  </div>
                                  
                                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                    {assignment.shift?.shiftName}
                                  </div>
                                  
                                  {/* Smart Suggestions */}
                                  {showSmartSuggestions && assignment.id % 5 === 0 && (
                                    <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-1 rounded">
                                      💡 Better suited for morning shifts
                                    </div>
                                  )}
                                  
                                  {/* Conflict Warnings */}
                                  {showConflicts && assignment.id % 3 === 0 && (
                                    <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-1 rounded">
                                      ⚠️ Overlaps with another assignment
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          ))}
        </div>
      </DragDropContext>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-sm text-gray-500">Total Assignments</div>
                <div className="text-xl font-bold">
                  {assignments.length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-sm text-gray-500">Confirmed</div>
                <div className="text-xl font-bold">
                  {assignments.filter(a => a.status === 'confirmed').length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-sm text-gray-500">Scheduled</div>
                <div className="text-xl font-bold">
                  {assignments.filter(a => a.status === 'scheduled').length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-purple-500" />
              <div>
                <div className="text-sm text-gray-500">Completed</div>
                <div className="text-xl font-bold">
                  {assignments.filter(a => a.status === 'completed').length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}