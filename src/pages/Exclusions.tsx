import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Users, Building, ShieldOff, Shield, AlertCircle, Search, Download } from "lucide-react";
import { format } from "date-fns";

// Form schema for exclusions
const exclusionSchema = z.object({
  type: z.enum(['department', 'employee']),
  targetValue: z.string().min(1, "Target value is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  isActive: z.boolean().default(true),
  selectedEmployees: z.array(z.string()).optional(), // For multi-select employee exclusions
});

type ExclusionFormData = z.infer<typeof exclusionSchema>;

interface Exclusion {
  id: number;
  type: 'department' | 'employee';
  targetValue: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Employee {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  department: string;
  nonBio: boolean;
}

interface DepartmentForExclusion {
  department: string;
  employeeCount: number;
}

export default function Exclusions() {
  const [open, setOpen] = useState(false);
  const [editingExclusion, setEditingExclusion] = useState<Exclusion | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  
  // State for bulk deletion
  const [selectedForDeletion, setSelectedForDeletion] = useState<number[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [bulkDeleteType, setBulkDeleteType] = useState<'single' | 'bulk'>('single');
  const [itemToDelete, setItemToDelete] = useState<{id: number, name: string} | null>(null);
  
  // State for employee details dialog
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all exclusions
  const { data: exclusions = [], isLoading } = useQuery<Exclusion[]>({
    queryKey: ['/api/exclusions'],
  });

  // Fetch calculated NonBio employees only (as per the updated capacity-based system)
  const { data: nonBioResponse, isLoading: employeesLoading } = useQuery({
    queryKey: ['/api/analytics/calculated-nonbio-employees'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/calculated-nonbio-employees');
      if (!response.ok) throw new Error('Failed to fetch calculated NonBio employees');
      return response.json();
    }
  });

  // Extract NonBio employees array from response
  const employees = nonBioResponse?.employees || [];

  // Fetch NonBio departments for department exclusion dropdown
  const departments: DepartmentForExclusion[] = nonBioResponse?.departmentBreakdown?.map((dept: any) => ({
    department: dept.department,
    employeeCount: dept.employee_count
  })) || [];

  // Fetch unified metrics for accurate NonBio count
  const { data: metrics } = useQuery({
    queryKey: ['/api/dashboard/metrics'],
    refetchInterval: 60000,
  });

  // Create exclusion mutation
  const createMutation = useMutation({
    mutationFn: async (data: ExclusionFormData) => {
      return apiRequest('POST', '/api/exclusions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/exclusions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/employees/departments/exclusions'] });
      toast({
        title: "Success",
        description: "Exclusion created successfully",
      });
      setOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create exclusion",
        variant: "destructive",
      });
    },
  });

  // Update exclusion mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ExclusionFormData> }) => {
      return apiRequest('PUT', `/api/exclusions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/exclusions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/employees/departments/exclusions'] });
      toast({
        title: "Success",
        description: "Exclusion updated successfully",
      });
      setEditingExclusion(null);
      setOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update exclusion",
        variant: "destructive",
      });
    },
  });

  // Delete exclusion mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/exclusions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/exclusions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/employees/departments/exclusions'] });
      toast({
        title: "Success",
        description: "Exclusion deleted successfully",
      });
      setSelectedForDeletion([]);
      setIsDeleteConfirmOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete exclusion",
        variant: "destructive",
      });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      return apiRequest('/api/exclusions/bulk', 'DELETE', { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/exclusions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/employees/departments/exclusions'] });
      toast({
        title: "Success",
        description: `${selectedForDeletion.length} exclusions deleted successfully`,
      });
      setSelectedForDeletion([]);
      setIsDeleteConfirmOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete exclusions",
        variant: "destructive",
      });
    },
  });

  // Form setup
  const form = useForm<ExclusionFormData>({
    resolver: zodResolver(exclusionSchema),
    defaultValues: {
      type: 'department',
      targetValue: '',
      name: '',
      description: '',
      isActive: true,
      selectedEmployees: [],
    },
  });

  // Handle form submission
  const onSubmit = (data: ExclusionFormData) => {
    if (editingExclusion) {
      updateMutation.mutate({ id: editingExclusion.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Handle edit
  const handleEdit = (exclusion: Exclusion) => {
    setEditingExclusion(exclusion);
    
    // For employee exclusions, initialize selectedEmployees
    if (exclusion.type === 'employee' && exclusion.targetValue) {
      setSelectedEmployees([exclusion.targetValue]);
    } else {
      setSelectedEmployees([]);
    }
    
    form.reset({
      type: exclusion.type,
      targetValue: exclusion.targetValue,
      name: exclusion.name,
      description: exclusion.description || '',
      isActive: exclusion.isActive,
      selectedEmployees: exclusion.type === 'employee' ? [exclusion.targetValue] : [],
    });
    setOpen(true);
  };

  // Handle delete
  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this exclusion?')) {
      deleteMutation.mutate(id);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    setOpen(false);
    setEditingExclusion(null);
    setSelectedEmployees([]);
    setSearchTerm("");
    form.reset();
  };

  // Filter exclusions by type
  const departmentExclusions = exclusions.filter(e => e.type === 'department');
  const employeeExclusions = exclusions.filter(e => e.type === 'employee');

  // Get employee count for department exclusions
  const getDepartmentEmployeeCount = (department: string) => {
    if (!Array.isArray(employees)) return 0;
    return employees.filter(emp => emp?.department === department).length;
  };

  // Get employees for a specific department
  const getDepartmentEmployees = (department: string) => {
    if (!Array.isArray(employees)) return [];
    return employees.filter(emp => emp?.department === department && emp?.nonBio === true);
  };

  // Handle department click to show employee details
  const handleDepartmentClick = (department: string) => {
    setSelectedDepartment(department);
    setShowEmployeeDetails(true);
  };

  // CSV Export functionality
  const exportToCSV = () => {
    const csvData = [];
    
    // Add headers
    csvData.push(['Type', 'Department/Employee', 'Employee Code', 'Employee Name', 'Reason', 'Status', 'Created Date']);
    
    // Add NonBio departments data
    nonBioDepartments.forEach(dept => {
      const deptEmployees = getDepartmentEmployees(dept.name);
      deptEmployees.forEach(emp => {
        csvData.push([
          'NonBio Department',
          dept.name,
          emp.employeeCode,
          `${emp.firstName} ${emp.lastName}`,
          '100% NonBio Department',
          'Active',
          new Date().toLocaleDateString()
        ]);
      });
    });
    
    // Add database exclusions
    exclusions.forEach(exclusion => {
      if (exclusion.type === 'department') {
        const deptEmployees = employees.filter(emp => emp.department === exclusion.targetValue);
        deptEmployees.forEach(emp => {
          csvData.push([
            'Department Exclusion',
            exclusion.targetValue,
            emp.employeeCode,
            `${emp.firstName} ${emp.lastName}`,
            exclusion.description || exclusion.name,
            exclusion.isActive ? 'Active' : 'Inactive',
            new Date(exclusion.createdAt).toLocaleDateString()
          ]);
        });
      } else {
        const employee = employees.find(emp => emp.employeeCode === exclusion.targetValue);
        csvData.push([
          'Individual Exclusion',
          employee?.department || 'N/A',
          exclusion.targetValue,
          employee ? `${employee.firstName} ${employee.lastName}` : 'N/A',
          exclusion.description || exclusion.name,
          exclusion.isActive ? 'Active' : 'Inactive',
          new Date(exclusion.createdAt).toLocaleDateString()
        ]);
      }
    });
    
    // Convert to CSV string
    const csvString = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    // Download CSV
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `exclusions_report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Currently excluded departments (from business logic - NonBio departments)
  // Get real NonBio employee counts by department
  const nonBioDepartments = Array.isArray(employees) 
    ? employees
        .filter(emp => emp?.nonBio === true)
        .reduce((acc, emp) => {
          const dept = emp.department || 'Unknown';
          const existing = acc.find(d => d.name === dept);
          if (existing) {
            existing.count += 1;
          } else {
            acc.push({ name: dept, count: 1 });
          }
          return acc;
        }, [] as { name: string; count: number }[])
    : [];



  // Currently excluded departments (combining NonBio + database exclusions)
  const currentlyExcludedDepartments = [
    ...nonBioDepartments,
    ...departmentExclusions.map(exclusion => ({
      name: exclusion.targetValue,
      count: getDepartmentEmployeeCount(exclusion.targetValue)
    }))
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-700 to-blue-700 bg-clip-text text-transparent mb-2">
                Exclusions Management
              </h1>
              <p className="text-purple-600 dark:text-purple-400">
                Manage NonBio employees and departments exempt from biometric attendance tracking
              </p>
            </div>
            <Button
              onClick={exportToCSV}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Current Exclusions Summary */}
        <Card className="mb-8 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-100">
              <ShieldOff className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Current Exclusions Summary
            </CardTitle>
            <CardDescription className="text-purple-700 dark:text-purple-300">
              Overview of departments and employees currently excluded from biometric attendance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Building className="h-5 w-5 text-purple-600" />
                  <span className="font-medium text-purple-900 dark:text-purple-100">
                    Excluded Departments
                  </span>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {currentlyExcludedDepartments.length}
                </div>
                <div className="text-sm text-purple-700 dark:text-purple-300">
                  Total: {currentlyExcludedDepartments.reduce((sum, dept) => sum + dept.count, 0)} employees
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900 dark:text-blue-100">
                    Individual Exclusions
                  </span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {employeeExclusions.length}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  Specific employees
                </div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-900 dark:text-green-100">
                    Total Exclusions
                  </span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {metrics?.nonBioEmployees || 0}
                </div>
                <div className="text-sm text-green-700 dark:text-green-300">
                  NonBio employees
                </div>
              </div>
            </div>

            {/* Currently Excluded Departments */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Currently Excluded Departments
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentlyExcludedDepartments.map((dept, index) => (
                  <div 
                    key={index} 
                    className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/30 cursor-pointer transition-colors"
                    onClick={() => handleDepartmentClick(dept.name)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-orange-900 dark:text-orange-100">
                          {dept.name}
                        </div>
                        <div className="text-sm text-orange-700 dark:text-orange-300">
                          {dept.count} employees (100% NonBio)
                        </div>
                        <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                          Click to view employees
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200">
                        EXCLUDED
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exclusions Management */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-blue-800 dark:text-blue-100">Exclusions Management</CardTitle>
                <CardDescription className="text-blue-700 dark:text-blue-300">
                  Configure department and individual employee exclusions from biometric attendance
                </CardDescription>
              </div>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => setEditingExclusion(null)}
                    className="bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Exclusion
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingExclusion ? 'Edit Exclusion' : 'Add New Exclusion'}
                    </DialogTitle>
                    <DialogDescription>
                      Configure exclusion rules for departments or individual employees
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Exclusion Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select exclusion type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="department">Department</SelectItem>
                                <SelectItem value="employee">Individual Employee</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Choose whether to exclude an entire department or specific employee
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {form.watch('type') === 'department' && (
                        <FormField
                          control={form.control}
                          name="targetValue"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Department</FormLabel>
                              <Select onValueChange={(value) => {
                                field.onChange(value);
                                form.setValue('name', `${value} Department Exclusion`);
                              }} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select department" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {departments.map((dept) => (
                                    <SelectItem key={dept.department} value={dept.department}>
                                      {dept.department} ({dept.employeeCount} employees)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {form.watch('type') === 'employee' && (
                        <FormField
                          control={form.control}
                          name="selectedEmployees"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Select Employees</FormLabel>
                              <FormControl>
                                <Card className="p-0">
                                  <CardHeader className="pb-2">
                                    <div className="flex items-center space-x-2">
                                      <Search className="h-4 w-4 text-muted-foreground" />
                                      <Input
                                        placeholder="Search by name, employee code, or department..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="flex-1"
                                      />
                                    </div>
                                  </CardHeader>
                                  <CardContent className="p-0">
                                    {employeesLoading ? (
                                      <div className="p-4 text-center text-muted-foreground">
                                        Loading employees...
                                      </div>
                                    ) : (
                                      <ScrollArea className="h-64 border-t">
                                        {Array.isArray(employees) && employees.length > 0 ? (
                                          employees
                                            .filter(emp => emp && emp.employeeCode && 
                                              (emp.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                               emp.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                               emp.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                               emp.department?.toLowerCase().includes(searchTerm.toLowerCase()))
                                            )
                                            .map((emp) => (
                                              <div key={emp.employeeCode} className="flex items-center space-x-2 p-2 hover:bg-muted/50 border-b">
                                                <Checkbox
                                                  id={emp.employeeCode}
                                                  checked={selectedEmployees.includes(emp.employeeCode)}
                                                  onCheckedChange={(checked) => {
                                                    const newSelected = checked 
                                                      ? [...selectedEmployees, emp.employeeCode]
                                                      : selectedEmployees.filter(id => id !== emp.employeeCode);
                                                    setSelectedEmployees(newSelected);
                                                    field.onChange(newSelected);
                                                    
                                                    // Set targetValue and name for the first selected employee
                                                    if (newSelected.length > 0) {
                                                      form.setValue('targetValue', newSelected[0]);
                                                      const firstEmployee = employees.find(e => e.employeeCode === newSelected[0]);
                                                      if (firstEmployee) {
                                                        form.setValue('name', `${firstEmployee.firstName} ${firstEmployee.lastName} (${firstEmployee.employeeCode})`);
                                                      }
                                                    } else {
                                                      form.setValue('targetValue', '');
                                                      form.setValue('name', '');
                                                    }
                                                  }}
                                                />
                                                <label htmlFor={emp.employeeCode} className="flex-1 cursor-pointer">
                                                  <div className="flex items-center justify-between">
                                                    <div>
                                                      <div className="font-medium text-lg">{emp.firstName} {emp.lastName}</div>
                                                      <div className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">Code: {emp.employeeCode}</div>
                                                    </div>
                                                    <div className="text-right">
                                                      <div className="text-sm font-medium text-purple-600">{emp.department}</div>
                                                    </div>
                                                  </div>
                                                </label>
                                              </div>
                                            ))
                                        ) : (
                                          <div className="p-4 text-center text-muted-foreground">
                                            No employees available
                                          </div>
                                        )}
                                      </ScrollArea>
                                    )}
                                  </CardContent>
                                  {selectedEmployees.length > 0 && (
                                    <CardHeader className="pt-2 pb-2 border-t">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">
                                          {selectedEmployees.length} employee{selectedEmployees.length > 1 ? 's' : ''} selected
                                        </span>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            setSelectedEmployees([]);
                                            field.onChange([]);
                                            form.setValue('targetValue', '');
                                            form.setValue('name', '');
                                          }}
                                        >
                                          Clear All
                                        </Button>
                                      </div>
                                    </CardHeader>
                                  )}
                                </Card>
                              </FormControl>
                              <FormDescription>
                                Select one or more employees to exclude from biometric attendance
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Exclusion Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter exclusion name..."
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Give this exclusion a descriptive name
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Enter description for exclusion..."
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Explain why this exclusion is needed
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex gap-2 justify-end">
                        <Button type="button" variant="outline" onClick={handleClose}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                          {editingExclusion ? 'Update' : 'Create'} Exclusion
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="departments" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30">
                <TabsTrigger 
                  value="departments" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-600 data-[state=active]:text-white"
                >
                  Department Exclusions
                </TabsTrigger>
                <TabsTrigger 
                  value="employees"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-600 data-[state=active]:text-white"
                >
                  Individual Exclusions
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="departments" className="space-y-4">
                <div className="rounded-md border border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50/50 to-blue-50/50 dark:from-purple-900/10 dark:to-blue-900/10">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20">
                        <TableHead className="text-purple-800 dark:text-purple-100 font-semibold">Department</TableHead>
                        <TableHead className="text-purple-800 dark:text-purple-100 font-semibold">Employee Count</TableHead>
                        <TableHead className="text-purple-800 dark:text-purple-100 font-semibold">Reason</TableHead>
                        <TableHead className="text-purple-800 dark:text-purple-100 font-semibold">Status</TableHead>
                        <TableHead className="text-purple-800 dark:text-purple-100 font-semibold">Created</TableHead>
                        <TableHead className="text-purple-800 dark:text-purple-100 font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departmentExclusions.map((exclusion) => (
                        <TableRow key={exclusion.id}>
                          <TableCell className="font-medium">
                            {exclusion.name}
                          </TableCell>
                          <TableCell>
                            {getDepartmentEmployeeCount(exclusion.targetValue)} employees
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {exclusion.description}
                          </TableCell>
                          <TableCell>
                            <Badge variant={exclusion.isActive ? "default" : "secondary"}>
                              {exclusion.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(exclusion.createdAt), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(exclusion)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(exclusion.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {departmentExclusions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-gray-500">
                            No department exclusions configured
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              
              <TabsContent value="employees" className="space-y-4">
                <div className="rounded-md border border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-900/10 dark:to-purple-900/10">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20">
                        <TableHead className="text-blue-800 dark:text-blue-100 font-semibold">Employee</TableHead>
                        <TableHead className="text-blue-800 dark:text-blue-100 font-semibold">Employee Code</TableHead>
                        <TableHead className="text-blue-800 dark:text-blue-100 font-semibold">Department</TableHead>
                        <TableHead className="text-blue-800 dark:text-blue-100 font-semibold">Reason</TableHead>
                        <TableHead className="text-blue-800 dark:text-blue-100 font-semibold">Status</TableHead>
                        <TableHead className="text-blue-800 dark:text-blue-100 font-semibold">Created</TableHead>
                        <TableHead className="text-blue-800 dark:text-blue-100 font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employeeExclusions.map((exclusion) => (
                        <TableRow key={exclusion.id}>
                          <TableCell className="font-medium">
                            {exclusion.name}
                          </TableCell>
                          <TableCell>{exclusion.targetValue}</TableCell>
                          <TableCell>
                            {employees.find(emp => emp.empCode === exclusion.targetValue)?.department || 'N/A'}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {exclusion.description}
                          </TableCell>
                          <TableCell>
                            <Badge variant={exclusion.isActive ? "default" : "secondary"}>
                              {exclusion.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(exclusion.createdAt), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(exclusion)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(exclusion.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {employeeExclusions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-gray-500">
                            No individual employee exclusions configured
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Employee Details Dialog */}
        <Dialog open={showEmployeeDetails} onOpenChange={setShowEmployeeDetails}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-orange-600" />
                NonBio Employees in {selectedDepartment}
              </DialogTitle>
              <DialogDescription>
                List of employees in {selectedDepartment} department who are excluded from biometric attendance
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[400px] overflow-y-auto">
              <div className="space-y-2">
                {selectedDepartment && getDepartmentEmployees(selectedDepartment).map((employee) => (
                  <div key={employee.id} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {employee.firstName?.[0] || 'U'}
                      </div>
                      <div>
                        <div className="font-medium text-orange-900 dark:text-orange-100">
                          {employee.firstName} {employee.lastName}
                        </div>
                        <div className="text-sm text-orange-700 dark:text-orange-300">
                          {employee.employeeCode}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200">
                      NonBio
                    </Badge>
                  </div>
                ))}
                {selectedDepartment && getDepartmentEmployees(selectedDepartment).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No NonBio employees found in this department
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}