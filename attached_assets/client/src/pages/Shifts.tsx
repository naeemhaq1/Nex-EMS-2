import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Plus, GripVertical, Trash2, Edit2, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import type { Shift, InsertShift } from "@shared/schema";

const shiftFormSchema = z.object({
  projectName: z.string().min(1, "Project name is required"),
  shiftName: z.string().min(1, "Shift name is required"),
  startHour: z.number().min(0).max(23),
  startMinute: z.number().min(0).max(59),
  endHour: z.number().min(0).max(23),
  endMinute: z.number().min(0).max(59),
  daysOfWeek: z.array(z.string()).min(1, "At least one day must be selected"),
});

const DAYS_OF_WEEK = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
  { value: "sunday", label: "Sun" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

interface ShiftCardProps {
  shift: Shift;
  onEdit: (shift: Shift) => void;
  onDelete: (id: number) => void;
}

function ShiftCard({ shift, onEdit, onDelete }: ShiftCardProps) {
  const formatTime = (hour: number, minute: number) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const getDayBadges = () => {
    return shift.daysOfWeek.map(day => (
      <Badge key={day} variant="secondary" className="text-xs">
        {DAYS_OF_WEEK.find(d => d.value === day)?.label}
      </Badge>
    ));
  };

  return (
    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-move">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
            <div>
              <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {shift.shiftName}
              </CardTitle>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {shift.projectName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(shift)}
              className="h-7 w-7 p-0"
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(shift.id)}
              className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <Clock className="h-3 w-3" />
            <span>{formatTime(shift.startHour, shift.startMinute)} - {formatTime(shift.endHour, shift.endMinute)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 text-gray-600 dark:text-gray-300" />
            <div className="flex gap-1 flex-wrap">
              {getDayBadges()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ShiftFormProps {
  shift?: Shift;
  onClose: () => void;
}

function ShiftForm({ shift, onClose }: ShiftFormProps) {
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof shiftFormSchema>>({
    resolver: zodResolver(shiftFormSchema),
    defaultValues: {
      projectName: shift?.projectName || "",
      shiftName: shift?.shiftName || "",
      startHour: shift?.startHour || 9,
      startMinute: shift?.startMinute || 0,
      endHour: shift?.endHour || 17,
      endMinute: shift?.endMinute || 0,
      daysOfWeek: shift?.daysOfWeek || [],
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof shiftFormSchema>) => {
      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create shift');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      toast({ title: "Shift created successfully" });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to create shift", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof shiftFormSchema>) => {
      const response = await fetch(`/api/shifts/${shift!.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update shift');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      toast({ title: "Shift updated successfully" });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to update shift", variant: "destructive" });
    },
  });

  const onSubmit = (data: z.infer<typeof shiftFormSchema>) => {
    if (shift) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="projectName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Enter project name" />
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
                <Input {...field} placeholder="Enter shift name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <FormLabel>Start Time</FormLabel>
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="startHour"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Select value={field.value.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HOURS.map(hour => (
                            <SelectItem key={hour} value={hour.toString()}>
                              {hour.toString().padStart(2, '0')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="startMinute"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Select value={field.value.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MINUTES.map(minute => (
                            <SelectItem key={minute} value={minute.toString()}>
                              {minute.toString().padStart(2, '0')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div>
            <FormLabel>End Time</FormLabel>
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="endHour"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Select value={field.value.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HOURS.map(hour => (
                            <SelectItem key={hour} value={hour.toString()}>
                              {hour.toString().padStart(2, '0')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endMinute"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Select value={field.value.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MINUTES.map(minute => (
                            <SelectItem key={minute} value={minute.toString()}>
                              {minute.toString().padStart(2, '0')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        <FormField
          control={form.control}
          name="daysOfWeek"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Days of Week</FormLabel>
              <div className="grid grid-cols-7 gap-2">
                {DAYS_OF_WEEK.map(day => (
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

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
            {shift ? 'Update' : 'Create'} Shift
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function Shifts() {
  const [editingShift, setEditingShift] = useState<Shift | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();

  const { data: shifts = [], isLoading } = useQuery<Shift[]>({
    queryKey: ['/api/shifts'],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/shifts/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete shift');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      toast({ title: "Shift deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete shift", variant: "destructive" });
    },
  });

  const handleEdit = (shift: Shift) => {
    setEditingShift(shift);
    setIsFormOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this shift?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingShift(undefined);
  };

  const groupedShifts = shifts.reduce((acc, shift) => {
    if (!acc[shift.projectName]) {
      acc[shift.projectName] = [];
    }
    acc[shift.projectName].push(shift);
    return acc;
  }, {} as Record<string, Shift[]>);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Shift Management</h1>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Shift Management</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Organize work shifts by project with drag-and-drop scheduling
          </p>
        </div>
        
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Add Shift
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingShift ? 'Edit Shift' : 'Create New Shift'}
              </DialogTitle>
            </DialogHeader>
            <ShiftForm shift={editingShift} onClose={handleCloseForm} />
          </DialogContent>
        </Dialog>
      </div>

      {Object.keys(groupedShifts).length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-gray-500 dark:text-gray-400">
            <Clock className="mx-auto h-12 w-12 mb-4" />
            <h3 className="text-lg font-medium mb-2">No shifts configured</h3>
            <p className="mb-4">Create your first shift to get started with project scheduling.</p>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Shift
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedShifts).map(([projectName, projectShifts]) => (
            <div key={projectName}>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                {projectName}
                <Badge variant="outline" className="ml-2">
                  {projectShifts.length} shift{projectShifts.length !== 1 ? 's' : ''}
                </Badge>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {projectShifts.map(shift => (
                  <ShiftCard
                    key={shift.id}
                    shift={shift}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}