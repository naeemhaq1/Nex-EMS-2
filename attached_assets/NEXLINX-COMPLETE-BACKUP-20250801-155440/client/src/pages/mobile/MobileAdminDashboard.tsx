import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  BarChart3,
  Settings,
  Bell,
  Shield,
  Activity,
  Database,
  Wifi,
  MapPin
} from 'lucide-react';

interface AdminMetrics {
  totalActiveUsers: number;
  totalSystemUsers: number;
  todayAttendance: number;
  presentToday: number;
  absentToday: number;
  lateArrivals: number;
  attendanceRate: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

interface QuickAction {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  color: string;
  route: string;
  description: string;
}

export default function MobileAdminDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch admin dashboard metrics (using working endpoint for consistency)
  const { data: metrics, isLoading, error } = useQuery<AdminMetrics>({
    queryKey: ['/api/admin/dashboard-metrics'],
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 2,
    onError: (error: any) => {
      console.error('Dashboard metrics error:', error);
      if (error.message.includes('401') || error.message.includes('403')) {
        // Redirect to login if not authenticated
        window.location.href = '/';
      }
    }
  });

  const quickActions: QuickAction[] = [
    {
      id: 'employees',
      title: 'Employee Management',
      icon: Users,
      color: 'bg-blue-500',
      route: '/mobile/admin/employees',
      description: 'Manage employee accounts and data'
    },
    {
      id: 'attendance',
      title: 'Attendance Control',
      icon: Clock,
      color: 'bg-green-500',
      route: '/mobile/admin/attendance',
      description: 'Monitor and manage attendance'
    },
    {
      id: 'analytics',
      title: 'Advanced Analytics',
      icon: BarChart3,
      color: 'bg-purple-500',
      route: '/mobile/admin/analytics',
      description: 'View comprehensive reports'
    },
    {
      id: 'system',
      title: 'System Monitoring',
      icon: Activity,
      color: 'bg-orange-500',
      route: '/mobile/admin/service-monitoring-new',
      description: 'Monitor system health and services'
    },
    {
      id: 'devices',
      title: 'Device Management',
      icon: Shield,
      color: 'bg-red-500',
      route: '/mobile/admin/devices',
      description: 'Manage user sessions and devices'
    },
    {
      id: 'map',
      title: 'Employee Map',
      icon: MapPin,
      color: 'bg-teal-500',
      route: '/mobile/admin/map',
      description: 'Track employee locations'
    },
    {
      id: 'alerts',
      title: 'System Alerts',
      icon: AlertTriangle,
      color: 'bg-yellow-500',
      route: '/mobile/admin/alerts',
      description: 'View system alerts and notifications'
    },
    {
      id: 'settings',
      title: 'Admin Settings',
      icon: Settings,
      color: 'bg-gray-500',
      route: '/mobile/admin/settings',
      description: 'Configure system settings'
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Loading Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  // Handle authentication errors
  if (error && (error as any).message?.includes('401')) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] flex items-center justify-center">
        <div className="text-center p-6">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Authentication Required</h2>
          <p className="text-gray-400 mb-6">Please log in to access the admin dashboard</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Go to Login
          </button>
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
            <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-gray-400 text-sm">System Administration Portal</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-blue-400">{formatTime(currentTime)}</div>
            <div className="text-xs text-gray-400">{formatDate(currentTime)}</div>
          </div>
        </div>

        {/* System Status Indicator */}
        <div className="flex items-center space-x-2 mt-3">
          <div className={`w-3 h-3 rounded-full ${
            metrics?.systemHealth === 'healthy' ? 'bg-green-500' :
            metrics?.systemHealth === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
          }`}></div>
          <span className="text-sm text-gray-300">
            System Status: {metrics?.systemHealth || 'Unknown'}
          </span>
          <Wifi className="w-4 h-4 text-green-500 ml-auto" />
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-3 text-gray-200">Today's Overview</h2>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-[#2A2B5E] rounded-lg p-3 border border-[#3A3B6E]">
            <div className="flex items-center justify-between">
              <Users className="w-6 h-6 text-blue-400" />
              <div className="text-right">
                <div className="text-xl font-bold text-white">{metrics?.totalActiveUsers || 0}</div>
                <div className="text-xs text-gray-400">Active Users</div>
              </div>
            </div>
          </div>

          <div className="bg-[#2A2B5E] rounded-lg p-3 border border-[#3A3B6E]">
            <div className="flex items-center justify-between">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <div className="text-right">
                <div className="text-xl font-bold text-white">{metrics?.presentToday || 0}</div>
                <div className="text-xs text-gray-400">Present Today</div>
              </div>
            </div>
          </div>

          <div className="bg-[#2A2B5E] rounded-lg p-3 border border-[#3A3B6E]">
            <div className="flex items-center justify-between">
              <XCircle className="w-6 h-6 text-red-400" />
              <div className="text-right">
                <div className="text-xl font-bold text-white">{metrics?.absentToday || 0}</div>
                <div className="text-xs text-gray-400">Absent Today</div>
              </div>
            </div>
          </div>

          <div className="bg-[#2A2B5E] rounded-lg p-3 border border-[#3A3B6E]">
            <div className="flex items-center justify-between">
              <TrendingUp className="w-6 h-6 text-purple-400" />
              <div className="text-right">
                <div className="text-xl font-bold text-white">{metrics?.attendanceRate?.toFixed(1) || 0}%</div>
                <div className="text-xs text-gray-400">Attendance Rate</div>
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

      {/* Admin Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10">
        <div className="flex items-center justify-around py-2 px-4">
          <button className="flex flex-col items-center py-2 px-3 transition-all duration-200 active:scale-95">
            <div className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-500">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] text-white mt-1 font-medium">Admin</span>
          </button>
          
          <button 
            onClick={() => window.location.href = '/mobile/admin/analytics'}
            className="flex flex-col items-center py-2 px-3 transition-all duration-200 active:scale-95"
          >
            <div className="w-7 h-7 flex items-center justify-center rounded-full">
              <BarChart3 className="w-5 h-5 text-gray-400" />
            </div>
            <span className="text-[10px] text-gray-400 mt-1 font-medium">Analytics</span>
          </button>
          
          <button 
            onClick={() => window.location.href = '/mobile/admin/system'}
            className="flex flex-col items-center py-2 px-3 transition-all duration-200 active:scale-95"
          >
            <div className="w-7 h-7 flex items-center justify-center rounded-full">
              <Activity className="w-5 h-5 text-gray-400" />
            </div>
            <span className="text-[10px] text-gray-400 mt-1 font-medium">System</span>
          </button>
          
          <button 
            onClick={() => window.location.href = '/mobile/admin/alerts'}
            className="flex flex-col items-center py-2 px-3 transition-all duration-200 active:scale-95"
          >
            <div className="w-7 h-7 flex items-center justify-center rounded-full">
              <Bell className="w-5 h-5 text-gray-400" />
            </div>
            <span className="text-[10px] text-gray-400 mt-1 font-medium">Alerts</span>
          </button>
          
          <button 
            onClick={() => window.location.href = '/mobile/employee/dashboard'}
            className="flex flex-col items-center py-2 px-3 transition-all duration-200 active:scale-95"
          >
            <div className="w-7 h-7 flex items-center justify-center rounded-full">
              <Users className="w-5 h-5 text-gray-400" />
            </div>
            <span className="text-[10px] text-gray-400 mt-1 font-medium">My Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
}