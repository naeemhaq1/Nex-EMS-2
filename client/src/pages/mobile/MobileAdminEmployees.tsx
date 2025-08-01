import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import MobileAdminDualNavigation from '@/components/mobile/MobileAdminDualNavigation';
import { 
  Users, 
  Search, 
  Filter, 
  RefreshCw, 
  Phone, 
  Mail, 
  Eye, 
  Edit, 
  MessageCircle, 
  MoreHorizontal,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  UserCheck,
  UserX,
  AlertCircle,
  Building2,
  Briefcase,
  MapPin,
  Calendar,
  Clock,
  X,
  SlidersHorizontal,
  UserCircle2
} from 'lucide-react';

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
  isActive: boolean;
  nonBio?: boolean;
  stopPay?: boolean;
}

interface EmployeeStatus {
  employeeCode: string;
  status: 'present' | 'absent' | 'late' | 'on_leave';
  lastPunch?: string;
  hoursWorked?: number;
}

export default function MobileAdminEmployees() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Removed pagination - using full scroll rolodex interface

  // Fetch employees with memory optimization
  const { data: employeesData, isLoading, refetch } = useQuery({
    queryKey: ['/api/employees', { isActive: true, limit: 1000 }],
    refetchInterval: 30000,
    retry: 2,
    staleTime: 60000, // Cache for 1 minute for quick lookups
    gcTime: 300000 // Keep in memory for 5 minutes (TanStack Query v5)
  });

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ['/api/employees/departments'],
    enabled: !!user,
    retry: 2,
    staleTime: 300000 // Cache departments for 5 minutes
  });

  // Fetch employee groups (for additional filtering)
  const { data: groups = [] } = useQuery({
    queryKey: ['/api/employees/groups'],
    enabled: !!user,
    retry: 2,
    staleTime: 300000
  });

  // Fetch employee status with memory optimization
  const { data: employeeStatusData = [] } = useQuery({
    queryKey: ['/api/employees/status'],
    enabled: !!user,
    refetchInterval: 30000,
    retry: 2,
    staleTime: 30000 // Cache status for 30 seconds
  });

  const employees = Array.isArray(employeesData?.employees) ? employeesData.employees : 
                    Array.isArray(employeesData) ? employeesData : [];

  // Memoized filtering for performance optimization
  const filteredEmployees = useMemo(() => {
    if (!Array.isArray(employees)) return [];
    
    return employees.filter((employee: Employee) => {
      // Enhanced search across multiple fields
      const searchFields = [
        employee.firstName,
        employee.lastName,
        employee.employeeCode,
        employee.department,
        employee.designation || '',
        employee.position || '',
        employee.email || '',
        employee.phone || ''
      ].join(' ').toLowerCase();
      
      const matchesSearch = searchTerm === '' || 
        searchFields.includes(searchTerm.toLowerCase());
      
      const matchesDepartment = selectedDepartment === 'all' || 
        employee.department === selectedDepartment;
      
      // Group filtering (using department as group)
      const matchesGroup = selectedGroup === 'all' || 
        employee.department === selectedGroup;
      
      const matchesStatus = selectedStatus === 'all' || (() => {
        const statusArray = Array.isArray(employeeStatusData) ? employeeStatusData : [];
        const statusData = statusArray.find((s: EmployeeStatus) => s.employeeCode === employee.employeeCode);
        if (!statusData) return selectedStatus === 'absent';
        return statusData.status === selectedStatus;
      })();
      
      return matchesSearch && matchesDepartment && matchesGroup && matchesStatus;
    });
  }, [employees, searchTerm, selectedDepartment, selectedGroup, selectedStatus, employeeStatusData]);

  // Full list for rolodex-style scrolling (no pagination)
  const displayEmployees = filteredEmployees;

  // Phone number formatting utility
  const formatPhoneNumber = (phone: string): string => {
    if (!phone) return '';
    
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Pakistani number format (+92 XXX XXX XXXX)
    if (digits.startsWith('92') && digits.length === 12) {
      return `+92 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
    }
    
    // US/International format (XXX-XXX-XXXX)
    if (digits.length === 10) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    
    // Return original if no pattern matches
    return phone;
  };

  // Utility functions
  const getInitials = (firstName: string, lastName: string): string => {
    if (!firstName || !lastName) return 'XX';
    return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'present': return 'bg-green-500';
      case 'late': return 'bg-yellow-500';
      case 'on_leave': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getEmployeeStatus = (employee: Employee): { status: string; hoursWorked?: number } => {
    if (!Array.isArray(employeeStatusData)) return { status: 'absent' };
    
    const statusData = employeeStatusData.find((s: EmployeeStatus) => 
      s.employeeCode === employee.employeeCode
    );
    
    return statusData || { status: 'absent' };
  };

  // Handle pull to refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Touch handlers for pull to refresh
  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollRef.current?.scrollTop === 0) {
      setIsDragging(true);
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !scrollRef.current) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    
    if (diff > 100 && scrollRef.current.scrollTop === 0) {
      handleRefresh();
      setIsDragging(false);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };



  if (isLoading) {
    return (
      <div className="flex-1 bg-[#0F0F1A] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading Employees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#1A1B3E] text-white flex flex-col overflow-hidden">
      {/* Pull to refresh indicator */}
      {refreshing && (
        <div className="absolute top-0 left-0 right-0 bg-blue-600 text-white text-center py-2 z-50">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm">Refreshing...</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-[#1A1B3E] p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/mobile/admin/dashboard')}
              className="bg-[#2A2B5E] hover:bg-[#3A3B6E] p-2 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="bg-[#2A2B5E] p-2 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white text-xl font-semibold">Employee Directory</h1>
              <p className="text-gray-400 text-sm">{filteredEmployees.length} employees</p>
            </div>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-[#2A2B5E] hover:bg-[#3A3B6E] p-2 rounded-lg transition-colors"
          >
            <Filter className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#2A2B5E] border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-[#2A2B5E] rounded-lg p-3 text-center">
            <div className="text-white text-lg font-bold">{employees.length}</div>
            <div className="text-gray-400 text-xs">Total</div>
          </div>
          <div className="bg-[#2A2B5E] rounded-lg p-3 text-center">
            <div className="text-white text-lg font-bold">
              {Array.isArray(employeeStatusData) ? employeeStatusData.filter((s: EmployeeStatus) => s.status === 'present').length : 0}
            </div>
            <div className="text-gray-400 text-xs">Present</div>
          </div>
          <div className="bg-[#2A2B5E] rounded-lg p-3 text-center">
            <div className="text-white text-lg font-bold">
              {Array.isArray(employeeStatusData) ? employeeStatusData.filter((s: EmployeeStatus) => s.status === 'late').length : 0}
            </div>
            <div className="text-gray-400 text-xs">Late</div>
          </div>
          <div className="bg-[#2A2B5E] rounded-lg p-3 text-center">
            <div className="text-white text-lg font-bold">
              {departments.length}
            </div>
            <div className="text-gray-400 text-xs">Depts</div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-[#2A2B5E] border-b border-gray-700 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-medium">Filters</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Department</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg p-2 text-white text-sm"
              >
                <option value="all">All Departments</option>
                {Array.isArray(departments) && departments.map((dept: string) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Group</label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg p-2 text-white text-sm"
              >
                <option value="all">All Groups</option>
                {Array.isArray(groups) && groups.map((group: string) => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg p-2 text-white text-sm"
              >
                <option value="all">All Status</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="on_leave">On Leave</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedDepartment('all');
                  setSelectedGroup('all');
                  setSelectedStatus('all');
                  setSearchTerm('');
                }}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg text-sm transition-colors flex items-center justify-center space-x-1"
              >
                <X className="w-4 h-4" />
                <span>Clear</span>
              </button>
            </div>
          </div>
          
          <div className="flex space-x-2 mt-3">
            <button
              onClick={() => setShowFilters(false)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Employee List */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-scroll overflow-x-hidden mobile-content-scroll pb-20"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="p-4 space-y-3">
          {displayEmployees.map((employee: Employee) => {
            const status = getEmployeeStatus(employee);
            
            return (
              <div
                key={employee.id}
                className="bg-[#2A2B5E] rounded-lg p-4 border border-gray-700 transform transition-all duration-200 active:scale-95"
                onClick={() => {
                  setSelectedEmployee(employee);
                  setShowEmployeeDetails(true);
                }}
              >
                <div className="flex items-center space-x-3">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {getInitials(employee.firstName, employee.lastName)}
                      </span>
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(status.status)} rounded-full border-2 border-[#2A2B5E]`}></div>
                  </div>
                  
                  {/* Employee Info - Rolodex Style */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-lg truncate">
                          {employee.firstName} {employee.lastName}
                        </h3>
                        <p className="text-gray-300 text-base font-medium">
                          {employee.designation || employee.position || 'Staff'}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {employee.phone ? formatPhoneNumber(employee.phone) : 'No phone'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                          status.status === 'present' ? 'bg-green-600/20 text-green-400' :
                          status.status === 'late' ? 'bg-yellow-600/20 text-yellow-400' :
                          status.status === 'on_leave' ? 'bg-blue-600/20 text-blue-400' :
                          'bg-gray-600/20 text-gray-400'
                        }`}>
                          {status.status === 'present' ? 'Present' :
                           status.status === 'late' ? 'Late' :
                           status.status === 'on_leave' ? 'On Leave' :
                           'Absent'}
                        </div>
                        <p className="text-gray-500 text-xs mt-1">
                          {employee.employeeCode}
                        </p>
                      </div>
                    </div>
                    
                    {/* Department and Hours */}
                    <div className="flex items-center justify-between mt-2 text-sm text-gray-400">
                      <div className="flex items-center space-x-1">
                        <Building2 className="w-3 h-3" />
                        <span>{employee.department}</span>
                      </div>
                      {status.hoursWorked !== undefined && (
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{status.hoursWorked}h today</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Rolodex-style footer showing count */}
        <div className="flex justify-center items-center p-4">
          <div className="text-gray-400 text-sm">
            Showing {filteredEmployees.length} of {employees.length} employees • Scroll to browse all
          </div>
        </div>
      </div>

      {/* Employee Details Modal */}
      {showEmployeeDetails && selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1B3E] rounded-3xl w-full max-w-md max-h-[85vh] overflow-hidden animate-slide-up">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {getInitials(selectedEmployee.firstName, selectedEmployee.lastName)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">
                      {selectedEmployee.firstName} {selectedEmployee.lastName}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {selectedEmployee.employeeCode} • {selectedEmployee.department}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEmployeeDetails(false)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-4 overflow-y-auto">
              {/* Contact Info */}
              <div className="space-y-3">
                <h4 className="text-white font-medium">Contact Information</h4>
                {selectedEmployee.email && (
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
                      <Mail className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Email</p>
                      <p className="text-white text-sm">{selectedEmployee.email}</p>
                    </div>
                  </div>
                )}
                {selectedEmployee.phone && (
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-600/20 rounded-lg flex items-center justify-center">
                      <Phone className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Phone</p>
                      <p className="text-white text-sm">{selectedEmployee.phone}</p>
                    </div>
                  </div>
                )}
                {selectedEmployee.nationalId && (
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-600/20 rounded-lg flex items-center justify-center">
                      <AlertCircle className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">National ID</p>
                      <p className="text-white text-sm">{selectedEmployee.nationalId}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Employment Info */}
              <div className="space-y-3">
                <h4 className="text-white font-medium">Employment Information</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-gray-400 text-sm">Department</p>
                    <p className="text-white text-sm">{selectedEmployee.department}</p>
                  </div>
                  {selectedEmployee.designation && (
                    <div>
                      <p className="text-gray-400 text-sm">Designation</p>
                      <p className="text-white text-sm">{selectedEmployee.designation}</p>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-gray-400 text-sm">Status</p>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      selectedEmployee.isActive ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                    }`}>
                      {selectedEmployee.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Type</p>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      selectedEmployee.nonBio ? 'bg-blue-600/20 text-blue-400' : 'bg-gray-600/20 text-gray-400'
                    }`}>
                      {selectedEmployee.nonBio ? 'Non-Bio' : 'Biometric'}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="space-y-3">
                <h4 className="text-white font-medium">Quick Actions</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors">
                    <Eye className="w-4 h-4" />
                    <span className="text-sm">View Details</span>
                  </button>
                  <button className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors">
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-sm">Send Message</span>
                  </button>
                  <button className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors">
                    <Edit className="w-4 h-4" />
                    <span className="text-sm">Edit Info</span>
                  </button>
                  <button className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg transition-colors">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">View Schedule</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Mobile Admin Dual Navigation */}
      <MobileAdminDualNavigation currentPage="directory" />
    </div>
  );
}