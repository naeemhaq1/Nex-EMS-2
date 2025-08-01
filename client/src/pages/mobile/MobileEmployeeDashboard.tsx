
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { 
  Clock, 
  MapPin, 
  Calendar,
  TrendingUp,
  Award,
  AlertCircle,
  CheckCircle,
  XCircle,
  Users,
  BarChart3,
  Settings,
  Bell,
  User,
  Activity,
  Wifi,
  Battery,
  Signal,
  Power,
  PowerOff,
  ChevronRight,
  RefreshCw,
  LogOut,
  Menu,
  X,
  MapPinIcon,
  Navigation,
  Camera,
  Smartphone,
  Globe,
  Target
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface EmployeeData {
  id: number;
  firstName: string;
  lastName: string;
  designation: string;
  department: string;
  employeeId: string;
  profileImage?: string;
  shiftTiming?: {
    start: string;
    end: string;
  };
}

interface AttendanceMetrics {
  todayStatus: 'present' | 'absent' | 'late';
  todayHours: number;
  weeklyHours: number;
  monthlyHours: number;
  attendanceRate: number;
  currentStreak: number;
  totalWorkDays: number;
  lateArrivals: number;
  earlyDepartures: number;
  overtime: number;
  lastPunchTime?: string;
  lastPunchType?: 'in' | 'out';
  currentLocation?: string;
  isPunchedIn: boolean;
}

interface PunchStatus {
  isPunchedIn: boolean;
  lastPunchTime?: string;
  lastPunchType?: 'in' | 'out';
  canPunchIn: boolean;
  canPunchOut: boolean;
  workingHours: number;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

interface Announcement {
  id: number;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  isRead: boolean;
}

export default function MobileEmployeeDashboard() {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();
  
  // Check if accessed from admin route by checking if user is admin/superadmin and current route
  const isFromAdmin = (user?.role === 'admin' || user?.role === 'superadmin') && location === '/mobile/employee/dashboard';
  
  // State variables
  const [hasLocation, setHasLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationSuccess, setLocationSuccess] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [kpiPanelsOrder, setKpiPanelsOrder] = useState([0, 1, 2, 3]);
  const [currentChartIndex, setCurrentChartIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPunch, setIsLoadingPunch] = useState(false);
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [punchInTime, setPunchInTime] = useState<Date | null>(null);
  const [punchOutTime, setPunchOutTime] = useState<Date | null>(null);
  const [shiftStartTime, setShiftStartTime] = useState<Date | null>(null);
  const [punchStatus, setPunchStatus] = useState<any>(null);
  const [userStatus, setUserStatus] = useState('Active');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('online');
  const [showSidebar, setShowSidebar] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [signalStrength, setSignalStrength] = useState(4);

  const queryClient = useQueryClient();

  // Fetch employee data
  const { data: employeeData, isLoading: isLoadingEmployee } = useQuery({
    queryKey: ['/api/employees/me'],
    queryFn: async () => {
      const response = await fetch('/api/employees/me', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch employee data');
      return response.json();
    },
    refetchInterval: 30000,
    retry: 2
  });

  // Fetch punch status
  const { data: punchStatusData, isLoading: isLoadingPunchStatus } = useQuery({
    queryKey: ['/api/mobile-attendance/punch-status'],
    queryFn: async () => {
      const response = await fetch('/api/mobile-attendance/punch-status', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch punch status');
      return response.json();
    },
    refetchInterval: 15000,
    retry: 2
  });

  // Fetch employee metrics
  const { data: metrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ['/api/employees/me/metrics'],
    queryFn: async () => {
      const response = await fetch('/api/employees/me/metrics', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch metrics');
      return response.json();
    },
    refetchInterval: 60000,
    retry: 2
  });

  // Fetch announcements
  const { data: announcements, isLoading: isLoadingAnnouncements } = useQuery({
    queryKey: ['/api/announcements/employee'],
    queryFn: async () => {
      const response = await fetch('/api/announcements/employee', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch announcements');
      return response.json();
    },
    refetchInterval: 300000, // 5 minutes
    retry: 2
  });

  // Punch In/Out mutation
  const punchMutation = useMutation({
    mutationFn: async ({ type, location }: { type: 'in' | 'out', location?: any }) => {
      const response = await fetch('/api/mobile-attendance/punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type, location })
      });
      if (!response.ok) throw new Error('Punch failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mobile-attendance/punch-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/employees/me/metrics'] });
    }
  });

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Monitor connection status
  useEffect(() => {
    const updateConnectionStatus = () => {
      const status = navigator.onLine ? 'online' : 'offline';
      setConnectionStatus(status);
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
    
    return () => {
      window.removeEventListener('online', updateConnectionStatus);
      window.removeEventListener('offline', updateConnectionStatus);
    };
  }, []);

  // Get device info
  useEffect(() => {
    // Battery API (if available)
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
      });
    }

    // Signal strength simulation
    setSignalStrength(Math.floor(Math.random() * 2) + 3); // 3-4 bars
  }, []);

  // Location permission and tracking
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setHasLocation(true);
          setLocationSuccess(true);
          setLocationError(null);
        },
        (error) => {
          setHasLocation(false);
          setLocationError(error.message);
          setLocationSuccess(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  }, []);

  // Update punch status from query data
  useEffect(() => {
    if (punchStatusData) {
      setIsPunchedIn(punchStatusData.isPunchedIn);
      setPunchStatus(punchStatusData);
      if (punchStatusData.lastPunchTime) {
        if (punchStatusData.lastPunchType === 'in') {
          setPunchInTime(new Date(punchStatusData.lastPunchTime));
        } else {
          setPunchOutTime(new Date(punchStatusData.lastPunchTime));
        }
      }
    }
  }, [punchStatusData]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'text-green-400';
      case 'late': return 'text-yellow-400';
      case 'absent': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return CheckCircle;
      case 'late': return Clock;
      case 'absent': return XCircle;
      default: return AlertCircle;
    }
  };

  const handlePunch = async (type: 'in' | 'out') => {
    if (!hasLocation) {
      setLocationError('Location permission required for attendance');
      return;
    }

    setIsLoadingPunch(true);
    try {
      await punchMutation.mutateAsync({ type });
    } catch (error) {
      console.error('Punch error:', error);
    } finally {
      setIsLoadingPunch(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigateToPage = (path: string) => {
    setShowSidebar(false);
    navigate(path);
  };

  const quickActions = [
    {
      id: 'punch',
      title: isPunchedIn ? 'Punch Out' : 'Punch In',
      icon: isPunchedIn ? PowerOff : Power,
      color: isPunchedIn ? 'bg-red-500' : 'bg-green-500',
      action: () => handlePunch(isPunchedIn ? 'out' : 'in'),
      description: isPunchedIn ? 'End your work session' : 'Start your work session'
    },
    {
      id: 'attendance',
      title: 'My Attendance',
      icon: Calendar,
      color: 'bg-blue-500',
      action: () => navigateToPage('/mobile/attendance'),
      description: 'View attendance history'
    },
    {
      id: 'analytics',
      title: 'Performance',
      icon: BarChart3,
      color: 'bg-purple-500',
      action: () => navigateToPage('/mobile/analytics'),
      description: 'View your analytics'
    },
    {
      id: 'leaderboard',
      title: 'Leaderboard',
      icon: Award,
      color: 'bg-orange-500',
      action: () => navigateToPage('/mobile/leaderboard'),
      description: 'Team rankings'
    },
    {
      id: 'profile',
      title: 'My Profile',
      icon: User,
      color: 'bg-indigo-500',
      action: () => navigateToPage('/mobile/profile'),
      description: 'Update profile info'
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: Settings,
      color: 'bg-gray-500',
      action: () => navigateToPage('/mobile/settings'),
      description: 'App preferences'
    }
  ];

  if (isLoadingEmployee || isLoadingMetrics) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1B3E] text-white relative">
      {/* Mobile Sidebar */}
      {showSidebar && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowSidebar(false)} />
          <div className="fixed left-0 top-0 h-full w-80 bg-[#2A2B5E] p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-white">Menu</h2>
              <button onClick={() => setShowSidebar(false)}>
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            
            <div className="space-y-4">
              <button 
                onClick={() => navigateToPage('/mobile/dashboard')}
                className="w-full flex items-center space-x-3 p-3 bg-blue-600 rounded-lg"
              >
                <User className="w-5 h-5" />
                <span>Dashboard</span>
              </button>
              
              <button 
                onClick={() => navigateToPage('/mobile/attendance')}
                className="w-full flex items-center space-x-3 p-3 hover:bg-gray-700 rounded-lg"
              >
                <Calendar className="w-5 h-5" />
                <span>Attendance</span>
              </button>
              
              <button 
                onClick={() => navigateToPage('/mobile/analytics')}
                className="w-full flex items-center space-x-3 p-3 hover:bg-gray-700 rounded-lg"
              >
                <BarChart3 className="w-5 h-5" />
                <span>Analytics</span>
              </button>
              
              <button 
                onClick={() => navigateToPage('/mobile/settings')}
                className="w-full flex items-center space-x-3 p-3 hover:bg-gray-700 rounded-lg"
              >
                <Settings className="w-5 h-5" />
                <span>Settings</span>
              </button>
              
              {isFromAdmin && (
                <button 
                  onClick={() => navigate('/admin/dashboard')}
                  className="w-full flex items-center space-x-3 p-3 hover:bg-gray-700 rounded-lg"
                >
                  <Users className="w-5 h-5" />
                  <span>Back to Admin</span>
                </button>
              )}
              
              <button 
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 p-3 hover:bg-red-600 rounded-lg text-red-400"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-[#2A2B5E] p-4 border-b border-[#3A3B6E]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setShowSidebar(true)}
              className="lg:hidden"
            >
              <Menu className="w-6 h-6 text-gray-400" />
            </button>
            
            <div>
              <h1 className="text-xl font-bold text-white">
                Welcome, {user?.firstName || employeeData?.firstName || 'Employee'}
              </h1>
              <p className="text-gray-400 text-sm">
                {user?.designation || employeeData?.designation || 'Employee'}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-lg font-semibold text-blue-400">{formatTime(currentTime)}</div>
            <div className="text-xs text-gray-400">{formatDate(currentTime)}</div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${connectionStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-300">
              {connectionStatus === 'online' ? 'Connected' : 'Offline Mode'}
            </span>
            {hasLocation && (
              <div className="flex items-center space-x-1">
                <MapPin className="w-3 h-3 text-green-500" />
                <span className="text-xs text-green-400">GPS</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex">
              {[...Array(signalStrength)].map((_, i) => (
                <div key={i} className="w-1 h-3 bg-green-500 mr-px" style={{ height: `${(i + 1) * 3}px` }} />
              ))}
            </div>
            <Wifi className={`w-4 h-4 ${connectionStatus === 'online' ? 'text-green-500' : 'text-red-500'}`} />
            <div className="flex items-center space-x-1">
              <Battery className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-300">{batteryLevel}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Location Warning */}
      {locationError && (
        <div className="bg-yellow-600/20 border-l-4 border-yellow-500 p-3 mx-4 mt-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
            <span className="text-sm text-yellow-200">Location access required for attendance tracking</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-4 pb-24">
        {/* Today's Status Card */}
        <div className="bg-[#2A2B5E] rounded-xl p-4 border border-[#3A3B6E] mb-6 shadow-lg">
          <h2 className="text-lg font-semibold mb-3 text-gray-200">Today's Status</h2>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {(() => {
                const StatusIcon = getStatusIcon(metrics?.todayStatus || 'absent');
                return <StatusIcon className={`w-10 h-10 ${getStatusColor(metrics?.todayStatus || 'absent')}`} />;
              })()}
              <div>
                <div className={`text-2xl font-bold ${getStatusColor(metrics?.todayStatus || 'absent')}`}>
                  {metrics?.todayStatus?.toUpperCase() || 'UNKNOWN'}
                </div>
                <div className="text-sm text-gray-400">
                  {isPunchedIn ? 'Currently Working' : 'Not Punched In'}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-3xl font-bold text-white">
                {punchStatus?.workingHours?.toFixed(1) || metrics?.todayHours?.toFixed(1) || '0.0'}h
              </div>
              <div className="text-xs text-gray-400">Today</div>
            </div>
          </div>

          {/* Punch Button */}
          <button
            onClick={() => handlePunch(isPunchedIn ? 'out' : 'in')}
            disabled={isLoadingPunch || !hasLocation}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200 ${
              isPunchedIn 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            } ${isLoadingPunch ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
          >
            {isLoadingPunch ? (
              <div className="flex items-center justify-center space-x-2">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                {isPunchedIn ? <PowerOff className="w-6 h-6" /> : <Power className="w-6 h-6" />}
                <span>{isPunchedIn ? 'Punch Out' : 'Punch In'}</span>
              </div>
            )}
          </button>

          {/* Last Punch Info */}
          {punchStatus?.lastPunchTime && (
            <div className="mt-3 pt-3 border-t border-[#3A3B6E]">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">
                  Last {punchStatus.lastPunchType}: {new Date(punchStatus.lastPunchTime).toLocaleTimeString()}
                </span>
                {metrics?.currentLocation && (
                  <span className="text-blue-400 flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    Office
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-[#2A2B5E] rounded-xl p-4 border border-[#3A3B6E] shadow-lg">
            <div className="flex items-center justify-between">
              <Calendar className="w-8 h-8 text-blue-400" />
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{metrics?.weeklyHours?.toFixed(1) || '0.0'}h</div>
                <div className="text-xs text-gray-400">This Week</div>
              </div>
            </div>
          </div>

          <div className="bg-[#2A2B5E] rounded-xl p-4 border border-[#3A3B6E] shadow-lg">
            <div className="flex items-center justify-between">
              <TrendingUp className="w-8 h-8 text-green-400" />
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{metrics?.attendanceRate?.toFixed(1) || '0.0'}%</div>
                <div className="text-xs text-gray-400">Attendance</div>
              </div>
            </div>
          </div>

          <div className="bg-[#2A2B5E] rounded-xl p-4 border border-[#3A3B6E] shadow-lg">
            <div className="flex items-center justify-between">
              <Award className="w-8 h-8 text-purple-400" />
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{metrics?.currentStreak || 0}</div>
                <div className="text-xs text-gray-400">Day Streak</div>
              </div>
            </div>
          </div>

          <div className="bg-[#2A2B5E] rounded-xl p-4 border border-[#3A3B6E] shadow-lg">
            <div className="flex items-center justify-between">
              <Activity className="w-8 h-8 text-orange-400" />
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{metrics?.monthlyHours?.toFixed(1) || '0.0'}h</div>
                <div className="text-xs text-gray-400">This Month</div>
              </div>
            </div>
          </div>
        </div>

        {/* Announcements */}
        {announcements && announcements.length > 0 && (
          <div className="bg-[#2A2B5E] rounded-xl p-4 border border-[#3A3B6E] mb-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-3 text-gray-200">Latest Announcements</h3>
            <div className="space-y-3">
              {announcements.slice(0, 2).map((announcement: Announcement) => (
                <div key={announcement.id} className="bg-[#1A1B3E] rounded-lg p-3 border border-[#3A3B6E]">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-white mb-1">{announcement.title}</h4>
                      <p className="text-sm text-gray-400 line-clamp-2">{announcement.message}</p>
                    </div>
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ml-2 ${
                      announcement.priority === 'high' ? 'bg-red-500' : 
                      announcement.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions Grid */}
        <h2 className="text-lg font-semibold mb-4 text-gray-200">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={action.action}
                disabled={action.id === 'punch' && isLoadingPunch}
                className="bg-[#2A2B5E] rounded-xl p-4 border border-[#3A3B6E] hover:border-blue-400 
                          transition-all duration-200 active:scale-95 text-left shadow-lg
                          disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{action.title}</h3>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">{action.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/10">
        <div className="flex items-center justify-around py-3 px-4">
          <button 
            onClick={() => navigate('/mobile/dashboard')}
            className="flex flex-col items-center py-2 px-3 transition-all duration-200 active:scale-95"
          >
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-500">
              <User className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] text-white mt-1 font-medium">Dashboard</span>
          </button>
          
          <button 
            onClick={() => navigate('/mobile/attendance')}
            className="flex flex-col items-center py-2 px-3 transition-all duration-200 active:scale-95"
          >
            <div className="w-8 h-8 flex items-center justify-center rounded-full">
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>
            <span className="text-[10px] text-gray-400 mt-1 font-medium">Attendance</span>
          </button>
          
          <button 
            onClick={() => navigate('/mobile/analytics')}
            className="flex flex-col items-center py-2 px-3 transition-all duration-200 active:scale-95"
          >
            <div className="w-8 h-8 flex items-center justify-center rounded-full">
              <BarChart3 className="w-5 h-5 text-gray-400" />
            </div>
            <span className="text-[10px] text-gray-400 mt-1 font-medium">Analytics</span>
          </button>
          
          <button 
            onClick={() => navigate('/mobile/settings')}
            className="flex flex-col items-center py-2 px-3 transition-all duration-200 active:scale-95"
          >
            <div className="w-8 h-8 flex items-center justify-center rounded-full">
              <Settings className="w-5 h-5 text-gray-400" />
            </div>
            <span className="text-[10px] text-gray-400 mt-1 font-medium">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
