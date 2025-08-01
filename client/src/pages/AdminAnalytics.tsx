import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, RadialBarChart, RadialBar,
  ComposedChart, ScatterChart, Scatter, FunnelChart, Funnel
} from 'recharts';
import {
  Activity, BarChart3, Clock, TrendingUp, TrendingDown, Users, Award,
  Target, Timer, AlertTriangle, CheckCircle, XCircle, Zap, Shield,
  Calendar, RefreshCw, Download, Filter, PieChart as PieChartIcon,
  LineChart as LineChartIcon
} from 'lucide-react';
import { format, subDays, eachDayOfInterval, subMonths, eachHourOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';

// Theme colors matching dashboard
const CHART_COLORS = {
  primary: '#8B5CF6', // Purple
  secondary: '#3B82F6', // Blue
  success: '#10B981', // Green
  warning: '#F59E0B', // Amber
  danger: '#EF4444', // Red
  info: '#06B6D4', // Cyan
  accent: '#EC4899', // Pink
  neutral: '#6B7280', // Gray
};

const GRADIENT_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.danger,
  CHART_COLORS.info,
  CHART_COLORS.accent,
  CHART_COLORS.neutral,
];

interface AnalyticsData {
  dashboardMetrics: any;
  attendanceStats: any;
  punchoutStats: any;
  punch48HourData: any;
  lateArrivals: any;
  performanceMetrics: any;
}

// Generate sample data for charts
const generateCurrentPunchStats = () => {
  const hours = eachHourOfInterval({
    start: new Date(new Date().setHours(0, 0, 0, 0)),
    end: new Date()
  });

  return hours.map(hour => ({
    hour: format(hour, 'HH:mm'),
    punchIn: Math.floor(Math.random() * 30) + 5,
    punchOut: Math.floor(Math.random() * 25) + 3,
    present: Math.floor(Math.random() * 50) + 20,
  }));
};

const generateLastDayDistribution = () => [
  { name: 'On Time', value: 78, color: CHART_COLORS.success },
  { name: 'Late', value: 15, color: CHART_COLORS.warning },
  { name: 'Grace Period', value: 7, color: CHART_COLORS.info },
];

const generate7DayPerformance = () => {
  const days = eachDayOfInterval({
    start: subDays(new Date(), 6),
    end: new Date()
  });

  return days.map(day => ({
    day: format(day, 'EEE'),
    date: format(day, 'MM/dd'),
    morning: Math.floor(Math.random() * 50) + 30,
    afternoon: Math.floor(Math.random() * 45) + 25,
    evening: Math.floor(Math.random() * 20) + 10,
  }));
};

const generate30DayPerformance = () => {
  const days = eachDayOfInterval({
    start: subDays(new Date(), 29),
    end: new Date()
  });

  return days.map(day => ({
    date: format(day, 'MM/dd'),
    punchIn: Math.floor(Math.random() * 100) + 50,
    punchOut: Math.floor(Math.random() * 95) + 45,
    missedPunchouts: Math.floor(Math.random() * 15) + 2,
  }));
};

const generatePunchoutTypes = () => [
  { name: 'Biometric', value: 65, color: CHART_COLORS.primary },
  { name: 'Mobile App', value: 25, color: CHART_COLORS.secondary },
  { name: 'Admin Forced', value: 7, color: CHART_COLORS.warning },
  { name: 'System Forced', value: 3, color: CHART_COLORS.danger },
];

const generateAttendanceTrends = () => {
  const days = eachDayOfInterval({
    start: subDays(new Date(), 29),
    end: new Date()
  });

  return days.map(day => ({
    date: format(day, 'MM/dd'),
    attendance: Math.floor(Math.random() * 20) + 80,
    punctuality: Math.floor(Math.random() * 15) + 85,
    productivity: Math.floor(Math.random() * 25) + 75,
  }));
};

const generateDepartmentComparison = () => [
  { department: 'Engineering', attendance: 95, performance: 92, efficiency: 88 },
  { department: 'Sales', attendance: 88, performance: 85, efficiency: 90 },
  { department: 'Marketing', attendance: 91, performance: 89, efficiency: 86 },
  { department: 'HR', attendance: 93, performance: 91, efficiency: 89 },
  { department: 'Finance', attendance: 96, performance: 94, efficiency: 92 },
];

const generateAttendanceStreaks = () => {
  const days = eachDayOfInterval({
    start: subDays(new Date(), 29),
    end: new Date()
  });

  return days.map(day => ({
    date: format(day, 'MM/dd'),
    perfectAttendance: Math.floor(Math.random() * 50) + 40,
    goodStreak: Math.floor(Math.random() * 30) + 20,
    lateStreak: Math.floor(Math.random() * 15) + 5,
    absenceBreak: Math.floor(Math.random() * 10) + 2,
  }));
};

const generatePunctualityIndex = () => [
  { category: 'Always On Time', count: 85, percentage: 29, color: CHART_COLORS.success },
  { category: 'Usually On Time', count: 120, percentage: 41, color: CHART_COLORS.info },
  { category: 'Sometimes Late', count: 65, percentage: 22, color: CHART_COLORS.warning },
  { category: 'Frequently Late', count: 23, percentage: 8, color: CHART_COLORS.danger },
];

const generateAttendanceConsistency = () => {
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const weekStart = subDays(new Date(), (11 - i) * 7);
    return {
      week: format(weekStart, 'MMM dd'),
      perfect: Math.floor(Math.random() * 40) + 60,
      good: Math.floor(Math.random() * 30) + 50,
      poor: Math.floor(Math.random() * 20) + 10,
    };
  });
  return weeks;
};

export default function AdminAnalytics() {
  const [selectedPeriod, setSelectedPeriod] = useState('7days');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [refreshKey, setRefreshKey] = useState(0);

  // Query for real analytics data
  const { data: dashboardMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/admin/dashboard-metrics', refreshKey],
    refetchInterval: 30000,
  });

  const { data: punch48HourData } = useQuery({
    queryKey: ['/api/admin/punch-48hour-data', refreshKey],
    refetchInterval: 60000,
  });

  const { data: attendanceStats } = useQuery({
    queryKey: ['/api/admin/attendance-stats', selectedPeriod, refreshKey],
    refetchInterval: 30000,
  });

  // Generate chart data
  const currentPunchStats = useMemo(() => generateCurrentPunchStats(), [refreshKey]);
  const lastDayDistribution = useMemo(() => generateLastDayDistribution(), [refreshKey]);
  const sevenDayPerformance = useMemo(() => generate7DayPerformance(), [refreshKey]);
  const thirtyDayPerformance = useMemo(() => generate30DayPerformance(), [refreshKey]);
  const punchoutTypes = useMemo(() => generatePunchoutTypes(), [refreshKey]);
  const attendanceTrends = useMemo(() => generateAttendanceTrends(), [refreshKey]);
  const departmentComparison = useMemo(() => generateDepartmentComparison(), [refreshKey]);
  const attendanceStreaks = useMemo(() => generateAttendanceStreaks(), [refreshKey]);
  const punctualityIndex = useMemo(() => generatePunctualityIndex(), [refreshKey]);
  const attendanceConsistency = useMemo(() => generateAttendanceConsistency(), [refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h1>
            <p className="text-purple-200">Comprehensive attendance and performance analytics</p>
          </div>
          <div className="flex gap-3">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleRefresh} variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-r from-purple-600 to-purple-700 border-0 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Total Present</p>
                  <p className="text-2xl font-bold">{(dashboardMetrics as any)?.totalPresent || 156}</p>
                </div>
                <Users className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-blue-600 to-blue-700 border-0 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Attendance Rate</p>
                  <p className="text-2xl font-bold">{(dashboardMetrics as any)?.attendanceRate || 87.2}%</p>
                </div>
                <Target className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-emerald-600 to-emerald-700 border-0 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm">On Time</p>
                  <p className="text-2xl font-bold">{(dashboardMetrics as any)?.punctualityRate || 92.5}%</p>
                </div>
                <CheckCircle className="h-8 w-8 text-emerald-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-amber-600 to-amber-700 border-0 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm">Avg Hours</p>
                  <p className="text-2xl font-bold">{(dashboardMetrics as any)?.averageHours || 8.2}h</p>
                </div>
                <Clock className="h-8 w-8 text-amber-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          
          {/* 1. Current Punch Stats Line Chart */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 col-span-full xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <LineChartIcon className="h-5 w-5" />
                Current Punch In/Out Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={currentPunchStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="hour" stroke="#fff" />
                  <YAxis stroke="#fff" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.8)', 
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff'
                    }} 
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="punchIn" 
                    stroke={CHART_COLORS.success} 
                    strokeWidth={3}
                    dot={{ fill: CHART_COLORS.success, strokeWidth: 2, r: 4 }}
                    name="Punch In"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="punchOut" 
                    stroke={CHART_COLORS.danger} 
                    strokeWidth={3}
                    dot={{ fill: CHART_COLORS.danger, strokeWidth: 2, r: 4 }}
                    name="Punch Out"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="present" 
                    stroke={CHART_COLORS.info} 
                    strokeWidth={3}
                    dot={{ fill: CHART_COLORS.info, strokeWidth: 2, r: 4 }}
                    name="Present"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 2. Last Day Distribution Doughnut */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                Last Day Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={lastDayDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {lastDayDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.8)', 
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff'
                    }} 
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 3. 7-Day Performance Stacked Bar */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 col-span-full xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                7-Day Hourly Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sevenDayPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="day" stroke="#fff" />
                  <YAxis stroke="#fff" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.8)', 
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff'
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="morning" stackId="a" fill={CHART_COLORS.success} name="Morning" />
                  <Bar dataKey="afternoon" stackId="a" fill={CHART_COLORS.warning} name="Afternoon" />
                  <Bar dataKey="evening" stackId="a" fill={CHART_COLORS.primary} name="Evening" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 4. Punchout Types Doughnut */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Punchout Types
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={punchoutTypes}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {punchoutTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.8)', 
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff'
                    }} 
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 5. 30-Day Performance Stacked Bar */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 col-span-full">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Activity className="h-5 w-5" />
                30-Day Punch Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 overflow-x-auto">
                <ResponsiveContainer width={thirtyDayPerformance.length * 40 + 100} height={300}>
                  <BarChart data={thirtyDayPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" stroke="#fff" />
                    <YAxis stroke="#fff" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)', 
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff'
                      }} 
                    />
                    <Legend />
                    <Bar dataKey="punchIn" stackId="a" fill={CHART_COLORS.success} name="Punch In" />
                    <Bar dataKey="punchOut" stackId="a" fill={CHART_COLORS.danger} name="Punch Out" />
                    <Bar dataKey="missedPunchouts" stackId="a" fill={CHART_COLORS.warning} name="Missed Punchouts" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 6. Attendance Trends Area Chart */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 col-span-full xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Attendance Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={attendanceTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="date" stroke="#fff" />
                  <YAxis stroke="#fff" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.8)', 
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff'
                    }} 
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="attendance" 
                    stackId="1" 
                    stroke={CHART_COLORS.primary} 
                    fill={CHART_COLORS.primary}
                    fillOpacity={0.6}
                    name="Attendance"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="punctuality" 
                    stackId="2" 
                    stroke={CHART_COLORS.success} 
                    fill={CHART_COLORS.success}
                    fillOpacity={0.6}
                    name="Punctuality"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="productivity" 
                    stackId="3" 
                    stroke={CHART_COLORS.info} 
                    fill={CHART_COLORS.info}
                    fillOpacity={0.6}
                    name="Productivity"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 7. Punctuality Index */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Award className="h-5 w-5" />
                Punctuality Index
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={punctualityIndex}>
                  <RadialBar dataKey="percentage" cornerRadius={10} fill="#8884d8">
                    {punctualityIndex.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </RadialBar>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.8)', 
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff'
                    }} 
                  />
                  <Legend />
                </RadialBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 8. Department Comparison */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 col-span-full xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Department Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={departmentComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="department" stroke="#fff" />
                  <YAxis stroke="#fff" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.8)', 
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff'
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="attendance" fill={CHART_COLORS.primary} name="Attendance" />
                  <Line type="monotone" dataKey="performance" stroke={CHART_COLORS.success} strokeWidth={3} name="Performance" />
                  <Line type="monotone" dataKey="efficiency" stroke={CHART_COLORS.warning} strokeWidth={3} name="Efficiency" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 9. Attendance Streaks */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Attendance Streaks (30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 overflow-x-auto">
                <ResponsiveContainer width={attendanceStreaks.length * 30 + 100} height={300}>
                  <AreaChart data={attendanceStreaks}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" stroke="#fff" />
                    <YAxis stroke="#fff" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)', 
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff'
                      }} 
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="perfectAttendance" 
                      stackId="1" 
                      stroke={CHART_COLORS.success} 
                      fill={CHART_COLORS.success}
                      fillOpacity={0.8}
                      name="Perfect Attendance"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="goodStreak" 
                      stackId="2" 
                      stroke={CHART_COLORS.info} 
                      fill={CHART_COLORS.info}
                      fillOpacity={0.6}
                      name="Good Streak"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="lateStreak" 
                      stackId="3" 
                      stroke={CHART_COLORS.warning} 
                      fill={CHART_COLORS.warning}
                      fillOpacity={0.4}
                      name="Late Streak"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 10. Attendance Consistency (Weekly Trends) */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 col-span-full xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Weekly Attendance Consistency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={attendanceConsistency}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="week" stroke="#fff" />
                  <YAxis stroke="#fff" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.8)', 
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff'
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="perfect" fill={CHART_COLORS.success} name="Perfect Week" />
                  <Bar dataKey="good" fill={CHART_COLORS.info} name="Good Week" />
                  <Bar dataKey="poor" fill={CHART_COLORS.warning} name="Needs Improvement" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 11. Overall Attendance Rate Gauge */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Target className="h-5 w-5" />
                Overall Attendance Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="40%" outerRadius="80%" data={[{ name: 'Attendance', value: 87.2, fill: CHART_COLORS.primary }]}>
                  <RadialBar 
                    minAngle={15} 
                    label={{ position: 'insideStart', fill: '#fff', fontSize: 16 }} 
                    background 
                    clockWise={true} 
                    dataKey="value" 
                    cornerRadius={10}
                  />
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-white text-3xl font-bold">
                    87.2%
                  </text>
                  <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-300 text-sm">
                    Target: 90%
                  </text>
                </RadialBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

        </div>

        {/* Bottom Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 backdrop-blur-sm border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-200 text-sm">Total Employees</p>
                  <p className="text-3xl font-bold text-white">{(dashboardMetrics as any)?.totalEmployees || 293}</p>
                  <p className="text-purple-300 text-xs mt-1">Active workforce</p>
                </div>
                <Users className="h-12 w-12 text-purple-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-600/20 to-teal-600/20 backdrop-blur-sm border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-200 text-sm">Today's Efficiency</p>
                  <p className="text-3xl font-bold text-white">94.2%</p>
                  <p className="text-emerald-300 text-xs mt-1">Above target</p>
                </div>
                <TrendingUp className="h-12 w-12 text-emerald-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-600/20 to-orange-600/20 backdrop-blur-sm border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-200 text-sm">Perfect Attendance</p>
                  <p className="text-3xl font-bold text-white">85</p>
                  <p className="text-amber-300 text-xs mt-1">Employees this month</p>
                </div>
                <CheckCircle className="h-12 w-12 text-amber-300" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}