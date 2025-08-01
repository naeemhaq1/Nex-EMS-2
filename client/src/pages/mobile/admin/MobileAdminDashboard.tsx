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

export default function MobileAdminDashboard() {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const [showDeviceChecker, setShowDeviceChecker] = useState(false);
  
  // Announcement state
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementSending, setAnnouncementSending] = useState(false);
  const [lastAnnouncementSent, setLastAnnouncementSent] = useState<string | null>(null);
  const [showEmployeeView, setShowEmployeeView] = useState(false);
  const [sentAnnouncementPreview, setSentAnnouncementPreview] = useState<string>("");
  const [repeatCount, setRepeatCount] = useState(1);
  const [showAnnouncementManagement, setShowAnnouncementManagement] = useState(false);
  const [userStatus, setUserStatus] = useState('Available');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  // Initialize with Pakistan timezone (UTC+5)
  const [currentTime, setCurrentTime] = useState(() => getCurrentPKTTime());
  const [lastServiceRestart, setLastServiceRestart] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState({
    isOnline: navigator.onLine,
    isMobile: /Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(navigator.userAgent),
    hasLocationAccess: false,
    batteryLevel: null as number | null
  });
  const [hasLocation, setHasLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationSuccess, setLocationSuccess] = useState(false);
  const [showManualLocationModal, setShowManualLocationModal] = useState(false);

  // Time formatting function - using Pakistan timezone (UTC+5) 
  const formatTime = (date: Date) => {
    // Convert to Pakistan time (UTC+5) before formatting
    const pktTime = new Date(date.getTime() + (5 * 60 * 60 * 1000));
    return pktTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Karachi'
    });
  };

  // Get time since last service restart - replaces sync status
  const getTimeSinceLastServiceRestart = () => {
    if (!lastServiceRestart) return 'Unknown';
    
    const now = Date.now();
    const restartTime = new Date(lastServiceRestart).getTime();
    const diffMs = now - restartTime;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    
    if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  // Clock update effect - using Pakistan timezone (UTC+5)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentPKTTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Temporarily remove the problematic useEffect that depends on servicesData
  // Will add it back after the queries are declared

  // Online status effect
  useEffect(() => {
    const handleOnlineStatusChange = () => {
      setDeviceInfo(prev => ({ ...prev, isOnline: navigator.onLine }));
    };

    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);

    return () => {
      window.removeEventListener('online', handleOnlineStatusChange);
      window.removeEventListener('offline', handleOnlineStatusChange);
    };
  }, []);

  // One-click location services enablement for admins - triggers browser permission request
  const handleLocationStatusClick = async () => {
    console.log('📍 Admin location clicked - enabling location services');
    
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      console.log('❌ Geolocation not supported');
      setLocationError('Location services not supported on this device');
      return;
    }

    try {
      // Check current permission status if available
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        console.log('🔍 Current admin location permission:', permission.state);
        
        if (permission.state === 'denied') {
          console.log('❌ Admin location permission denied - opening manual settings');
          setLocationError('Location permission denied');
          return;
        }
      }

      // Trigger location permission request and get position for admin
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('✅ Admin location services enabled successfully:', position);
          setHasLocation(true);
          setLocationError(null);
          setLocationSuccess(true);
          
          // Store successful admin location
          localStorage.setItem('adminLastKnownLocation', JSON.stringify({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now(),
            role: 'admin',
            enabled: true
          }));
          
          // Update admin location status globally
          localStorage.setItem('adminLocationServicesEnabled', 'true');
          
          // Auto-dismiss success message after 3 seconds
          setTimeout(() => {
            setLocationSuccess(false);
          }, 3000);
        },
        (error) => {
          console.log('❌ Admin location access failed:', error.code, error.message);
          
          let errorMessage = 'Unable to enable admin location services';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Admin location permission denied';
              setLocationError(errorMessage);
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Admin location information unavailable';
              setLocationError(errorMessage);
              break;
            case error.TIMEOUT:
              errorMessage = 'Admin location request timed out';
              setLocationError(errorMessage);
              break;
            default:
              setLocationError(errorMessage);
              break;
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,  // Longer timeout for admin accuracy
          maximumAge: 0    // Force fresh location to trigger permission request
        }
      );
      
      // Setup admin location watching for continuous monitoring
      if (navigator.geolocation.watchPosition) {
        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            console.log('📍 Admin location watching active:', position.coords);
            setHasLocation(true);
            setLocationError(null);
          },
          (error) => {
            console.log('⚠️ Admin location watching error:', error);
          },
          {
            enableHighAccuracy: false,
            timeout: 45000,
            maximumAge: 120000  // Admin gets longer cache for efficiency
          }
        );
        
        // Store admin watch ID for cleanup
        localStorage.setItem('adminLocationWatchId', watchId.toString());
      }
      
    } catch (error) {
      console.error('❌ Admin location enablement error:', error);
      setLocationError('Failed to enable admin location services');
    }
  };

  // Function to open device-specific location settings with Always On instructions for admins
  const openDeviceLocationSettings = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroid = userAgent.includes('android');
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    
    if (isIOS) {
      // For iOS admin, provide detailed instructions with Always On
      alert('Admin Location Setup:\n\n1. Opening iOS Settings → Privacy & Security → Location Services\n2. Enable Location Services (main toggle)\n3. Find this app and set to "Always" for admin monitoring\n4. Enable "Precise Location" for accurate reporting\n5. Set app to "Always On" in iOS Settings → Battery → Background App Refresh');
      window.open('prefs:root=Privacy&path=LOCATION', '_blank');
    } else if (isAndroid) {
      // For Android admin, provide Always On instructions
      alert('Admin Location Setup:\n\n1. Opening Android Settings → Apps & notifications\n2. Find this app → Permissions → Location\n3. Select "Allow all the time" for continuous admin monitoring\n4. Go to Settings → Apps → This app → Battery → "Don\'t optimize"\n5. Enable "Always On" background activity for real-time admin features');
      window.open('intent://settings/location_source_settings#Intent;scheme=android-app;package=com.android.settings;end', '_blank');
    } else {
      // For desktop admin, provide PWA Always On instructions
      alert('Admin Location Setup:\n\n1. Click the location icon in browser address bar\n2. Select "Allow" for admin location features\n3. Browser Settings → Site Settings → Location → Always Allow\n4. For PWA: Enable "Always On" notifications and background sync\n5. Pin this admin app to taskbar for persistent access');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
  // Status management function
  const getCurrentStatus = () => {
    switch (userStatus) {
      case 'Available':
        return { label: 'Available', color: 'text-green-400', bgColor: 'bg-green-500' };
      case 'Busy':
        return { label: 'Busy', color: 'text-red-400', bgColor: 'bg-red-500' };
      case 'On Job':
        return { label: 'On Job', color: 'text-blue-400', bgColor: 'bg-blue-500' };
      case 'Not Available':
        return { label: 'Not Available', color: 'text-gray-400', bgColor: 'bg-gray-500' };
      default:
        return { label: 'Available', color: 'text-green-400', bgColor: 'bg-green-500' };
    }
  };

  const handleStatusChange = (newStatus: string) => {
    setUserStatus(newStatus);
    setShowStatusMenu(false);
    // TODO: In real implementation, sync status with employee dashboard via API
  };

  // Function to send announcement to all users
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
          priority: 'normal',
          targetAudience: 'all',
          repeatCount: repeatCount
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Show employee view confirmation
        setSentAnnouncementPreview(`URGENT ANNOUNCEMENT: ${announcementText.trim()}`);
        setShowEmployeeView(true);
        
        // Set success message for later display
        setLastAnnouncementSent(`${repeatCount}x to ${data.recipientCount || 'all'} users: "${announcementText.trim()}"`);
        setAnnouncementText('');
        setRepeatCount(1);
        
        // Auto-revert to admin view after 4 seconds
        setTimeout(() => {
          setShowEmployeeView(false);
          // Auto-hide success message after additional 3 seconds
          setTimeout(() => setLastAnnouncementSent(null), 3000);
        }, 4000);
      } else {
        throw new Error('Failed to send announcement');
      }
    } catch (error) {
      console.error('Error sending announcement:', error);
      setLastAnnouncementSent('Failed to send announcement');
      setTimeout(() => setLastAnnouncementSent(null), 3000);
    }
    setAnnouncementSending(false);
  };

  // Filter admin features - only show admin options to admin/superadmin users
  const filteredAdminFeatures = adminFeatures.filter(feature => {
    // Only show admin features to admin/superadmin users
    if (user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'general_admin') {
      return true; // Show all features to admin users
    } else {
      // For non-admin users, only show basic features (no admin-specific functions)
      return ['dashboard', 'logout'].includes(feature.id);
    }
  });
  const [draggedKPI, setDraggedKPI] = useState<string | null>(null);
  const [kpiPanelsOrder, setKpiPanelsOrder] = useState<string[]>([]);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Fetch dashboard metrics with offline support
  const { data: dashboardMetrics, isLoading: dashboardLoading, isOffline } = useOfflineDashboardMetrics();
  const { isOnline } = useConnectionStatus();

  // Fetch system metrics for services status
  const { data: systemMetrics, isLoading: systemLoading } = useQuery<AdminMetrics>({
    queryKey: ['/api/admin/system-metrics'],
    refetchInterval: 30000,
  });

  // Fetch services data to check individual service status
  const { data: servicesData, error: servicesError } = useQuery({
    queryKey: ['/api/admin/services'],
    refetchInterval: 10000,
    retry: 3,
    refetchOnWindowFocus: true,
  });



  const isLoading = dashboardLoading || systemLoading;

  // Calculate service status according to new rules
  const getServiceStatus = () => {
    if (!servicesData || !Array.isArray(servicesData)) {
      return { color: 'text-red-400', count: 0, total: 0 };
    }

    const runningServices = servicesData.filter((s: any) => s.status === 'running' || s.status === 'healthy');
    const downServices = servicesData.length - runningServices.length;
    
    // Critical services that affect attendance/biotime - if any down, status is red
    const criticalServices = ['biotimeService', 'attendanceProcessor', 'dataProcessor', 'biotimeMonitor'];
    const hasCriticalServiceDown = servicesData.some((s: any) => 
      criticalServices.includes(s.name) && s.status !== 'running' && s.status !== 'healthy'
    );

    let color = 'text-green-400'; // All operational = green
    
    if (hasCriticalServiceDown || downServices >= 3) {
      color = 'text-red-400'; // 3+ down or critical service down = red
    } else if (downServices >= 2) {
      color = 'text-purple-400'; // 2+ down = purple
    } else if (downServices === 1) {
      color = 'text-indigo-400'; // 1 down = indigo
    }

    return { color, count: runningServices.length, total: servicesData.length };
  };

  const serviceStatus = getServiceStatus();

  // Calculate uptime percentage
  const getUptimeColor = () => {
    const healthStatus = (systemMetrics as any)?.systemHealth;
    
    if (healthStatus === 'healthy') return 'text-green-400';
    if (healthStatus === 'warning') return 'text-indigo-400';
    return 'text-red-400';
  };

  // Extended KPI panels matching desktop admin metrics - using employee mobile sizing with updated services logic
  const kpiPanelsBase = [
    { id: 'total_employees', title: 'ACTIVE EMP', value: (dashboardMetrics as any)?.totalActiveUsers || 0, suffix: '', icon: Users, color: 'text-blue-400' },
    { id: 'total_punch_in', title: 'PUNCH IN', value: (dashboardMetrics as any)?.totalPunchIn || 0, suffix: '', icon: ArrowRight, color: 'text-green-400' },
    { id: 'present_today', title: 'PRESENT', value: (dashboardMetrics as any)?.presentToday || 0, suffix: '', icon: UserCheck, color: 'text-green-400' },
    { id: 'total_punch_out', title: 'PUNCH OUT', value: (dashboardMetrics as any)?.totalPunchOut || 0, suffix: '', icon: ArrowLeft, color: 'text-red-400' },
    { id: 'attendance_rate', title: 'ATT RATE', value: Math.round((dashboardMetrics as any)?.attendanceRate || 0), suffix: '%', icon: TrendingUp, color: 'text-purple-400' },
    { id: 'total_attendance', title: 'TOTAL ATT', value: (dashboardMetrics as any)?.totalAttendance || 0, suffix: '', icon: Calendar, color: 'text-blue-400' },
    { id: 'completed_today', title: 'COMPLETED', value: (dashboardMetrics as any)?.completedToday || 0, suffix: '', icon: CheckCircle, color: 'text-green-400' },
    { id: 'absent_today', title: 'ABSENT', value: (dashboardMetrics as any)?.absentToday || 0, suffix: '', icon: XCircle, color: 'text-red-400' },
    { id: 'late_arrivals', title: 'LATE', value: (dashboardMetrics as any)?.lateArrivals || 0, suffix: '', icon: AlertTriangle, color: 'text-purple-400' },
    { id: 'overtime_hours', title: 'OVERTIME', value: (dashboardMetrics as any)?.overtimeHours || 0, suffix: 'h', icon: Clock, color: 'text-indigo-400' },
    { id: 'active_services', title: 'Services', value: serviceStatus.count, suffix: `/${serviceStatus.total}`, icon: Activity, color: serviceStatus.color },
    { id: 'system_health', title: 'Uptime', value: (systemMetrics as any)?.systemHealth === 'healthy' ? '100' : (systemMetrics as any)?.systemHealth === 'warning' ? '75' : '25', suffix: '%', icon: Shield, color: getUptimeColor() }
  ];

  // Initialize KPI panels order from localStorage or use default order
  React.useEffect(() => {
    const savedOrder = localStorage.getItem('adminKpiPanelsOrder');
    if (savedOrder) {
      try {
        const parsedOrder = JSON.parse(savedOrder);
        if (Array.isArray(parsedOrder) && parsedOrder.length > 0) {
          setKpiPanelsOrder(parsedOrder);
        } else {
          // Reset to default if saved order is invalid
          const defaultOrder = kpiPanelsBase.map(panel => panel.id);
          setKpiPanelsOrder(defaultOrder);
          localStorage.setItem('adminKpiPanelsOrder', JSON.stringify(defaultOrder));
        }
      } catch (error) {
        // If parsing fails, use default order
        const defaultOrder = kpiPanelsBase.map(panel => panel.id);
        setKpiPanelsOrder(defaultOrder);
        localStorage.setItem('adminKpiPanelsOrder', JSON.stringify(defaultOrder));
      }
    } else {
      // First time - use default order
      const defaultOrder = kpiPanelsBase.map(panel => panel.id);
      setKpiPanelsOrder(defaultOrder);
      localStorage.setItem('adminKpiPanelsOrder', JSON.stringify(defaultOrder));
    }
  }, []);

  // Get ordered KPI panels based on current order
  const kpiPanels = kpiPanelsOrder.map(id => 
    kpiPanelsBase.find(panel => panel.id === id)
  ).filter(Boolean) as typeof kpiPanelsBase;

  // Service restart tracking effect - now safely after servicesData is declared
  useEffect(() => {
    // Monitor services data for restart detection
    if (servicesData && Array.isArray(servicesData)) {
      const currentTime = Date.now();
      const restartTime = new Date(currentTime - (Math.random() * 3600000)).toISOString(); // Random within last hour for demo
      setLastServiceRestart(restartTime);
    }
  }, [servicesData]);

  // System Health Badge - Check services for actual status
  const getHealthBadge = () => {
    // Check if any services are down
    const servicesArray = servicesData as any[] || [];
    const downServices = servicesArray.filter((service: any) => 
      service.status === 'stopped' || service.status === 'error' || service.status === 'unhealthy'
    );
    
    if (downServices.length > 0) {
      // Show warning if any service is down (including WhatsApp)
      return <Badge className="bg-orange-500 text-white">Warning</Badge>;
    }
    
    // Fallback to system health if all services are running
    const health = systemMetrics?.systemHealth || 'unknown';
    switch (health) {
      case 'healthy':
        return <Badge className="bg-green-500 text-white">Healthy</Badge>;
      case 'warning':
        return <Badge className="bg-orange-500 text-white">Warning</Badge>;
      case 'critical':
        return <Badge className="bg-red-500 text-white">Critical</Badge>;
      default:
        return <Badge className="bg-gray-500 text-white">Unknown</Badge>;
    }
  };

  // Attendance Chart Data
  const attendanceChartData = {
    labels: ['Normal', 'Grace', 'Late'],
    datasets: [
      {
        data: [65, 20, 15],
        backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%', // Smaller doughnut to accommodate legend
    plugins: {
      legend: {
        display: false, // We'll use custom legend below
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.label}: ${context.parsed}%`,
        },
      },
    },
    elements: {
      arc: {
        borderWidth: 0,
      },
    },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] flex items-center justify-center">
        <div className="text-white">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#1A1B3E] text-white overflow-hidden flex flex-col fixed inset-0">
      {/* Status Bar - Exact match with employee dashboard */}
      <div className="flex items-center justify-between px-4 py-1 text-sm">
        <div className="font-medium">{formatTime(currentTime)}</div>
        <div className="flex items-center space-x-2">
          {/* Service Restart Time Indicator (replaces Sync Status) */}
          <div className="text-xs text-gray-400" title={`Last service restart: ${lastServiceRestart || 'Unknown'}`}>
            {getTimeSinceLastServiceRestart()}
          </div>
          {/* Connectivity Status - Green dot for online, Red for offline */}
          <div className={`w-2 h-2 rounded-full ${deviceInfo.isOnline ? 'bg-green-400' : 'bg-red-400'}`} title={deviceInfo.isOnline ? 'Online' : 'Offline'}></div>
          {/* Location Status - Green dot for available, Red for unavailable, clickable for GPS/manual entry */}
          <div 
            className={`w-2 h-2 rounded-full ${hasLocation ? 'bg-green-400' : 'bg-red-400'} cursor-pointer`} 
            title={hasLocation ? 'Location Available - Tap to refresh' : (locationError || 'Location Unavailable - Tap to set')}
            onClick={handleLocationStatusClick}
          ></div>
          {/* Signal Strength Indicator - Four bars */}
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
          </div>
          {/* Network Icon */}
          <span title="Network Signal">📶</span>
          {/* Battery Icon */}
          <span title="Battery Level">🔋</span>
        </div>
      </div>

      {/* Header with Profile and Status - Exact match with employee dashboard structure */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 relative">
        <div className="flex items-center space-x-3">
          {/* Avatar with Status Indicator */}
          <div className="relative">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer relative"
              style={{ 
                background: 'linear-gradient(to bottom right, #6366F1, #8B5CF6)', // Professional purple gradient for admin
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <span className="text-white font-semibold text-base">{user?.username?.substring(0, 2).toUpperCase() || 'AD'}</span>
            </div>
            
            {/* Status indicator - matching employee dashboard */}
            <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${getCurrentStatus().bgColor} border border-[#1A1B3E] flex items-center justify-center`}>
              <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
            </div>
          </div>
          
          {/* User Info and Status */}
          <div>
            <h2 className="text-white font-semibold text-base">{user?.username || 'Admin'}</h2>
            <div className="flex items-center space-x-2">
              <div 
                onClick={() => setShowStatusMenu(true)}
                className={`px-2 py-1 rounded-full text-xs font-medium cursor-pointer ${getCurrentStatus().color} bg-opacity-20 border border-opacity-50 inline-block`}
              >
                {getCurrentStatus().label}
              </div>
            </div>
          </div>
        </div>
        
        {/* Right side actions */}
        <div className="flex items-start space-x-2">
          {/* Services Status Button (replaces Punch IN) */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => navigate('/mobile/admin/service-monitoring')}
              className={`px-2 py-1.5 rounded-md text-xs font-medium flex items-center justify-center space-x-1 w-20 ${
                servicesData && Array.isArray(servicesData) && servicesData.length > 0
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : servicesError
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
              title={servicesData && Array.isArray(servicesData) 
                ? `${servicesData.filter((s: any) => s.status === 'running' || s.status === 'healthy').length}/${servicesData.length} services running`
                : servicesError 
                ? 'Authentication error - check session'
                : 'Loading services status...'
              }
            >
              <Activity className="w-3 h-3" />
              <span className="text-[10px]">Services</span>
            </button>
            <div className="text-[9px] text-blue-400 mt-1">
              {servicesData && Array.isArray(servicesData) ? 
                `${servicesData.filter((s: any) => s.status === 'running' || s.status === 'healthy').length}/${servicesData.length}` : 
                servicesError ? 'Auth' : 'Loading'
              }
            </div>
          </div>
          
          {/* System Uptime Button (replaces Punch OUT) */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => navigate('/mobile/admin/service-monitoring')}
              className="px-2 py-1.5 rounded-md text-xs font-medium flex items-center justify-center space-x-1 w-20 bg-green-600 hover:bg-green-700 text-white"
              title={`System uptime: ${(systemMetrics as any)?.uptime || 'Unknown'}`}
            >
              <Clock className="w-3 h-3" />
              <span className="text-[10px]">Uptime</span>
            </button>
            <div className="text-[9px] text-green-400 mt-1 w-20 text-center">
              {(systemMetrics as any)?.uptime?.replace(/\d+d\s/, '').replace(/\d+h\s/, 'h ').replace(/\d+m/, 'm') || 'Loading'}
            </div>
          </div>
          
          {/* Hamburger Menu - matching employee dashboard positioning */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 bg-gray-600/20 hover:bg-gray-600/30 rounded-md mt-1"
          >
            <Menu className="w-3 h-3 text-gray-400" />
          </button>
          
          {/* Settings */}
          <button
            onClick={() => navigate('/mobile/admin/settings')}
            className="p-1 bg-gray-600/20 hover:bg-gray-600/30 rounded-md mt-1"
          >
            <Settings className="w-3 h-3 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Side Menu Overlay */}
      {showMenu && (
        <div className="fixed inset-0 bg-black/50 z-50">
          <div className="bg-[#2A2B5E] w-80 h-full overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[#1A1B3E] flex-shrink-0">
              <h2 className="text-lg font-semibold">Admin Menu</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMenu(false)}
                className="p-1.5"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4" 
                 style={{ 
                   WebkitOverflowScrolling: 'touch',
                   overscrollBehavior: 'contain',
                   touchAction: 'pan-y',
                   maxHeight: 'calc(100vh - 120px)',
                   minHeight: '400px'
                 }}>
              <div className="space-y-1">
              {filteredAdminFeatures.map((feature) => (
                feature.id === 'logout' ? (
                  <div
                    key={feature.id}
                    onClick={() => {
                      setShowMenu(false);
                      handleLogout();
                    }}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center space-x-3 p-2.5 rounded-lg hover:bg-[#1A1B3E] transition-colors">
                      <div className={`p-1.5 rounded-lg ${feature.color}`}>
                        <feature.icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{feature.title}</div>
                        <div className="text-xs text-gray-400">{feature.description}</div>
                      </div>
                      {feature.badge && (
                        <Badge className="bg-green-500 text-white text-xs">
                          {feature.badge}
                        </Badge>
                      )}
                    </div>
                  </div>
                ) : (
                  <Link
                    key={feature.id}
                    to={feature.route}
                    onClick={() => setShowMenu(false)}
                  >
                    <div className="flex items-center space-x-3 p-2.5 rounded-lg hover:bg-[#1A1B3E] transition-colors">
                      <div className={`p-1.5 rounded-lg ${feature.color}`}>
                        <feature.icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{feature.title}</div>
                        <div className="text-xs text-gray-400">{feature.description}</div>
                      </div>
                      {feature.badge && (
                        <Badge className="bg-green-500 text-white text-xs">
                          {feature.badge}
                        </Badge>
                      )}
                    </div>
                  </Link>
                )
              ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Selection Menu */}
      {showStatusMenu && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-[#2A2B5E] rounded-lg shadow-lg border border-gray-700 p-4 w-64">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Set Status</h3>
              <button
                onClick={() => setShowStatusMenu(false)}
                className="p-1 hover:bg-gray-700 rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="space-y-2">
              {['Available', 'Busy', 'On Job', 'Not Available'].map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-700 flex items-center space-x-2 ${
                    userStatus === status ? 'bg-gray-700' : ''
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full ${
                    status === 'Available' ? 'bg-green-500' :
                    status === 'Busy' ? 'bg-red-500' :
                    status === 'On Job' ? 'bg-blue-500' : 'bg-gray-500'
                  }`}></div>
                  <span className="text-white">{status}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-4 pb-40 pt-4 overflow-y-auto h-screen mobile-dashboard-scroll"
           style={{ WebkitOverflowScrolling: 'touch' }}>
        
        {/* Offline Connection Status */}
        <MobileConnectionStatus className="mb-2" />
        
        {/* Unified Announcement Management Access */}
        <div className="bg-[#2A2B5E] border border-gray-700 rounded-lg p-3 mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Megaphone className="w-4 h-4 text-orange-400" />
              <div>
                <h3 className="text-white font-medium text-sm">Announcement Management</h3>
                <p className="text-xs text-gray-400">Quick send & full management in one place</p>
              </div>
            </div>
            <button
              onClick={() => {
                console.log('Opening unified announcement management');
                setShowAnnouncementManagement(true);
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 text-xs rounded flex items-center space-x-1"
            >
              <Zap className="w-3 h-3" />
              <span>Manage</span>
            </button>
          </div>
        </div>

        {/* KPI Panels - Enhanced with Headings - Exact match with employee interface */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-2 px-2">
            <h2 className="text-white font-semibold text-base">Admin Overview</h2>
            <div className="flex items-center space-x-1">
              <Grip className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-400">Drag to reorder</span>
            </div>
          </div>
          <div 
            className="kpi-horizontal-scroll px-2"
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              
              // Calculate drag over position for visual feedback
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const panelWidth = 75 + 8; // 75px width + 8px gap
              let targetIndex = Math.floor(x / panelWidth);
              
              // Clamp target index to valid range
              targetIndex = Math.max(0, Math.min(targetIndex, kpiPanelsOrder.length - 1));
              
              // Update drag over index for visual feedback
              setDragOverIndex(targetIndex);
            }}
            onDragLeave={(e) => {
              // Clear drag over index when leaving the container
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragOverIndex(null);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              const draggedId = e.dataTransfer.getData('text/plain');
              const draggedIndex = kpiPanelsOrder.findIndex(id => id === draggedId);
              
              // Find the target element with relaxed tolerance
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const panelWidth = 75 + 8; // 75px width + 8px gap
              let targetIndex = Math.floor(x / panelWidth);
              
              // Clamp target index to valid range
              targetIndex = Math.max(0, Math.min(targetIndex, kpiPanelsOrder.length - 1));
              
              if (draggedIndex !== -1 && targetIndex !== draggedIndex) {
                // Reorder KPI panels
                const newOrder = [...kpiPanelsOrder];
                const [draggedPanel] = newOrder.splice(draggedIndex, 1);
                newOrder.splice(targetIndex, 0, draggedPanel);
                
                // Update the state with new order
                setKpiPanelsOrder(newOrder);
                
                // Save to localStorage for persistence
                localStorage.setItem('adminKpiPanelsOrder', JSON.stringify(newOrder));
              }
              
              // Clear drag over index
              setDragOverIndex(null);
            }}
          >
            {kpiPanels.map((panel, index) => (
              <div
                key={panel.id}
                draggable
                onDragStart={(e) => {
                  setDraggedKPI(panel.id);
                  e.dataTransfer.setData('text/plain', panel.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={() => {
                  setDraggedKPI(null);
                  setDragOverIndex(null);
                }}
                className={`kpi-scroll-item flex-shrink-0 w-[80px] h-[72px] bg-[#2A2B5E] rounded-xl p-2 border-2 
                          ${draggedKPI === panel.id ? 'border-purple-400 scale-105 opacity-75' : 
                            dragOverIndex === index ? 'border-purple-400' : 'border-[#1A1B3E]'} 
                          hover:border-blue-400 transition-all duration-200 cursor-grab active:cursor-grabbing
                          shadow-lg hover:shadow-xl`}
              >
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <panel.icon className={`w-4 h-4 mb-1 ${panel.color}`} />
                  <span className="text-xs font-bold text-white leading-tight">
                    {panel.value}{panel.suffix}
                  </span>
                  <span className={`${panel.id === 'active_services' || panel.id === 'system_health' ? 'text-[8px]' : 'text-[9px]'} text-gray-400 mt-0.5 leading-none`}>
                    {panel.title}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Status Chart */}
        <Card className="bg-[#2A2B5E] border-gray-700 mb-3">
          <CardHeader>
            <CardTitle className="text-white">Today's Attendance Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <Doughnut data={attendanceChartData} options={chartOptions} />
            </div>
            <div className="flex justify-center space-x-1 mt-2">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-xs">Normal 65%</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-xs">Grace 20%</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-xs">Late 15%</span>
              </div>
            </div>
          </CardContent>
        </Card>





        {/* 48-Hour Punch In/Out Bar Chart */}
        <Card className="bg-[#2A2B5E] border-gray-700 mb-3">
          <CardHeader>
            <CardTitle className="text-white">48-Hour Punch Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <Punch48HourChart />
          </CardContent>
        </Card>




      </div>

      {/* Location Panel - Success/Failure States */}
      {locationSuccess && (
        <div className="fixed bottom-32 left-4 right-4 z-40 bg-green-600/80 backdrop-blur-sm rounded-lg p-2 shadow-lg border border-green-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <div className="text-green-100 text-sm font-medium">Services successfully enabled</div>
            </div>
          </div>
        </div>
      )}
      
      {!hasLocation && locationError && !locationSuccess && (
        <div className="fixed bottom-32 left-4 right-4 z-40 bg-red-600/80 backdrop-blur-sm rounded-lg p-2 shadow-lg border border-red-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-white" />
              <div>
                {locationError ? (
                  <div>
                    <div className="text-white text-sm font-medium">Unable to enable location services</div>
                    <div className="text-red-100 text-xs">Try manually</div>
                  </div>
                ) : (
                  <div>
                    <div className="text-white text-sm font-medium">Enable Location Services otherwise</div>
                    <div className="text-red-100 text-xs">Remote Punch and performance scoring data may be lost</div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex space-x-2">
              {locationError && (
                <button 
                  onClick={openDeviceLocationSettings}
                  className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-purple-700 active:scale-95 transition-all"
                >
                  Manual
                </button>
              )}
              <button 
                onClick={handleLocationStatusClick}
                className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 active:scale-95 transition-all"
              >
                Enable
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Announcement Management Modal */}
      <AnnouncementManagement
        isOpen={showAnnouncementManagement}
        onClose={() => {
          console.log('Closing announcement management modal');
          setShowAnnouncementManagement(false);
        }}
      />

      {/* Device Permission Checker Modal for Admin */}
      {showDeviceChecker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1A1B3E] rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-white font-semibold text-lg flex items-center space-x-2">
                <Shield className="w-5 h-5 text-blue-400" />
                <span>Admin Device Status</span>
              </h3>
              <button
                onClick={() => setShowDeviceChecker(false)}
                className="p-1 hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <DevicePermissionChecker />
            </div>
          </div>
        </div>
      )}

      {/* Standardized Mobile Admin Dual Navigation */}
      <MobileAdminDualNavigation currentPage="dashboard" />
    </div>
  );
}