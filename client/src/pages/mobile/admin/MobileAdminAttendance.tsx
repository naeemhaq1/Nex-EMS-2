import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Users, Clock, Calendar, TrendingUp, TrendingDown, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useLocation } from 'wouter';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface AttendanceStats {
  today: {
    totalEmployees: number;
    present: number;
    absent: number;
    late: number;
    onTime: number;
    avgArrivalTime: string;
    attendanceRate: number;
  };
  yesterday: {
    totalEmployees: number;
    present: number;
    absent: number;
    late: number;
    onTime: number;
    avgArrivalTime: string;
    attendanceRate: number;
  };
  trends: {
    presentTrend: number;
    rateTrend: number;
    lateTrend: number;
  };
  hourlyData: Array<{
    hour: string;
    arrivals: number;
  }>;
  departmentStats: Array<{
    department: string;
    present: number;
    total: number;
    rate: number;
  }>;
}

const MobileAdminAttendance = () => {
  const [, navigate] = useLocation();
  const [selectedDay, setSelectedDay] = useState<'today' | 'yesterday'>('today');

  const { data: attendanceStats, isLoading } = useQuery<AttendanceStats>({
    queryKey: ['/api/admin/attendance-stats'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const COLORS = ['#10B981', '#EF4444', '#F59E0B', '#6B7280'];

  const formatTrend = (value: number) => {
    const isPositive = value > 0;
    const icon = isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />;
    const colorClass = isPositive ? 'text-green-400' : 'text-red-400';
    return (
      <div className={`flex items-center space-x-1 ${colorClass}`}>
        {icon}
        <span className="text-xs">{Math.abs(value)}%</span>
      </div>
    );
  };

  const currentStats = attendanceStats?.[selectedDay];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading Attendance Statistics...</p>
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
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white text-xl font-semibold">Attendance Analytics</h1>
              <p className="text-gray-400 text-sm">Today & Yesterday Statistics</p>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-scroll overflow-x-hidden mobile-admin-content-scroll">
        {/* Day Toggle */}
        <div className="p-4">
          <div className="flex bg-[#2A2B5E] rounded-lg p-1">
            <button
              onClick={() => setSelectedDay('today')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                selectedDay === 'today'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setSelectedDay('yesterday')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                selectedDay === 'yesterday'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Yesterday
            </button>
          </div>
        </div>

          {/* Main KPIs */}
        <div className="px-4 mb-4">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-[#2A2B5E] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Present</p>
                <p className="text-white text-2xl font-bold">{currentStats?.present || 0}</p>
              </div>
              <div className="flex flex-col items-end">
                <CheckCircle className="w-6 h-6 text-green-500 mb-1" />
                {attendanceStats?.trends && formatTrend(attendanceStats.trends.presentTrend)}
              </div>
            </div>
          </div>

          <div className="bg-[#2A2B5E] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Attendance Rate</p>
                <p className="text-white text-2xl font-bold">{currentStats?.attendanceRate || 0}%</p>
              </div>
              <div className="flex flex-col items-end">
                <TrendingUp className="w-6 h-6 text-blue-500 mb-1" />
                {attendanceStats?.trends && formatTrend(attendanceStats.trends.rateTrend)}
              </div>
            </div>
          </div>

          <div className="bg-[#2A2B5E] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Late Arrivals</p>
                <p className="text-white text-2xl font-bold">{currentStats?.late || 0}</p>
              </div>
              <div className="flex flex-col items-end">
                <AlertCircle className="w-6 h-6 text-yellow-500 mb-1" />
                {attendanceStats?.trends && formatTrend(attendanceStats.trends.lateTrend)}
              </div>
            </div>
          </div>

          <div className="bg-[#2A2B5E] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Avg Arrival</p>
                <p className="text-white text-2xl font-bold">{currentStats?.avgArrivalTime || '--:--'}</p>
              </div>
              <div className="flex flex-col items-end">
                <Clock className="w-6 h-6 text-purple-500 mb-1" />
                <span className="text-xs text-gray-400">AM</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Distribution Chart */}
      <div className="px-4 mb-4">
        <div className="bg-[#2A2B5E] rounded-lg p-4">
          <h3 className="text-white text-lg font-semibold mb-3">Attendance Distribution</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Present', value: currentStats?.present || 0, color: COLORS[0] },
                    { name: 'Absent', value: currentStats?.absent || 0, color: COLORS[1] },
                    { name: 'Late', value: currentStats?.late || 0, color: COLORS[2] },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {[
                    { name: 'Present', value: currentStats?.present || 0, color: COLORS[0] },
                    { name: 'Absent', value: currentStats?.absent || 0, color: COLORS[1] },
                    { name: 'Late', value: currentStats?.late || 0, color: COLORS[2] },
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1A1B3E',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-400">Present</span>
              </div>
              <span className="text-white font-semibold">{currentStats?.present || 0}</span>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-xs text-gray-400">Absent</span>
              </div>
              <span className="text-white font-semibold">{currentStats?.absent || 0}</span>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-xs text-gray-400">Late</span>
              </div>
              <span className="text-white font-semibold">{currentStats?.late || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hourly Arrivals Chart */}
      <div className="px-4 mb-4">
        <div className="bg-[#2A2B5E] rounded-lg p-4">
          <h3 className="text-white text-lg font-semibold mb-3">Hourly Arrivals Pattern</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceStats?.hourlyData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="hour" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1A1B3E',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                />
                <Bar dataKey="arrivals" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Department Stats */}
      <div className="px-4 mb-4">
        <div className="bg-[#2A2B5E] rounded-lg p-4">
          <h3 className="text-white text-lg font-semibold mb-3">Department Performance</h3>
          <div className="space-y-3">
            {attendanceStats?.departmentStats?.map((dept, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-[#1A1B3E] rounded-lg">
                <div className="flex-1">
                  <p className="text-white font-medium">{dept.department}</p>
                  <p className="text-gray-400 text-sm">{dept.present}/{dept.total} present</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${dept.rate}%` }}
                    ></div>
                  </div>
                  <span className="text-white text-sm font-semibold w-10">{dept.rate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison Card */}
      <div className="px-4 mb-4">
        <div className="bg-[#2A2B5E] rounded-lg p-4">
          <h3 className="text-white text-lg font-semibold mb-3">Today vs Yesterday</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-2">Today</p>
              <div className="space-y-1">
                <p className="text-white font-semibold">Present: {attendanceStats?.today.present || 0}</p>
                <p className="text-white font-semibold">Rate: {attendanceStats?.today.attendanceRate || 0}%</p>
                <p className="text-white font-semibold">Late: {attendanceStats?.today.late || 0}</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-2">Yesterday</p>
              <div className="space-y-1">
                <p className="text-white font-semibold">Present: {attendanceStats?.yesterday.present || 0}</p>
                <p className="text-white font-semibold">Rate: {attendanceStats?.yesterday.attendanceRate || 0}%</p>
                <p className="text-white font-semibold">Late: {attendanceStats?.yesterday.late || 0}</p>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default MobileAdminAttendance;