import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  Search,
  Eye,
  Edit2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  User,
  Building2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Filter,
  Download,
  Upload,
  Plus,
  RefreshCw,
  Shield,
  Activity,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
} from 'lucide-react';
import { WhatsAppDialog } from '@/components/WhatsAppDialog';
import { WhatsAppTestDialog } from '@/components/WhatsAppTestDialog';

// Types
interface Employee {
  id: number;
  employeeCode: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  username?: string;
  salutation?: string;
  department: string;
  subDepartment?: string;
  designation?: string;
  position?: string;
  mobile?: string;
  email?: string;
  nationalId?: string;
  address?: string;
  vrn?: string;
  workTeam?: string;
  location?: string;
  empType?: string;
  nonBio?: boolean;
  suspect?: boolean;
  susreason?: string;
  pop?: string;
  stopPay?: boolean;
  whatsappNumber?: string;
  joiningDate?: string;
  contractType?: 'full-time' | 'part-time' | 'contracted';
  contractStartDate?: string;
  contractDuration?: string;
  shiftId?: number;
  shiftName?: string;
  isActive: boolean;
  gpsLocation?: {
    latitude: number;
    longitude: number;
    timestamp: Date;
  };
  appStatus?: 'installed' | 'not_installed';
  appLoc?: 'communicating' | 'no_data';
  appStatusCheckedAt?: string;
}

interface AttendanceRecord {
  id: number;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  hoursWorked: number;
}

// Function to get mobile app status color
const getMobileAppStatusColor = (employee: Employee) => {
  if (!employee.appStatus || employee.appStatus === 'not_installed') {
    return '#6B7280'; // Grey for not installed (darker than avatar grey for visibility)
  }
  
  if (employee.appStatus === 'installed') {
    if (employee.appLoc === 'communicating') {
      return '#10B981'; // Green for installed + communicating
    } else if (employee.appLoc === 'no_data') {
      return '#F59E0B'; // Yellow for installed but no location data
    } else {
      return '#3B82F6'; // Blue for installed (default)
    }
  }
  
  return '#6B7280'; // Grey as fallback
};

// Function to generate department-based avatar colors
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

// Get mobile app status color based on AppStatus and AppLoc fields
const getMobileAppStatusColor = (employee: Employee) => {
  const appStatus = employee.appStatus || 'not_installed';
  const appLoc = employee.appLoc || 'no_data';
  
  if (appStatus === 'not_installed') {
    return 'bg-gray-700'; // Darker grey: App not installed
  }
  
  if (appStatus === 'installed') {
    if (appLoc === 'communicating') {
      return 'bg-green-500'; // Green: App installed + communicating location data
    } else if (appLoc === 'no_data') {
      return 'bg-yellow-500'; // Yellow: App installed but no location data
    }
    return 'bg-blue-500'; // Blue: App installed
  }
  
  return 'bg-gray-700'; // Default to darker grey for unknown status
};

export default function EmployeeDirectory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [designationFilter, setDesignationFilter] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Fetch all employees once and cache in memory
  const { data: allEmployees, isLoading, error } = useQuery({
    queryKey: ['/api/employees/all'],
    queryFn: async () => {
      try {
        const response = await apiRequest({
          url: '/api/employees/all',
          method: 'GET'
        });
        console.log('API Response:', response);
        console.log('Response length:', response?.length);
        return response || [];
      } catch (error) {
        console.error('Error fetching employees:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Create filtered and searched employees
  const filteredEmployees = React.useMemo(() => {
    let filtered = allEmployees || [];

    // Apply department filter
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(emp => emp.department === departmentFilter);
    }

    // Apply designation filter
    if (designationFilter !== 'all') {
      filtered = filtered.filter(emp => emp.designation === designationFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(emp => 
        emp.firstName?.toLowerCase().includes(query) ||
        emp.lastName?.toLowerCase().includes(query) ||
        emp.employeeCode?.toLowerCase().includes(query) ||
        emp.department?.toLowerCase().includes(query) ||
        emp.designation?.toLowerCase().includes(query) ||
        emp.mobile?.includes(searchQuery) ||
        emp.email?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [allEmployees, departmentFilter, designationFilter, searchQuery]);

  // Paginate filtered results
  const paginatedEmployees = React.useMemo(() => {
    const startIndex = (page - 1) * 20;
    const endIndex = startIndex + 20;
    return filteredEmployees.slice(startIndex, endIndex);
  }, [filteredEmployees, page]);

  // Calculate total pages
  const totalPages = Math.ceil(filteredEmployees.length / 20);

  // Create lookup maps for better performance
  const employeeById = React.useMemo(() => {
    const map = new Map<number, Employee>();
    (allEmployees || []).forEach(emp => {
      map.set(emp.id, emp);
    });
    return map;
  }, [allEmployees]);

  // Get unique departments from cached data
  const uniqueDepartments = React.useMemo(() => {
    const deptSet = new Set((allEmployees || []).map(emp => emp.department).filter(Boolean));
    return Array.from(deptSet).sort();
  }, [allEmployees]);

  // Get unique designations from cached data
  const uniqueDesignations = React.useMemo(() => {
    const designSet = new Set((allEmployees || []).map(emp => emp.designation).filter(Boolean));
    return Array.from(designSet).sort();
  }, [allEmployees]);

  // Use cached departments and designations (no additional API calls needed)
  const departments = uniqueDepartments;
  const designations = uniqueDesignations;

  // Fetch shifts
  const { data: shifts = [] } = useQuery({
    queryKey: ['/api/shifts'],
    queryFn: async () => {
      const response = await apiRequest({
        url: '/api/shifts',
        method: 'GET'
      });
      return response;
    },
  });

  // Fetch employee attendance records for details view
  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['/api/attendance/employee', selectedEmployee?.id],
    queryFn: async () => {
      if (!selectedEmployee?.id) return [];
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // Last 7 days

      const response = await apiRequest({
        url: `/api/attendance/employee/${selectedEmployee.id}?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`,
        method: 'GET'
      });
      return response;
    },
    enabled: !!selectedEmployee?.id,
  });

  // Mutations
  const updateEmployeeMutation = useMutation({
    mutationFn: async (data: Partial<Employee>) => {
      const response = await apiRequest({
        url: `/api/employees/${data.id}`,
        method: 'PATCH',
        data: data
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees/all'] });
      setShowEditDialog(false);
      setEditingEmployee(null);
      toast({ title: 'Employee updated successfully', variant: 'default' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to update employee', description: error.message, variant: 'destructive' });
    },
  });

  // Refresh app status mutation
  const refreshAppStatusMutation = useMutation({
    mutationFn: async (employeeId: number) => {
      const response = await apiRequest({
        url: `/api/employees/${employeeId}/refresh-app-status`,
        method: 'POST'
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees/all'] });
      toast({ title: 'App status refreshed', variant: 'default' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to refresh app status', description: error.message, variant: 'destructive' });
    },
  });

  // Helper functions
  const getVerificationStatus = (employee: Employee) => {
    const hasCNIC = employee.nationalId && /^\d{13}$/.test(employee.nationalId.replace(/-/g, ''));
    const hasPhone = employee.mobile && employee.mobile.trim() !== '';

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

  // Handle employee click to refresh app status (every 5 minutes)
  const handleEmployeeClick = async (employee: Employee) => {
    const now = new Date();
    const lastChecked = employee.appStatusCheckedAt ? new Date(employee.appStatusCheckedAt) : null;
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    // Only refresh if last check was more than 5 minutes ago or never checked
    if (!lastChecked || lastChecked < fiveMinutesAgo) {
      refreshAppStatusMutation.mutate(employee.id);
    }
  };
    if (!lastChecked || lastChecked < fiveMinutesAgo) {
      try {
        // Call API to refresh app status
        await apiRequest({
          url: `/api/employees/${employee.id}/refresh-app-status`,
          method: 'POST'
        });
        
        // Invalidate cache to refresh the data
        queryClient.invalidateQueries({ queryKey: ['/api/employees/all'] });
        
        toast({
          title: "App Status Refreshed",
          description: `Updated mobile app status for ${employee.firstName} ${employee.lastName}`,
        });
      } catch (error) {
        console.error('Failed to refresh app status:', error);
      }
    }
  };

  const handleViewDetails = (employee: Employee) => {
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
        middleName: editingEmployee.middleName || null,
        lastName: editingEmployee.lastName,
        salutation: editingEmployee.salutation || null,
        department: editingEmployee.department,
        subDepartment: editingEmployee.subDepartment || null,
        position: editingEmployee.position || null,
        designation: editingEmployee.designation || null,
        email: editingEmployee.email || null,
        phone: editingEmployee.mobile || null, // Map mobile to phone
        nationalId: editingEmployee.nationalId || null,
        address: editingEmployee.address || null,
        vrn: editingEmployee.vrn || null,
        workTeam: editingEmployee.workTeam || null,
        location: editingEmployee.location || null,
        empType: editingEmployee.empType || 'Full-time',
        nonBio: editingEmployee.nonBio || false,
        suspect: editingEmployee.suspect || false,
        susreason: editingEmployee.susreason || null,
        pop: editingEmployee.pop || null,
        stopPay: editingEmployee.stopPay || false,
        isActive: editingEmployee.isActive,
      };
      console.log('Sending update data:', updateData);
      updateEmployeeMutation.mutate(updateData);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return 'N/A';
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
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
          <WhatsAppTestDialog 
            trigger={
              <Button variant="outline" className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white">
                <MessageCircle className="mr-2 h-4 w-4" />
                Test WhatsApp
              </Button>
            }
          />
          <Button className="bg-purple-600 hover:bg-purple-700 text-white">
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
                placeholder="Search by name or employee ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
          <div className="mt-4 text-sm text-gray-400">
            Showing {paginatedEmployees.length} of {filteredEmployees.length} employees
            {filteredEmployees.length !== allEmployees.length && ` (filtered from ${allEmployees.length} total)`}
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
                  <TableHead className="text-gray-200">Username</TableHead>
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
                {paginatedEmployees.map((employee: Employee) => {
                  const { hasCNIC, hasPhone } = getVerificationStatus(employee);
                  const { status, color } = getEmployeeStatus(employee);

                  return (
                    <TableRow key={employee.id} className="border-purple-500/20 hover:bg-purple-900/20">
                      <TableCell>
                        <div className="font-mono text-sm text-gray-200">
                          {employee.employeeCode}
                        </div>
                      </TableCell>
                      
                      <TableCell className="min-w-[200px]">
                        {/* Grid layout for perfect circular avatars */}
                        <div className="grid grid-cols-[40px_1fr] gap-3 items-center">
                          <div 
                            className={`${getDepartmentColor(employee.department)} text-white font-medium text-sm relative`}
                            style={{ 
                              width: '40px', 
                              height: '40px', 
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                            onClick={() => handleEmployeeClick(employee)}
                          >
                            {employee.firstName?.[0] || 'N'}{employee.lastName?.[0] || 'A'}
                            {/* Mobile App Status Dot at 10 o'clock position */}
                            <div 
                              className={`absolute w-3 h-3 rounded-full border-2 border-white ${getMobileAppStatusColor(employee)}`}
                              style={{
                                top: '2px',
                                left: '8px',
                                transform: 'rotate(-60deg) translateX(-50%)',
                                transformOrigin: 'center'
                              }}
                            />
                          </div>
                          <div className="font-medium text-white">
                            {employee.firstName} {employee.lastName}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-gray-200 font-mono text-sm">
                          {employee.username || 'N/A'}
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
                          {employee.mobile ? (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3 w-3 text-gray-400" />
                              <span className="text-gray-200">{employee.mobile}</span>
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
                          {/* Phone Status */}
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            hasPhone ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                          }`}>
                            P
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
                          {employee.mobile && (
                            <WhatsAppDialog
                              defaultPhone={employee.mobile}
                              defaultName={`${employee.firstName} ${employee.lastName}`}
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-500 hover:text-green-400 hover:bg-green-500/20"
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </Button>
                              }
                            />
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
      {totalPages > 1 && (
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
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="border-[#2A2B5E] text-gray-300 hover:bg-[#2A2B5E] hover:text-white"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Employee Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#1A1B3E] border-[#2A2B5E]">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">
              Employee Details - {selectedEmployee?.firstName} {selectedEmployee?.lastName}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Complete employee information and recent activity
            </DialogDescription>
          </DialogHeader>

          {selectedEmployee && (
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-[#2A2B5E]">
                <TabsTrigger value="personal" className="data-[state=active]:bg-purple-600 text-gray-200">
                  Personal Details
                </TabsTrigger>
                <TabsTrigger value="employment" className="data-[state=active]:bg-purple-600 text-gray-200">
                  Employment Details
                </TabsTrigger>
                <TabsTrigger value="activity" className="data-[state=active]:bg-purple-600 text-gray-200">
                  Recent Activity
                </TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-4 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-[#2A2B5E] border-[#3A3B6E]">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center">
                        <User className="mr-2 h-5 w-5" />
                        Personal Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-gray-300">Full Name</Label>
                        <p className="text-white font-medium">
                          {selectedEmployee.firstName} {selectedEmployee.lastName}
                        </p>
                      </div>
                      <div>
                        <Label className="text-gray-300">Employee Code</Label>
                        <p className="text-white font-mono">{selectedEmployee.employeeCode}</p>
                      </div>
                      <div>
                        <Label className="text-gray-300">CNIC</Label>
                        <p className="text-white">{selectedEmployee.nationalId || 'Not provided'}</p>
                      </div>
                      <div>
                        <Label className="text-gray-300">Address</Label>
                        <p className="text-white">{selectedEmployee.address || 'Not provided'}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-[#2A2B5E] border-[#3A3B6E]">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center">
                        <Phone className="mr-2 h-5 w-5" />
                        Contact Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-gray-300">Mobile Phone</Label>
                        <p className="text-white">{selectedEmployee.mobile || 'Not provided'}</p>
                      </div>
                      <div>
                        <Label className="text-gray-300">Email</Label>
                        <p className="text-white">{selectedEmployee.email || 'Not provided'}</p>
                      </div>
                      <div>
                        <Label className="text-gray-300">WhatsApp Number</Label>
                        <p className="text-white">{selectedEmployee.whatsappNumber || 'Same as mobile'}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="employment" className="space-y-4 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-[#2A2B5E] border-[#3A3B6E]">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center">
                        <Building2 className="mr-2 h-5 w-5" />
                        Job Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-gray-300">Designation</Label>
                        <p className="text-white">{selectedEmployee.designation || 'Not assigned'}</p>
                      </div>
                      <div>
                        <Label className="text-gray-300">Department</Label>
                        <p className="text-white">{selectedEmployee.department}</p>
                      </div>
                      <div>
                        <Label className="text-gray-300">Date of Joining</Label>
                        <p className="text-white">{formatDate(selectedEmployee.joiningDate)}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-[#2A2B5E] border-[#3A3B6E]">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center">
                        <Shield className="mr-2 h-5 w-5" />
                        Contract Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-gray-300">Employment Type</Label>
                        <Badge variant="outline" className="block w-fit mt-1">
                          {selectedEmployee.contractType || 'Full-time'}
                        </Badge>
                      </div>
                      {selectedEmployee.contractType === 'contracted' && (
                        <>
                          <div>
                            <Label className="text-gray-300">Contract Start Date</Label>
                            <p className="text-white">{formatDate(selectedEmployee.contractStartDate)}</p>
                          </div>
                          <div>
                            <Label className="text-gray-300">Contract Duration</Label>
                            <p className="text-white">{selectedEmployee.contractDuration || 'Not specified'}</p>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4 mt-6">
                <Card className="bg-[#2A2B5E] border-[#3A3B6E]">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Activity className="mr-2 h-5 w-5" />
                      Last 7 Days Punch In/Out Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {attendanceRecords.length > 0 ? (
                        attendanceRecords.map((record: AttendanceRecord) => (
                          <div
                            key={record.id}
                            className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
                          >
                            <div className="flex items-center gap-4">
                              <div className="text-center">
                                <div className="text-white font-medium">
                                  {formatDate(record.date)}
                                </div>
                                <div className="text-gray-400 text-sm">
                                  {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-center">
                                  <div className="text-gray-300 text-sm">Punch In</div>
                                  <div className="text-white font-medium">
                                    {formatTime(record.checkIn)}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-gray-300 text-sm">Punch Out</div>
                                  <div className="text-white font-medium">
                                    {formatTime(record.checkOut)}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-gray-300 text-sm">Hours</div>
                                  <div className="text-white font-medium">
                                    {record.hoursWorked?.toFixed(1) || '0.0'}h
                                  </div>
                                </div>
                              </div>
                            </div>
                            <Badge
                              variant={record.status === 'present' ? 'default' : 'destructive'}
                              className="capitalize"
                            >
                              {record.status}
                            </Badge>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-gray-400 py-8">
                          No attendance records found for the last 7 days
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-[#1A1B3E] border-[#2A2B5E]">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">Edit Employee</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update employee information and settings
            </DialogDescription>
          </DialogHeader>

          {editingEmployee && (
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-[#2A2B5E]">
                <TabsTrigger value="personal" className="data-[state=active]:bg-blue-600 text-gray-200">
                  Personal
                </TabsTrigger>
                <TabsTrigger value="employment" className="data-[state=active]:bg-blue-600 text-gray-200">
                  Employment
                </TabsTrigger>
                <TabsTrigger value="contact" className="data-[state=active]:bg-blue-600 text-gray-200">
                  Contact
                </TabsTrigger>
                <TabsTrigger value="settings" className="data-[state=active]:bg-blue-600 text-gray-200">
                  Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-4 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-gray-300">Salutation</Label>
                    <Select
                      value={editingEmployee.salutation || ''}
                      onValueChange={(value) => setEditingEmployee(prev => prev ? { ...prev, salutation: value } : null)}
                    >
                      <SelectTrigger className="bg-[#2A2B5E] border-blue-500/30 text-white">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#2A2B5E] border-blue-500/30">
                        <SelectItem value="Mr." className="text-white hover:bg-blue-500/20">Mr.</SelectItem>
                        <SelectItem value="Mrs." className="text-white hover:bg-blue-500/20">Mrs.</SelectItem>
                        <SelectItem value="Ms." className="text-white hover:bg-blue-500/20">Ms.</SelectItem>
                        <SelectItem value="Dr." className="text-white hover:bg-blue-500/20">Dr.</SelectItem>
                        <SelectItem value="Eng." className="text-white hover:bg-blue-500/20">Eng.</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-300">First Name</Label>
                    <Input
                      value={editingEmployee.firstName}
                      onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, firstName: e.target.value } : null)}
                      className="bg-[#2A2B5E] border-blue-500/30 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Middle Name</Label>
                    <Input
                      value={editingEmployee.middleName || ''}
                      onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, middleName: e.target.value } : null)}
                      className="bg-[#2A2B5E] border-blue-500/30 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Last Name</Label>
                    <Input
                      value={editingEmployee.lastName}
                      onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, lastName: e.target.value } : null)}
                      className="bg-[#2A2B5E] border-blue-500/30 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">CNIC</Label>
                    <Input
                      value={editingEmployee.nationalId || ''}
                      onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, nationalId: e.target.value } : null)}
                      className="bg-[#2A2B5E] border-blue-500/30 text-white"
                      placeholder="13 digits without dashes"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-gray-300">Address</Label>
                  <Textarea
                    value={editingEmployee.address || ''}
                    onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, address: e.target.value } : null)}
                    className="bg-[#2A2B5E] border-blue-500/30 text-white"
                    rows={3}
                  />
                </div>
              </TabsContent>

              <TabsContent value="employment" className="space-y-4 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Department</Label>
                    <Select
                      value={editingEmployee.department}
                      onValueChange={(value) => setEditingEmployee(prev => prev ? { ...prev, department: value } : null)}
                    >
                      <SelectTrigger className="bg-[#2A2B5E] border-blue-500/30 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#2A2B5E] border-blue-500/30">
                        {departments.map((dept: string) => (
                          <SelectItem key={dept} value={dept} className="text-white hover:bg-blue-500/20">
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-300">Sub Department</Label>
                    <Input
                      value={editingEmployee.subDepartment || ''}
                      onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, subDepartment: e.target.value } : null)}
                      className="bg-[#2A2B5E] border-blue-500/30 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Position</Label>
                    <Input
                      value={editingEmployee.position || ''}
                      onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, position: e.target.value } : null)}
                      className="bg-[#2A2B5E] border-blue-500/30 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Designation</Label>
                    <Input
                      value={editingEmployee.designation || ''}
                      onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, designation: e.target.value } : null)}
                      className="bg-[#2A2B5E] border-blue-500/30 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Work Team</Label>
                    <Input
                      value={editingEmployee.workTeam || ''}
                      onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, workTeam: e.target.value } : null)}
                      className="bg-[#2A2B5E] border-blue-500/30 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Employment Type</Label>
                    <Select
                      value={editingEmployee.empType || 'Full-time'}
                      onValueChange={(value) => setEditingEmployee(prev => prev ? { ...prev, empType: value } : null)}
                    >
                      <SelectTrigger className="bg-[#2A2B5E] border-blue-500/30 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#2A2B5E] border-blue-500/30">
                        <SelectItem value="Full-time" className="text-white hover:bg-blue-500/20">Full-time</SelectItem>
                        <SelectItem value="Part-time" className="text-white hover:bg-blue-500/20">Part-time</SelectItem>
                        <SelectItem value="Contract" className="text-white hover:bg-blue-500/20">Contract</SelectItem>
                        <SelectItem value="Temporary" className="text-white hover:bg-blue-500/20">Temporary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Location</Label>
                    <Input
                      value={editingEmployee.location || ''}
                      onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, location: e.target.value } : null)}
                      className="bg-[#2A2B5E] border-blue-500/30 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">POP (Point of Presence)</Label>
                    <Input
                      value={editingEmployee.pop || ''}
                      onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, pop: e.target.value } : null)}
                      className="bg-[#2A2B5E] border-blue-500/30 text-white"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-gray-300">Vehicle Registration Number (VRN)</Label>
                  <Input
                    value={editingEmployee.vrn || ''}
                    onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, vrn: e.target.value } : null)}
                    className="bg-[#2A2B5E] border-blue-500/30 text-white"
                    placeholder="e.g., ABC-123"
                  />
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-4 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Mobile Phone</Label>
                    <Input
                      value={editingEmployee.mobile || ''}
                      onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, mobile: e.target.value } : null)}
                      className="bg-[#2A2B5E] border-blue-500/30 text-white"
                      placeholder="+92-xxx-xxxxxxx"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Email</Label>
                    <Input
                      value={editingEmployee.email || ''}
                      onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, email: e.target.value } : null)}
                      className="bg-[#2A2B5E] border-blue-500/30 text-white"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-gray-300">Non-Bio Employee</Label>
                        <p className="text-sm text-gray-400">Exempt from biometric attendance</p>
                      </div>
                      <Switch
                        checked={editingEmployee.nonBio || false}
                        onCheckedChange={(checked) => setEditingEmployee(prev => prev ? { ...prev, nonBio: checked } : null)}
                        className="data-[state=checked]:bg-blue-600"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-gray-300">Active Employee</Label>
                        <p className="text-sm text-gray-400">Currently employed</p>
                      </div>
                      <Switch
                        checked={editingEmployee.isActive}
                        onCheckedChange={(checked) => setEditingEmployee(prev => prev ? { ...prev, isActive: checked } : null)}
                        className="data-[state=checked]:bg-green-600"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-gray-300">Suspect Employee</Label>
                        <p className="text-sm text-gray-400">Flagged for review</p>
                      </div>
                      <Switch
                        checked={editingEmployee.suspect || false}
                        onCheckedChange={(checked) => setEditingEmployee(prev => prev ? { ...prev, suspect: checked } : null)}
                        className="data-[state=checked]:bg-yellow-600"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-gray-300">Stop Pay</Label>
                        <p className="text-sm text-gray-400">Suspend payroll processing</p>
                      </div>
                      <Switch
                        checked={editingEmployee.stopPay || false}
                        onCheckedChange={(checked) => setEditingEmployee(prev => prev ? { ...prev, stopPay: checked } : null)}
                        className="data-[state=checked]:bg-red-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {editingEmployee.suspect && (
                      <div>
                        <Label className="text-gray-300">Suspect Reason</Label>
                        <Textarea
                          value={editingEmployee.susreason || ''}
                          onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, susreason: e.target.value } : null)}
                          className="bg-[#2A2B5E] border-blue-500/30 text-white"
                          rows={3}
                          placeholder="Reason for flagging as suspect..."
                        />
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <div className="flex justify-end gap-3 pt-6 border-t border-blue-500/30">
                <Button
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                  className="border-blue-500/30 text-gray-300 hover:bg-blue-500/20"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateEmployee}
                  disabled={updateEmployeeMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
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
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}