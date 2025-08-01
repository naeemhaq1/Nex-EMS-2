import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users, 
  UserPlus, 
  Building2, 
  Trash2, 
  CheckCircle, 
  Plus,
  Search,
  UserCheck,
  Filter
} from "lucide-react";

interface Manager {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  designation: string;
  department: string;
  username: string;
  role: string;
  departments: string[];
  departmentDetails: Array<{
    departmentName: string;
    assignedAt: string;
  }>;
}

interface Employee {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  designation: string;
  department: string;
}

interface Department {
  name: string;
  memberCount: number;
}

interface Group {
  name: string;
  memberCount: number;
}

export default function ManagerAssignment() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for creating managers
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // State for assigning departments
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);

  // Filter states
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [designationFilter, setDesignationFilter] = useState<string>("all");

  // Fetch managers with details
  const { data: managers, isLoading: managersLoading } = useQuery({
    queryKey: ["/api/managers"],
    queryFn: () => apiRequest({ url: "/api/managers" }),
  });

  // Fetch employees for manager creation
  const { data: employeesData, isLoading: employeesLoading } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: () => apiRequest({ url: "/api/employees?limit=1000&isActive=true" }),
  });

  // Fetch departments
  const { data: departmentsData } = useQuery({
    queryKey: ["/api/employees/departments"],
    queryFn: () => apiRequest({ url: "/api/employees/departments" }),
  });

  // Fetch groups
  const { data: groupsData } = useQuery({
    queryKey: ["/api/employees/groups"],
    queryFn: () => apiRequest({ url: "/api/employees/groups" }),
  });

  const employees = employeesData?.employees || employeesData?.data || [];
  const departments: Department[] = departmentsData?.departments || departmentsData || [];
  const groups: Group[] = groupsData?.groups || groupsData || [];

  // Get unique designations from employees
  const designations = useMemo(() => {
    const uniqueDesignations = Array.from(new Set(employees.map((emp: Employee) => emp.designation)));
    return uniqueDesignations.filter(Boolean).sort();
  }, [employees]);

  // Filtered employees based on search and filters
  const filteredEmployees = useMemo(() => {
    let filtered = employees.filter((emp: Employee) => {
      const matchesSearch = searchTerm === "" || 
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.department.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDepartment = departmentFilter === "all" || emp.department === departmentFilter;
      const matchesDesignation = designationFilter === "all" || emp.designation === designationFilter;
      
      return matchesSearch && matchesDepartment && matchesDesignation;
    });

    // Additional filtering by group if needed
    if (groupFilter !== "all") {
      // You could implement group-based filtering here if groups are linked to employees
    }

    return filtered;
  }, [employees, searchTerm, departmentFilter, groupFilter, designationFilter]);

  // Create manager mutation
  const createManagerMutation = useMutation({
    mutationFn: async (employeeCode: string) => {
      const response = await apiRequest({
        url: "/api/managers/create",
        method: "POST",
        data: { employeeCode },
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/managers"] });
      setSelectedEmployee("");
      toast({
        title: "Success",
        description: "Manager created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to create manager",
        variant: "destructive",
      });
    },
  });

  // Update manager departments mutation
  const updateDepartmentsMutation = useMutation({
    mutationFn: async ({ managerId, departments }: { managerId: number; departments: string[] }) => {
      const response = await apiRequest({
        url: `/api/managers/${managerId}/departments`,
        method: "PUT",
        data: { departments },
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/managers"] });
      setSelectedManager(null);
      setSelectedDepartments([]);
      toast({
        title: "Success",
        description: "Department assignments updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update department assignments",
        variant: "destructive",
      });
    },
  });

  // Delete manager mutation
  const deleteManagerMutation = useMutation({
    mutationFn: async (managerId: number) => {
      const response = await apiRequest({
        url: `/api/managers/${managerId}`,
        method: "DELETE",
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/managers"] });
      toast({
        title: "Success",
        description: "Manager removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove manager",
        variant: "destructive",
      });
    },
  });

  const handleCreateManager = () => {
    if (!selectedEmployee) {
      toast({
        title: "Error",
        description: "Please select an employee",
        variant: "destructive",
      });
      return;
    }
    createManagerMutation.mutate(selectedEmployee);
  };

  const handleAssignDepartments = () => {
    if (!selectedManager) {
      toast({
        title: "Error", 
        description: "Please select a manager",
        variant: "destructive",
      });
      return;
    }
    updateDepartmentsMutation.mutate({
      managerId: selectedManager.id,
      departments: selectedDepartments,
    });
  };

  const handleRemoveManager = (managerId: number) => {
    if (confirm("Are you sure you want to remove this manager?")) {
      deleteManagerMutation.mutate(managerId);
    }
  };

  const openAssignDepartments = (manager: Manager) => {
    setSelectedManager(manager);
    setSelectedDepartments(manager.departments || []);
  };

  const clearFilters = () => {
    setDepartmentFilter("all");
    setGroupFilter("all");
    setDesignationFilter("all");
    setSearchTerm("");
  };

  if (managersLoading || employeesLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Manager Assignment</h1>
          <p className="text-gray-400 mt-1">Assign managers to departments and manage access</p>
        </div>
        <div className="flex items-center space-x-2">
          <UserCheck className="h-8 w-8 text-indigo-400" />
          <Badge variant="outline" className="text-indigo-400 border-indigo-400">
            {managers?.length || 0} Managers
          </Badge>
        </div>
      </div>

      {/* Create Manager Section */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <UserPlus className="h-5 w-5" />
            <span>Create New Manager</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-white"
              />
            </div>
            
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Filter by Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept, index) => (
                  <SelectItem key={`dept-${index}-${dept.name}`} value={dept.name}>
                    {dept.name} ({dept.memberCount})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Filter by Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {groups.map((group, index) => (
                  <SelectItem key={`group-${index}-${group.name}`} value={group.name}>
                    {group.name} ({group.memberCount})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={designationFilter} onValueChange={setDesignationFilter}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Filter by Designation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Designations</SelectItem>
                {designations.map((designation: string, index: number) => (
                  <SelectItem key={`designation-${index}-${designation}`} value={designation}>
                    {designation}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              onClick={clearFilters}
              variant="outline" 
              className="border-slate-600 text-gray-300 hover:bg-slate-700"
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>

          {/* Employee Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Select employee to make manager" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {filteredEmployees.map((employee: Employee) => (
                  <SelectItem key={`emp-${employee.employeeCode}-${employee.id}`} value={employee.employeeCode}>
                    {employee.firstName} {employee.lastName} ({employee.employeeCode}) - {employee.designation}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              onClick={handleCreateManager}
              disabled={!selectedEmployee || createManagerMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              {createManagerMutation.isPending ? "Creating..." : "Create Manager"}
            </Button>
          </div>

          <p className="text-sm text-gray-400">
            Found {filteredEmployees.length} employees matching your criteria
          </p>
        </CardContent>
      </Card>

      {/* Current Managers - Dense Table Format */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Current Managers ({managers?.length || 0})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {managers?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-600">
                    <th className="text-left py-3 px-2 text-gray-300 font-medium">Manager</th>
                    <th className="text-left py-3 px-2 text-gray-300 font-medium">Employee Code</th>
                    <th className="text-left py-3 px-2 text-gray-300 font-medium">Designation</th>
                    <th className="text-left py-3 px-2 text-gray-300 font-medium">Home Department</th>
                    <th className="text-left py-3 px-2 text-gray-300 font-medium">Username</th>
                    <th className="text-left py-3 px-2 text-gray-300 font-medium">Role</th>
                    <th className="text-left py-3 px-2 text-gray-300 font-medium">Assigned Departments</th>
                    <th className="text-right py-3 px-2 text-gray-300 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {managers.map((manager: Manager) => (
                    <tr key={manager.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                      <td className="py-2 px-2">
                        <div className="flex items-center space-x-2">
                          <div className="bg-indigo-600 p-1 rounded-full">
                            <UserCheck className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-white font-medium">
                            {manager.firstName} {manager.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <span className="text-gray-300 font-mono text-xs bg-slate-700 px-2 py-1 rounded">
                          {manager.employeeCode}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-gray-300 text-xs">
                        {manager.designation}
                      </td>
                      <td className="py-2 px-2 text-gray-300 text-xs">
                        {manager.department}
                      </td>
                      <td className="py-2 px-2">
                        <span className="text-gray-400 font-mono text-xs">
                          {manager.username}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <Badge variant="outline" className="text-xs border-indigo-500 text-indigo-400">
                          {manager.role}
                        </Badge>
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {manager.departmentDetails?.length > 0 ? (
                            manager.departmentDetails.map((dept, index) => (
                              <Badge key={index} variant="secondary" className="bg-indigo-600/20 text-indigo-400 text-xs px-1 py-0">
                                {dept.departmentName}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-gray-500 italic">None assigned</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <Button
                            onClick={() => openAssignDepartments(manager)}
                            variant="outline"
                            size="sm"
                            className="border-indigo-600 text-indigo-400 hover:bg-indigo-600 hover:text-white text-xs px-2 py-1 h-auto"
                          >
                            <Building2 className="h-3 w-3 mr-1" />
                            Assign
                          </Button>
                          <Button
                            onClick={() => handleRemoveManager(manager.id)}
                            variant="outline"
                            size="sm"
                            className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white text-xs px-2 py-1 h-auto"
                            disabled={deleteManagerMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No managers created yet</p>
              <p className="text-sm text-gray-500 mt-2">Use the form above to promote employees to managers</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Department Assignment Modal */}
      {selectedManager && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Assign Departments to {selectedManager.firstName} {selectedManager.lastName}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {departments.map((dept, index) => (
                <div key={`dept-checkbox-${index}-${dept.name}`} className="flex items-center space-x-2">
                  <Checkbox
                    id={`dept-${index}-${dept.name}`}
                    checked={selectedDepartments.includes(dept.name)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedDepartments([...selectedDepartments, dept.name]);
                      } else {
                        setSelectedDepartments(selectedDepartments.filter(d => d !== dept.name));
                      }
                    }}
                  />
                  <Label htmlFor={`dept-${index}-${dept.name}`} className="text-sm text-gray-300 cursor-pointer">
                    {dept.name} ({dept.memberCount})
                  </Label>
                </div>
              ))}
            </div>
            
            <div className="flex space-x-2">
              <Button
                onClick={handleAssignDepartments}
                disabled={updateDepartmentsMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {updateDepartmentsMutation.isPending ? "Updating..." : "Update Assignments"}
              </Button>
              <Button
                onClick={() => {
                  setSelectedManager(null);
                  setSelectedDepartments([]);
                }}
                variant="outline"
                className="border-slate-600 text-gray-300 hover:bg-slate-700"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}