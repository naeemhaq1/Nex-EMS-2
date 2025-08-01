import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import MobileAdminDualNavigation from '@/components/mobile/MobileAdminDualNavigation';
import { getCurrentPakistanDate, getPakistanDayOfWeek, isPakistanToday } from '@/utils/timezone';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  Calendar, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Filter,
  Download,
  Eye,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';

interface AnalyticsData {
  dailyAttendance: {
    date: string;
    dayOfWeek?: string;
    present: number;
    absent: number;
    late: number;
    missedPunchouts?: number;
    total: number;
  }[];
  departmentStats: {
    department: string;
    present: number;
    absent: number;
    late: number;
    total: number;
    percentage: number;
  }[];
  punctualityTrends: {
    week: string;
    onTime: number;
    late: number;
    absent: number;
  }[];
  topPerformers: {
    name: string;
    employeeCode: string;
    attendance: number;
    punctuality: number;
    department: string;
  }[];
}

export default function MobileAdminAnalytics() {
  const [, navigate] = useLocation();
  const [selectedPeriod, setSelectedPeriod] = useState('7days');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch analytics data - transform attendance stats to analytics format
  const { data: attendanceStats, isLoading } = useQuery({
    queryKey: ['/api/admin/attendance-stats', selectedPeriod, selectedDepartment],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Debug logs to check data
  if (attendanceStats?.last7Days) {
    console.log('✅ Analytics Data:', attendanceStats.last7Days.slice(0, 3));
  }

  // Transform attendance stats data to analytics format with last 7 days data
  const analytics = attendanceStats ? {
    dailyAttendance: (attendanceStats.last7Days && Array.isArray(attendanceStats.last7Days)) ? 
      attendanceStats.last7Days.map((day: any) => ({
        date: day.date,
        dayOfWeek: day.dayOfWeek || 'Unknown',
        present: day.present || 0,
        absent: day.absent || 0,
        late: day.late || 0,
        missedPunchouts: Math.max(0, (day.totalPunchIn || 0) - (day.totalPunchOut || 0)), // Biometric in - biometric out
        total: day.total || 0,
        attendanceRate: day.attendanceRate || 0,
        totalPunchIn: day.totalPunchIn || 0,
        totalPunchOut: day.totalPunchOut || 0
      })) : [
      { 
        date: attendanceStats.today?.date || new Date().toISOString().split('T')[0], 
        dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
        present: attendanceStats.today?.present || 0, 
        absent: attendanceStats.today?.absent || 0, 
        late: attendanceStats.today?.late || 0, 
        total: attendanceStats.today?.totalEmployees || 0 
      },
      { 
        date: attendanceStats.yesterday?.date || new Date(Date.now() - 86400000).toISOString().split('T')[0],
        dayOfWeek: new Date(Date.now() - 86400000).toLocaleDateString('en-US', { weekday: 'long' }), 
        present: attendanceStats.yesterday?.present || 0, 
        absent: attendanceStats.yesterday?.absent || 0, 
        late: attendanceStats.yesterday?.late || 0, 
        total: attendanceStats.yesterday?.totalEmployees || 0 
      }
    ],
    departmentStats: attendanceStats.departmentStats || [
      { department: 'IT', present: 45, absent: 3, late: 2, total: 50, percentage: 90 },
      { department: 'HR', present: 18, absent: 1, late: 1, total: 20, percentage: 90 },
      { department: 'Finance', present: 25, absent: 2, late: 3, total: 30, percentage: 83 },
      { department: 'Operations', present: 85, absent: 8, late: 7, total: 100, percentage: 85 },
      { department: 'Sales', present: 38, absent: 4, late: 3, total: 45, percentage: 84 }
    ],
    punctualityTrends: attendanceStats.punctualityTrends || [
      { week: 'Week 1', onTime: 280, late: 25, absent: 12 },
      { week: 'Week 2', onTime: 285, late: 20, absent: 12 },
      { week: 'Week 3', onTime: 290, late: 18, absent: 9 },
      { week: 'Week 4', onTime: 288, late: 19, absent: 10 }
    ],
    topPerformers: attendanceStats.topPerformers || [
      { name: 'Ahmed Hassan', employeeCode: '10001', attendance: 98, punctuality: 95, department: 'IT' },
      { name: 'Fatima Ali', employeeCode: '10045', attendance: 97, punctuality: 94, department: 'HR' },
      { name: 'Omar Khan', employeeCode: '10089', attendance: 96, punctuality: 92, department: 'Finance' },
      { name: 'Aisha Malik', employeeCode: '10156', attendance: 95, punctuality: 91, department: 'Operations' },
      { name: 'Hassan Ahmed', employeeCode: '10203', attendance: 94, punctuality: 90, department: 'Sales' }
    ]
  } : null;

  // Generate dynamic dates for fallback data
  const generateRecentDates = (count: number) => {
    const dates = [];
    for (let i = 0; i < count; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const recentDates = generateRecentDates(7);

  // Fallback data when API data is not available - using dynamic dates
  const fallbackAnalytics: AnalyticsData = {
    dailyAttendance: [
      { date: recentDates[0], present: 285, absent: 22, late: 10, total: 317 },
      { date: recentDates[1], present: 292, absent: 15, late: 10, total: 317 },
      { date: recentDates[2], present: 288, absent: 20, late: 9, total: 317 },
      { date: recentDates[3], present: 295, absent: 12, late: 10, total: 317 },
      { date: recentDates[4], present: 278, absent: 25, late: 14, total: 317 },
      { date: recentDates[5], present: 290, absent: 18, late: 9, total: 317 },
      { date: recentDates[6], present: 285, absent: 32, late: 15, total: 317 }
    ],
    departmentStats: [
      { department: 'IT', present: 45, absent: 3, late: 2, total: 50, percentage: 90 },
      { department: 'HR', present: 18, absent: 1, late: 1, total: 20, percentage: 90 },
      { department: 'Finance', present: 25, absent: 2, late: 3, total: 30, percentage: 83 },
      { department: 'Operations', present: 85, absent: 8, late: 7, total: 100, percentage: 85 },
      { department: 'Sales', present: 38, absent: 4, late: 3, total: 45, percentage: 84 }
    ],
    punctualityTrends: [
      { week: 'Week 1', onTime: 280, late: 25, absent: 12 },
      { week: 'Week 2', onTime: 285, late: 20, absent: 12 },
      { week: 'Week 3', onTime: 290, late: 18, absent: 9 },
      { week: 'Week 4', onTime: 288, late: 19, absent: 10 }
    ],
    topPerformers: [
      { name: 'Ahmed Hassan', employeeCode: '10001', attendance: 98, punctuality: 95, department: 'IT' },
      { name: 'Fatima Ali', employeeCode: '10045', attendance: 97, punctuality: 94, department: 'HR' },
      { name: 'Omar Khan', employeeCode: '10089', attendance: 96, punctuality: 92, department: 'Finance' },
      { name: 'Aisha Malik', employeeCode: '10156', attendance: 95, punctuality: 91, department: 'Operations' },
      { name: 'Hassan Ahmed', employeeCode: '10203', attendance: 94, punctuality: 90, department: 'Sales' }
    ]
  };

  const currentData = analytics || fallbackAnalytics;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-8 h-8 text-blue-500 animate-pulse mx-auto mb-4" />
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#1A1B3E] text-white flex flex-col overflow-hidden">
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
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white text-xl font-semibold">Analytics</h1>
              <p className="text-gray-400 text-sm">Attendance insights & trends</p>
            </div>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-[#2A2B5E] hover:bg-[#3A3B6E] p-2 rounded-lg transition-colors"
          >
            <Filter className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-[#2A2B5E] rounded-lg p-3 text-center">
            <div className="text-white text-lg font-bold">
              {currentData.dailyAttendance[0]?.present || 0}
            </div>
            <div className="text-gray-400 text-xs">Present</div>
          </div>
          <div className="bg-[#2A2B5E] rounded-lg p-3 text-center">
            <div className="text-white text-lg font-bold">
              {currentData.dailyAttendance[0]?.absent || 0}
            </div>
            <div className="text-gray-400 text-xs">Absent</div>
          </div>
          <div className="bg-[#2A2B5E] rounded-lg p-3 text-center">
            <div className="text-white text-lg font-bold">
              {currentData.dailyAttendance[0]?.late || 0}
            </div>
            <div className="text-gray-400 text-xs">Late</div>
          </div>
          <div className="bg-[#2A2B5E] rounded-lg p-3 text-center">
            <div className="text-white text-lg font-bold">
              {Math.round((currentData.dailyAttendance[0]?.present || 0) / 
                (currentData.dailyAttendance[0]?.total || 1) * 100)}%
            </div>
            <div className="text-gray-400 text-xs">Rate</div>
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
              <XCircle className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Period</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg p-2 text-white text-sm"
              >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="thismonth">This Month</option>
                <option value="lastmonth">Last Month</option>
              </select>
            </div>
            
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Department</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg p-2 text-white text-sm"
              >
                <option value="all">All Departments</option>
                <option value="IT">IT</option>
                <option value="HR">HR</option>
                <option value="Finance">Finance</option>
                <option value="Operations">Operations</option>
                <option value="Sales">Sales</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Content */}
      <div className="flex-1 overflow-y-scroll overflow-x-hidden mobile-admin-content-scroll">
        <div className="p-4 space-y-4">
          {/* Attendance Trends Line Graph */}
          <div className="bg-[#2A2B5E] rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium">7-Day Attendance Trends</h3>
              <BarChart3 className="w-4 h-4 text-blue-400" />
            </div>
            
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={currentData.dailyAttendance.slice(1, 7).reverse()} // Skip first item (today) and reverse to show chronological order
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1A1B3E', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  />
                  <Legend 
                    wrapperStyle={{ color: '#9CA3AF' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="present" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                    name="Present"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="late" 
                    stroke="#F59E0B" 
                    strokeWidth={3}
                    dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                    name="Late"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="absent" 
                    stroke="#EF4444" 
                    strokeWidth={3}
                    dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                    name="Absent"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="missedPunchouts" 
                    stroke="#F97316" 
                    strokeWidth={3}
                    dot={{ fill: '#F97316', strokeWidth: 2, r: 4 }}
                    name="Missed Punchouts"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily Attendance Table */}
          <div className="bg-[#2A2B5E] rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium">Daily Attendance Data</h3>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            
            {/* Legend - Aligned exactly with data column order */}
            <div className="flex items-center justify-between mb-4 p-3 bg-[#1A1B3E] rounded-lg">
              <div className="flex items-center space-x-1 flex-1 justify-center">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-400 text-xs font-medium">Present</span>
              </div>
              <div className="flex items-center space-x-1 flex-1 justify-center">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-yellow-400 text-xs font-medium">Late</span>
              </div>
              <div className="flex items-center space-x-1 flex-1 justify-center">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-red-400 text-xs font-medium">Absent</span>
              </div>
              <div className="flex items-center space-x-1 flex-1 justify-center">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-orange-400 text-xs font-medium">Missed</span>
              </div>
            </div>

            <div className="space-y-3">
              {currentData.dailyAttendance.slice(0, 7).map((day, index) => (
                <div key={day.date || index} className="flex items-center justify-between py-2 px-3 bg-[#1A1B3E] rounded-lg">
                  <div className="flex flex-col min-w-[80px]">
                    <span className="text-white font-medium text-sm">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    <span className="text-gray-400 text-xs">{day.dayOfWeek || new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' })}</span>
                  </div>
                  <div className="flex items-center justify-between flex-1 ml-4">
                    <div className="flex items-center justify-center flex-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                      <span className="text-green-400 font-bold text-base">{day.present}</span>
                    </div>
                    <div className="flex items-center justify-center flex-1">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></div>
                      <span className="text-yellow-400 font-bold text-base">{day.late}</span>
                    </div>
                    <div className="flex items-center justify-center flex-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                      <span className="text-red-400 font-bold text-base">{day.absent}</span>
                    </div>
                    <div className="flex items-center justify-center flex-1">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mr-1"></div>
                      <span className="text-orange-400 font-bold text-base">{day.missedPunchouts || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Department Performance */}
          <div className="bg-[#2A2B5E] rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium">Department Performance</h3>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="space-y-3">
              {currentData.departmentStats.map((dept, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
                      <Users className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{dept.department}</p>
                      <p className="text-gray-400 text-xs">{dept.present}/{dept.total} present</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      dept.percentage >= 90 ? 'bg-green-600/20 text-green-400' :
                      dept.percentage >= 80 ? 'bg-yellow-600/20 text-yellow-400' :
                      'bg-red-600/20 text-red-400'
                    }`}>
                      {dept.percentage}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Performers */}
          <div className="bg-[#2A2B5E] rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium">Top Performers</h3>
              <CheckCircle className="w-4 h-4 text-green-400" />
            </div>
            <div className="space-y-3">
              {currentData.topPerformers.map((performer, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-xs">
                        {performer.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{performer.name}</p>
                      <p className="text-gray-400 text-xs">{performer.employeeCode} • {performer.department}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      <div className="text-green-400 text-xs">{performer.attendance}%</div>
                      <ChevronRight className="w-3 h-3 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-[#2A2B5E] rounded-lg p-4 border border-gray-700">
            <h3 className="text-white font-medium mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex flex-col items-center justify-center space-y-1 px-2 py-2 rounded-lg transition-all duration-200 active:scale-95 min-w-[60px] bg-blue-600 hover:bg-blue-700">
                <div className="p-1 rounded-lg flex items-center justify-center">
                  <Download className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs text-white font-medium text-center leading-tight">Export Data</span>
              </button>
              <button className="flex flex-col items-center justify-center space-y-1 px-2 py-2 rounded-lg transition-all duration-200 active:scale-95 min-w-[60px] bg-green-600 hover:bg-green-700">
                <div className="p-1 rounded-lg flex items-center justify-center">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs text-white font-medium text-center leading-tight">View Reports</span>
              </button>
              <button className="flex flex-col items-center justify-center space-y-1 px-2 py-2 rounded-lg transition-all duration-200 active:scale-95 min-w-[60px] bg-purple-600 hover:bg-purple-700">
                <div className="p-1 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs text-white font-medium text-center leading-tight">Schedule Report</span>
              </button>
              <button className="flex flex-col items-center justify-center space-y-1 px-2 py-2 rounded-lg transition-all duration-200 active:scale-95 min-w-[60px] bg-orange-600 hover:bg-orange-700">
                <div className="p-1 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs text-white font-medium text-center leading-tight">Alert Settings</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Admin Dual Navigation */}
      <MobileAdminDualNavigation currentPage="analytics" />
    </div>
  );
}