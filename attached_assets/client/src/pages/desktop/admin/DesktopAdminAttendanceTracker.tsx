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
  CheckCircle,
  XCircle,
  AlertTriangle,
  Timer,
  MapPin,
  Download,
  Eye,
  MoreHorizontal
} from 'lucide-react';
import { format, subDays } from 'date-fns';

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

const DesktopAdminAttendanceTracker = () => {
  const [, navigate] = useLocation();
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [dateRange, setDateRange] = useState({
    from: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

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
      case 'present': return 'text-green-600 bg-green-100';
      case 'late': return 'text-yellow-600 bg-yellow-100';
      case 'early': return 'text-blue-600 bg-blue-100';
      case 'grace': return 'text-orange-600 bg-orange-100';
      case 'absent': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Attendance Records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Attendance Tracker</h1>
                <p className="text-sm text-gray-500">Comprehensive attendance monitoring and analysis</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
              
              {/* Employee Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                <div className="space-y-3">
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="early">Early</option>
                  <option value="grace">Grace</option>
                  <option value="absent">Absent</option>
                </select>
              </div>

              {/* Summary */}
              {attendanceData?.summary && (
                <div className="border-t pt-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Present:</span>
                      <span className="text-sm font-medium text-green-600">{attendanceData.summary.present || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Late:</span>
                      <span className="text-sm font-medium text-yellow-600">{attendanceData.summary.late || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Early:</span>
                      <span className="text-sm font-medium text-blue-600">{attendanceData.summary.early || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Absent:</span>
                      <span className="text-sm font-medium text-red-600">{attendanceData.summary.absent || 0}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Search */}
            <div className="bg-white rounded-lg shadow mb-6 p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by employee name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Records Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Attendance Records ({filteredRecords.length})
                </h3>
                
                {filteredRecords.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No attendance records found</p>
                    <p className="text-gray-400 text-sm">Try adjusting your filters</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Employee
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Punch In
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Punch Out
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Hours
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredRecords.map((record) => (
                          <tr key={record.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{record.employeeName}</div>
                                <div className="text-sm text-gray-500">{record.employeeCode}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {format(new Date(record.date), 'MMM dd, yyyy')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.punchIn ? format(new Date(record.punchIn), 'HH:mm') : '---'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.punchOut ? format(new Date(record.punchOut), 'HH:mm') : '---'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.hoursWorked.toFixed(1)}h
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                                {getStatusIcon(record.status)}
                                <span className="ml-1 capitalize">{record.status}</span>
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                record.recordType === 'biometric' ? 'bg-blue-100 text-blue-800' :
                                record.recordType === 'mobile' ? 'bg-green-100 text-green-800' :
                                'bg-orange-100 text-orange-800'
                              }`}>
                                {record.recordType}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => setSelectedRecord(record)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Record Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Attendance Details</h3>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700">{selectedRecord.employeeName}</h4>
                  <p className="text-sm text-gray-500">{selectedRecord.employeeCode}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Date</label>
                    <p className="text-sm text-gray-900">{format(new Date(selectedRecord.date), 'MMM dd, yyyy')}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Hours Worked</label>
                    <p className="text-sm text-gray-900">{selectedRecord.hoursWorked.toFixed(1)}h</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Punch In</label>
                    <p className="text-sm text-gray-900">{selectedRecord.punchIn ? format(new Date(selectedRecord.punchIn), 'HH:mm') : '---'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Punch Out</label>
                    <p className="text-sm text-gray-900">{selectedRecord.punchOut ? format(new Date(selectedRecord.punchOut), 'HH:mm') : '---'}</p>
                  </div>
                </div>
                
                {selectedRecord.location && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Location</label>
                    <p className="text-sm text-gray-900 flex items-center">
                      <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                      {selectedRecord.location}
                    </p>
                  </div>
                )}
                
                {selectedRecord.notes && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Notes</label>
                    <p className="text-sm text-gray-900">{selectedRecord.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesktopAdminAttendanceTracker;