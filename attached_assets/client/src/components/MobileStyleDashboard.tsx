import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, BarChart, Bar, Tooltip, RadialBarChart, RadialBar, AreaChart, Area } from 'recharts';
import { 
  Users, CheckCircle, Clock, XCircle, TrendingUp, AlertTriangle, Calendar, Building2, UserX, UserCheck, 
  LogIn, LogOut, Activity, Zap, Award, BarChart3, Trophy, ChevronLeft, ChevronRight, RefreshCw
} from 'lucide-react';

interface KPIPanel {
  id: string;
  title: string;
  value: string | number;
  suffix: string;
  icon: any;
  color: string;
}

export default function MobileStyleDashboard() {
  const { user } = useAuth();
  const [currentChartIndex, setCurrentChartIndex] = useState(0);
  const [kpiScrollPosition, setKpiScrollPosition] = useState(0);
  const kpiContainerRef = useRef<HTMLDivElement>(null);

  // Fetch admin metrics (same as mobile admin)
  const { data: adminMetrics, isLoading: adminLoading } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
    refetchInterval: 30000,
    retry: false,
  });

  // Fetch employee metrics (using employees/me endpoint for staff users)
  const { data: employeeMetrics, isLoading: employeeLoading } = useQuery({
    queryKey: ["/api/employees/me"],
    refetchInterval: 30000,
    retry: false,
  });

  // Add employee KPI data with fallback values
  const employeeKPIData = employeeMetrics ? {
    hoursToday: 8,
    hoursWeek: 40,
    attendanceRate: 95,
    performanceScore: 87,
    monthlyRank: 3,
    currentStreak: 7,
    missedPunches: 1,
    overtime: 2,
    productivity: 89
  } : null;

  // Determine if user is admin
  const isAdmin = user?.role === "admin" || user?.role === "superadmin" || user?.role === "general_admin";

  // Employee KPI data - same as mobile version
  const kpiData = {
    hoursToday: 7.5,
    hoursWeek: 42,
    attendanceRate: 96,
    performanceScore: 88,
    currentStreak: 12,
    monthlyRank: 4,
    totalHours: 168,
    missedPunches: 1,
    streakDays: 15,
    missedOvertime: 3,
    productivity: 94
  };

  // Get KPI panels - using employee data for desktop unified interface
  const getKpiPanels = (): KPIPanel[] => {
    return [
      { id: 'hours_today', title: 'Today', value: kpiData.hoursToday, suffix: 'h', icon: Clock, color: 'text-blue-400' },
      { id: 'hours_week', title: 'Week', value: kpiData.hoursWeek, suffix: 'h', icon: BarChart3, color: 'text-cyan-400' },
      { id: 'attendance_rate', title: 'Attend', value: kpiData.attendanceRate, suffix: '%', icon: CheckCircle, color: 'text-green-400' },
      { id: 'performance', title: 'Score', value: kpiData.performanceScore, suffix: '%', icon: Trophy, color: 'text-purple-400' },
      { id: 'monthly_rank', title: 'Rank', value: `#${kpiData.monthlyRank}`, suffix: '', icon: Award, color: 'text-cyan-400' },
      { id: 'current_streak', title: 'Streak', value: kpiData.currentStreak, suffix: ' days', icon: Zap, color: 'text-green-400' },
      { id: 'missed_punches', title: 'Missed', value: kpiData.missedPunches, suffix: '', icon: AlertTriangle, color: 'text-red-400' },
      { id: 'overtime', title: 'Overtime', value: '2.5', suffix: 'h', icon: Clock, color: 'text-blue-400' },
      { id: 'productivity', title: 'Productivity', value: kpiData.productivity, suffix: '%', icon: TrendingUp, color: 'text-indigo-400' }
    ];
  };

  const kpiPanels = getKpiPanels();

  // Sample chart data (same as mobile)
  const punctualityData = [
    { name: 'Normal', value: 65, color: '#10B981' },
    { name: 'Grace', value: 20, color: '#F59E0B' },
    { name: 'Late', value: 15, color: '#EF4444' }
  ];

  const weeklyData = [
    { day: 'Mon', normal: 8, grace: 0, late: 0, overtime: 0 },
    { day: 'Tue', normal: 7.5, grace: 0.5, late: 0, overtime: 0 },
    { day: 'Wed', normal: 8, grace: 0, late: 0, overtime: 1 },
    { day: 'Thu', normal: 7, grace: 0, late: 1, overtime: 0 },
    { day: 'Fri', normal: 8, grace: 0, late: 0, overtime: 0.5 },
    { day: 'Sat', normal: 4, grace: 0, late: 0, overtime: 0 },
    { day: 'Sun', normal: 0, grace: 0, late: 0, overtime: 0 }
  ];

  const performanceTrendsData = [
    { week: 'W1', punctuality: 95, consistency: 92, efficiency: 88 },
    { week: 'W2', punctuality: 97, consistency: 94, efficiency: 90 },
    { week: 'W3', punctuality: 94, consistency: 91, efficiency: 87 },
    { week: 'W4', punctuality: 98, consistency: 95, efficiency: 91 }
  ];

  const scrollKPIs = (direction: 'left' | 'right') => {
    if (kpiContainerRef.current) {
      const container = kpiContainerRef.current;
      const scrollAmount = 300;
      const newScrollPosition = direction === 'left' 
        ? Math.max(0, container.scrollLeft - scrollAmount)
        : Math.min(container.scrollWidth - container.clientWidth, container.scrollLeft + scrollAmount);
      
      container.scrollTo({ left: newScrollPosition, behavior: 'smooth' });
    }
  };

  if (adminLoading || employeeLoading) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4 mx-auto"></div>
          <p className="text-lg">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1B3E] text-white">
      {/* Desktop Header */}
      <div className="bg-[#1A1B3E] border-b border-purple-500/20 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {isAdmin ? 'Admin Dashboard' : 'Employee Dashboard'}
            </h1>
            <p className="text-sm text-gray-400">
              {isAdmin ? 'System Overview & Metrics' : 'Personal Performance & Analytics'}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* KPI Panels Section - Desktop Horizontal Scroller */}
        <div className="bg-[#2A2B5E] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">
              {isAdmin ? 'System Metrics' : 'Performance Metrics'}
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => scrollKPIs('left')}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scrollKPIs('right')}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Horizontal Scrolling KPI Panels */}
          <div 
            ref={kpiContainerRef}
            className="flex overflow-x-auto scrollbar-hide space-x-4 pb-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {kpiPanels.map((panel) => (
              <div
                key={panel.id}
                className="min-w-[140px] bg-[#1A1B3E] rounded-lg p-4 text-center hover:bg-[#2A2B4E] transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-center mb-2">
                  <panel.icon className={`w-6 h-6 ${panel.color}`} />
                </div>
                <div className="text-xs text-gray-400 uppercase font-medium mb-1">{panel.title}</div>
                <div className="text-lg font-bold text-white">{panel.value}{panel.suffix}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Charts Section - Desktop Horizontal Scroller */}
        <div className="bg-[#2A2B5E] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Analytics Charts</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentChartIndex(Math.max(0, currentChartIndex - 1))}
                disabled={currentChartIndex === 0}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex space-x-1">
                {[0, 1, 2].map((index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentChartIndex(index)}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      currentChartIndex === index ? 'bg-purple-500' : 'bg-gray-600'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={() => setCurrentChartIndex(Math.min(2, currentChartIndex + 1))}
                disabled={currentChartIndex === 2}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Chart Content */}
          <div className="h-96">
            {/* Chart 1: Punctuality Doughnut */}
            {currentChartIndex === 0 && (
              <div className="h-full flex flex-col items-center justify-center">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-medium text-white mb-2">Attendance Punctuality</h3>
                  <div className="text-sm text-gray-400">Last 30 Days Performance</div>
                </div>
                <div className="flex items-center justify-center w-full">
                  <div className="flex-1 max-w-md">
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={punctualityData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={110}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {punctualityData.map((entry, index) => (
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
                  <div className="ml-8 space-y-3">
                    {punctualityData.map((entry, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: entry.color }}></div>
                        <div className="text-sm text-gray-300 min-w-[60px]">{entry.name}</div>
                        <div className="text-lg font-bold text-white">{entry.value}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Chart 2: Weekly Hours Stacked Bar */}
            {currentChartIndex === 1 && (
              <div className="h-full flex flex-col items-center justify-center">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-medium text-white mb-2">Weekly Hours Breakdown</h3>
                  <div className="text-sm text-gray-400">Work Hours Distribution</div>
                </div>
                <div className="w-full max-w-2xl">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={weeklyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1A1B3E',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                      />
                      <Bar dataKey="normal" stackId="a" fill="#10B981" radius={[0, 0, 4, 4]} />
                      <Bar dataKey="grace" stackId="a" fill="#F59E0B" />
                      <Bar dataKey="late" stackId="a" fill="#EF4444" />
                      <Bar dataKey="overtime" stackId="a" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center space-x-8 mt-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-sm bg-green-500"></div>
                    <span className="text-sm text-gray-300">Normal</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-sm bg-yellow-500"></div>
                    <span className="text-sm text-gray-300">Grace</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-sm bg-red-500"></div>
                    <span className="text-sm text-gray-300">Late</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-sm bg-blue-500"></div>
                    <span className="text-sm text-gray-300">Overtime</span>
                  </div>
                </div>
              </div>
            )}

            {/* Chart 3: Performance Trends Line */}
            {currentChartIndex === 2 && (
              <div className="h-full flex flex-col items-center justify-center">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-medium text-white mb-2">Performance Trends</h3>
                  <div className="text-sm text-gray-400">Weekly Performance Analysis</div>
                </div>
                <div className="w-full max-w-2xl">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={performanceTrendsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1A1B3E',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                      />
                      <Line type="monotone" dataKey="punctuality" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }} />
                      <Line type="monotone" dataKey="consistency" stroke="#3B82F6" strokeWidth={3} dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }} />
                      <Line type="monotone" dataKey="efficiency" stroke="#F59E0B" strokeWidth={3} dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center space-x-8 mt-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    <span className="text-sm text-gray-300">Punctuality</span>
                    <span className="text-sm font-bold text-green-400">98%</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                    <span className="text-sm text-gray-300">Consistency</span>
                    <span className="text-sm font-bold text-blue-400">95%</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                    <span className="text-sm text-gray-300">Efficiency</span>
                    <span className="text-sm font-bold text-yellow-400">91%</span>
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