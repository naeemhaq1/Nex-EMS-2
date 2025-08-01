import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, BarChart, Bar, Tooltip, AreaChart, Area } from 'recharts';
import { ArrowLeft, Calendar, Clock, Target, TrendingUp, Award, CheckCircle, AlertTriangle, Zap, Users, BarChart3 } from 'lucide-react';
import { useLocation } from 'wouter';

export default function MobileEmployeeAnalytics() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const [currentChartIndex, setCurrentChartIndex] = useState(0);

  // Fetch employee-specific analytics
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: [`/api/employee-analytics/employee-behavior/${user?.username}`],
    refetchInterval: 300000, // Refresh every 5 minutes
    enabled: !!user?.username
  });

  // Fetch employee performance scores
  const { data: performanceData } = useQuery({
    queryKey: [`/api/employee-analytics/employee-performance/${user?.username}`],
    refetchInterval: 300000,
    enabled: !!user?.username
  });

  if (isLoading) {
    return (
      <div className="h-screen bg-[#1A1B3E] flex items-center justify-center">
        <div className="text-white">Loading analytics...</div>
      </div>
    );
  }

  const stats = analyticsData?.stats || {};
  const charts = analyticsData?.charts || {};

  // Chart data with fallbacks
  const attendanceBreakdown = charts.attendanceBreakdown || [
    { name: 'On Time', value: 0, color: '#10B981' },
    { name: 'Grace Period', value: 0, color: '#F59E0B' },
    { name: 'Late', value: 0, color: '#EF4444' },
    { name: 'Absent', value: 0, color: '#6B7280' }
  ];

  const weeklyHours = charts.weeklyHours || [];
  const punctualityTrend = charts.punctualityTrend || [];

  const performanceScores = performanceData?.scores || {
    total: 0,
    attendance: 0,
    punctuality: 0,
    consistency: 0
  };

  return (
    <div className="h-screen bg-[#1A1B3E] text-white overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/mobile/employee/dashboard')}
            className="p-2 rounded-lg hover:bg-[#2A2B5E] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold">My Analytics</h1>
            <p className="text-sm text-gray-400">Personal attendance insights</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-6 h-6 text-purple-400" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto mobile-content-scroll">
        {/* Performance Score Cards */}
        <div className="p-4 grid grid-cols-2 gap-3">
          <div className="bg-[#2A2B5E] rounded-lg p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Award className="w-6 h-6 text-yellow-400" />
            </div>
            <div className="text-xs text-gray-400 uppercase mb-1">Total Score</div>
            <div className="text-2xl font-bold text-white">{performanceScores.total}%</div>
          </div>
          
          <div className="bg-[#2A2B5E] rounded-lg p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Target className="w-6 h-6 text-green-400" />
            </div>
            <div className="text-xs text-gray-400 uppercase mb-1">Attendance</div>
            <div className="text-2xl font-bold text-white">{stats.attendanceRate || 0}%</div>
          </div>
          
          <div className="bg-[#2A2B5E] rounded-lg p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-xs text-gray-400 uppercase mb-1">Punctuality</div>
            <div className="text-2xl font-bold text-white">{performanceScores.punctuality}%</div>
          </div>
          
          <div className="bg-[#2A2B5E] rounded-lg p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Zap className="w-6 h-6 text-orange-400" />
            </div>
            <div className="text-xs text-gray-400 uppercase mb-1">Streak</div>
            <div className="text-2xl font-bold text-white">{stats.currentStreak || 0} days</div>
          </div>
        </div>

        {/* Attendance Behavior Stats */}
        <div className="px-4 mb-4">
          <h3 className="text-lg font-semibold mb-3">Attendance Behavior</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#2A2B5E] rounded-lg p-3 text-center">
              <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-1" />
              <div className="text-xs text-gray-400">On Time</div>
              <div className="text-lg font-bold text-green-400">{stats.onTime || 0}</div>
            </div>
            
            <div className="bg-[#2A2B5E] rounded-lg p-3 text-center">
              <AlertTriangle className="w-5 h-5 text-orange-400 mx-auto mb-1" />
              <div className="text-xs text-gray-400">Grace</div>
              <div className="text-lg font-bold text-orange-400">{stats.grace || 0}</div>
            </div>
            
            <div className="bg-[#2A2B5E] rounded-lg p-3 text-center">
              <Clock className="w-5 h-5 text-red-400 mx-auto mb-1" />
              <div className="text-xs text-gray-400">Late</div>
              <div className="text-lg font-bold text-red-400">{stats.late || 0}</div>
            </div>
          </div>
        </div>

        {/* Interactive Charts */}
        <div className="px-4 mb-4">
          <div className="bg-[#2A2B5E] rounded-lg p-4">
            {/* Chart Navigation */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Analytics Charts</h3>
              <div className="flex space-x-1">
                {[0, 1, 2].map((index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentChartIndex(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      currentChartIndex === index ? 'bg-purple-500' : 'bg-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Chart 1: Attendance Breakdown Pie Chart */}
            {currentChartIndex === 0 && (
              <div className="h-64">
                <h4 className="text-center text-sm text-gray-400 mb-4">Attendance Distribution</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={attendanceBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {attendanceBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1A1B3E',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Chart 2: Weekly Hours Bar Chart */}
            {currentChartIndex === 1 && (
              <div className="h-64">
                <h4 className="text-center text-sm text-gray-400 mb-4">Weekly Hours Worked</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyHours}>
                    <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1A1B3E',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Bar dataKey="hours" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Chart 3: Punctuality Trend Line Chart */}
            {currentChartIndex === 2 && (
              <div className="h-64">
                <h4 className="text-center text-sm text-gray-400 mb-4">7-Day Punctuality Trend</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={punctualityTrend}>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1A1B3E',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#10B981"
                      strokeWidth={3}
                      dot={{ fill: '#10B981', strokeWidth: 0, r: 4 }}
                      activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2, fill: '#fff' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Additional Insights */}
        <div className="px-4 pb-6">
          <h3 className="text-lg font-semibold mb-3">Key Insights</h3>
          <div className="space-y-3">
            <div className="bg-[#2A2B5E] rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <TrendingUp className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                <div>
                  <div className="font-medium text-green-400">Current Streak</div>
                  <div className="text-sm text-gray-300">
                    You've been on time for {stats.currentStreak || 0} consecutive days. 
                    Your longest streak is {stats.longestStreak || 0} days.
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-[#2A2B5E] rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                <div>
                  <div className="font-medium text-blue-400">Average Hours</div>
                  <div className="text-sm text-gray-300">
                    You work an average of {stats.averageHours || 0} hours per day.
                    Total hours this month: {stats.totalHours || 0}h
                  </div>
                </div>
              </div>
            </div>
            
            {stats.punchOutMissed > 0 && (
              <div className="bg-[#2A2B5E] rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-orange-400 mt-1 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-orange-400">Missed Punch-Outs</div>
                    <div className="text-sm text-gray-300">
                      You have {stats.punchOutMissed} missed punch-out(s). 
                      Remember to punch out at the end of your shift.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}