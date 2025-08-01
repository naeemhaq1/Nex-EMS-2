
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Signal
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface EmployeeMetrics {
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
  currentLocation?: string;
  shiftTiming?: {
    start: string;
    end: string;
  };
}

interface QuickAction {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  color: string;
  route: string;
  description: string;
}

export default function MobileEmployeeDashboard() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [connectionStatus, setConnectionStatus] = useState('online');

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Monitor connection status
  useEffect(() => {
    const updateConnectionStatus = () => {
      setConnectionStatus(navigator.onLine ? 'online' : 'offline');
    };

    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
    
    return () => {
      window.removeEventListener('online', updateConnectionStatus);
      window.removeEventListener('offline', updateConnectionStatus);
    };
  }, []);

  // Fetch employee dashboard metrics
  const { data: metrics, isLoading, error } = useQuery<EmployeeMetrics>({
    queryKey: ['/api/employee/dashboard-metrics'],
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 2,
    onError: (error: any) => {
      console.error('Dashboard metrics error:', error);
    }
  });

  const quickActions: QuickAction[] = [
    {
      id: 'punch',
      title: 'Punch In/Out',
      icon: Clock,
      color: 'bg-blue-500',
      route: '/mobile/punch',
      description: 'Record your attendance'
    },
    {
      id: 'attendance',
      title: 'My Attendance',
      icon: Calendar,
      color: 'bg-green-500',
      route: '/mobile/attendance',
      description: 'View attendance history'
    },
    {
      id: 'analytics',
      title: 'Performance',
      icon: BarChart3,
      color: 'bg-purple-500',
      route: '/mobile/analytics',
      description: 'View your analytics'
    },
    {
      id: 'leaderboard',
      title: 'Leaderboard',
      icon: Award,
      color: 'bg-orange-500',
      route: '/mobile/leaderboard',
      description: 'Team rankings'
    },
    {
      id: 'schedule',
      title: 'My Schedule',
      icon: Calendar,
      color: 'bg-teal-500',
      route: '/mobile/schedule',
      description: 'View work schedule'
    },
    {
      id: 'profile',
      title: 'My Profile',
      icon: User,
      color: 'bg-indigo-500',
      route: '/mobile/profile',
      description: 'Update profile info'
    },
    {
      id: 'requests',
      title: 'Leave Requests',
      icon: Bell,
      color: 'bg-yellow-500',
      route: '/mobile/requests',
      description: 'Apply for leave'
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: Settings,
      color: 'bg-gray-500',
      route: '/mobile/settings',
      description: 'App preferences'
    }
  ];

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

  if (isLoading) {
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
    <div className="min-h-screen bg-[#1A1B3E] text-white">
      {/* Header */}
      <div className="bg-[#2A2B5E] p-4 border-b border-[#3A3B6E]">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold text-white">Welcome, {user?.firstName || 'Employee'}</h1>
            <p className="text-gray-400 text-sm">{user?.designation || 'Employee'}</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-blue-400">{formatTime(currentTime)}</div>
            <div className="text-xs text-gray-400">{formatDate(currentTime)}</div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${connectionStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-300">
              {connectionStatus === 'online' ? 'Connected' : 'Offline Mode'}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Wifi className={`w-4 h-4 ${connectionStatus === 'online' ? 'text-green-500' : 'text-red-500'}`} />
            <Signal className="w-4 h-4 text-green-500" />
            <Battery className="w-4 h-4 text-green-500" />
          </div>
        </div>
      </div>

      {/* Today's Status Card */}
      <div className="p-4">
        <div className="bg-[#2A2B5E] rounded-lg p-4 border border-[#3A3B6E] mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-200">Today's Status</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {(() => {
                const StatusIcon = getStatusIcon(metrics?.todayStatus || 'absent');
                return <StatusIcon className={`w-8 h-8 ${getStatusColor(metrics?.todayStatus || 'absent')}`} />;
              })()}
              <div>
                <div className={`text-xl font-bold ${getStatusColor(metrics?.todayStatus || 'absent')}`}>
                  {metrics?.todayStatus?.toUpperCase() || 'UNKNOWN'}
                </div>
                <div className="text-sm text-gray-400">
                  {metrics?.lastPunchTime ? `Last punch: ${metrics.lastPunchTime}` : 'No punches today'}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{metrics?.todayHours?.toFixed(1) || '0.0'}h</div>
              <div className="text-xs text-gray-400">Today</div>
            </div>
          </div>

          {metrics?.shiftTiming && (
            <div className="mt-3 pt-3 border-t border-[#3A3B6E]">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Shift: {metrics.shiftTiming.start} - {metrics.shiftTiming.end}</span>
                {metrics.currentLocation && (
                  <span className="text-blue-400 flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    {metrics.currentLocation}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-[#2A2B5E] rounded-lg p-3 border border-[#3A3B6E]">
            <div className="flex items-center justify-between">
              <Calendar className="w-6 h-6 text-blue-400" />
              <div className="text-right">
                <div className="text-xl font-bold text-white">{metrics?.weeklyHours?.toFixed(1) || '0.0'}h</div>
                <div className="text-xs text-gray-400">This Week</div>
              </div>
            </div>
          </div>

          <div className="bg-[#2A2B5E] rounded-lg p-3 border border-[#3A3B6E]">
            <div className="flex items-center justify-between">
              <TrendingUp className="w-6 h-6 text-green-400" />
              <div className="text-right">
                <div className="text-xl font-bold text-white">{metrics?.attendanceRate?.toFixed(1) || '0.0'}%</div>
                <div className="text-xs text-gray-400">Attendance</div>
              </div>
            </div>
          </div>

          <div className="bg-[#2A2B5E] rounded-lg p-3 border border-[#3A3B6E]">
            <div className="flex items-center justify-between">
              <Award className="w-6 h-6 text-purple-400" />
              <div className="text-right">
                <div className="text-xl font-bold text-white">{metrics?.currentStreak || 0}</div>
                <div className="text-xs text-gray-400">Day Streak</div>
              </div>
            </div>
          </div>

          <div className="bg-[#2A2B5E] rounded-lg p-3 border border-[#3A3B6E]">
            <div className="flex items-center justify-between">
              <Activity className="w-6 h-6 text-orange-400" />
              <div className="text-right">
                <div className="text-xl font-bold text-white">{metrics?.monthlyHours?.toFixed(1) || '0.0'}h</div>
                <div className="text-xs text-gray-400">This Month</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <h2 className="text-lg font-semibold mb-3 text-gray-200">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 mb-20">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => window.location.href = action.route}
                className="bg-[#2A2B5E] rounded-lg p-4 border border-[#3A3B6E] hover:border-blue-400 
                          transition-all duration-200 active:scale-95 text-left"
              >
                <div className="flex items-center space-x-3 mb-2">
                  <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-sm">{action.title}</h3>
                  </div>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{action.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Employee Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10">
        <div className="flex items-center justify-around py-2 px-4">
          <button className="flex flex-col items-center py-2 px-3 transition-all duration-200 active:scale-95">
            <div className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-500">
              <User className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] text-white mt-1 font-medium">Dashboard</span>
          </button>
          
          <button 
            onClick={() => window.location.href = '/mobile/punch'}
            className="flex flex-col items-center py-2 px-3 transition-all duration-200 active:scale-95"
          >
            <div className="w-7 h-7 flex items-center justify-center rounded-full">
              <Clock className="w-5 h-5 text-gray-400" />
            </div>
            <span className="text-[10px] text-gray-400 mt-1 font-medium">Punch</span>
          </button>
          
          <button 
            onClick={() => window.location.href = '/mobile/attendance'}
            className="flex flex-col items-center py-2 px-3 transition-all duration-200 active:scale-95"
          >
            <div className="w-7 h-7 flex items-center justify-center rounded-full">
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>
            <span className="text-[10px] text-gray-400 mt-1 font-medium">Attendance</span>
          </button>
          
          <button 
            onClick={() => window.location.href = '/mobile/analytics'}
            className="flex flex-col items-center py-2 px-3 transition-all duration-200 active:scale-95"
          >
            <div className="w-7 h-7 flex items-center justify-center rounded-full">
              <BarChart3 className="w-5 h-5 text-gray-400" />
            </div>
            <span className="text-[10px] text-gray-400 mt-1 font-medium">Analytics</span>
          </button>
          
          <button 
            onClick={() => window.location.href = '/mobile/settings'}
            className="flex flex-col items-center py-2 px-3 transition-all duration-200 active:scale-95"
          >
            <div className="w-7 h-7 flex items-center justify-center rounded-full">
              <Settings className="w-5 h-5 text-gray-400" />
            </div>
            <span className="text-[10px] text-gray-400 mt-1 font-medium">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
