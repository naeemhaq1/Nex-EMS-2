import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import MobileAdminDualNavigation from '@/components/mobile/MobileAdminDualNavigation';
import { DevicePermissionChecker } from '@/components/DevicePermissionChecker';
import { MobileConnectionStatus, OfflineIndicator } from '@/components/OfflineIndicator';
import { useOfflineDashboardMetrics, useConnectionStatus } from '@/hooks/useOfflineData';
import AnnouncementManagement from '@/components/AnnouncementManagement';
import { 
  Users, 
  Settings, 
  Activity, 
  MessageSquare, 
  Calendar, 
  BarChart3,
  Map,
  Shield,
  FileText,
  Smartphone,
  Bug,
  Menu,
  X,
  Bell,
  Search,
  ChevronRight,
  TrendingUp,
  Clock,
  MapPin,
  UserCheck,
  MessageCircle,
  Database,
  Wifi,
  AlertTriangle,
  Trophy,
  GripHorizontal,
  Grip,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  XCircle,
  User,
  LogOut,
  RefreshCw,
  Send,
  Megaphone,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Doughnut, Line, Bar } from 'react-chartjs-2';
import { Punch48HourChart } from '@/components/Punch48HourChart';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
} from 'chart.js';
import { formatPKTDateTime, formatMobileDate, getCurrentPKTTime } from '@/utils/timezone';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title
);

interface AdminMetrics {
  totalEmployees: number;
  activeEmployees: number;
  totalPunchIn: number;
  totalPunchOut: number;
  totalPresent: number;
  attendanceRate: number;
  servicesStatus: {
    timestampPolling: boolean;
    automatedPolling: boolean;
    autoPunchout: boolean;
    whatsappService: boolean;
  };
  systemHealth: 'healthy' | 'warning' | 'critical';
}

interface AdminFeature {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  route: string;
  badge?: string;
  color: string;
}

const adminFeatures: AdminFeature[] = [
  {
    id: 'dashboard',
    title: 'My Dashboard',
    icon: User,
    description: 'View personal employee dashboard',
    route: '/mobile/employee/dashboard',
    color: 'bg-cyan-500'
  },
  {
    id: 'directory',
    title: 'Employee Directory',
    icon: Users,
    description: 'Full employee directory with groups',
    route: '/mobile/admin/directory',
    color: 'bg-blue-500'
  },
  {
    id: 'services',
    title: 'Service Monitor',
    icon: Activity,
    description: 'Monitor and control services',
    route: '/mobile/admin/services',
    badge: 'Live',
    color: 'bg-green-500'
  },
  {
    id: 'analytics',
    title: 'Analytics Suite',
    icon: BarChart3,
    description: 'Full suite of analytics',
    route: '/mobile/admin/analytics',
    color: 'bg-purple-500'
  },
  {
    id: 'map',
    title: 'Employee Map',
    icon: Map,
    description: 'Google map with employee locations',
    route: '/mobile/admin/map',
    color: 'bg-orange-500'
  },
  {
    id: 'announcements',
    title: 'Announcements',
    icon: MessageSquare,
    description: 'Send announcements to groups',
    route: '/mobile/admin/announcements',
    color: 'bg-cyan-500'
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp Console',
    icon: MessageCircle,
    description: 'Enhanced messaging interface',
    route: '/mobile/whatsapp-interface',
    color: 'bg-green-600'
  },
  {
    id: 'attendance',
    title: 'Attendance Records',
    icon: Clock,
    description: 'Last 48 hours attendance',
    route: '/mobile/admin/attendance',
    color: 'bg-indigo-500'
  },
  {
    id: 'continuity',
    title: 'Data Continuity',
    icon: Database,
    description: 'Heatmap with polling control',
    route: '/mobile/admin/continuity',
    color: 'bg-red-500'
  },
  {
    id: 'pollers',
    title: '3-Pollers',
    icon: RefreshCw,
    description: 'BioTime sync system monitoring',
    route: '/mobile/admin/polling',
    badge: 'Live',
    color: 'bg-orange-600'
  },
  {
    id: 'devices',
    title: 'Manage Devices',
    icon: Smartphone,
    description: 'Device sessions & remote control',
    route: '/mobile/admin/device-management',
    color: 'bg-teal-500'
  },
  {
    id: 'punches',
    title: 'Manage Punches',
    icon: Clock,
    description: 'Force punch-out long sessions',
    route: '/mobile/admin/punch-management',
    color: 'bg-orange-500'
  },
  {
    id: 'users',
    title: 'Manage Users',
    icon: UserCheck,
    description: 'Enable/disable users & passwords',
    route: '/mobile/admin/user-management',
    color: 'bg-yellow-500'
  },
  {
    id: 'requests',
    title: 'Employee Requests',
    icon: FileText,
    description: 'Messaging for employee requests',
    route: '/mobile/admin/requests',
    color: 'bg-blue-600'
  },
  {
    id: 'whatsapp-manager',
    title: 'WhatsApp Manager',
    icon: MessageCircle,
    description: 'Full WhatsApp chat & broadcast system',
    route: '/mobile/whatsapp-manager',
    color: 'bg-green-500',
    badge: 'Enhanced'
  },
  {
    id: 'support',
    title: 'Bug Reports',
    icon: Bug,
    description: 'Feature & bug reporting',
    route: '/mobile/admin/support',
    color: 'bg-gray-500'
  },
  {
    id: 'logout',
    title: 'Logout',
    icon: LogOut,
    description: 'Sign out of admin account',
    route: '#',
    color: 'bg-red-500'
  }
];

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function MobileAdminDashboard() {
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('MobileAdminDashboard mounted, user:', user);
    setIsLoading(false);
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1B3E] p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-white text-center mb-6">
          <h1 className="text-2xl font-bold">Nexlinx EMS Admin</h1>
          <p className="text-gray-300">Welcome, {user?.username || 'Admin'}</p>
          <p className="text-sm text-gray-400">Role: {user?.role || 'admin'}</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-500/20 backdrop-blur rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">0</div>
            <div className="text-xs text-gray-300">Present Today</div>
          </div>
          <div className="bg-red-500/20 backdrop-blur rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-400">0</div>
            <div className="text-xs text-gray-300">Absent Today</div>
          </div>
        </div>

        {/* Admin Controls */}
        <div className="space-y-4">
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <h2 className="text-white font-semibold mb-3">Admin Controls</h2>
            <div className="space-y-3">
              <button className="w-full bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg text-left transition-colors flex items-center">
                <span className="mr-3">📊</span>
                View Reports & Analytics
              </button>
              <button className="w-full bg-green-500 hover:bg-green-600 text-white p-3 rounded-lg text-left transition-colors flex items-center">
                <span className="mr-3">👥</span>
                Manage Employees
              </button>
              <button className="w-full bg-purple-500 hover:bg-purple-600 text-white p-3 rounded-lg text-left transition-colors flex items-center">
                <span className="mr-3">📋</span>
                Attendance Records
              </button>
              <button className="w-full bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-lg text-left transition-colors flex items-center">
                <span className="mr-3">⚙️</span>
                System Settings
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <h2 className="text-white font-semibold mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <button className="w-full text-left text-gray-300 hover:text-white p-2 rounded transition-colors">
                📈 Today's Summary
              </button>
              <button className="w-full text-left text-gray-300 hover:text-white p-2 rounded transition-colors">
                🔔 Notifications
              </button>
              <button className="w-full text-left text-gray-300 hover:text-white p-2 rounded transition-colors">
                📱 Mobile Management
              </button>
              <button 
                onClick={logout}
                className="w-full text-left text-red-400 hover:text-red-300 p-2 rounded transition-colors"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}