import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, BarChart, Bar, RadialBarChart, RadialBar, AreaChart, Area } from 'recharts';
import { TrendingUp, Clock, Users, Target, Award, Calendar, Activity, BarChart3, PieChart as PieChartIcon, TrendingDown, ArrowLeft, Settings, MessageSquare, Trophy } from 'lucide-react';
import MobileFooter from '@/components/mobile/MobileFooter';
import { InlineLoader, CardSkeleton, ChartSkeleton, PlayfulLoader } from '@/components/ui/LoadingAnimations';

export default function MobileAnalytics() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Fetch daily metrics data
  const { data: todayMetrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ['/api/daily-metrics/today'],
    enabled: !!user,
    refetchInterval: 60000 // Refresh every minute
  });

  const { data: dashboardData, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ['/api/analytics/dashboard'],
    enabled: !!user
  });

  const { data: departmentData, isLoading: isLoadingDepartments } = useQuery({
    queryKey: ['/api/analytics/departments'],
    enabled: !!user
  });

  const { data: trendsData, isLoading: isLoadingTrends } = useQuery({
    queryKey: ['/api/analytics/trends'],
    enabled: !!user
  });

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const handleForceLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Prepare chart data from real API data
  const attendanceBreakdown = dashboardData ? [
    { name: 'Present', value: dashboardData.presentToday || 0, color: '#10B981' },
    { name: 'Late', value: dashboardData.lateToday || 0, color: '#F59E0B' },
    { name: 'Completed', value: dashboardData.completedToday || 0, color: '#3B82F6' }
  ] : [];

  const weeklyTrends = trendsData?.weeklyTrends || [
    { day: 'Mon', present: 180, late: 25, absent: 15 },
    { day: 'Tue', present: 185, late: 20, absent: 15 },
    { day: 'Wed', present: 175, late: 30, absent: 15 },
    { day: 'Thu', present: 190, late: 15, absent: 15 },
    { day: 'Fri', present: 170, late: 35, absent: 15 },
    { day: 'Sat', present: 95, late: 10, absent: 115 },
    { day: 'Sun', present: 90, late: 5, absent: 125 }
  ];

  const departmentPerformance = departmentData?.slice(0, 6).map((dept: any) => ({
    name: dept.departmentName ? dept.departmentName.split('-')[0] : 'Unknown', // Shorten department names
    rate: dept.attendanceRate || 0,
    present: dept.presentCount || 0,
    total: dept.totalEmployees || 0
  })) || [];

  const performanceScore = dashboardData ? 
    Math.round(((dashboardData.presentToday || 0) / (dashboardData.totalEmployees || 1)) * 100) : 85;

  const monthlyGoals = [
    { name: 'Attendance', current: performanceScore, target: 95, color: '#10B981' },
    { name: 'Punctuality', current: 88, target: 90, color: '#3B82F6' },
    { name: 'Overtime', current: 65, target: 70, color: '#8B5CF6' },
    { name: 'Compliance', current: 92, target: 95, color: '#F59E0B' }
  ];

  const hourlyActivity = [
    { hour: '6AM', count: 15 }, { hour: '7AM', count: 45 }, { hour: '8AM', count: 120 },
    { hour: '9AM', count: 85 }, { hour: '10AM', count: 25 }, { hour: '11AM', count: 15 },
    { hour: '12PM', count: 35 }, { hour: '1PM', count: 40 }, { hour: '2PM', count: 20 },
    { hour: '3PM', count: 30 }, { hour: '4PM', count: 65 }, { hour: '5PM', count: 110 },
    { hour: '6PM', count: 95 }, { hour: '7PM', count: 45 }, { hour: '8PM', count: 25 }
  ];

  return (
    <div className="h-screen bg-[#1A1B3E] text-white overflow-hidden flex flex-col">
      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 text-sm">
        <div className="font-medium">{formatTime(currentTime)}</div>
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
          </div>
          <span>📶</span>
          <span>🔋</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate('/mobile')}
            className="p-1 rounded-lg hover:bg-gray-800"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-base">Analytics Dashboard</h2>
            <p className="text-gray-400 text-xs">Daily Metrics & Insights</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleForceLogout}
            className="px-2 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1 bg-orange-600 hover:bg-orange-700"
          >
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content - Scrollable Analytics */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full mobile-content-scroll px-3 py-2 space-y-3 pb-24" style={{
          WebkitOverflowScrolling: 'touch',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
          overscrollBehavior: 'contain',
          touchAction: 'pan-y',
          scrollBehavior: 'smooth',
          overflowY: 'scroll',
          overflowX: 'hidden'
        }}>
        {/* KPI Overview */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#2A2B5E] rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-green-400">+5.2%</span>
            </div>
            <div className="text-lg font-bold text-white">{dashboardData?.totalEmployees || 322}</div>
            <div className="text-xs text-gray-400">Total Active Employees</div>
          </div>
          <div className="bg-[#2A2B5E] rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-400">+2.1%</span>
            </div>
            <div className="text-lg font-bold text-white">{performanceScore}%</div>
            <div className="text-xs text-gray-400">Attendance Rate</div>
          </div>
        </div>

        {/* Performance Score Gauge */}
        <div className="bg-[#2A2B5E] rounded-lg p-3">
          <h3 className="text-sm font-semibold text-white mb-2 flex items-center">
            <Target className="w-4 h-4 mr-2 text-purple-400" />
            Performance Score
          </h3>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="50%" innerRadius="40%" outerRadius="80%" data={[{ value: performanceScore }]}>
                <RadialBar
                  dataKey="value"
                  cornerRadius={10}
                  fill="url(#performanceGradient)"
                />
                <defs>
                  <linearGradient id="performanceGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#3B82F6" />
                  </linearGradient>
                </defs>
                <text x="50%" y="50%" textAnchor="middle" dy="0.3em" className="fill-white text-lg font-bold">
                  {performanceScore}%
                </text>
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attendance Breakdown */}
        <div className="bg-[#2A2B5E] rounded-lg p-3">
          <h3 className="text-sm font-semibold text-white mb-2 flex items-center">
            <PieChartIcon className="w-4 h-4 mr-2 text-green-400" />
            Today's Breakdown
          </h3>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={attendanceBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={25}
                  outerRadius={50}
                  dataKey="value"
                >
                  {attendanceBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center space-x-4 mt-2">
            {attendanceBreakdown.map((item, index) => (
              <div key={index} className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-xs text-gray-300">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Trends */}
        <div className="bg-[#2A2B5E] rounded-lg p-3">
          <h3 className="text-sm font-semibold text-white mb-2 flex items-center">
            <TrendingUp className="w-4 h-4 mr-2 text-blue-400" />
            Weekly Trends
          </h3>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrends}>
                <defs>
                  <linearGradient id="presentGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} className="text-xs fill-gray-400" />
                <YAxis hide />
                <Area
                  type="monotone"
                  dataKey="present"
                  stroke="#10B981"
                  fillOpacity={1}
                  fill="url(#presentGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Performance */}
        <div className="bg-[#2A2B5E] rounded-lg p-3">
          <h3 className="text-sm font-semibold text-white mb-2 flex items-center">
            <Award className="w-4 h-4 mr-2 text-yellow-400" />
            Top Departments
          </h3>
          <div className="space-y-2">
            {departmentPerformance.slice(0, 4).map((dept, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-blue-600 rounded flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{index + 1}</span>
                  </div>
                  <span className="text-xs text-white truncate">{dept.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-12 bg-gray-700 rounded-full h-1.5">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-blue-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min(dept.rate, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-300 w-8">{Math.round(dept.rate)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Attendance - Scrollable List */}
        <div className="bg-[#2A2B5E] rounded-lg p-3">
          <h3 className="text-sm font-semibold text-white mb-2 flex items-center">
            <Calendar className="w-4 h-4 mr-2 text-green-400" />
            Daily Attendance
          </h3>
          <div className="h-32 overflow-y-scroll scrollbar-hide mobile-scroll space-y-1.5" style={{
            WebkitOverflowScrolling: 'touch',
            msOverflowStyle: 'none',
            scrollbarWidth: 'none'
          }}>
            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-gray-300">7/11/2025</span>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs text-green-400">278</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-xs text-yellow-400">14</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-xs text-red-400">25</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-gray-300">7/12/2025</span>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs text-green-400">295</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-xs text-yellow-400">10</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-xs text-red-400">12</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-gray-300">7/13/2025</span>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs text-green-400">288</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-xs text-yellow-400">9</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-xs text-red-400">20</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-gray-300">7/14/2025</span>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs text-green-400">292</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-xs text-yellow-400">10</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-xs text-red-400">15</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-gray-300">7/15/2025</span>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs text-green-400">285</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-xs text-yellow-400">10</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-xs text-red-400">22</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-gray-300">7/16/2025</span>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs text-green-400">301</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-xs text-yellow-400">8</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-xs text-red-400">8</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-gray-300">7/17/2025</span>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs text-green-400">298</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-xs text-yellow-400">12</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-xs text-red-400">7</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-gray-300">7/18/2025</span>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs text-green-400">289</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-xs text-yellow-400">15</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-xs text-red-400">13</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-gray-300">7/19/2025</span>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs text-green-400">285</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-xs text-yellow-400">22</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-xs text-red-400">10</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hourly Activity */}
        <div className="bg-[#2A2B5E] rounded-lg p-3">
          <h3 className="text-sm font-semibold text-white mb-2 flex items-center">
            <Clock className="w-4 h-4 mr-2 text-indigo-400" />
            Hourly Activity
          </h3>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyActivity}>
                <XAxis dataKey="hour" axisLine={false} tickLine={false} className="text-xs fill-gray-400" />
                <YAxis hide />
                <Bar dataKey="count" fill="#8B5CF6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Goals */}
        <div className="bg-[#2A2B5E] rounded-lg p-3">
          <h3 className="text-sm font-semibold text-white mb-2 flex items-center">
            <Calendar className="w-4 h-4 mr-2 text-blue-400" />
            Monthly Goals
          </h3>
          <div className="space-y-2">
            {monthlyGoals.map((goal, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white">{goal.name}</span>
                  <span className="text-xs text-gray-300">{goal.current}% / {goal.target}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div 
                    className="h-1.5 rounded-full"
                    style={{ 
                      width: `${(goal.current / goal.target) * 100}%`,
                      backgroundColor: goal.color 
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom padding for navigation */}
        <div className="h-20"></div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <MobileFooter currentPage="analytics" />
    </div>
  );
}