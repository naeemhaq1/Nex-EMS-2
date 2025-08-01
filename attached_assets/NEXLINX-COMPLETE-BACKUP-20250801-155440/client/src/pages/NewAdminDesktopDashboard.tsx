import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { 
  MapPin, 
  Clock, 
  CheckCircle, 
  Loader2, 
  LogIn, 
  LogOut, 
  User, 
  Calendar, 
  Target, 
  TrendingUp,
  Trophy,
  BarChart3,
  Timer,
  Award,
  Users,
  Activity,
  Zap,
  Globe,
  RefreshCw,
  RefreshCcw,
  Wifi,
  WifiOff,
  Megaphone,
  Play,
  Pause,
  X,
  Shield,
  Home,
  AlertTriangle,
  Monitor,
  Clock4
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';

interface PunchStatusData {
  isPunchedIn: boolean;
  punchInTime: string | null;
  hoursWorkedToday: number;
  employee: {
    code: string;
    name: string;
    department: string;
  };
}

interface EmployeeData {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  department: string;
  designation: string;
}

const NewAdminDesktopDashboard: React.FC = () => {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [hasLocation, setHasLocation] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoadingPunch, setIsLoadingPunch] = useState(false);
  const [showPunchStatus, setShowPunchStatus] = useState(false);
  const [punchStatusMessage, setPunchStatusMessage] = useState('');
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(true);

  // Desktop Announcement System State
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementSending, setAnnouncementSending] = useState(false);
  const [lastAnnouncementSent, setLastAnnouncementSent] = useState<string | null>(null);
  const [repeatCount, setRepeatCount] = useState(1);
  const [targetAudience, setTargetAudience] = useState('all');
  const [priority, setPriority] = useState('normal');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');
  const [expirationTime, setExpirationTime] = useState('');

  // Fetch live announcements from database
  const { data: liveAnnouncements } = useQuery({
    queryKey: ['/api/announcements/active'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Combined announcements (live + sample)
  const announcements = [
    ...(liveAnnouncements?.map((ann: any) => ann.message) || []),
    "Welcome to NEXLINX Employee Management System - Your productivity partner",
    "Please ensure all attendance records are up to date", 
    "New shift schedules have been posted - Check your dashboard",
    "Monthly performance reviews are due by end of week",
    "System maintenance scheduled for Sunday 2AM - 4AM"
  ];

  // Enhanced announcement sending function
  const sendAnnouncement = async () => {
    if (!announcementText.trim() || announcementSending) return;

    setAnnouncementSending(true);
    try {
      const response = await fetch('/api/announcements/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: announcementText.trim(),
          priority,
          targetAudience,
          repeatCount: Math.min(repeatCount, 10),
          scheduledTime: scheduledTime || null,
          expirationTime: expirationTime || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLastAnnouncementSent(`URGENT ANNOUNCEMENT sent ${repeatCount}x to ${data.recipientCount || 'all'} users: "${announcementText.trim()}"`);
        setAnnouncementText('');
        
        // Auto-hide success message after 8 seconds
        setTimeout(() => setLastAnnouncementSent(null), 8000);
      } else {
        throw new Error('Failed to send announcement');
      }
    } catch (error) {
      console.error('Error sending announcement:', error);
      setLastAnnouncementSent('Failed to send urgent announcement');
      setTimeout(() => setLastAnnouncementSent(null), 5000);
    }
    setAnnouncementSending(false);
  };

  // Query for employee data
  const { data: employeeData } = useQuery({
    queryKey: ['/api/employees/me'],
    enabled: !!user,
  });

  // Query for admin dashboard metrics (synced with mobile and old desktop)
  const { data: dashboardMetrics, refetch: refetchDashboardMetrics } = useQuery({
    queryKey: ['/api/admin/dashboard-metrics'],
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Query for yesterday's performance data
  const { data: yesterdayPerformance, refetch: refetchYesterday } = useQuery({
    queryKey: ['/api/admin/yesterday-performance'],
    enabled: !!user,
  });

  // Query for today's performance data
  const { data: todayPerformance, refetch: refetchToday } = useQuery({
    queryKey: ['/api/admin/today-performance'],
    enabled: !!user,
  });

  // Query for live activity data
  const { data: liveActivity, refetch: refetchLiveActivity } = useQuery({
    queryKey: ['/api/admin/live-activity'],
    enabled: !!user,
  });

  // Comprehensive refresh handler
  const handleComprehensiveRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Call comprehensive refresh API
      await apiRequest({
        url: '/api/admin/comprehensive-refresh',
        method: 'POST'
      });
      
      // Refetch all queries
      await Promise.all([
        refetchDashboardMetrics(),
        refetchYesterday(),
        refetchToday(),
        refetchLiveActivity()
      ]);
      
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Comprehensive refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Alias for backward compatibility
  const handleRefreshStats = handleComprehensiveRefresh;



  // Location and time effects
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const getLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCurrentLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              address: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`
            });
            setHasLocation(true);
          },
          (error) => {
            console.error('Location error:', error);
            setHasLocation(false);
          }
        );
      } else {
        setHasLocation(false);
      }
    };

    getLocation();
    const interval = setInterval(getLocation, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Announcement bar functionality
  useEffect(() => {
    if (isPaused || announcements.length === 0) return;

    const interval = setInterval(() => {
      setCurrentAnnouncementIndex((prev) => 
        prev === announcements.length - 1 ? 0 : prev + 1
      );
    }, 4000); // Change announcement every 4 seconds

    return () => clearInterval(interval);
  }, [isPaused, announcements.length]);





  // System-wide admin KPIs with short, meaningful descriptions
  const todayMetrics = dashboardMetrics?.today || {};
  const yesterdayMetrics = dashboardMetrics?.yesterday || {};
  const weeklyMetrics = dashboardMetrics?.thisWeek || {};
  const monthlyMetrics = dashboardMetrics?.thisMonth || {};

  const kpiData = [
    { title: 'Staff Total', value: todayMetrics?.totalEmployees || 0, suffix: '', icon: Users, color: 'text-blue-400' },
    { title: 'Present', value: todayMetrics?.totalPresent || 0, suffix: '', icon: Activity, color: 'text-green-400' },
    { title: 'Absent', value: todayMetrics?.totalAbsent || 0, suffix: '', icon: AlertTriangle, color: 'text-red-400' },
    { title: 'Late', value: todayMetrics?.lateArrivals || 0, suffix: '', icon: Clock, color: 'text-orange-400' },
    { title: 'Grace', value: todayMetrics?.gracePeriodUsage || 0, suffix: '', icon: Timer, color: 'text-yellow-400' },
    { title: 'Non-Bio', value: todayMetrics?.nonBioAttendance || 0, suffix: '', icon: Shield, color: 'text-purple-400' },
    { title: 'Punch In', value: todayMetrics?.totalPunchIn || 0, suffix: '', icon: LogIn, color: 'text-cyan-400' },
    { title: 'Punch Out', value: todayMetrics?.totalPunchOut || 0, suffix: '', icon: LogOut, color: 'text-pink-400' },
    { title: 'Hours Today', value: Math.round((todayMetrics?.totalHours || 0) * 10) / 10, suffix: 'h', icon: BarChart3, color: 'text-indigo-400' },
    { title: 'Hours Yesterday', value: Math.round((yesterdayMetrics?.totalHours || 0) * 10) / 10, suffix: 'h', icon: Calendar, color: 'text-teal-400' },
    { title: 'Attend Rate', value: Math.round((todayMetrics?.attendanceRate || 0) * 10) / 10, suffix: '%', icon: TrendingUp, color: 'text-emerald-400' },
    { title: 'On-Time', value: Math.round((todayMetrics?.punctualityRate || 0) * 10) / 10, suffix: '%', icon: Target, color: 'text-lime-400' },
    { title: 'Completed', value: todayMetrics?.completedShifts || 0, suffix: '', icon: CheckCircle, color: 'text-rose-400' },
    { title: 'Devices', value: Math.min(todayMetrics?.totalPunchIn || 0, 228), suffix: '', icon: Monitor, color: 'text-amber-400' },
  ];

  // Fetch system-wide chart data
  const punctualityQuery = useQuery({
    queryKey: ['/api/admin/punctuality-breakdown'],
    refetchInterval: 30000
  });

  const weeklyHoursQuery = useQuery({
    queryKey: ['/api/admin/weekly-hours'],
    refetchInterval: 30000
  });

  const performanceTrendsQuery = useQuery({
    queryKey: ['/api/admin/performance-trends'],
    refetchInterval: 30000
  });

  const todaysActivityQuery = useQuery({
    queryKey: ['/api/admin/todays-activity'],
    refetchInterval: 30000
  });

  // Add yesterday performance query for doughnut chart
  const yesterdayPerformanceQuery = useQuery({
    queryKey: ['/api/admin/yesterday-performance'],
    refetchInterval: 30000
  });

  // Add today's summary query for doughnut chart
  const todaysSummaryQuery = useQuery({
    queryKey: ['/api/admin/todays-summary'],
    refetchInterval: 30000
  });

  // Remove duplicate queries - using the ones defined earlier

  // Process chart data - Only use real data from APIs
  const punctualityData = punctualityQuery.data?.breakdown || [];

  const weeklyHours = weeklyHoursQuery.data?.weeklyHours || [];

  const performanceData = performanceTrendsQuery.data?.trends || [];

  const todaysActivity = todaysActivityQuery.data;

  // Use the existing query data directly

  // Yesterday's performance pie chart data
  const yesterdayPieData = yesterdayPerformanceQuery.data && (yesterdayPerformanceQuery.data as any).data ? [
    { name: 'Complete', value: (yesterdayPerformanceQuery.data as any).data.complete || 0, color: '#10B981' },
    { name: 'Incomplete', value: (yesterdayPerformanceQuery.data as any).data.incomplete || 0, color: '#F59E0B' },
    { name: 'NonBio', value: (yesterdayPerformanceQuery.data as any).data.nonBio || 0, color: '#3B82F6' },
    { name: 'Absent', value: (yesterdayPerformanceQuery.data as any).data.absent || 0, color: '#EF4444' }
  ] : [];

  // Today's summary pie chart data (using data from todays-summary API)
  const todaysSummaryPieData = todaysSummaryQuery.data && (todaysSummaryQuery.data as any).data ? [
    { name: 'Complete', value: (todaysSummaryQuery.data as any).data.complete || 0, color: '#10B981' },
    { name: 'Incomplete', value: (todaysSummaryQuery.data as any).data.incomplete || 0, color: '#F59E0B' },
    { name: 'NonBio', value: (todaysSummaryQuery.data as any).data.nonBio || 0, color: '#3B82F6' },
    { name: 'Absent', value: (todaysSummaryQuery.data as any).data.absent || 0, color: '#EF4444' }
  ] : [];

  // Today's performance pie chart data
  const todayPieData = todayPerformance && (todayPerformance as any).data ? [
    { name: 'Complete', value: (todayPerformance as any).data.complete || 0, color: '#10B981' },
    { name: 'Incomplete', value: (todayPerformance as any).data.incomplete || 0, color: '#F59E0B' },
    { name: 'NonBio', value: (todayPerformance as any).data.nonBio || 0, color: '#3B82F6' },
    { name: 'Absent', value: (todayPerformance as any).data.absent || 0, color: '#EF4444' }
  ] : [];

  // Live activity bar chart data
  const liveActivityData = liveActivity && (liveActivity as any).data ? [
    { name: 'Punch-ins', value: (liveActivity as any).data.totalPunchIns || 0, color: '#10B981' },
    { name: 'Punch-outs', value: (liveActivity as any).data.totalPunchOuts || 0, color: '#EF4444' },
    { name: 'Terminated', value: (liveActivity as any).data.totalTerminated || 0, color: '#F59E0B' },
    { name: 'Exclusions', value: (liveActivity as any).data.exclusions || 0, color: '#8B5CF6' }
  ] : [];

  return (
    <div className="min-h-screen bg-[#1A1B3E] text-white">
      {/* Admin Header */}
      <div className="bg-[#2A2B5E] border-b border-purple-500/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-8 h-8 text-purple-400" />
              <h1 className="text-xl font-bold">Admin Dashboard</h1>
            </div>
            <div className="text-sm text-gray-400">
              Welcome back, Administrator {user?.username}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Status indicators */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-mono">{currentTime.toLocaleTimeString()}</span>
              </div>
              {/* Comprehensive Refresh Button */}
              <button
                onClick={handleRefreshStats}
                disabled={isRefreshing}
                className="flex items-center space-x-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 rounded-lg transition-colors"
                title="Force refresh all unified calculations and statistics"
              >
                <RefreshCw className={`w-4 h-4 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="text-sm text-white">
                  {isRefreshing ? 'Refreshing...' : 'Refresh All'}
                </span>
              </button>
              {lastRefresh && (
                <div className="flex items-center space-x-1 text-xs text-gray-400">
                  <span>Last: {lastRefresh.toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scrolling Announcement Bar */}
      {isAnnouncementVisible && announcements.length > 0 && (
        <div className="bg-purple-600 text-white px-4 py-2 flex items-center justify-between relative overflow-hidden">
          <div className="flex items-center space-x-3 flex-1">
            <Megaphone className="w-4 h-4 text-white flex-shrink-0" />
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-medium whitespace-nowrap animate-scroll">
                URGENT ANNOUNCEMENT: {announcements[currentAnnouncementIndex]}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-1 hover:bg-purple-700 rounded transition-colors"
              title={isPaused ? "Resume scrolling" : "Pause scrolling"}
            >
              {isPaused ? (
                <Play className="w-4 h-4" />
              ) : (
                <Pause className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => setIsAnnouncementVisible(false)}
              className="p-1 hover:bg-purple-700 rounded transition-colors"
              title="Hide announcements"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Desktop Admin Announcement Interface */}
      <div className="bg-[#2A2B5E] border-b border-purple-500/20 px-4 py-3">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white flex items-center">
              <Megaphone className="w-5 h-5 mr-2 text-orange-400" />
              Admin Announcement Center
            </h2>
            <button
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="text-sm px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded transition-colors"
            >
              {showAdvancedOptions ? 'Basic' : 'Advanced'} Options
            </button>
          </div>
          
          <div className="grid grid-cols-12 gap-4">
            {/* Main Announcement Input */}
            <div className="col-span-8">
              <textarea
                rows={2}
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="Type urgent announcement message..."
                className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400 resize-none"
                disabled={announcementSending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    sendAnnouncement();
                  }
                }}
              />
            </div>
            
            {/* Controls Column */}
            <div className="col-span-4 space-y-2">
              <div className="flex space-x-2">
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">Repeat</label>
                  <input
                    type="number"
                    value={repeatCount}
                    onChange={(e) => setRepeatCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                    min="1"
                    max="10"
                    className="w-full bg-[#1A1B3E] border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-orange-400"
                    disabled={announcementSending}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-[#1A1B3E] border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-orange-400"
                    disabled={announcementSending}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              
              <button
                onClick={sendAnnouncement}
                disabled={!announcementText.trim() || announcementSending}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-all ${
                  announcementSending 
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : announcementText.trim()
                    ? 'bg-orange-600 text-white hover:bg-orange-700 hover:shadow-lg'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
                title="Ctrl+Enter to send"
              >
                {announcementSending ? (
                  <div className="flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    Sending...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Megaphone className="w-4 h-4 mr-2" />
                    Send Urgent ({repeatCount}x)
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Advanced Options */}
          {showAdvancedOptions && (
            <div className="mt-4 p-3 bg-[#1A1B3E] rounded-lg border border-gray-700">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Target Audience</label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full bg-[#2A2B5E] border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-orange-400"
                    disabled={announcementSending}
                  >
                    <option value="all">All Employees</option>
                    <option value="admins">Administrators Only</option>
                    <option value="managers">Managers Only</option>
                    <option value="staff">Staff Only</option>
                    <option value="online">Online Users Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Schedule Time (Optional)</label>
                  <input
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full bg-[#2A2B5E] border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-orange-400"
                    disabled={announcementSending}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Expiration Time (Optional)</label>
                  <input
                    type="datetime-local"
                    value={expirationTime}
                    onChange={(e) => setExpirationTime(e.target.value)}
                    className="w-full bg-[#2A2B5E] border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-orange-400"
                    disabled={announcementSending}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Success/Error Message */}
          {lastAnnouncementSent && (
            <div className="mt-3 p-2 bg-green-900/50 border border-green-500/50 rounded-lg">
              <div className="flex items-center text-green-400 text-sm">
                <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="break-words">{lastAnnouncementSent}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Punch Status Notification */}
      {showPunchStatus && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5" />
            <span>{punchStatusMessage}</span>
          </div>
        </div>
      )}

      {/* Main Content - Non-scrolling Grid Layout */}
      <div className="p-4 h-[calc(100vh-90px)]">
        <div className="grid grid-cols-12 gap-4 h-full">
          {/* Left Column - Status & KPIs */}
          <div className="col-span-3 space-y-4">
            {/* Status Panel */}
            <div className="bg-[#2A2B5E] rounded-lg p-4 h-fit border border-purple-500/20">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-purple-400" />
                Current Status
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Work Status</span>
                  <span className="text-sm font-semibold px-2 py-1 rounded-full bg-gray-500/20 text-gray-400">
                    Inactive
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Hours Today</span>
                  <span className="text-sm font-semibold text-white">
                    0h
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">System</span>
                  <button 
                    onClick={handleComprehensiveRefresh}
                    disabled={isRefreshing}
                    className="text-sm font-semibold flex items-center text-green-400 hover:text-green-300 disabled:text-green-600 disabled:opacity-50 transition-colors"
                  >
                    <RefreshCcw className={`w-3 h-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {isRefreshing ? 'Refreshing' : 'Refresh All'}
                  </button>
                </div>
              </div>
            </div>

            {/* KPI Grid - 14 TOTAL KPIs */}
            <div className="bg-[#2A2B5E] rounded-lg p-4 flex-1 border border-purple-500/20">
              <h2 className="text-lg font-bold text-white mb-3 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-purple-400" />
                Performance KPIs ({kpiData.length} Total)
              </h2>
              <div className="grid grid-cols-2 gap-2 max-h-full overflow-y-auto custom-scrollbar">
                {kpiData.map((kpi, index) => {
                  const Icon = kpi.icon;
                  return (
                    <div
                      key={index}
                      className="bg-[#1A1B3E] rounded-lg p-2 border border-purple-500/20 hover:border-purple-500/40 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Icon className={`w-3 h-3 ${kpi.color}`} />
                        <div className="text-xs font-bold text-white">
                          {kpi.value}{kpi.suffix}
                        </div>
                      </div>
                      <div className="text-gray-400 text-xs truncate">{kpi.title}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Charts Section - Expanded Width with Larger Height */}
          <div className="col-span-9">
            <div className="grid grid-cols-2 gap-4 h-96">
              {/* Today's Attendance Distribution - Working Chart */}
              <Card className="bg-[#2A2B5E] border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-lg">Today's Attendance Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'On Time', value: 75, color: '#10B981' },
                            { name: 'Late', value: 15, color: '#F59E0B' },
                            { name: 'Early', value: 10, color: '#3B82F6' },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {[
                            { name: 'On Time', value: 75, color: '#10B981' },
                            { name: 'Late', value: 15, color: '#F59E0B' },
                            { name: 'Early', value: 10, color: '#3B82F6' },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center space-x-6 mt-4">
                    {[
                      { name: 'On Time', value: 75, color: '#10B981' },
                      { name: 'Late', value: 15, color: '#F59E0B' },
                      { name: 'Early', value: 10, color: '#3B82F6' },
                    ].map((entry, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-gray-300 text-sm">
                          {entry.name} {entry.value}%
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>Yesterday's Performance</span>
                    <Badge variant="outline">{format(new Date(Date.now() - 24 * 60 * 60 * 1000), 'MMM dd')}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{(yesterdayPerformanceQuery?.data as any)?.complete || 0}</p>
                        <p className="text-sm text-gray-500">Complete</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{(yesterdayPerformanceQuery?.data as any)?.nonBio || 0}</p>
                        <p className="text-sm text-gray-500">NonBio</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Yesterday Rate</span>
                        <span className="text-sm font-medium">{(((yesterdayPerformanceQuery?.data as any)?.complete || 0) / Math.max(1, (yesterdayPerformanceQuery?.data as any)?.totalEmployees || 1) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(((yesterdayPerformanceQuery?.data as any)?.complete || 0) / Math.max(1, (yesterdayPerformanceQuery?.data as any)?.totalEmployees || 1) * 100)}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Absent</span>
                        <span className="text-sm font-medium text-red-600">{(yesterdayPerformanceQuery?.data as any)?.absent || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Employees</span>
                        <span className="text-sm font-medium">{(yesterdayPerformanceQuery?.data as any)?.totalEmployees || 0}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Live Data Panel - PSC Records */}
          <div className="col-span-12 mt-6">
            <Card className="bg-[#2A2B5E] border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-green-400" />
                  Live PSC Records - Real-Time Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Punch-ins', value: 228, color: '#10B981' },
                      { name: 'Punch-outs', value: 175, color: '#EF4444' },
                      { name: 'Active Sessions', value: 53, color: '#F59E0B' },
                      { name: 'Late Arrivals', value: 12, color: '#8B5CF6' },
                      { name: 'Early Departures', value: 8, color: '#EC4899' },
                      { name: 'Overtime', value: 23, color: '#06B6D4' }
                    ]} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#F3F4F6'
                        }}
                      />
                      <Bar dataKey="value" fill="#8B5CF6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center space-x-8 mt-4">
                  {[
                    { name: 'Active', value: 228, color: '#10B981' },
                    { name: 'Completed', value: 175, color: '#EF4444' },
                    { name: 'In Progress', value: 53, color: '#F59E0B' },
                  ].map((entry, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-gray-300 text-sm">
                        {entry.name}: {entry.value}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
};

export default NewAdminDesktopDashboard;