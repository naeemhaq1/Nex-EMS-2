import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { 
  Clock, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Calendar, 
  Users,
  MapPin,
  Activity,
  CheckCircle,
  XCircle,
  Settings,
  Filter,
  MoreVertical,
  AlertCircle,
  Eye
} from 'lucide-react';

const shiftFormSchema = z.object({
  projectName: z.string().min(1, 'Project name is required'),
  shiftName: z.string().min(1, 'Shift name is required'),
  startHour: z.number().min(0).max(23),
  startMinute: z.number().min(0).max(59),
  endHour: z.number().min(0).max(23),
  endMinute: z.number().min(0).max(59),
  daysOfWeek: z.array(z.string()).min(1, 'At least one day must be selected'),
  gracePeriodMinutes: z.number().min(0).default(30),
  isActive: z.boolean().default(true),
});

type ShiftFormData = z.infer<typeof shiftFormSchema>;

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
  createdAt: string;
  updatedAt: string;
}

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
];

const formatTime = (hour: number, minute: number): string => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
};

const getDaysDisplay = (days: string[]): string => {
  if (days.length === 7) return 'Every day';
  if (days.length === 5 && !days.includes('saturday') && !days.includes('sunday')) return 'Weekdays';
  if (days.length === 2 && days.includes('saturday') && days.includes('sunday')) return 'Weekends';
  return days.map(day => day.charAt(0).toUpperCase() + day.slice(1, 3)).join(', ');
};

export default function ShiftManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isShiftFormOpen, setIsShiftFormOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [selectedProject, setSelectedProject] = useState('all');

  const form = useForm<ShiftFormData>({
    resolver: zodResolver(shiftFormSchema),
    defaultValues: {
      projectName: '',
      shiftName: '',
      startHour: 9,
      startMinute: 0,
      endHour: 17,
      endMinute: 0,
      daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      gracePeriodMinutes: 30,
      isActive: true,
    },
  });

  const { data: shifts, isLoading: shiftsLoading } = useQuery<Shift[]>({
    queryKey: ['/api/shifts'],
  });

  const createShiftMutation = useMutation({
    mutationFn: async (data: ShiftFormData) => {
      return await apiRequest({
        url: '/api/shifts',
        method: 'POST',
        data: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      toast({
        title: 'Success',
        description: 'Shift created successfully',
      });
      setIsShiftFormOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create shift',
        variant: 'destructive',
      });
    },
  });

  const updateShiftMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ShiftFormData> }) => {
      console.log('Mutation called with ID:', id, 'Data:', data);
      const response = await apiRequest({
        url: `/api/shifts/${id}`,
        method: 'PUT',
        data: data
      });
      console.log('API Response:', response);
      return response;
    },
    onSuccess: (response) => {
      console.log('Update successful:', response);
      // Force refresh of the shifts data
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      queryClient.refetchQueries({ queryKey: ['/api/shifts'] });
      toast({
        title: 'Success',
        description: 'Shift updated successfully',
      });
      setIsShiftFormOpen(false);
      setEditingShift(null);
      form.reset({
        projectName: '',
        shiftName: '',
        startHour: 9,
        startMinute: 0,
        endHour: 17,
        endMinute: 0,
        daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        gracePeriodMinutes: 30,
        isActive: true,
      });
    },
    onError: (error: any) => {
      console.error('Update error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update shift',
        variant: 'destructive',
      });
    },
  });

  const deleteShiftMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest({
        url: `/api/shifts/${id}`,
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      toast({
        title: 'Success',
        description: 'Shift deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete shift',
        variant: 'destructive',
      });
    },
  });

  const handleEditShift = (shift: Shift) => {
    setEditingShift(shift);
    form.reset({
      projectName: shift.projectName,
      shiftName: shift.shiftName,
      startHour: shift.startHour,
      startMinute: shift.startMinute,
      endHour: shift.endHour,
      endMinute: shift.endMinute,
      daysOfWeek: shift.daysOfWeek,
      gracePeriodMinutes: shift.gracePeriodMinutes,
      isActive: shift.isActive,
    });
    // Force form to update with new values
    setTimeout(() => {
      form.setValue('startHour', shift.startHour);
      form.setValue('startMinute', shift.startMinute);
      form.setValue('endHour', shift.endHour);
      form.setValue('endMinute', shift.endMinute);
    }, 0);
    setIsShiftFormOpen(true);
  };

  const handleDeleteShift = (id: number) => {
    if (confirm('Are you sure you want to delete this shift?')) {
      deleteShiftMutation.mutate(id);
    }
  };

  const onSubmit = (data: ShiftFormData) => {
    console.log('Form submit data:', data);
    console.log('Editing shift:', editingShift);
    
    if (editingShift) {
      console.log('Updating shift with ID:', editingShift.id, 'Data:', data);
      updateShiftMutation.mutate({ id: editingShift.id, data });
    } else {
      console.log('Creating new shift with data:', data);
      createShiftMutation.mutate(data);
    }
  };

  const filteredShifts = shifts?.filter(shift => {
    const matchesSearch = shift.shiftName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shift.projectName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = selectedProject === 'all' || shift.projectName === selectedProject;
    return matchesSearch && matchesProject;
  }) || [];

  const projects = [...new Set(shifts?.map(shift => shift.projectName) || [])];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Clock className="h-7 w-7 text-blue-600" />
                Shift Management
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Manage work shifts and schedules
              </p>
            </div>
            <Dialog open={isShiftFormOpen} onOpenChange={setIsShiftFormOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => {
                    setEditingShift(null);
                    form.reset();
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Shift
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingShift ? 'Edit Shift' : 'Add New Shift'}
                  </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="projectName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Project Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter project name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="shiftName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Shift Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter shift name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <FormField
                        control={form.control}
                        name="startHour"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Hour</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                max="23"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="startMinute"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Minute</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                max="59"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="endHour"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Hour</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                max="23"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="endMinute"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Minute</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                max="59"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="gracePeriodMinutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Grace Period (Minutes)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Grace period for late arrivals
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="daysOfWeek"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Days of Week</FormLabel>
                          <div className="grid grid-cols-4 gap-2">
                            {DAYS_OF_WEEK.map((day) => (
                              <div key={day.value} className="flex items-center space-x-2">
                                <Checkbox
                                  id={day.value}
                                  checked={field.value.includes(day.value)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      field.onChange([...field.value, day.value]);
                                    } else {
                                      field.onChange(field.value.filter(d => d !== day.value));
                                    }
                                  }}
                                />
                                <label htmlFor={day.value} className="text-sm font-medium">
                                  {day.label}
                                </label>
                              </div>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Active</FormLabel>
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsShiftFormOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={createShiftMutation.isPending || updateShiftMutation.isPending}
                      >
                        {editingShift ? 'Update' : 'Create'} Shift
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search shifts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project} value={project}>
                      {project}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Shifts Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Shifts ({filteredShifts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {shiftsLoading ? (
              <div className="text-center py-8">Loading shifts...</div>
            ) : filteredShifts.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-16 w-16 mx-auto mb-4 text-slate-400" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                  No shifts found
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-4">
                  {searchTerm ? "Try adjusting your search terms" : "Create your first shift to get started"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Shift Name</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Grace Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredShifts.map((shift) => (
                      <TableRow key={shift.id}>
                        <TableCell className="font-medium text-blue-600">#{shift.id}</TableCell>
                        <TableCell className="font-medium">{shift.projectName}</TableCell>
                        <TableCell>{shift.shiftName}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatTime(shift.startHour, shift.startMinute)} - {formatTime(shift.endHour, shift.endMinute)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{getDaysDisplay(shift.daysOfWeek)}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {shift.gracePeriodMinutes} min
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={shift.isActive ? "default" : "secondary"} className={shift.isActive ? "bg-green-600 hover:bg-green-700" : ""}>
                            {shift.isActive ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                Inactive
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditShift(shift)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteShift(shift.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}