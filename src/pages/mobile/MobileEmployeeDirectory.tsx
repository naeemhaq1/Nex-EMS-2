import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Search, Filter, X, Users, MapPin, Phone, Mail, Building, Clock, ChevronRight, Loader2, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Employee {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  department: string;
  designation: string;
  phone?: string;
  email?: string;
  profilePicture?: string;
  isActive: boolean;
}

interface EmployeeStatus {
  employeeCode: string;
  status: 'present' | 'absent' | 'late' | 'on_leave' | 'scheduled' | 'at_work' | 'available' | 'offline';
  lastSeen?: string;
  location?: string;
}

// Rolodex-style Employee Card with Name, Designation, Phone
function RolodexEmployeeCard({ employee, status }: { employee: Employee; status?: EmployeeStatus }) {
  const [, navigate] = useLocation();
  
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'present':
      case 'at_work': return 'bg-green-500';
      case 'scheduled':
      case 'available': return 'bg-blue-500';
      case 'late': return 'bg-yellow-500';
      case 'on_leave': return 'bg-purple-500';
      case 'absent':
      case 'offline':
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'present': return 'Present';
      case 'at_work': return 'At Work';
      case 'scheduled': return 'Scheduled';
      case 'available': return 'Available';
      case 'late': return 'Late';
      case 'on_leave': return 'On Leave';
      case 'absent': return 'Absent';
      case 'offline': return 'Offline';
      default: return 'Unknown';
    }
  };

  // Format phone number for display
  const formatPhone = (phone?: string) => {
    if (!phone) return 'No phone';
    // Clean and format phone number (basic formatting)
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('92')) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
    }
    return phone;
  };

  return (
    <div 
      className="bg-[#2A2B5E] rounded-lg p-4 border border-gray-600 hover:border-gray-500 hover:bg-[#2A2B5E]/80 transition-all duration-200 touch-manipulation active:scale-98"
      onClick={() => navigate(`/mobile/employee/profile/${employee.id}`)}
    >
      <div className="flex items-center space-x-4">
        {/* Large Avatar with Status */}
        <div className="relative flex-shrink-0">
          <div 
            className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-white font-bold text-lg border-2 border-gray-500"
          >
            {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
          </div>
          {/* Status Indicator */}
          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#2A2B5E] ${getStatusColor(status?.status)}`}></div>
        </div>

        {/* Employee Details - Rolodex Style */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Full Name - Large and Prominent */}
          <h3 className="text-white font-semibold text-lg leading-tight">
            {employee.firstName} {employee.lastName}
          </h3>
          
          {/* Designation - Prominent Secondary */}
          <p className="text-gray-300 font-medium text-base leading-tight">
            {employee.designation}
          </p>
          
          {/* Phone Number - Easily Accessible */}
          <div className="flex items-center space-x-2 mt-2">
            <Phone className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400 text-sm font-mono">
              {formatPhone(employee.phone)}
            </span>
          </div>

          {/* Status Badge */}
          <div className="flex items-center space-x-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${getStatusColor(status?.status)}`}></div>
            <span className="text-gray-400 text-xs">{getStatusText(status?.status)}</span>
            <span className="text-gray-500 text-xs">•</span>
            <span className="text-gray-500 text-xs">{employee.department}</span>
          </div>
        </div>

        {/* Subtle Arrow */}
        <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="bg-[#2A2B5E] rounded-xl p-4 border border-gray-700 animate-pulse">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-gray-600"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-600 rounded w-3/4"></div>
              <div className="h-3 bg-gray-700 rounded w-1/2"></div>
              <div className="h-3 bg-gray-700 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MobileEmployeeDirectory() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  // Removed pagination - using full scroll Rolodex interface

  // Fetch employees with error handling
  const { data: employeesData, isLoading: employeesLoading, error: employeesError } = useQuery({
    queryKey: ['/api/employees', { isActive: true, limit: 1000 }],
    refetchInterval: 30000,
    retry: 2,
    staleTime: 60000,
  });

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ['/api/employees/departments'],
    retry: 2,
    staleTime: 300000,
  });

  // Fetch employee status data with proper error handling
  const { data: employeeStatusData = [], isLoading: statusLoading } = useQuery({
    queryKey: ['/api/employees/status'],
    refetchInterval: 30000,
    retry: 2,
    staleTime: 30000,
  });

  const employees = employeesData?.employees || employeesData || [];
  const isLoading = employeesLoading || statusLoading;

  // Safe array operations with proper type checking
  const filteredEmployees = Array.isArray(employees) ? employees.filter((employee: Employee) => {
    const matchesSearch = 
      employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.department.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = selectedDepartment === 'all' || 
      employee.department === selectedDepartment;
    
    // Safe status filtering with array check
    const matchesStatus = selectedStatus === 'all' || (() => {
      const statusArray = Array.isArray(employeeStatusData) ? employeeStatusData : [];
      const statusData = statusArray.find((s: EmployeeStatus) => s.employeeCode === employee.employeeCode);
      if (!statusData) return selectedStatus === 'offline';
      return statusData.status === selectedStatus;
    })();
    
    return matchesSearch && matchesDepartment && matchesStatus;
  }) : [];

  // Full list for Rolodex-style scrolling (no pagination)
  const displayEmployees = filteredEmployees;

  // Get status for employee with safe array access
  const getEmployeeStatus = (employeeCode: string): EmployeeStatus | undefined => {
    const statusArray = Array.isArray(employeeStatusData) ? employeeStatusData : [];
    return statusArray.find((s: EmployeeStatus) => s.employeeCode === employeeCode);
  };

  // Calculate stats with safe operations
  const stats = {
    total: filteredEmployees.length,
    present: Array.isArray(employeeStatusData) ? 
      employeeStatusData.filter((s: EmployeeStatus) => s.status === 'present' || s.status === 'at_work').length : 0,
    available: Array.isArray(employeeStatusData) ? 
      employeeStatusData.filter((s: EmployeeStatus) => s.status === 'available' || s.status === 'scheduled').length : 0,
    offline: Array.isArray(employeeStatusData) ? 
      employeeStatusData.filter((s: EmployeeStatus) => s.status === 'offline' || s.status === 'absent').length : 0,
  };

  if (employeesError) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] flex flex-col">
        <div className="flex items-center justify-center flex-1 p-4">
          <div className="text-center">
            <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h2 className="text-xl text-white mb-2">Unable to Load Employees</h2>
            <p className="text-gray-400 mb-4">Please check your connection and try again</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="bg-blue-600 hover:bg-blue-700"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1B3E] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-[#2A2B5E] border-b border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/mobile')}
              className="p-2 hover:bg-[#3A3B6E] rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-white">Employee Directory</h1>
              <p className="text-sm text-gray-400">{stats.total} employees</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigate('/mobile/ai-predictions')}
              className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg transition-colors hover:from-purple-700 hover:to-blue-700"
              title="AI Attendance Predictions"
            >
              <Brain className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-blue-600 text-white' : 'bg-[#3A3B6E] text-gray-300 hover:text-white'}`}
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          <div className="bg-[#1A1B3E] rounded-lg p-3 text-center border border-gray-700">
            <div className="text-white text-lg font-bold">{stats.total}</div>
            <div className="text-gray-400 text-xs">Total</div>
          </div>
          <div className="bg-[#1A1B3E] rounded-lg p-3 text-center border border-gray-700">
            <div className="text-green-400 text-lg font-bold">{stats.present}</div>
            <div className="text-gray-400 text-xs">Present</div>
          </div>
          <div className="bg-[#1A1B3E] rounded-lg p-3 text-center border border-gray-700">
            <div className="text-blue-400 text-lg font-bold">{stats.available}</div>
            <div className="text-gray-400 text-xs">Available</div>
          </div>
          <div className="bg-[#1A1B3E] rounded-lg p-3 text-center border border-gray-700">
            <div className="text-gray-400 text-lg font-bold">{stats.offline}</div>
            <div className="text-gray-400 text-xs">Offline</div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="flex-shrink-0 bg-[#2A2B5E] border-b border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-medium">Filters</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Department</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Departments</option>
                {Array.isArray(departments) && departments.map((dept: string) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="present">Present</option>
                <option value="at_work">At Work</option>
                <option value="available">Available</option>
                <option value="scheduled">Scheduled</option>
                <option value="late">Late</option>
                <option value="on_leave">On Leave</option>
                <option value="absent">Absent</option>
                <option value="offline">Offline</option>
              </select>
            </div>

            <button
              onClick={() => {
                setSelectedDepartment('all');
                setSelectedStatus('all');
                setSearchTerm('');
              }}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg text-sm transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Scrollable Employee List */}
      <div className="flex-1 overflow-hidden">
        <div 
          className="h-full mobile-content-scroll" 
          style={{
            WebkitOverflowScrolling: 'touch',
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
            overscrollBehavior: 'contain',
            touchAction: 'pan-y',
            scrollBehavior: 'smooth',
            overflowY: 'scroll',
            overflowX: 'hidden'
          }}
        >
          <div className="p-4 pb-32">
            {isLoading ? (
              <LoadingSkeleton />
            ) : displayEmployees.length > 0 ? (
              <div className="space-y-2">
                {displayEmployees.map((employee: Employee) => (
                  <RolodexEmployeeCard
                    key={employee.id}
                    employee={employee}
                    status={getEmployeeStatus(employee.employeeCode)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg text-white mb-2">No employees found</h3>
                <p className="text-gray-400">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Employee Count Footer - No pagination, just count */}
      <div className="flex-shrink-0 bg-[#2A2B5E] border-t border-gray-700 p-3">
        <div className="text-center">
          <p className="text-sm text-gray-400">
            {filteredEmployees.length} employees {searchTerm || selectedDepartment !== 'all' || selectedStatus !== 'all' ? 'filtered' : 'total'}
          </p>
        </div>
      </div>
    </div>
  );
}