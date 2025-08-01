import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Search, 
  Calendar, 
  Clock, 
  User, 
  Filter,
  ChevronDown,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Timer,
  MapPin,
  Download
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface AttendanceRecord {
  id: string;
  employeeCode: string;
  employeeName: string;
  date: string;
  punchIn: string | null;
  punchOut: string | null;
  hoursWorked: number;
  status: 'present' | 'absent' | 'late' | 'early' | 'grace';
  location?: string;
  recordType: 'biometric' | 'mobile' | 'admin';
  notes?: string;
}

interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  department: string;
  designation: string;
}

const MobileAdminAttendanceTracker = () => {
  const [, navigate] = useLocation();
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [dateRange, setDateRange] = useState({
    from: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch employees for dropdown
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['/api/employees?isActive=true&limit=1000'],
    retry: 2
  });

  // Fetch attendance records
  const { data: attendanceData, isLoading } = useQuery<{records: AttendanceRecord[], summary: any}>({
    queryKey: ['/api/admin/attendance-records', selectedEmployee, dateRange.from, dateRange.to, statusFilter],
    enabled: !!dateRange.from && !!dateRange.to,
    retry: 2
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'text-green-400 bg-green-600/20';
      case 'late': return 'text-yellow-400 bg-yellow-600/20';
      case 'early': return 'text-blue-400 bg-blue-600/20';
      case 'grace': return 'text-orange-400 bg-orange-600/20';
      case 'absent': return 'text-red-400 bg-red-600/20';
      default: return 'text-gray-400 bg-gray-600/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle className="w-4 h-4" />;
      case 'late': return <Timer className="w-4 h-4" />;
      case 'early': return <Clock className="w-4 h-4" />;
      case 'grace': return <AlertTriangle className="w-4 h-4" />;
      case 'absent': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const filteredRecords = attendanceData?.records?.filter(record => {
    const matchesSearch = searchTerm === '' || 
      record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.employeeCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  }) || [];

  if (isLoading) {
    return (
      <div className="h-screen bg-[#1A1B3E] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading Attendance Records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#1A1B3E] text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-[#2A2B5E] p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/mobile/admin/dashboard')}
              className="bg-[#1A1B3E] hover:bg-[#3A3B6E] p-2 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="bg-[#1A1B3E] p-2 rounded-lg">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white text-xl font-semibold">Attendance Tracker</h1>
              <p className="text-gray-400 text-sm">Check Anyone's Attendance</p>
            </div>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-[#1A1B3E] hover:bg-[#3A3B6E] p-2 rounded-lg transition-colors"
          >
            <Filter className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-[#2A2B5E] p-4 border-b border-gray-700">
          <div className="space-y-4">
            {/* Employee Selection */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">Employee</label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.employeeCode}>
                    {emp.firstName} {emp.lastName} ({emp.employeeCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 text-sm mb-2">From Date</label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                  className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">To Date</label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                  className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="early">Early</option>
                <option value="grace">Grace</option>
                <option value="absent">Absent</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="p-4 bg-[#2A2B5E] border-b border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by employee name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Summary Cards */}
      {attendanceData?.summary && (
        <div className="p-4 bg-[#1A1B3E]">
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-[#2A2B5E] rounded-lg p-3 text-center">
              <p className="text-green-400 text-lg font-bold">{attendanceData.summary.present || 0}</p>
              <p className="text-gray-400 text-xs">Present</p>
            </div>
            <div className="bg-[#2A2B5E] rounded-lg p-3 text-center">
              <p className="text-yellow-400 text-lg font-bold">{attendanceData.summary.late || 0}</p>
              <p className="text-gray-400 text-xs">Late</p>
            </div>
            <div className="bg-[#2A2B5E] rounded-lg p-3 text-center">
              <p className="text-blue-400 text-lg font-bold">{attendanceData.summary.early || 0}</p>
              <p className="text-gray-400 text-xs">Early</p>
            </div>
            <div className="bg-[#2A2B5E] rounded-lg p-3 text-center">
              <p className="text-red-400 text-lg font-bold">{attendanceData.summary.absent || 0}</p>
              <p className="text-gray-400 text-xs">Absent</p>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Records */}
      <div className="flex-1 overflow-y-scroll overflow-x-hidden mobile-content-scroll">
        <div className="p-4 space-y-3">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No attendance records found</p>
              <p className="text-gray-500 text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            filteredRecords.map((record) => (
              <div key={record.id} className="bg-[#2A2B5E] rounded-lg p-4 border border-gray-700">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-white font-medium">{record.employeeName}</h3>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                        {getStatusIcon(record.status)}
                        <span className="ml-1 capitalize">{record.status}</span>
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm">{record.employeeCode} • {format(new Date(record.date), 'MMM dd, yyyy')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">{record.hoursWorked.toFixed(1)}h</p>
                    <p className={`text-xs ${record.recordType === 'biometric' ? 'text-blue-400' : record.recordType === 'mobile' ? 'text-green-400' : 'text-orange-400'}`}>
                      {record.recordType}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="bg-[#1A1B3E] rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <Clock className="w-4 h-4 text-green-400" />
                      <span className="text-gray-400 text-sm">Punch In</span>
                    </div>
                    <p className="text-white font-medium">
                      {record.punchIn ? format(new Date(record.punchIn), 'HH:mm') : '---'}
                    </p>
                  </div>
                  <div className="bg-[#1A1B3E] rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <Clock className="w-4 h-4 text-red-400" />
                      <span className="text-gray-400 text-sm">Punch Out</span>
                    </div>
                    <p className="text-white font-medium">
                      {record.punchOut ? format(new Date(record.punchOut), 'HH:mm') : '---'}
                    </p>
                  </div>
                </div>

                {record.location && (
                  <div className="flex items-center space-x-2 text-gray-400 text-sm">
                    <MapPin className="w-4 h-4" />
                    <span>{record.location}</span>
                  </div>
                )}

                {record.notes && (
                  <div className="mt-2 p-2 bg-[#1A1B3E] rounded text-gray-300 text-sm">
                    {record.notes}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Export Button */}
      <div className="p-4 bg-[#2A2B5E] border-t border-gray-700">
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors">
          <Download className="w-4 h-4" />
          <span>Export Records</span>
        </button>
      </div>
    </div>
  );
};

export default MobileAdminAttendanceTracker;