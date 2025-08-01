import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  Users, 
  Building, 
  MapPin,
  Crown,
  UserCheck,
  AlertTriangle,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Employee {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  designation: string;
  department: string;
  poslevel: string | null;
  subdesignation: string | null;
  isActive: boolean;
}

interface RoleAssignment {
  id: number;
  userId: number;
  employeeCode: string;
  employee: Employee;
  poslevel: string;
  subdesignation: string;
  accessScope: string;
  isActive: boolean;
  assignedBy: string;
  assignedAt: string;
}

const ROLE_HIERARCHY = [
  { value: "Executive Director", label: "Executive Director", icon: Crown, color: "bg-purple-600" },
  { value: "General Manager", label: "General Manager", icon: Shield, color: "bg-red-600" },
  { value: "Manager", label: "Manager", icon: Users, color: "bg-blue-600" },
  { value: "Assistant Manager", label: "Assistant Manager", icon: UserCheck, color: "bg-green-600" },
  { value: "Supervisor", label: "Supervisor", icon: Eye, color: "bg-yellow-600" }
];

const ACCESS_SCOPES = [
  { value: "global", label: "Global Access", description: "Full system access" },
  { value: "department", label: "Department Access", description: "Limited to specific department" },
  { value: "location", label: "Location Access", description: "Limited to specific location/branch" },
  { value: "subdesignation", label: "Specialized Access", description: "Limited to subdesignation area" }
];

export default function RoleManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedAccessScope, setSelectedAccessScope] = useState<string>("department");
  const [selectedSubdesignation, setSelectedSubdesignation] = useState<string>("");
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch employees with role information
  const { data: employeesData, isLoading: employeesLoading } = useQuery({
    queryKey: ["/api/employees/with-roles"],
    queryFn: async () => {
      const response = await fetch("/api/employees?isActive=true&limit=1000", {
        credentials: "include",
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    },
  });

  const employees = Array.isArray(employeesData?.employees) ? employeesData.employees : [];

  // Fetch role assignments
  const { data: roleAssignments = [] } = useQuery({
    queryKey: ["/api/role-assignments"],
    queryFn: () => apiRequest({ url: "/api/role-assignments" }),
  });

  // Fetch users for account linking
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: () => apiRequest({ url: "/api/users" }),
  });

  // Get unique subdesignations for dropdown
  const subdesignations = [...new Set(employees
    .filter(emp => emp.subdesignation && emp.subdesignation.trim())
    .map(emp => emp.subdesignation)
  )].sort();

  // Filter employees based on search and role
  const filteredEmployees = employees.filter((emp: Employee) => {
    const matchesSearch = searchTerm === "" || 
      emp.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.designation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = selectedRole === "" || emp.poslevel === selectedRole;
    
    return matchesSearch && matchesRole;
  });

  // Get role statistics
  const getRoleStats = () => {
    const stats: Record<string, { count: number; departments: Set<string>; locations: Set<string> }> = {};
    
    ROLE_HIERARCHY.forEach(role => {
      stats[role.value] = { count: 0, departments: new Set(), locations: new Set() };
    });

    employees.forEach((emp: Employee) => {
      if (emp.poslevel && stats[emp.poslevel]) {
        stats[emp.poslevel].count++;
        if (emp.department) stats[emp.poslevel].departments.add(emp.department);
        if (emp.subdesignation) stats[emp.poslevel].locations.add(emp.subdesignation);
      }
    });

    return stats;
  };

  // Create role assignment mutation
  const createRoleAssignment = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest({
        url: "/api/role-assignments",
        method: "POST",
        data
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Role assignment created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/role-assignments"] });
      setIsAssignDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create role assignment",
        variant: "destructive",
      });
    },
  });

  // Delete role assignment mutation
  const deleteRoleAssignment = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest({
        url: `/api/role-assignments/${id}`,
        method: "DELETE"
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Role assignment removed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/role-assignments"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove role assignment",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedEmployee("");
    setSelectedRole("");
    setSelectedAccessScope("department");
    setSelectedSubdesignation("");
  };

  const handleAssignRole = () => {
    if (!selectedEmployee || !selectedRole) {
      toast({
        title: "Error",
        description: "Please select both employee and role",
        variant: "destructive",
      });
      return;
    }

    const employee = employees.find(emp => emp.employeeCode === selectedEmployee);
    if (!employee) {
      toast({
        title: "Error",
        description: "Employee not found",
        variant: "destructive",
      });
      return;
    }

    createRoleAssignment.mutate({
      employeeCode: selectedEmployee,
      poslevel: selectedRole,
      subdesignation: selectedSubdesignation || employee.subdesignation,
      accessScope: selectedAccessScope,
      assignedBy: "admin" // This should come from current user context
    });
  };

  const roleStats = getRoleStats();

  return (
    <div className="p-6 bg-[#1A1B3E] min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Role Management</h1>
            <p className="text-gray-400 mt-2">Manage hierarchical roles and access control</p>
          </div>
          <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Assign Role
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#2A2B5E] border-gray-600 text-white max-w-md">
              <DialogHeader>
                <DialogTitle>Assign Role to Employee</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="employee">Employee</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger className="bg-[#3A3B6E] border-gray-600">
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#3A3B6E] border-gray-600">
                      {employees.map((emp: Employee) => (
                        <SelectItem key={emp.employeeCode} value={emp.employeeCode}>
                          {emp.firstName} {emp.lastName} ({emp.employeeCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="role">Role Level</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="bg-[#3A3B6E] border-gray-600">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#3A3B6E] border-gray-600">
                      {ROLE_HIERARCHY.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          <div className="flex items-center gap-2">
                            <role.icon className="w-4 h-4" />
                            {role.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="accessScope">Access Scope</Label>
                  <Select value={selectedAccessScope} onValueChange={setSelectedAccessScope}>
                    <SelectTrigger className="bg-[#3A3B6E] border-gray-600">
                      <SelectValue placeholder="Select access scope" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#3A3B6E] border-gray-600">
                      {ACCESS_SCOPES.map((scope) => (
                        <SelectItem key={scope.value} value={scope.value}>
                          <div>
                            <div className="font-medium">{scope.label}</div>
                            <div className="text-sm text-gray-400">{scope.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedAccessScope === "subdesignation" && (
                  <div>
                    <Label htmlFor="subdesignation">Subdesignation</Label>
                    <Select value={selectedSubdesignation} onValueChange={setSelectedSubdesignation}>
                      <SelectTrigger className="bg-[#3A3B6E] border-gray-600">
                        <SelectValue placeholder="Select subdesignation" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#3A3B6E] border-gray-600">
                        {subdesignations.map((subdesig) => (
                          <SelectItem key={subdesig} value={subdesig}>
                            {subdesig}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleAssignRole}
                    disabled={createRoleAssignment.isPending}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {createRoleAssignment.isPending ? "Assigning..." : "Assign Role"}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setIsAssignDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-[#2A2B5E] border-gray-600">
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600">Overview</TabsTrigger>
            <TabsTrigger value="employees" className="data-[state=active]:bg-blue-600">Employees</TabsTrigger>
            <TabsTrigger value="assignments" className="data-[state=active]:bg-blue-600">Assignments</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Role Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {ROLE_HIERARCHY.map((role) => {
                const stats = roleStats[role.value];
                return (
                  <Card key={role.value} className="bg-[#2A2B5E] border-gray-600">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <role.icon className="w-4 h-4 text-white" />
                            <span className="text-sm font-medium text-white">{role.label}</span>
                          </div>
                          <div className="text-2xl font-bold text-white">{stats.count}</div>
                          <div className="text-xs text-gray-400">
                            {stats.departments.size} departments
                          </div>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${role.color}`} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Department Distribution */}
            <Card className="bg-[#2A2B5E] border-gray-600">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Department Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[...new Set(employees.map(emp => emp.department))].filter(Boolean).map((dept) => {
                    const deptEmployees = employees.filter(emp => emp.department === dept);
                    const roleDistribution = ROLE_HIERARCHY.reduce((acc, role) => {
                      acc[role.value] = deptEmployees.filter(emp => emp.poslevel === role.value).length;
                      return acc;
                    }, {} as Record<string, number>);

                    return (
                      <div key={dept} className="p-3 bg-[#3A3B6E] rounded-lg">
                        <div className="font-medium text-white mb-2">{dept}</div>
                        <div className="space-y-1">
                          {Object.entries(roleDistribution).map(([role, count]) => {
                            if (count === 0) return null;
                            const roleInfo = ROLE_HIERARCHY.find(r => r.value === role);
                            return (
                              <div key={role} className="flex items-center justify-between text-sm">
                                <span className="text-gray-300">{roleInfo?.label}</span>
                                <span className="text-white">{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employees" className="space-y-6">
            {/* Filters */}
            <Card className="bg-[#2A2B5E] border-gray-600">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search employees..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-[#3A3B6E] border-gray-600 text-white"
                      />
                    </div>
                  </div>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="w-48 bg-[#3A3B6E] border-gray-600">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#3A3B6E] border-gray-600">
                      <SelectItem value="">All Roles</SelectItem>
                      {ROLE_HIERARCHY.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Employee List */}
            <Card className="bg-[#2A2B5E] border-gray-600">
              <CardHeader>
                <CardTitle className="text-white">Employee Role Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredEmployees.map((employee: Employee) => (
                    <div key={employee.employeeCode} className="flex items-center justify-between p-3 bg-[#3A3B6E] rounded-lg">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium text-white">
                            {employee.firstName} {employee.lastName}
                          </div>
                          <div className="text-sm text-gray-400">
                            {employee.employeeCode} • {employee.designation}
                          </div>
                          <div className="text-sm text-gray-400">
                            {employee.department} {employee.subdesignation && `• ${employee.subdesignation}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {employee.poslevel ? (
                          <Badge className={`${ROLE_HIERARCHY.find(r => r.value === employee.poslevel)?.color || 'bg-gray-600'} text-white`}>
                            {employee.poslevel}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-gray-600 text-gray-400">
                            No Role
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments" className="space-y-6">
            {/* Active Assignments */}
            <Card className="bg-[#2A2B5E] border-gray-600">
              <CardHeader>
                <CardTitle className="text-white">Active Role Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {roleAssignments.map((assignment: RoleAssignment) => (
                    <div key={assignment.id} className="flex items-center justify-between p-3 bg-[#3A3B6E] rounded-lg">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium text-white">
                            {assignment.employee?.firstName} {assignment.employee?.lastName}
                          </div>
                          <div className="text-sm text-gray-400">
                            {assignment.employeeCode} • {assignment.poslevel}
                          </div>
                          <div className="text-sm text-gray-400">
                            Access: {assignment.accessScope} {assignment.subdesignation && `• ${assignment.subdesignation}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${ROLE_HIERARCHY.find(r => r.value === assignment.poslevel)?.color || 'bg-gray-600'} text-white`}>
                          {assignment.poslevel}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRoleAssignment.mutate(assignment.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}