
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { 
  BarChart3, 
  Users, 
  Clock, 
  TrendingUp, 
  Settings, 
  Bell, 
  Shield, 
  Activity,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  MapPin,
  MessageSquare
} from 'lucide-react';
import MobileFooter from '@/components/mobile/MobileFooter';
import { MobileConnectionStatus } from '@/components/OfflineIndicator';

interface AdminMetrics {
  totalEmployees: number;
  presentToday: number;
  attendanceRate: number;
  lateArrivals: number;
  earlyLeaves: number;
  overtime: number;
  alerts: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

export default function MobileAdminDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [currentView, setCurrentView] = useState('dashboard');

  // API queries
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/admin/dashboard/metrics'],
    queryFn: async () => {
      const response = await fetch('/api/admin/dashboard/metrics');
      if (!response.ok) throw new Error('Failed to fetch admin metrics');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 30000
  });

  const { data: alerts } = useQuery({
    queryKey: ['/api/admin/alerts'],
    queryFn: async () => {
      const response = await fetch('/api/admin/alerts');
      if (!response.ok) throw new Error('Failed to fetch alerts');
      return response.json();
    },
    staleTime: 2 * 60 * 1000
  });

  // Navigation items
  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  if (metricsLoading) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-white">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (currentView === 'dashboard') {
    return (
      <div className="min-h-screen bg-[#1A1B3E] text-white">
        {/* Header */}
        <div className="bg-[#2A2B5E] shadow-lg border-b border-gray-700 sticky top-0 z-10">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Shield size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white">
                    Admin Dashboard
                  </h1>
                  <p className="text-sm text-gray-300">Welcome, {user?.username}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <MobileConnectionStatus />
                <button className="relative p-2 text-gray-300 hover:text-white">
                  <Bell size={20} />
                  {alerts?.filter(a => !a.isRead).length > 0 && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 py-4 space-y-4">
          {/* System Status */}
          <div className="bg-[#2A2B5E] rounded-xl p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">System Status</h2>
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                metrics?.systemHealth === 'healthy' ? 'bg-green-900 text-green-300' :
                metrics?.systemHealth === 'warning' ? 'bg-yellow-900 text-yellow-300' :
                'bg-red-900 text-red-300'
              }`}>
                {metrics?.systemHealth === 'healthy' ? <CheckCircle size={16} /> :
                 metrics?.systemHealth === 'warning' ? <AlertTriangle size={16} /> :
                 <XCircle size={16} />}
                <span className="capitalize">{metrics?.systemHealth || 'Unknown'}</span>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#2A2B5E] rounded-xl p-4 border border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Users size={24} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {metrics?.totalEmployees || 0}
                  </p>
                  <p className="text-sm text-gray-400">Total Employees</p>
                </div>
              </div>
            </div>

            <div className="bg-[#2A2B5E] rounded-xl p-4 border border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <UserCheck size={24} className="text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {metrics?.presentToday || 0}
                  </p>
                  <p className="text-sm text-gray-400">Present Today</p>
                </div>
              </div>
            </div>

            <div className="bg-[#2A2B5E] rounded-xl p-4 border border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <TrendingUp size={24} className="text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {metrics?.attendanceRate?.toFixed(1) || '0.0'}%
                  </p>
                  <p className="text-sm text-gray-400">Attendance Rate</p>
                </div>
              </div>
            </div>

            <div className="bg-[#2A2B5E] rounded-xl p-4 border border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <Clock size={24} className="text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {metrics?.lateArrivals || 0}
                  </p>
                  <p className="text-sm text-gray-400">Late Arrivals</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-[#2A2B5E] rounded-xl p-4 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setCurrentView('employees')}
                className="flex items-center space-x-3 p-3 bg-[#1A1B3E] rounded-lg border border-gray-600 hover:border-blue-500 transition-colors"
              >
                <Users size={20} className="text-blue-400" />
                <span className="text-white font-medium">Manage Employees</span>
              </button>

              <button 
                onClick={() => setCurrentView('attendance')}
                className="flex items-center space-x-3 p-3 bg-[#1A1B3E] rounded-lg border border-gray-600 hover:border-green-500 transition-colors"
              >
                <Clock size={20} className="text-green-400" />
                <span className="text-white font-medium">Attendance</span>
              </button>

              <button 
                onClick={() => setCurrentView('analytics')}
                className="flex items-center space-x-3 p-3 bg-[#1A1B3E] rounded-lg border border-gray-600 hover:border-purple-500 transition-colors"
              >
                <BarChart3 size={20} className="text-purple-400" />
                <span className="text-white font-medium">Analytics</span>
              </button>

              <button 
                onClick={() => setCurrentView('settings')}
                className="flex items-center space-x-3 p-3 bg-[#1A1B3E] rounded-lg border border-gray-600 hover:border-orange-500 transition-colors"
              >
                <Settings size={20} className="text-orange-400" />
                <span className="text-white font-medium">Settings</span>
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-[#2A2B5E] rounded-xl p-4 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-[#1A1B3E] rounded-lg">
                <Activity size={16} className="text-blue-400" />
                <div className="flex-1">
                  <p className="text-white text-sm">System backup completed</p>
                  <p className="text-gray-400 text-xs">2 minutes ago</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-[#1A1B3E] rounded-lg">
                <UserCheck size={16} className="text-green-400" />
                <div className="flex-1">
                  <p className="text-white text-sm">New employee added</p>
                  <p className="text-gray-400 text-xs">15 minutes ago</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-[#1A1B3E] rounded-lg">
                <AlertTriangle size={16} className="text-yellow-400" />
                <div className="flex-1">
                  <p className="text-white text-sm">Attendance alert</p>
                  <p className="text-gray-400 text-xs">1 hour ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <MobileFooter
          currentView={currentView}
          onViewChange={setCurrentView}
          navigationItems={navigationItems}
        />
      </div>
    );
  }

  // Other views
  return (
    <div className="min-h-screen bg-[#1A1B3E] text-white flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white mb-2">
          {currentView.charAt(0).toUpperCase() + currentView.slice(1)}
        </h2>
        <p className="text-gray-400 mb-4">This feature is coming soon!</p>
        <button
          onClick={() => setCurrentView('dashboard')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
