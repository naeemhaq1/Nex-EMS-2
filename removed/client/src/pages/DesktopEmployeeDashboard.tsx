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
  Wifi,
  WifiOff,
  Megaphone,
  Play,
  Pause,
  X
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line } from 'recharts';
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

interface KPIData {
  hoursToday: number;
  attendanceRate: number;
  hoursWeek: number;
  performanceScore: number;
  currentStreak: number;
  monthlyRank: number;
  missedPunches: number;
  overtime: number;
  productivity: number;
  weeklyTotal: number;
  weeklyOvertime: number;
  efficiency: number;
  qualityScore: number;
  taskCompletion: number;
}

const DesktopEmployeeDashboard: React.FC = () => {
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
  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(true);

  // Query for employee data
  const { data: employeeData } = useQuery<EmployeeData>({
    queryKey: ['/api/employees/me'],
    enabled: !!user,
  });

  // Query for punch status
  const { data: punchStatusData, refetch: refetchPunchStatus } = useQuery<PunchStatusData>({
    queryKey: ['/api/mobile-attendance/punch-status'],
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Query for employee KPI metrics
  const { data: kpiApiData, isLoading: isLoadingKPIs, refetch: refetchKPIs } = useQuery<KPIData>({
    queryKey: ['/api/employees/me/metrics'],
    enabled: !!user,
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000 // Consider data stale after 30 seconds
  });

  // Query for urgent announcements - RED TEXT SCROLLER DISPLAY
  const { data: urgentAnnouncements, isLoading: isLoadingAnnouncements } = useQuery({
    queryKey: ['/api/announcements/employee'],
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds for urgent updates
    staleTime: 10000 // Consider data stale after 10 seconds for urgent announcements
  });

  // Dynamic announcements - prioritize urgent announcements with red text
  const announcements = (() => {
    if (urgentAnnouncements && Array.isArray(urgentAnnouncements) && urgentAnnouncements.length > 0) {
      // Show urgent announcements as red text
      return urgentAnnouncements.map((announcement: any) => announcement.message);
    } else {
      // Fallback to standard messages only if no urgent announcements
      return [
        "📢 New office hours: 9:00 AM - 5:00 PM effective immediately",
        "🎉 Employee appreciation event scheduled for next Friday",
        "⚠️ Server maintenance window: Sunday 2:00 AM - 4:00 AM",
        "💡 Remember to submit your monthly reports by end of day",
        "🏆 Q3 performance reviews are now available in the system"
      ];
    }
  })();

  // Check if current announcement is urgent
  const isCurrentAnnouncementUrgent = urgentAnnouncements && Array.isArray(urgentAnnouncements) && urgentAnnouncements.length > 0;

  const isPunchedIn = punchStatusData?.isPunchedIn || false;
  const punchInTime = punchStatusData?.punchInTime ? new Date(punchStatusData.punchInTime) : null;

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
          async (position) => {
            const coords = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy
            };
            
            // Reverse geocoding to get city/area information
            try {
              const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
              );
              const data = await response.json();
              
              let address = `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
              let city = '';
              let area = '';
              
              if (data.results && data.results.length > 0) {
                const result = data.results[0];
                address = result.formatted_address;
                
                // Extract city and area from address components
                const components = result.address_components;
                components.forEach((component: any) => {
                  if (component.types.includes('locality')) {
                    city = component.long_name;
                  }
                  if (component.types.includes('sublocality') || component.types.includes('neighborhood')) {
                    area = component.long_name;
                  }
                });
              }
              
              setCurrentLocation({
                ...coords,
                address,
                city: city || 'Unknown City',
                area: area || 'Unknown Area'
              });
            } catch (error) {
              console.error('Geocoding error:', error);
              setCurrentLocation({
                ...coords,
                address: `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`,
                city: 'Unknown City',
                area: 'Unknown Area'
              });
            }
            
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

  const handlePunchIn = async () => {
    if (!hasLocation || !isOnline) {
      setPunchStatusMessage(
        !hasLocation ? 'Location required for punch-in' : 'Internet connection required'
      );
      setShowPunchStatus(true);
      setTimeout(() => setShowPunchStatus(false), 3000);
      return;
    }

    setIsLoadingPunch(true);
    try {
      const response = await apiRequest({
        url: '/api/mobile-attendance/punch-in',
        method: 'POST',
        data: {
          location: currentLocation,
          source: 'desktop'
        }
      });
      
      setPunchStatusMessage('Punch In successful!');
      setShowPunchStatus(true);
      setTimeout(() => setShowPunchStatus(false), 3000);
      refetchPunchStatus();
    } catch (error: any) {
      console.error('Punch in error:', error);
      setPunchStatusMessage(
        error?.response?.data?.message || 'Punch in failed. Please try again.'
      );
      setShowPunchStatus(true);
      setTimeout(() => setShowPunchStatus(false), 3000);
    } finally {
      setIsLoadingPunch(false);
    }
  };

  const handlePunchOut = async () => {
    if (!hasLocation || !isOnline) {
      setPunchStatusMessage(
        !hasLocation ? 'Location required for punch-out' : 'Internet connection required'
      );
      setShowPunchStatus(true);
      setTimeout(() => setShowPunchStatus(false), 3000);
      return;
    }

    setIsLoadingPunch(true);
    try {
      const response = await apiRequest({
        url: '/api/mobile-attendance/punch-out',
        method: 'POST',
        data: {
          location: currentLocation,
          source: 'desktop'
        }
      });
      
      setPunchStatusMessage('Punch Out successful!');
      setShowPunchStatus(true);
      setTimeout(() => setShowPunchStatus(false), 3000);
      refetchPunchStatus();
    } catch (error: any) {
      console.error('Punch out error:', error);
      setPunchStatusMessage(
        error?.response?.data?.message || 'Punch out failed. Please try again.'
      );
      setShowPunchStatus(true);
      setTimeout(() => setShowPunchStatus(false), 3000);
    } finally {
      setIsLoadingPunch(false);
    }
  };

  // Real KPI data from API with fallback values
  const kpiData = [
    { title: 'Hours Today', value: isLoadingKPIs ? '...' : (kpiApiData?.hoursToday || punchStatusData?.hoursWorkedToday || 0), suffix: 'h', icon: Timer, color: 'text-blue-400' },
    { title: 'Attendance Rate', value: isLoadingKPIs ? '...' : (kpiApiData?.attendanceRate || 0), suffix: '%', icon: Trophy, color: 'text-green-400' },
    { title: 'Weekly Hours', value: isLoadingKPIs ? '...' : (kpiApiData?.hoursWeek || 0), suffix: 'h', icon: BarChart3, color: 'text-indigo-400' },
    { title: 'Performance Score', value: isLoadingKPIs ? '...' : (kpiApiData?.performanceScore || 0), suffix: '%', icon: Award, color: 'text-emerald-400' },
    { title: 'Current Streak', value: isLoadingKPIs ? '...' : (kpiApiData?.currentStreak || 0), suffix: 'd', icon: Activity, color: 'text-lime-400' },
    { title: 'Monthly Rank', value: isLoadingKPIs ? '...' : `#${kpiApiData?.monthlyRank || 0}`, suffix: '', icon: Target, color: 'text-yellow-400' },
    { title: 'Missed Punches', value: isLoadingKPIs ? '...' : (kpiApiData?.missedPunches || 0), suffix: '', icon: CheckCircle, color: 'text-cyan-400' },
    { title: 'Overtime', value: isLoadingKPIs ? '...' : (kpiApiData?.overtime || 0), suffix: 'h', icon: Clock, color: 'text-orange-400' },
    { title: 'Productivity', value: isLoadingKPIs ? '...' : (kpiApiData?.productivity || 0), suffix: '%', icon: TrendingUp, color: 'text-violet-400' },
    { title: 'Weekly Total', value: isLoadingKPIs ? '...' : (kpiApiData?.weeklyTotal || 0), suffix: 'h', icon: Users, color: 'text-pink-400' },
    { title: 'Weekly Overtime', value: isLoadingKPIs ? '...' : (kpiApiData?.weeklyOvertime || 0), suffix: 'h', icon: Zap, color: 'text-rose-400' },
    { title: 'Efficiency', value: isLoadingKPIs ? '...' : (kpiApiData?.efficiency || 0), suffix: '%', icon: TrendingUp, color: 'text-purple-400' },
    { title: 'Quality Score', value: isLoadingKPIs ? '...' : (kpiApiData?.qualityScore || 0), suffix: '%', icon: Globe, color: 'text-teal-400' },
    { title: 'Task Completion', value: isLoadingKPIs ? '...' : (kpiApiData?.taskCompletion || 0), suffix: '%', icon: RefreshCw, color: 'text-amber-400' },
  ];

  const punctualityData = [
    { name: 'On Time', value: 75, color: '#10B981' },
    { name: 'Grace Period', value: 20, color: '#F59E0B' },
    { name: 'Late', value: 5, color: '#EF4444' },
  ];

  const weeklyHours = [
    { day: 'Mon', hours: 8.5 },
    { day: 'Tue', hours: 8.0 },
    { day: 'Wed', hours: 9.0 },
    { day: 'Thu', hours: 8.5 },
    { day: 'Fri', hours: 8.0 },
    { day: 'Sat', hours: 4.0 },
    { day: 'Sun', hours: 0 },
  ];

  const performanceData = [
    { week: 'W1', punctuality: 85, consistency: 78, efficiency: 92 },
    { week: 'W2', punctuality: 88, consistency: 82, efficiency: 89 },
    { week: 'W3', punctuality: 92, consistency: 85, efficiency: 95 },
    { week: 'W4', punctuality: 90, consistency: 88, efficiency: 93 },
  ];

  return (
    <div className="min-h-screen bg-[#1A1B3E] text-white">
      {/* Header */}
      <div className="bg-[#2A2B5E] border-b border-purple-500/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-8 h-8 text-purple-400" />
              <h1 className="text-xl font-bold">Employee Dashboard</h1>
            </div>
            <div className="text-sm text-gray-400">
              Welcome back, {employeeData?.firstName} {employeeData?.lastName}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Punch Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePunchIn}
                disabled={isLoadingPunch || !isOnline || !hasLocation || isPunchedIn}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                  isPunchedIn || !isOnline || !hasLocation
                    ? 'bg-gray-600 cursor-not-allowed opacity-60'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isLoadingPunch ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                <span>IN</span>
              </button>

              <button
                onClick={handlePunchOut}
                disabled={isLoadingPunch || !isOnline || !hasLocation || !isPunchedIn}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                  !isPunchedIn || !isOnline || !hasLocation
                    ? 'bg-gray-600 cursor-not-allowed opacity-60'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isLoadingPunch ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
                <span>OUT</span>
              </button>
            </div>

            {/* Status indicators */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-mono">{currentTime.toLocaleTimeString()}</span>
              </div>
              <div className="flex items-center space-x-2">
                {isOnline ? (
                  <>
                    <Wifi className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-400">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-red-400">Offline</span>
                  </>
                )}
              </div>
              {hasLocation && (
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-400">GPS</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Announcement Bar */}
      {isAnnouncementVisible && announcements.length > 0 && (
        <div className={`${isCurrentAnnouncementUrgent ? 'bg-red-600' : 'bg-purple-600'} text-white px-4 py-2 flex items-center justify-between`}>
          <div className="flex items-center space-x-3 flex-1">
            <Megaphone className={`w-4 h-4 ${isCurrentAnnouncementUrgent ? 'text-red-200 animate-pulse' : 'text-white'} flex-shrink-0`} />
            <div className="flex-1 overflow-hidden">
              <div className={`text-sm font-medium truncate ${isCurrentAnnouncementUrgent ? 'text-red-100 font-bold' : ''}`}>
                {announcements[currentAnnouncementIndex]}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-1 hover:bg-purple-700 rounded transition-colors"
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
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
                  <span className={`text-sm font-semibold px-2 py-1 rounded-full ${isPunchedIn ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {isPunchedIn ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Hours Today</span>
                  <span className="text-sm font-semibold text-white">
                    {punchStatusData?.hoursWorkedToday || 0}h
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Connection</span>
                  <span className={`text-sm font-semibold flex items-center ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
                    {isOnline ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Location</span>
                  <span className={`text-sm font-semibold flex items-center ${hasLocation ? 'text-green-400' : 'text-red-400'}`}>
                    <MapPin className="w-3 h-3 mr-1" />
                    {hasLocation ? 'Ready' : 'Disabled'}
                  </span>
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

          {/* Center Column - Charts */}
          <div className="col-span-6 space-y-4">
            {/* Punctuality Chart */}
            <div className="bg-[#2A2B5E] rounded-lg p-4 h-1/2 border border-purple-500/20">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-purple-400" />
                Punctuality Breakdown
              </h3>
              <div className="h-full">
                <ResponsiveContainer width="100%" height="85%">
                  <PieChart>
                    <Pie
                      data={punctualityData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {punctualityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1A1B3E', 
                        border: '1px solid #7C3AED',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center space-x-6">
                  {punctualityData.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-gray-400">{item.name} {item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Weekly Hours Chart */}
            <div className="bg-[#2A2B5E] rounded-lg p-4 h-1/2">
              <h3 className="text-lg font-bold text-white mb-3">Weekly Hours</h3>
              <div className="h-full">
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={weeklyHours}>
                    <XAxis 
                      dataKey="day" 
                      stroke="#9CA3AF"
                      fontSize={12}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#9CA3AF"
                      fontSize={12}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1A1B3E', 
                        border: '1px solid #7C3AED',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                    />
                    <Bar dataKey="hours" fill="#7C3AED" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right Column - Performance Trends */}
          <div className="col-span-3 space-y-4">
            {/* Performance Trends Chart */}
            <div className="bg-[#2A2B5E] rounded-lg p-4 h-1/2 border border-purple-500/20">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-purple-400" />
                Performance Trends
              </h3>
              <div className="h-full">
                <ResponsiveContainer width="100%" height="75%">
                  <LineChart 
                    data={performanceData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 5,
                      bottom: 5,
                    }}
                  >
                    <XAxis 
                      dataKey="week" 
                      stroke="#9CA3AF"
                      fontSize={10}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#9CA3AF"
                      fontSize={10}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1A1B3E', 
                        border: '1px solid #7C3AED',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="punctuality" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="consistency" 
                      stroke="#F59E0B" 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="efficiency" 
                      stroke="#EF4444" 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                
                {/* Legend - positioned below chart */}
                <div className="flex justify-center space-x-2 mt-1">
                  <div className="flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-xs text-gray-400 text-[10px]">Punctuality</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                    <span className="text-xs text-gray-400 text-[10px]">Consistency</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span className="text-xs text-gray-400 text-[10px]">Efficiency</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Content Panel */}
            <div className="bg-[#2A2B5E] rounded-lg p-4 h-1/2 border border-purple-500/20">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-purple-400" />
                Today's Activity
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">First Punch In</span>
                  <span className="text-sm font-semibold text-white">
                    {punchInTime ? punchInTime.toLocaleTimeString() : '--:--'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Status</span>
                  <span className={`text-sm font-semibold ${isPunchedIn ? 'text-green-400' : 'text-gray-400'}`}>
                    {isPunchedIn ? 'Working' : 'Not Working'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Break Time</span>
                  <span className="text-sm font-semibold text-white">45 min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Remaining Hours</span>
                  <span className="text-sm font-semibold text-white">
                    {8 - (punchStatusData?.hoursWorkedToday || 0)}h
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Tasks Completed</span>
                  <span className="text-sm font-semibold text-green-400">3/4</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Performance Today</span>
                  <span className="text-sm font-semibold text-purple-400">Excellent</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesktopEmployeeDashboard;