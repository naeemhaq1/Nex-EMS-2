import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  ChevronDown, 
  Search, 
  Filter, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Edit2, 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  CheckCircle,
  MessageCircle,
  Upload,
  Download,
  Plus,
  Loader2,
  User,
  Building2,
  Clock,
  Shield,
  Activity,
  FileText,
  X
} from 'lucide-react';
// Define Employee interface locally since it's not exported from schema
interface Employee {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  department: string;
  designation?: string;
  position?: string;
  email?: string;
  phone?: string;
  nationalId?: string;
  address?: string;
  isActive: boolean;
  shiftId?: number;
  updatedAt?: string;
  pop?: string;
}

const getDepartmentColor = (department: string) => {
  const colorMap: Record<string, string> = {
    'LHE-OFC': 'bg-blue-500',
    'LHE-Safecity': 'bg-red-500',
    'LHE-Safecity-Drivers': 'bg-orange-500',
    'LHE-Safecity-Nex': 'bg-pink-500',
    'LHE-IPTV': 'bg-green-500',
    'LHE-Support': 'bg-teal-500',
    'LHE-HR': 'bg-purple-500',
    'LHE-Finance': 'bg-yellow-500',
    'LHE-Accounts': 'bg-indigo-500',
    'LHE-Sales': 'bg-cyan-500',
    'LHE-Datacom': 'bg-emerald-500',
    'FSD': 'bg-violet-500',
    'FSD-OFC': 'bg-rose-500',
    'PSH': 'bg-amber-500',
    'ISB': 'bg-lime-500',
    'KHI': 'bg-sky-500',
    'GUJ': 'bg-fuchsia-500',
    'Tech': 'bg-slate-500',
    'NOC': 'bg-zinc-500',
    'Resident-Engineer': 'bg-stone-500',
    'default': 'bg-gray-500'
  };
  
  return colorMap[department] || colorMap['default'];
};

export default function NewEmployeeDirectory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState(''); // Separate input state
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [designationFilter, setDesignationFilter] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [newEmployee, setNewEmployee] = useState({
    employeeCode: '',
    firstName: '',
    lastName: '',
    department: '',
    designation: '',
    email: '',
    phone: '',
    nationalId: '',
    address: ''
  });
  
  // Use ref to track timeout
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search - only search after user stops typing for 1000ms
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new timeout
    searchTimeoutRef.current = setTimeout(() => {
      if (searchInput !== searchQuery) {
        setSearchQuery(searchInput);
        setPage(1); // Reset to first page on new search
      }
    }, 1000);

    // Cleanup on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchInput]);

  // Handle Enter key press for immediate search
  const handleSearchKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // Clear any pending timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      setSearchQuery(searchInput);
      setPage(1);
    }
  }, [searchInput]);

  // Fetch employees
  const { data: employeeData, isLoading } = useQuery({
    queryKey: ['/api/employees', { page, searchQuery, departmentFilter, designationFilter, isActive: true, limit: 50 }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '50');
      params.append('isActive', 'true');
      if (searchQuery) params.append('search', searchQuery);
      if (departmentFilter && departmentFilter !== 'all') params.append('department', departmentFilter);
      if (designationFilter && designationFilter !== 'all') params.append('designation', designationFilter);
      
      const response = await fetch(`/api/employees?${params}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }
      
      return response.json();
      },
    select: (data) => data || { employees: [], total: 0 },
    staleTime: 30000, // Keep data fresh for 30 seconds
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ['/api/employees/departments'],
    queryFn: async () => {
      const response = await fetch('/api/employees/departments', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch departments');
      }
      return response.json();
    },
  });

  // Fetch designations
  const { data: designations = [] } = useQuery({
    queryKey: ['/api/employees/designations'],
    queryFn: async () => {
      const response = await fetch('/api/employees/designations', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch designations');
      }
      return response.json();
    },
  });

  // Mutations
  const updateEmployeeMutation = useMutation({
    mutationFn: async (data: Partial<Employee>) => {
      const response = await fetch(`/api/employees/${data.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to update employee');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      setShowEditDialog(false);
      setEditingEmployee(null);
      toast({ title: 'Employee updated successfully', variant: 'default' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to update employee', description: error.message, variant: 'destructive' });
    },
  });

  const createEmployeeMutation = useMutation({
    mutationFn: async (data: typeof newEmployee) => {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          employeeCode: data.employeeCode,
          firstName: data.firstName,
          lastName: data.lastName,
          department: data.department || undefined,
          position: data.designation || undefined, // Map designation to position
          email: data.email || undefined,
          mobile: data.phone || undefined, // Map phone to mobile
          nationalId: data.nationalId || undefined,
          address: data.address || undefined,
          isActive: true
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to create employee');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      setShowAddDialog(false);
      setNewEmployee({
        employeeCode: '',
        firstName: '',
        lastName: '',
        department: '',
        designation: '',
        email: '',
        phone: '',
        nationalId: '',
        address: ''
      });
      toast({ title: 'Employee created successfully', variant: 'default' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to create employee', description: error.message, variant: 'destructive' });
    },
  });

  // Helper functions
  const getVerificationStatus = (employee: Employee) => {
    const hasCNIC = employee.nationalId && /^\d{13}$/.test(employee.nationalId.replace(/-/g, ''));
    const hasPhone = employee.phone && employee.phone.trim() !== '';

    return { hasCNIC, hasPhone };
  };

  const getEmployeeStatus = (employee: Employee) => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    if (!employee.shiftId) return { status: 'No Shift', color: 'gray' };

    // For now, using simplified shift logic - would be enhanced with actual shift data
    const shiftStart = 9 * 60; // 9:00 AM
    const shiftEnd = 17 * 60; // 5:00 PM

    if (currentTime < shiftStart - 30) return { status: 'Pre-Shift', color: 'blue' };
    if (currentTime >= shiftStart - 30 && currentTime <= shiftStart + 30) return { status: 'Arrival Time', color: 'yellow' };
    if (currentTime > shiftStart + 30 && currentTime < shiftEnd - 30) return { status: 'In Office', color: 'green' };
    if (currentTime >= shiftEnd - 30 && currentTime <= shiftEnd + 30) return { status: 'Departure Time', color: 'orange' };
    if (currentTime > shiftEnd + 30) return { status: 'Post-Shift', color: 'purple' };

    return { status: 'Unknown', color: 'gray' };
  };

  const handleViewDetails = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDetailsDialog(true);
  };

  const handleRowDoubleClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDetailsDialog(true);
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee({ ...employee });
    setShowEditDialog(true);
  };

  const handleUpdateEmployee = () => {
    if (editingEmployee) {
      // Map frontend field names to backend field names
      const updateData = {
        id: editingEmployee.id,
        employeeCode: editingEmployee.employeeCode,
        firstName: editingEmployee.firstName,
        lastName: editingEmployee.lastName,
        department: editingEmployee.department,
        position: editingEmployee.position || null,
        email: editingEmployee.email || null,
        phone: editingEmployee.phone || null,
        nationalId: editingEmployee.nationalId || null,
        address: editingEmployee.address || null,
        isActive: editingEmployee.isActive,
      };
      console.log('Sending update data:', updateData);
      updateEmployeeMutation.mutate(updateData);
    }
  };

  const handleCreateEmployee = () => {
    if (newEmployee.employeeCode && newEmployee.firstName && newEmployee.lastName && newEmployee.department) {
      createEmployeeMutation.mutate(newEmployee);
    } else {
      toast({ 
        title: 'Missing required fields', 
        description: 'Please fill in Employee Code, First Name, Last Name, and Department', 
        variant: 'destructive' 
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#1A1B3E' }}>
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 min-h-screen" style={{ backgroundColor: '#1A1B3E' }}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Employee Directory</h1>
          <p className="text-gray-300 mt-1">Comprehensive employee information and verification status</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="border-purple-500 text-purple-300 hover:bg-purple-900/20">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" className="border-purple-500 text-purple-300 hover:bg-purple-900/20">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button 
            onClick={() => setShowAddDialog(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-purple-500/20" style={{ backgroundColor: '#2A2B5E' }}>
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search by name/employee ID */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or employee ID... (Press Enter or wait 1s)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className="pl-10 bg-[#1A1B3E] border-purple-500/30 text-white placeholder-gray-400"
              />
            </div>

            {/* Department filter */}
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="bg-[#1A1B3E] border-purple-500/30 text-white">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent className="bg-[#2A2B5E] border-purple-500/30">
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept: string) => (
                  <SelectItem key={dept} value={dept} className="text-white hover:bg-purple-900/20">
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Designation filter */}
            <Select value={designationFilter} onValueChange={setDesignationFilter}>
              <SelectTrigger className="bg-[#1A1B3E] border-purple-500/30 text-white">
                <SelectValue placeholder="All Designations" />
              </SelectTrigger>
              <SelectContent className="bg-[#2A2B5E] border-purple-500/30">
                <SelectItem value="all">All Designations</SelectItem>
                {designations.map((designation: string) => (
                  <SelectItem key={designation} value={designation} className="text-white hover:bg-purple-900/20">
                    {designation}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear filters */}
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery('');
                setSearchInput(''); // Clear both input states
                setDepartmentFilter('all');
                setDesignationFilter('all');
                setPage(1);
              }}
              className="border-purple-500/30 text-purple-300 hover:bg-purple-900/20"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Employee Table */}
      <Card className="border-purple-500/20" style={{ backgroundColor: '#2A2B5E' }}>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-purple-500/20 hover:bg-purple-900/20">
                  <TableHead className="text-gray-200">Emp ID</TableHead>
                  <TableHead className="text-gray-200">Name</TableHead>
                  <TableHead className="text-gray-200">Designation</TableHead>
                  <TableHead className="text-gray-200">Department</TableHead>
                  <TableHead className="text-gray-200">Contact</TableHead>
                  <TableHead className="text-gray-200">Verification</TableHead>
                  <TableHead className="text-gray-200">Shift</TableHead>
                  <TableHead className="text-gray-200">Status</TableHead>
                  <TableHead className="text-gray-200 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeData?.employees?.map((employee: Employee) => {
                  const { hasCNIC, hasPhone } = getVerificationStatus(employee);
                  const { status, color } = getEmployeeStatus(employee);

                  return (
                    <TableRow 
                      key={employee.id} 
                      className="border-purple-500/20 hover:bg-purple-900/20 cursor-pointer"
                      onDoubleClick={() => handleRowDoubleClick(employee)}
                    >
                      <TableCell>
                        <div className="font-mono text-sm text-gray-200">
                          {employee.employeeCode}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 ${getDepartmentColor(employee.department)} rounded-full flex items-center justify-center`}>
                            <span className="text-white font-medium text-sm">
                              {employee.firstName?.[0] || 'N'}{employee.lastName?.[0] || 'A'}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-white">
                              {employee.firstName} {employee.lastName}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-gray-200">
                          {employee.designation || 'N/A'}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-gray-200">
                          {employee.department}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          {employee.phone ? (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3 w-3 text-gray-400" />
                              <span className="text-gray-200">{employee.phone}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">No phone</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          {/* CNIC Status */}
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            hasCNIC ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                          }`}>
                            C
                          </div>
                          {/* Mobile Status */}
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            hasPhone ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                          }`}>
                            M
                          </div>
                          {hasCNIC && hasPhone && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-gray-200 text-sm">
                          {employee.shiftName || 'No Shift'}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`border-${color}-500 text-${color}-400 bg-${color}-500/10`}
                        >
                          {status}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(employee)}
                            className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/20"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(employee)}
                            className="text-gray-300 hover:text-gray-100 hover:bg-purple-900/20"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          {employee.phone && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-500 hover:text-green-400 hover:bg-green-500/20"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {employeeData?.total > 50 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="border-[#2A2B5E] text-gray-300 hover:bg-[#2A2B5E] hover:text-white"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <span className="flex items-center px-4 text-gray-300">
            Page {page} of {Math.ceil(employeeData.total / 50)}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(page + 1)}
            disabled={page >= Math.ceil(employeeData.total / 50)}
            className="border-[#2A2B5E] text-gray-300 hover:bg-[#2A2B5E] hover:text-white"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Show total count */}
      <div className="text-center text-gray-400 text-sm">
        Showing {employeeData?.employees?.length || 0} of {employeeData?.total || 0} employees
      </div>

      {/* Employee Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-[#2A2B5E] border-purple-500/20">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">Employee Details</DialogTitle>
          </DialogHeader>
          
          {selectedEmployee && (
            <div className="space-y-6">
              {/* Profile Header */}
              <div className="bg-[#1A1B3E] rounded-lg p-6">
                <div className="flex items-start gap-6">
                  <div className={`w-24 h-24 ${getDepartmentColor(selectedEmployee.department)} rounded-full flex items-center justify-center`}>
                    <span className="text-white font-bold text-2xl">
                      {selectedEmployee.firstName?.[0] || 'N'}{selectedEmployee.lastName?.[0] || 'A'}
                    </span>
                  </div>
                  
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold mb-2 text-white">
                      {selectedEmployee.firstName} {selectedEmployee.lastName}
                    </h1>
                    <p className="text-xl text-gray-300 mb-4">
                      {selectedEmployee.designation || selectedEmployee.position || 'N/A'}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="outline" className={`${selectedEmployee.isActive ? 'border-green-500 text-green-400' : 'border-red-500 text-red-400'}`}>
                        {selectedEmployee.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {selectedEmployee.nonBio && (
                        <Badge variant="outline" className="border-blue-500 text-blue-400">
                          Non-Bio
                        </Badge>
                      )}
                      {selectedEmployee.stopPay && (
                        <Badge variant="outline" className="border-red-500 text-red-400">
                          Stop Pay
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="bg-[#1A1B3E] rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4 text-white">PERSONAL INFORMATION</h2>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-400">Employee Code</label>
                        <p className="text-white">{selectedEmployee.employeeCode}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Code2</label>
                        <p className="text-white">{selectedEmployee.employeeCode}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-400">BioTime ID</label>
                        <p className="text-white">{selectedEmployee.id}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">First Name</label>
                        <p className="text-white">{selectedEmployee.firstName}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-400">Salutation</label>
                        <p className="text-white">{selectedEmployee.salutation || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Last Name</label>
                        <p className="text-white">{selectedEmployee.lastName}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-400">Email</label>
                        <p className="text-white">{selectedEmployee.email || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Phone</label>
                        <p className="text-white">{selectedEmployee.phone || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-400">National ID</label>
                        <p className="text-white">{selectedEmployee.nationalId || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Birthday</label>
                        <p className="text-white">{selectedEmployee.birthday ? new Date(selectedEmployee.birthday).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Employment Information */}
                <div className="bg-[#1A1B3E] rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4 text-white">EMPLOYMENT INFORMATION</h2>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-400">Department</label>
                        <p className="text-white">{selectedEmployee.department}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Position</label>
                        <p className="text-white">{selectedEmployee.position || selectedEmployee.designation || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-400">Work Team</label>
                        <p className="text-white">{selectedEmployee.workTeam || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Designation</label>
                        <p className="text-white">{selectedEmployee.designation || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-400">Hire Date</label>
                        <p className="text-white">{selectedEmployee.hireDate ? new Date(selectedEmployee.hireDate).toLocaleDateString() : 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Joining Date</label>
                        <p className="text-white">{selectedEmployee.joiningDate ? new Date(selectedEmployee.joiningDate).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-400">Employment Status</label>
                        <p className="text-white">{selectedEmployee.isActive ? 'Active' : 'Inactive'}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Shift</label>
                        <p className="text-white">{selectedEmployee.shiftName || 'No shift assigned'}</p>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <label className="text-sm text-gray-400">Location</label>
                      <p className="text-white">{selectedEmployee.location || selectedEmployee.pop || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Contract & Status */}
                <div className="bg-[#1A1B3E] rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4 text-white">CONTRACT & STATUS</h2>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-400">Contract Date</label>
                        <p className="text-white">{selectedEmployee.contractDate ? new Date(selectedEmployee.contractDate).toLocaleDateString() : 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Contract Term</label>
                        <p className="text-white">{selectedEmployee.contractTerm || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-400">Contract Expiry</label>
                        <p className="text-white">{selectedEmployee.contractExpiry ? new Date(selectedEmployee.contractExpiry).toLocaleDateString() : 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Entitlement Date</label>
                        <p className="text-white">{selectedEmployee.joiningDate ? new Date(selectedEmployee.joiningDate).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-400">Is Active</label>
                        <p className={`font-semibold ${selectedEmployee.isActive ? 'text-green-400' : 'text-red-400'}`}>
                          {selectedEmployee.isActive ? 'Yes' : 'No'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Shift ID</label>
                        <p className="text-white">{selectedEmployee.shiftId || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-400">CNIC Missing</label>
                        <p className={`font-semibold ${selectedEmployee.cnicMissing === 'yes' ? 'text-red-400' : 'text-green-400'}`}>
                          {selectedEmployee.cnicMissing === 'yes' ? 'Yes' : 'No'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Stop Pay</label>
                        <p className={`font-semibold ${selectedEmployee.stopPay ? 'text-red-400' : 'text-green-400'}`}>
                          {selectedEmployee.stopPay ? 'Yes' : 'No'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* System Information */}
                <div className="bg-[#1A1B3E] rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4 text-white">SYSTEM INFORMATION</h2>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-400">Non-Bio</label>
                        <p className={`font-semibold ${selectedEmployee.nonBio ? 'text-yellow-400' : 'text-green-400'}`}>
                          {selectedEmployee.nonBio ? 'Yes' : 'No'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Created At</label>
                        <p className="text-white">{selectedEmployee.createdAt ? new Date(selectedEmployee.createdAt).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-400">Updated At</label>
                        <p className="text-white">{selectedEmployee.updatedAt ? new Date(selectedEmployee.updatedAt).toLocaleDateString() : 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Point of Presence</label>
                        <p className="text-white">{selectedEmployee.pop || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl bg-[#1A1B3E] border-purple-500/20">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Employee</DialogTitle>
          </DialogHeader>

          {editingEmployee && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">CNIC</label>
                  <Input
                    value={editingEmployee.nationalId || ''}
                    onChange={(e) => setEditingEmployee((prev: Employee | null) => prev ? { ...prev, nationalId: e.target.value } : null)}
                    className="bg-[#2A2B5E] border-purple-500/30 text-white"
                    placeholder="Enter CNIC"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400">Mobile Phone</label>
                  <Input
                    value={editingEmployee.phone || ''}
                    onChange={(e) => setEditingEmployee((prev: Employee | null) => prev ? { ...prev, phone: e.target.value } : null)}
                    className="bg-[#2A2B5E] border-purple-500/30 text-white"
                    placeholder="Enter mobile phone"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Email</label>
                  <Input
                    value={editingEmployee.email || ''}
                    onChange={(e) => setEditingEmployee((prev: Employee | null) => prev ? { ...prev, email: e.target.value } : null)}
                    className="bg-[#2A2B5E] border-purple-500/30 text-white"
                    placeholder="Enter email"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400">Department</label>
                  <Select 
                    value={editingEmployee.department || ''} 
                    onValueChange={(value) => setEditingEmployee((prev: Employee | null) => prev ? { ...prev, department: value } : null)}
                  >
                    <SelectTrigger className="bg-[#2A2B5E] border-purple-500/30 text-white">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2A2B5E] border-purple-500/30">
                      {departments.map((dept: string) => (
                        <SelectItem key={dept} value={dept} className="text-white hover:bg-purple-900/20">
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                  className="border-purple-500/30 text-purple-300 hover:bg-purple-900/20"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateEmployee}
                  disabled={updateEmployeeMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {updateEmployeeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Employee'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Employee Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl bg-[#1A1B3E] border-purple-500/20">
          <DialogHeader>
            <DialogTitle className="text-white">Add New Employee</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400">Employee Code *</label>
                <Input
                  value={newEmployee.employeeCode}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, employeeCode: e.target.value }))}
                  className="bg-[#2A2B5E] border-purple-500/30 text-white"
                  placeholder="Enter employee code"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">Department *</label>
                <Select 
                  value={newEmployee.department} 
                  onValueChange={(value) => setNewEmployee(prev => ({ ...prev, department: value }))}
                >
                  <SelectTrigger className="bg-[#2A2B5E] border-purple-500/30 text-white">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2A2B5E] border-purple-500/30">
                    {departments.map((dept: string) => (
                      <SelectItem key={dept} value={dept} className="text-white hover:bg-purple-900/20">
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400">First Name *</label>
                <Input
                  value={newEmployee.firstName}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, firstName: e.target.value }))}
                  className="bg-[#2A2B5E] border-purple-500/30 text-white"
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">Last Name *</label>
                <Input
                  value={newEmployee.lastName}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, lastName: e.target.value }))}
                  className="bg-[#2A2B5E] border-purple-500/30 text-white"
                  placeholder="Enter last name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400">Designation</label>
                <Select 
                  value={newEmployee.designation} 
                  onValueChange={(value) => setNewEmployee(prev => ({ ...prev, designation: value }))}
                >
                  <SelectTrigger className="bg-[#2A2B5E] border-purple-500/30 text-white">
                    <SelectValue placeholder="Select designation" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2A2B5E] border-purple-500/30">
                    {designations.filter((des: string) => des !== 'all').map((designation: string) => (
                      <SelectItem key={designation} value={designation} className="text-white hover:bg-purple-900/20">
                        {designation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-400">Email</label>
                <Input
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, email: e.target.value }))}
                  className="bg-[#2A2B5E] border-purple-500/30 text-white"
                  placeholder="Enter email"
                  type="email"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400">Mobile Phone</label>
                <Input
                  value={newEmployee.phone}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, phone: e.target.value }))}
                  className="bg-[#2A2B5E] border-purple-500/30 text-white"
                  placeholder="Enter mobile phone"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">CNIC</label>
                <Input
                  value={newEmployee.nationalId}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, nationalId: e.target.value }))}
                  className="bg-[#2A2B5E] border-purple-500/30 text-white"
                  placeholder="Enter CNIC"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400">Address</label>
              <Input
                value={newEmployee.address}
                onChange={(e) => setNewEmployee(prev => ({ ...prev, address: e.target.value }))}
                className="bg-[#2A2B5E] border-purple-500/30 text-white"
                placeholder="Enter address"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                className="border-purple-500/30 text-purple-300 hover:bg-purple-900/20"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateEmployee}
                disabled={createEmployeeMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {createEmployeeMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Employee
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}