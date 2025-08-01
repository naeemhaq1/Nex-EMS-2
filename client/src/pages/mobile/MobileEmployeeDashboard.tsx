import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { locationPiggybackService } from '@/services/LocationPiggybackService';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { DevicePermissionChecker } from '@/components/DevicePermissionChecker';
import { MobileConnectionStatus, OfflineIndicator } from '@/components/OfflineIndicator';
import { useOfflineDashboardMetrics, useConnectionStatus } from '@/hooks/useOfflineData';
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';
import { useSyncManager } from '@/hooks/useSyncManager';
import { ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, BarChart, Bar, Tooltip, RadialBarChart, RadialBar, AreaChart, Area } from 'recharts';
import { Bell, Star, Trophy, Circle, LogIn, LogOut, TrendingUp, Clock, Users, Target, Power, BarChart3, HelpCircle, X, Award, CheckCircle, AlertTriangle, AlertCircle, XCircle, Calendar, ChevronLeft, ChevronRight, Settings, Camera, User, Home, BarChart2, Zap, Fingerprint, Menu, Activity, MessageSquare, ChevronDown, ChevronUp, Grip, Check, CircleDot, Briefcase, UserCheck, Coffee, FileText, MapPin, Shield } from 'lucide-react';
import MobileFooter from '@/components/mobile/MobileFooter';
import LocationSettings from '@/components/mobile/LocationSettings';
import PhotoEditor from '@/components/mobile/PhotoEditor';

// Types and interfaces
interface Employee {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  designation: string;
  department: string;
  avatar?: string;
  isLocationEnabled?: boolean;
  lastLocationUpdate?: string;
}

interface PunchStatus {
  isPunchedIn: boolean;
  lastPunchTime?: string;
  punchType?: 'in' | 'out';
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

interface EmployeeMetrics {
  hoursToday: number;
  hoursWeek: number;
  hoursMonth: number;
  attendanceRate: number;
  overtimeHours: number;
  lateCount: number;
  earlyLeaveCount: number;
  totalWorkingDays: number;
  presentDays: number;
  ranking: number;
  totalEmployees: number;
  badges: string[];
  score: number;
  streak: number;
}

interface Announcement {
  id: number;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  isRead: boolean;
}

// Color schemes
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
const PERFORMANCE_COLORS = {
  excellent: '#10B981',
  good: '#3B82F6',
  average: '#F59E0B',
  poor: '#EF4444'
};

export default function MobileEmployeeDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [currentView, setCurrentView] = useState('dashboard');
  const [showLocationSettings, setShowLocationSettings] = useState(false);
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [notifications, setNotifications] = useState<Announcement[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const { isOnline } = useConnectionStatus();
  const { isSyncing, syncStatus } = useSyncManager();

  // API queries with proper queryFn
  const { data: employee, isLoading: employeeLoading } = useQuery({
    queryKey: ['/api/employees/me'],
    queryFn: async () => {
      const response = await fetch('/api/employees/me');
      if (!response.ok) throw new Error('Failed to fetch employee data');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: isOnline ? 30000 : false
  });

  const { data: punchStatus, isLoading: punchLoading, refetch: refetchPunchStatus } = useQuery({
    queryKey: ['/api/mobile-attendance/punch-status'],
    queryFn: async () => {
      const response = await fetch('/api/mobile-attendance/punch-status');
      if (!response.ok) throw new Error('Failed to fetch punch status');
      return response.json();
    },
    refetchInterval: isOnline ? 15000 : false
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/employees/me/metrics'],
    queryFn: async () => {
      const response = await fetch('/api/employees/me/metrics');
      if (!response.ok) throw new Error('Failed to fetch metrics');
      return response.json();
    },
    staleTime: 10 * 60 * 1000
  });

  const { data: announcements } = useQuery({
    queryKey: ['/api/announcements/employee'],
    queryFn: async () => {
      const response = await fetch('/api/announcements/employee');
      if (!response.ok) throw new Error('Failed to fetch announcements');
      return response.json();
    },
    staleTime: 15 * 60 * 1000
  });

  // Handle punch action
  const handlePunch = async (type: 'in' | 'out') => {
    try {
      setIsRefreshing(true);

      const location = await locationPiggybackService.getCurrentLocation();

      const response = await fetch('/api/mobile-attendance/punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          location: location ? {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy
          } : null,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to record punch');
      }

      await refetchPunchStatus();
    } catch (error) {
      console.error('Punch error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Navigation items
  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  // Render loading state
  if (employeeLoading || punchLoading || metricsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Main dashboard view
  if (currentView === 'dashboard') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b sticky top-0 z-10">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {employee?.firstName?.charAt(0) || 'U'}
                  </span>
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    Welcome, {employee?.firstName}
                  </h1>
                  <p className="text-sm text-gray-500">{employee?.designation}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <MobileConnectionStatus />
                <button
                  onClick={() => setShowAnnouncements(true)}
                  className="relative p-2 text-gray-500 hover:text-gray-700"
                >
                  <Bell size={20} />
                  {announcements?.filter(a => !a.isRead).length > 0 && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-4 py-4">
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
              <SyncStatusIndicator />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handlePunch(punchStatus?.isPunchedIn ? 'out' : 'in')}
                disabled={isRefreshing}
                className={`p-4 rounded-lg border-2 transition-all ${
                  punchStatus?.isPunchedIn
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-green-200 bg-green-50 text-green-700'
                }`}
              >
                <div className="flex flex-col items-center space-y-2">
                  {punchStatus?.isPunchedIn ? (
                    <LogOut size={24} />
                  ) : (
                    <LogIn size={24} />
                  )}
                  <span className="font-medium">
                    {isRefreshing ? 'Processing...' : (
                      punchStatus?.isPunchedIn ? 'Punch Out' : 'Punch In'
                    )}
                  </span>
                </div>
              </button>

              <button
                onClick={() => setShowLocationSettings(true)}
                className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50 text-blue-700"
              >
                <div className="flex flex-col items-center space-y-2">
                  <MapPin size={24} />
                  <span className="font-medium">Location</span>
                </div>
              </button>
            </div>

            {punchStatus?.lastPunchTime && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Last punch: {new Date(punchStatus.lastPunchTime).toLocaleTimeString()}
                </p>
              </div>
            )}
          </div>

          {/* Today's Summary */}
          {metrics && (
            <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Summary</h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {metrics.hoursToday?.toFixed(1) || '0.0'}
                  </div>
                  <div className="text-sm text-gray-600">Hours Today</div>
                </div>

                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {metrics.attendanceRate?.toFixed(0) || '0'}%
                  </div>
                  <div className="text-sm text-gray-600">Attendance Rate</div>
                </div>

                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    #{metrics.ranking || 'N/A'}
                  </div>
                  <div className="text-sm text-gray-600">Ranking</div>
                </div>

                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {metrics.score || 0}
                  </div>
                  <div className="text-sm text-gray-600">Score</div>
                </div>
              </div>
            </div>
          )}

          {/* Weekly Overview */}
          {metrics && (
            <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Weekly Overview</h2>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Hours</span>
                  <span className="font-semibold">{metrics.hoursWeek?.toFixed(1) || '0.0'}h</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Present Days</span>
                  <span className="font-semibold">{metrics.presentDays || 0}/{metrics.totalWorkingDays || 0}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Late Arrivals</span>
                  <span className="font-semibold text-red-600">{metrics.lateCount || 0}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Overtime Hours</span>
                  <span className="font-semibold text-blue-600">{metrics.overtimeHours?.toFixed(1) || '0.0'}h</span>
                </div>
              </div>
            </div>
          )}

          {/* Achievements */}
          {metrics?.badges && metrics.badges.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Achievements</h2>

              <div className="flex flex-wrap gap-2">
                {metrics.badges.map((badge, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-2 bg-gradient-to-r from-yellow-100 to-yellow-200 px-3 py-2 rounded-lg"
                  >
                    <Award size={16} className="text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">{badge}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Device Permission Checker */}
        <DevicePermissionChecker />

        {/* Location Settings Modal */}
        {showLocationSettings && (
          <LocationSettings onClose={() => setShowLocationSettings(false)} />
        )}

        {/* Photo Editor Modal */}
        {showPhotoEditor && (
          <PhotoEditor onClose={() => setShowPhotoEditor(false)} />
        )}

        {/* Announcements Modal */}
        {showAnnouncements && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full max-h-96 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold">Announcements</h3>
                <button
                  onClick={() => setShowAnnouncements(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto max-h-64 p-4">
                {announcements && announcements.length > 0 ? (
                  <div className="space-y-3">
                    {announcements.map((announcement) => (
                      <div
                        key={announcement.id}
                        className={`p-3 rounded-lg border ${
                          announcement.isRead ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'
                        }`}
                      >
                        <h4 className="font-medium text-gray-900">{announcement.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{announcement.message}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(announcement.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No announcements</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <MobileFooter
          currentView={currentView}
          onViewChange={setCurrentView}
          navigationItems={navigationItems}
        />

        {/* Offline Indicator */}
        <OfflineIndicator />
      </div>
    );
  }

  // Other views would be rendered here based on currentView
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {currentView.charAt(0).toUpperCase() + currentView.slice(1)}
        </h2>
        <p className="text-gray-600 mb-4">This feature is coming soon!</p>
        <button
          onClick={() => setCurrentView('dashboard')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}