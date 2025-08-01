import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, BarChart, Bar, Tooltip, RadialBarChart, RadialBar, AreaChart, Area, Legend } from 'recharts';
import { Bell, Star, Trophy, Circle, LogIn, LogOut, TrendingUp, Clock, Users, Target, Power, BarChart3, HelpCircle, X, Award, CheckCircle, AlertTriangle, AlertCircle, XCircle, Calendar, ChevronLeft, ChevronRight, Settings, Camera, User, Home, BarChart2, Zap, Fingerprint, Menu, Activity, MessageSquare, ChevronDown, ChevronUp, Grip, Check, CircleDot, Briefcase, UserCheck, Coffee, FileText, Mail, MapPin, Shield, Database, Monitor, Bug, Smartphone } from 'lucide-react';
import MobileFooter from '@/components/mobile/MobileFooter';
import MobileAdminDualNavigation from '@/components/mobile/MobileAdminDualNavigation';
import { getCurrentPKTTime, formatTime12h, formatMobileDate } from '@/utils/timezone';

interface SystemMetrics {
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

export default function MobileEmployeeDashboard() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [, navigate] = useLocation();

  // Remove the admin-only redirect - admins should see both interfaces
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [isLoadingPunch, setIsLoadingPunch] = useState(false);
  const [punchInTime, setPunchInTime] = useState<Date | null>(null);
  const [shiftStartTime, setShiftStartTime] = useState<Date | null>(null);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showScoreSheet, setShowScoreSheet] = useState(false);
  const [hoursViewMode, setHoursViewMode] = useState<'weekly' | 'monthly'>('weekly');
  const [currentChartIndex, setCurrentChartIndex] = useState(0);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [currentAdminSlide, setCurrentAdminSlide] = useState(0);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [startX, setStartX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  // New state for improvements
  const [userStatus, setUserStatus] = useState<'available' | 'busy' | 'on_job' | 'not_available'>('available');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showScrollingMessages, setShowScrollingMessages] = useState(true);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [kpiScrollPosition, setKpiScrollPosition] = useState(0);
  const [draggedKPI, setDraggedKPI] = useState<string | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [avatarImageUrl, setAvatarImageUrl] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasLocation, setHasLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationSuccess, setLocationSuccess] = useState<string | null>(null);
  const [showLocationSuccess, setShowLocationSuccess] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const kpiContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Employee data query - use existing auth endpoint for admin users
  const { data: employeeData, isLoading: isLoadingEmployee } = useQuery({
    queryKey: ['/api/auth/me'],
    enabled: !!user?.username,
  });

  // Admin system metrics query (only for admin users)
  const { data: adminMetrics, isLoading: isLoadingAdminMetrics } = useQuery({
    queryKey: ['/api/admin/system-metrics'],
    enabled: isAdmin,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Sample data for charts
  const attendanceBreakdown = [
    { name: 'Present', value: 85, color: '#8B5CF6' },
    { name: 'Late', value: 10, color: '#F59E0B' },
    { name: 'Absent', value: 5, color: '#EF4444' }
  ];

  // Weekly data with stacked time categories
  const weeklyData = [
    { day: 'M', label: 'Mon', normal: 6.5, grace: 0.5, late: 1, overtime: 0 },
    { day: 'T', label: 'Tue', normal: 7, grace: 0, late: 0.5, overtime: 0 },
    { day: 'W', label: 'Wed', normal: 8, grace: 0, late: 0, overtime: 0.5 },
    { day: 'T', label: 'Thu', normal: 7.5, grace: 0.5, late: 0, overtime: 0 },
    { day: 'F', label: 'Fri', normal: 6, grace: 0, late: 0, overtime: 0 },
    { day: 'S', label: 'Sat', normal: 4, grace: 0, late: 0, overtime: 0 },
    { day: 'S', label: 'Sun', normal: 0, grace: 0, late: 0, overtime: 0 }
  ];

  // Monthly data with stacked time categories (showing first 31 days)
  const monthlyData = Array.from({ length: 31 }, (_, i) => {
    const date = new Date();
    date.setDate(i + 1);
    const dayLetter = date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
    
    // Generate realistic work data (no work on weekends for most days)
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const baseHours = isWeekend ? 0 : 7 + Math.random() * 2;
    const hasLate = Math.random() > 0.8;
    const hasGrace = Math.random() > 0.7;
    const hasOvertime = Math.random() > 0.6;
    
    return {
      day: (i + 1).toString(),
      dayLetter,
      normal: Math.max(0, baseHours - (hasLate ? 0.5 : 0) - (hasGrace ? 0.5 : 0)),
      grace: hasGrace && !isWeekend ? 0.5 : 0,
      late: hasLate && !isWeekend ? 0.5 : 0,
      overtime: hasOvertime && !isWeekend ? Math.random() * 2 : 0
    };
  });

  const performanceData = [
    { name: 'Punctuality', value: 92, color: '#10B981' },
    { name: 'Attendance', value: 88, color: '#3B82F6' },
    { name: 'Overtime', value: 15, color: '#8B5CF6' }
  ];

  // Attendance punctuality breakdown for doughnut chart
  const punctualityData = isAdminMode ? [
    { name: 'Present', value: adminMetrics?.totalPunchIn || 228, color: '#10B981' },
    { name: 'Absent', value: (adminMetrics?.totalEmployees || 317) - (adminMetrics?.totalPunchIn || 228), color: '#EF4444' },
    { name: 'NonBio', value: adminMetrics?.totalPresent || 73, color: '#3B82F6' }
  ] : [
    { name: 'Normal', value: 65, color: '#10B981' },
    { name: 'Grace', value: 20, color: '#F59E0B' },
    { name: 'Late', value: 15, color: '#EF4444' }
  ];

  // Performance metrics for radial chart
  const performanceMetrics = [
    { name: 'Overall Score', value: 88, fill: '#8B5CF6' },
    { name: 'Punctuality', value: 92, fill: '#10B981' },
    { name: 'Attendance', value: 85, fill: '#3B82F6' },
    { name: 'Productivity', value: 78, fill: '#F59E0B' }
  ];

  // Trend data for area chart
  const trendData = [
    { day: 'Mon', score: 85, hours: 8.2 },
    { day: 'Tue', score: 88, hours: 8.5 },
    { day: 'Wed', score: 92, hours: 9.1 },
    { day: 'Thu', score: 89, hours: 8.8 },
    { day: 'Fri', score: 94, hours: 8.0 },
    { day: 'Sat', score: 78, hours: 4.0 },
    { day: 'Sun', score: 0, hours: 0 }
  ];

  // Employee performance trends data for third chart
  const performanceTrendsData = [
    { week: 'W1', punctuality: 92, consistency: 88, efficiency: 85 },
    { week: 'W2', punctuality: 95, consistency: 90, efficiency: 88 },
    { week: 'W3', punctuality: 88, consistency: 85, efficiency: 92 },
    { week: 'W4', punctuality: 96, consistency: 93, efficiency: 89 },
    { week: 'W5', punctuality: 91, consistency: 87, efficiency: 94 },
    { week: 'W6', punctuality: 94, consistency: 91, efficiency: 86 },
    { week: 'W7', punctuality: 98, consistency: 95, efficiency: 91 },
  ];

  // Fetch employee data removed to avoid duplication - using the one from line 70

  // Sample KPI values with new fields
  const kpiData = {
    hoursToday: 7.5,
    hoursWeek: 42,
    attendanceRate: 96,
    performanceScore: 88,
    currentStreak: 12,
    monthlyRank: 4,
    totalHours: 168,
    missedPunches: 1, // 0=green, 1-2=yellow, 3+=red
    streakDays: 15, // consecutive days without missed punches
    missedOvertime: 3, // overtime opportunities missed
    productivity: 94
  };

  // Function to get color for missed punches based on count
  const getMissedPunchesColor = (count: number) => {
    if (count === 0) return 'text-green-400';
    if (count <= 2) return 'text-cyan-400';
    return 'text-red-400';
  };

  // Scrolling messages/alerts data
  const scrollingMessages = [
    { id: 1, type: 'alert', message: 'Team meeting scheduled for 2:00 PM today', color: 'text-blue-400' },
    { id: 2, type: 'announcement', message: 'New overtime policy effective next week', color: 'text-cyan-400' },
    { id: 3, type: 'reminder', message: 'Submit timesheets by Friday 5 PM', color: 'text-green-400' },
    { id: 4, type: 'celebration', message: 'Congratulations on 15-day attendance streak!', color: 'text-purple-400' },
    { id: 5, type: 'warning', message: 'Update your profile information', color: 'text-purple-400' }
  ];

  // Dynamic KPI panel configuration - switches between employee and admin data
  const getKpiPanels = () => {
    if (isAdminMode && adminMetrics) {
      // Admin KPI panels according to new specifications
      return [
        { id: 'late_arrivals', title: 'Late', value: adminMetrics.totalLateToday || 0, suffix: '', icon: AlertTriangle, color: 'text-red-400' },
        { id: 'total_hours_today', title: 'Total Hours', value: adminMetrics.totalHoursToday || 0, suffix: 'h', icon: Clock, color: 'text-blue-400' },
        { id: 'total_hours_week', title: 'Hours Week', value: adminMetrics.totalHoursWeek || 0, suffix: 'h', icon: BarChart3, color: 'text-cyan-400' },
        { id: 'total_punch_in', title: 'Punch-in Today', value: adminMetrics.totalPunchInToday || adminMetrics.totalPunchIn, suffix: '', icon: LogIn, color: 'text-green-400' },
        { id: 'total_punch_out', title: 'Punch-out Today', value: adminMetrics.totalPunchOutToday || adminMetrics.totalPunchOut, suffix: '', icon: LogOut, color: 'text-indigo-400' },
        { id: 'punchouts_missed', title: 'Punchouts Missed', value: adminMetrics.punchoutsMissed || 0, suffix: '', icon: XCircle, color: 'text-red-400' },
        { id: 'non_bio', title: 'Non-Bio', value: adminMetrics.nonBioAttendance || 0, suffix: '', icon: Users, color: 'text-purple-400' },
        { id: 'absentees', title: 'Absentees', value: adminMetrics.absentees || 0, suffix: '', icon: AlertCircle, color: 'text-purple-400' },
        { id: 'overtime_today', title: 'Overtime', value: adminMetrics.totalOvertimeToday || 0, suffix: 'h', icon: Clock, color: 'text-indigo-400' }
      ];
    } else {
      // Employee KPI panels using employee data
      return [
        { id: 'hours_today', title: 'Today', value: kpiData.hoursToday, suffix: 'h', icon: Clock, color: 'text-blue-400' },
        { id: 'hours_week', title: 'Week', value: kpiData.hoursWeek, suffix: 'h', icon: BarChart3, color: 'text-cyan-400' },
        { id: 'attendance_rate', title: 'Attend', value: kpiData.attendanceRate, suffix: '%', icon: CheckCircle, color: 'text-green-400' },
        { id: 'performance', title: 'On-time', value: kpiData.performanceScore, suffix: '%', icon: Clock, color: 'text-purple-400' },
        { id: 'monthly_rank', title: 'Rank', value: `#${kpiData.monthlyRank}`, suffix: '', icon: Award, color: 'text-cyan-400' },
        { id: 'current_streak', title: 'Streak', value: kpiData.currentStreak, suffix: ' days', icon: Zap, color: 'text-green-400' },
        { id: 'missed_punches', title: 'Missed', value: kpiData.missedPunches, suffix: '', icon: AlertCircle, color: getMissedPunchesColor(kpiData.missedPunches) },
        { id: 'overtime', title: 'Overtime', value: '2.5', suffix: 'h', icon: Clock, color: 'text-blue-400' },
        { id: 'productivity', title: 'Product', value: kpiData.productivity, suffix: '%', icon: TrendingUp, color: 'text-indigo-400' }
      ];
    }
  };

  const kpiPanels = getKpiPanels();

  // Status options with colors and icons
  const statusOptions = [
    { value: 'available', label: 'Available', color: 'text-green-400', bgColor: 'bg-green-500', icon: CheckCircle },
    { value: 'busy', label: 'Busy', color: 'text-cyan-400', bgColor: 'bg-cyan-500', icon: Clock },
    { value: 'on_job', label: 'On Job', color: 'text-blue-400', bgColor: 'bg-blue-500', icon: Briefcase },
    { value: 'not_available', label: 'Not Available', color: 'text-red-400', bgColor: 'bg-red-500', icon: XCircle }
  ];

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Monitor connectivity status
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

  // Check location permission and availability with Google Maps integration
  useEffect(() => {
    const checkLocation = async () => {
      if (!navigator.geolocation) {
        setLocationError('Location not supported');
        setHasLocation(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          setHasLocation(true);
          setLocationError(null);
          
          // Try to get city and country using Google Maps API
          try {
            const { googleMapsService } = await import('@/services/googleMapsService');
            await googleMapsService.initialize();
            
            const locationInfo = await googleMapsService.reverseGeocode(
              position.coords.latitude,
              position.coords.longitude
            );
            
            const city = locationInfo.address.city || 'Unknown City';
            const country = locationInfo.address.country || 'Unknown Country';
            const successMessage = `Location detected, ${city}, ${country}`;
            
            setLocationSuccess(successMessage);
            setShowLocationSuccess(true);
            
            // Hide success message after 5 seconds
            setTimeout(() => {
              setShowLocationSuccess(false);
            }, 5000);
            
          } catch (error) {
            console.log('Google Maps geocoding failed, using fallback:', error);
            // Fallback to basic success message if Google Maps fails
            setLocationSuccess('Location detected successfully');
            setShowLocationSuccess(true);
            
            setTimeout(() => {
              setShowLocationSuccess(false);
            }, 5000);
          }
        },
        (error) => {
          setHasLocation(false);
          setShowLocationSuccess(false);
          switch (error.code) {
            case error.PERMISSION_DENIED:
              setLocationError('Location permission denied');
              break;
            case error.POSITION_UNAVAILABLE:
              setLocationError('Location unavailable');
              break;
            case error.TIMEOUT:
              setLocationError('Location timeout');
              break;
            default:
              setLocationError('Location error');
              break;
          }
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    };

    checkLocation();
    const locationInterval = setInterval(checkLocation, 60000); // Check every minute
    
    return () => clearInterval(locationInterval);
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    if (scrollingMessages.length > 0) {
      const interval = setInterval(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % scrollingMessages.length);
      }, 4000); // Change message every 4 seconds
      return () => clearInterval(interval);
    }
  }, [scrollingMessages.length]);

  // Initialize biometric authentication check
  useEffect(() => {
    const checkBiometricSupport = async () => {
      if ('credentials' in navigator && 'create' in navigator.credentials) {
        try {
          const isSupported = await navigator.credentials.create({
            publicKey: {
              challenge: new Uint8Array(32),
              rp: { name: 'EMS' },
              user: { id: new Uint8Array(16), name: 'test', displayName: 'Test User' },
              pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
              timeout: 60000,
              attestation: 'direct'
            }
          });
          if (isSupported) {
            setBiometricEnabled(true);
          }
        } catch (error) {
          console.log('Biometric authentication not supported');
        }
      }
    };

    checkBiometricSupport();
  }, []);

  // Prevent scrolling for native app experience
  useEffect(() => {
    // Disable body scrolling
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, []);

  // Initialize demo data - in real app this would come from API
  useEffect(() => {
    // Demo: Set shift start time to 9:00 AM today
    const today = new Date();
    const shiftStart = new Date(today);
    shiftStart.setHours(9, 0, 0, 0);
    setShiftStartTime(shiftStart);

    // Demo: Set punch in time to simulate being punched in
    if (isPunchedIn && !punchInTime) {
      const punchTime = new Date();
      punchTime.setHours(9, 15, 0, 0); // Punched in at 9:15 AM (15 minutes late)
      setPunchInTime(punchTime);
    }
  }, [isPunchedIn, punchInTime]);

  // Calculate status information
  const getStatusInfo = () => {
    const now = new Date();
    
    // Check if punched out today (not currently punched in)
    if (!isPunchedIn) {
      // Check if it's still work hours (before 6 PM) and they haven't punched out
      const currentHour = now.getHours();
      const isWorkDay = now.getDay() >= 1 && now.getDay() <= 6; // Monday to Saturday
      const isWorkHours = currentHour >= 8 && currentHour <= 18; // 8 AM to 6 PM
      
      // If it's a work day and work hours, and they're out, show missed punch-out warning
      if (isWorkDay && isWorkHours) {
        return {
          status: 'MISSED PUNCH OUT!',
          color: 'red',
          bgColor: 'bg-red-600/20',
          borderColor: 'border-red-500 border-2',
          textColor: 'text-red-400',
          dotColor: 'bg-red-400 animate-ping',
          animate: true
        };
      }
      
      // Normal "OUT" status for non-work hours
      return {
        status: 'OUT',
        color: 'gray',
        bgColor: 'bg-gray-600/10',
        borderColor: 'border-gray-500',
        textColor: 'text-gray-400',
        dotColor: 'bg-gray-400',
        animate: false
      };
    }

    // Currently punched in - check for late arrival and work duration
    if (!punchInTime || !shiftStartTime) {
      return {
        status: 'IN',
        color: 'green',
        bgColor: 'bg-green-600/10',
        borderColor: 'border-green-500',
        textColor: 'text-green-400',
        dotColor: 'bg-green-400',
        animate: false
      };
    }

    const timeSincePunch = now.getTime() - punchInTime.getTime();
    const hoursWorked = Math.floor(timeSincePunch / (1000 * 60 * 60));
    const minutesWorked = Math.floor((timeSincePunch % (1000 * 60 * 60)) / (1000 * 60));

    // Check if working too long (over 10 hours) - needs to punch out soon
    if (hoursWorked >= 10) {
      return {
        status: `PUNCH OUT! ${hoursWorked}h ${minutesWorked}m`,
        color: 'red',
        bgColor: 'bg-red-600/20',
        borderColor: 'border-red-500 border-2',
        textColor: 'text-red-400',
        dotColor: 'bg-red-400 animate-ping',
        animate: true
      };
    }

    // Check if punched in late
    const lateMinutes = Math.floor((punchInTime.getTime() - shiftStartTime.getTime()) / (1000 * 60));
    
    if (lateMinutes > 30) {
      // More than 30 minutes late - RED border for LATE
      return {
        status: `LATE +${lateMinutes}m`,
        color: 'red',
        bgColor: 'bg-red-600/10',
        borderColor: 'border-red-500 border-2',
        textColor: 'text-red-400',
        dotColor: 'bg-red-400 animate-ping',
        animate: true
      };
    } else if (lateMinutes > 0 && lateMinutes <= 30) {
      // Grace period - ORANGE border for GRACE
      const graceRemaining = 30 - lateMinutes;
      return {
        status: `GRACE ${graceRemaining}m`,
        color: 'orange',
        bgColor: 'bg-orange-600/10',
        borderColor: 'border-orange-500 border-2',
        textColor: 'text-orange-400',
        dotColor: 'bg-orange-400 animate-pulse',
        animate: true
      };
    } else {
      // On time - GREEN border for ON TIME
      return {
        status: `ON SHIFT ${hoursWorked}h ${minutesWorked}m`,
        color: 'green',
        bgColor: 'bg-green-600/10',
        borderColor: 'border-green-500 border-2',
        textColor: 'text-green-400',
        dotColor: 'bg-green-400',
        animate: false
      };
    }
  };

  const formatTime = (date: Date) => {
    return formatTime12h(date);
  };

  const formatDate = (date: Date) => {
    return formatMobileDate(date);
  };

  const getName = () => {
    return employeeData?.firstName && employeeData?.lastName 
      ? `${employeeData.firstName} ${employeeData.lastName}`
      : user?.username || 'Employee';
  };

  const getInitials = () => {
    const name = getName();
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handlePunchIn = async () => {
    setIsLoadingPunch(true);
    try {
      const response = await fetch('/api/attendance/punch-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeCode: user?.username,
          location: 'Mobile App',
          timestamp: new Date().toISOString(),
        }),
      });
      
      if (response.ok) {
        setIsPunchedIn(true);
      }
    } catch (error) {
      console.error('Punch in failed:', error);
    } finally {
      setIsLoadingPunch(false);
    }
  };

  const handlePunchOut = async () => {
    setIsLoadingPunch(true);
    try {
      const response = await fetch('/api/attendance/punch-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeCode: user?.username,
          location: 'Mobile App',
          timestamp: new Date().toISOString(),
        }),
      });
      
      if (response.ok) {
        setIsPunchedIn(false);
      }
    } catch (error) {
      console.error('Punch out failed:', error);
    } finally {
      setIsLoadingPunch(false);
    }
  };

  const handleForceLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // New helper functions for features
  const handleStatusChange = (newStatus: typeof userStatus) => {
    setUserStatus(newStatus);
    setShowStatusMenu(false);
    // In real app, would save to API
  };

  const handleAvatarClick = () => {
    setShowAvatarMenu(!showAvatarMenu);
  };

  // Avatar photo handlers
  const handleTakePhoto = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
    setShowAvatarMenu(false);
  };

  const handleChoosePhoto = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
    setShowAvatarMenu(false);
  };

  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        setAvatarImageUrl(imageUrl);
        // TODO: Upload to server
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        setAvatarImageUrl(imageUrl);
        // TODO: Upload to server
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBiometricAuth = async () => {
    if (!biometricEnabled) return;
    
    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: { name: 'EMS' },
          user: { id: new Uint8Array(16), name: user?.username || 'user', displayName: getName() },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          timeout: 60000,
          attestation: 'direct'
        }
      });
      
      if (credential) {
        console.log('Biometric authentication successful');
        // Handle successful authentication
      }
    } catch (error) {
      console.error('Biometric authentication failed:', error);
    }
  };

  const getCurrentStatus = () => {
    return statusOptions.find(option => option.value === userStatus) || statusOptions[0];
  };

  // Swipe handlers for chart navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const endX = e.changedTouches[0].clientX;
    const diff = startX - endX;
    
    // Minimum swipe distance threshold
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentChartIndex < 2) {
        // Swipe left - next chart
        setCurrentChartIndex(currentChartIndex + 1);
      } else if (diff < 0 && currentChartIndex > 0) {
        // Swipe right - previous chart
        setCurrentChartIndex(currentChartIndex - 1);
      }
    }
  };

  if (isLoadingEmployee || (isAdminMode && isLoadingAdminMetrics)) {
    return (
      <div className="h-screen bg-[#1A1B3E] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#1A1B3E] text-white overflow-hidden flex flex-col fixed inset-0 pb-36">
      {/* Hidden file inputs for photo selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoSelect}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoCapture}
        className="hidden"
      />
      
      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 text-sm">
        <div className="font-medium">{getCurrentPKTTime()}</div>
        <div className="flex items-center space-x-2">
          {/* Connectivity Status - Green dot for online, Red for offline */}
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`} title={isOnline ? 'Online' : 'Offline'}></div>
          {/* Location Status - Green dot for available, Red for unavailable */}
          <div className={`w-2 h-2 rounded-full ${hasLocation ? 'bg-green-400' : 'bg-red-400'}`} title={hasLocation ? 'Location Available' : locationError || 'Location Unavailable'}></div>
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

      {/* Header with Profile and Status */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 relative">
        <div className="flex items-center space-x-3">
          {/* Avatar with Photo Change Option */}
          <div className="relative">
            <div 
              onClick={handleAvatarClick}
              className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer relative"
              style={{ 
                background: avatarImageUrl ? `url(${avatarImageUrl})` : 'linear-gradient(to bottom right, #8B5CF6, #3B82F6)',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              {!avatarImageUrl && (
                <span className="text-white font-semibold text-sm">{getInitials()}</span>
              )}
              <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border border-[#1A1B3E] flex items-center justify-center">
                <Camera className="w-2 h-2 text-white" />
              </div>
            </div>
            
            {/* Status indicator */}
            <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${getCurrentStatus().bgColor} border border-[#1A1B3E] flex items-center justify-center`}>
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          </div>
          
          {/* User Info and Status */}
          <div>
            <h2 className="text-white font-semibold text-base">{getName()}</h2>
            <div className="flex items-center space-x-2">
              <div 
                onClick={() => setShowStatusMenu(true)}
                className={`px-2 py-1 rounded-full text-xs font-medium cursor-pointer ${getCurrentStatus().color} bg-opacity-20 border border-opacity-50`}
              >
                {getCurrentStatus().label}
              </div>
              {employeeData?.designation && (
                <>
                  <span className="text-gray-500 text-xs">•</span>
                  <p className="text-gray-400 text-xs">{employeeData.designation}</p>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Right side actions */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          {/* Biometric Auth Button */}
          {biometricEnabled && (
            <button
              onClick={handleBiometricAuth}
              className="p-2 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg flex-shrink-0"
            >
              <Fingerprint className="w-4 h-4 text-purple-400" />
            </button>
          )}
          
          {/* Smart Punch Button - Navigate to Enhanced Interface */}
          <button
            onClick={() => navigate('/mobile/punch')}
            disabled={!isOnline || !hasLocation}
            title={!hasLocation ? 'Please enable Location services' : ''}
            className={`px-2 py-2 rounded-lg font-medium flex items-center space-x-1 min-w-[60px] max-w-[80px] flex-shrink-0 ${
              !isOnline || !hasLocation
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed text-xs'
                : isPunchedIn 
                  ? 'bg-red-600 hover:bg-red-700 text-white text-sm'
                  : 'bg-green-600 hover:bg-green-700 text-white text-sm'
            }`}
          >
            {!isOnline || !hasLocation ? (
              <MapPin className="w-3 h-3 flex-shrink-0" />
            ) : isPunchedIn ? (
              <LogOut className="w-3 h-3 flex-shrink-0" />
            ) : (
              <LogIn className="w-3 h-3 flex-shrink-0" />
            )}
            <span className="text-center flex-1 truncate text-xs font-semibold">
              {!isOnline ? 'OFF' :
               !hasLocation ? 'LOC' : 
               isPunchedIn ? 'OUT' : 'IN'}
            </span>
          </button>

          {/* Admin Toggle Switch - Only for admin users - RIGHT SIDE - VERTICALLY ALIGNED */}
          {isAdmin && (
            <div className="flex flex-col items-center justify-center space-y-1 h-10 flex-shrink-0">
              <span className="text-xs text-gray-400">Admin</span>
              <button
                onClick={() => setIsAdminMode(!isAdminMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isAdminMode ? 'bg-purple-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isAdminMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}

          {/* Settings */}
          <button
            onClick={() => navigate('/mobile/settings')}
            className="p-1.5 bg-gray-600/20 hover:bg-gray-600/30 rounded-lg flex-shrink-0"
          >
            <Settings className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        
        {/* Avatar Menu */}
        {showAvatarMenu && (
          <div className="absolute top-16 left-4 bg-[#2A2B5E] rounded-lg shadow-lg border border-gray-700 py-2 w-48 z-50">
            <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-700">
              Profile Photo
            </div>
            <button
              onClick={handleTakePhoto}
              className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 flex items-center space-x-2"
            >
              <Camera className="w-4 h-4" />
              <span>Take Photo</span>
            </button>
            <button
              onClick={handleChoosePhoto}
              className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 flex items-center space-x-2"
            >
              <User className="w-4 h-4" />
              <span>Choose Photo</span>
            </button>
            <div className="border-t border-gray-700 mt-2">
              <button
                onClick={() => navigate('/mobile/my-profile')}
                className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 flex items-center space-x-2"
              >
                <User className="w-4 h-4" />
                <span>View Profile</span>
              </button>
              <button
                onClick={() => setShowAvatarMenu(false)}
                className="w-full px-4 py-2 text-left text-gray-400 hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        )}
        
        {/* Status Menu */}
        {showStatusMenu && (
          <div className="absolute top-16 left-20 bg-[#2A2B5E] rounded-lg shadow-lg border border-gray-700 py-2 w-40 z-50">
            {statusOptions.map((status) => (
              <button
                key={status.value}
                onClick={() => handleStatusChange(status.value)}
                className={`w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center space-x-2 ${
                  userStatus === status.value ? 'bg-gray-700' : ''
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${status.bgColor}`}></div>
                <span className={status.color}>{status.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Admin Panel - Only show when admin toggle is enabled */}
      {isAdmin && showAdminPanel && (
        <div className="flex-1 overflow-hidden">
          <div className="text-center text-white p-8">
            <h2 className="text-xl font-bold mb-4">Admin Panel</h2>
            <p className="text-gray-400">Navigate to /mobile/admin/dashboard for admin features</p>
          </div>
        </div>
      )}
      
      {/* Employee Interface - Show when admin toggle is off OR user is not admin */}
      {(!isAdmin || !showAdminPanel) && (
        <>
          {/* Only show connectivity alert for offline status */}
          {!isOnline && (
        <div className="bg-red-600/20 border border-red-500/50 mx-4 mt-2 px-3 py-2 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-sm">No internet connection</span>
          </div>
        </div>
      )}
      
      {/* Scrolling Messages/Alerts */}
      {(showScrollingMessages || !hasLocation || showLocationSuccess) && (
        <div className={`border-b border-gray-800 py-2 px-4 relative overflow-hidden ${
          !hasLocation ? 'bg-red-600/20 border-red-500/50' : 
          showLocationSuccess ? 'bg-green-600/20 border-green-500/50' : 
          'bg-[#2A2B5E]'
        }`}>
          <div className="flex items-center space-x-2">
            {!hasLocation ? (
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            ) : showLocationSuccess ? (
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
            ) : (
              <MessageSquare className="w-4 h-4 text-blue-400 flex-shrink-0" />
            )}
            <div className="flex-1 overflow-hidden">
              <div className="animate-pulse">
                <span className={`text-sm ${
                  !hasLocation ? 'text-red-400' : 
                  showLocationSuccess ? 'text-green-400' :
                  scrollingMessages[currentMessageIndex]?.color || 'text-white'
                }`}>
                  {!hasLocation ? 'Please Enable Location Services' : 
                   showLocationSuccess ? locationSuccess :
                   scrollingMessages[currentMessageIndex]?.message}
                </span>
              </div>
            </div>
            {!hasLocation ? null : (
              <button
                onClick={() => {
                  if (showLocationSuccess) {
                    setShowLocationSuccess(false);
                  } else {
                    setShowScrollingMessages(false);
                  }
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Scrollable and Draggable KPI Panels */}
      <div className="w-full overflow-hidden">
        <div 
          ref={kpiContainerRef}
          className="flex overflow-x-auto scrollbar-hide space-x-2 pb-2 px-2 mt-2"
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            scrollBehavior: 'smooth'
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(e) => {
            e.preventDefault();
            const draggedId = e.dataTransfer.getData('text/plain');
            const draggedIndex = kpiPanels.findIndex(p => p.id === draggedId);
            
            // Find target element
            const targetElement = e.target.closest('[draggable="true"]');
            if (!targetElement) return;
            
            const targetId = targetElement.getAttribute('data-panel-id');
            const targetIndex = kpiPanels.findIndex(p => p.id === targetId);
            
            if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
              // Reorder KPI panels
              const newPanels = [...kpiPanels];
              const [draggedPanel] = newPanels.splice(draggedIndex, 1);
              newPanels.splice(targetIndex, 0, draggedPanel);
              
              // Update the state with new order
              if (isAdminMode) {
                localStorage.setItem('adminKPIOrder', JSON.stringify(newPanels.map(p => p.id)));
              } else {
                localStorage.setItem('employeeKPIOrder', JSON.stringify(newPanels.map(p => p.id)));
              }
              
              // Force re-render by triggering state update
              window.location.reload();
            }
            setDraggedKPI(null);
          }}
        >
          {kpiPanels.map((panel, index) => (
            <div
              key={panel.id}
              data-panel-id={panel.id}
              className={`flex-shrink-0 w-[80px] min-w-[80px] bg-[#2A2B5E] rounded-lg p-1.5 text-center cursor-grab active:cursor-grabbing transform transition-all duration-200 ${
                draggedKPI === panel.id ? 'scale-105 shadow-lg bg-[#3A3B6E] opacity-80' : 'hover:bg-[#3A3B6E]'
              }`}
              draggable={true}
              onDragStart={(e) => {
                setDraggedKPI(panel.id);
                e.dataTransfer.setData('text/plain', panel.id);
                e.dataTransfer.effectAllowed = 'move';
                e.currentTarget.style.opacity = '0.5';
              }}
              onDragEnd={(e) => {
                setDraggedKPI(null);
                e.currentTarget.style.opacity = '1';
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (draggedKPI && draggedKPI !== panel.id) {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }
              }}
              onDragLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
              onTouchStart={(e) => {
                // Enable smooth scrolling on touch
                const container = kpiContainerRef.current;
                if (container) {
                  container.style.scrollBehavior = 'smooth';
                }
              }}
            >
              <div className="flex items-center justify-center mb-1">
                <panel.icon className={`w-3 h-3 ${panel.color}`} />
              </div>
              <div className="text-[8px] text-gray-400 uppercase font-medium leading-tight mb-0.5">{panel.title}</div>
              <div className="text-xs font-bold text-white">{panel.value}{panel.suffix}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-2 overflow-hidden">
        <div className="h-full flex flex-col space-y-2 overflow-hidden">

          {/* Admin Navigation Bar - Replaces Status Box */}
          {isAdminMode && (
            <div className="bg-[#2A2B5E] rounded-lg p-3 border border-purple-500/20">
              <div className="flex items-center justify-around">
                <button
                  onClick={() => navigate('/mobile/admin/analytics')}
                  className="flex flex-col items-center space-y-1 px-2 py-1 rounded-lg transition-all duration-200 active:scale-95"
                >
                  <div className="p-1 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-gray-400" />
                  </div>
                  <span className="text-[9px] text-gray-400 font-medium">Analytics</span>
                </button>
                <button
                  onClick={() => navigate('/mobile/admin/data-continuity')}
                  className="flex flex-col items-center space-y-1 px-2 py-1 rounded-lg transition-all duration-200 active:scale-95"
                >
                  <div className="p-1 rounded-lg flex items-center justify-center">
                    <Database className="w-4 h-4 text-gray-400" />
                  </div>
                  <span className="text-[9px] text-gray-400 font-medium">Data</span>
                </button>
                <button
                  onClick={() => navigate('/mobile/admin/employees')}
                  className="flex flex-col items-center space-y-1 px-2 py-1 rounded-lg transition-all duration-200 active:scale-95"
                >
                  <div className="p-1 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-gray-400" />
                  </div>
                  <span className="text-[9px] text-gray-400 font-medium">Directory</span>
                </button>
                <button
                  onClick={() => navigate('/mobile/admin-whatsapp')}
                  className="flex flex-col items-center space-y-1 px-2 py-1 rounded-lg transition-all duration-200 active:scale-95"
                >
                  <div className="p-1 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-gray-400" />
                  </div>
                  <span className="text-[9px] text-gray-400 font-medium">Communicate</span>
                </button>
                <button
                  onClick={() => navigate('/mobile/attendance')}
                  className="flex flex-col items-center space-y-1 px-2 py-1 rounded-lg transition-all duration-200 active:scale-95"
                >
                  <div className="p-1 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4 text-gray-400" />
                  </div>
                  <span className="text-[9px] text-gray-400 font-medium">Attendance</span>
                </button>
              </div>
            </div>
          )}





          {/* CENTERPIECE: Analytics Charts - Original Configuration */}
          <div 
            ref={chartContainerRef}
            className={`bg-[#2A2B5E] rounded-lg p-3 flex-1 flex flex-col ${isAdminMode ? 'min-h-[500px]' : 'min-h-[400px]'}`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Chart Navigation */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentChartIndex(Math.max(0, currentChartIndex - 1))}
                  disabled={currentChartIndex === 0}
                  className="p-1 rounded-full text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex space-x-1">
                  {[0, 1, 2].map((index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentChartIndex(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        currentChartIndex === index ? 'bg-purple-500' : 'bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setCurrentChartIndex(Math.min(2, currentChartIndex + 1))}
                  disabled={currentChartIndex === 2}
                  className="p-1 rounded-full text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="text-[10px] text-gray-400">
                {currentChartIndex + 1} of 3
              </div>
            </div>

            {/* Chart 1: Large Punctuality Doughnut Chart */}
            {currentChartIndex === 0 && (
              <div className="flex-1 flex flex-col">
                <div className="text-center mb-2">
                  <h3 className="text-white font-medium text-lg mb-1">
                    {isAdminMode ? 'Today\'s Attendance Overview' : 'Attendance Punctuality'}
                  </h3>
                  <div className="text-sm text-gray-400 mb-1">
                    {isAdminMode ? 'All Employees Status' : 'Last 30 Days Performance'}
                  </div>
                </div>
                
                <div className={`flex-1 flex flex-col justify-center items-center relative ${isAdminMode ? 'min-h-[350px] -mt-4' : 'min-h-[350px]'}`}>
                  {/* Large Chart Area - Admin Mode Expanded */}
                  <div className={`w-full h-[300px] relative z-10`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 10, right: 20, bottom: 60, left: 20 }}>
                        <Pie
                          data={punctualityData}
                          cx="50%"
                          cy="40%"
                          innerRadius={40}
                          outerRadius={80}
                          dataKey="value"
                          startAngle={90}
                          endAngle={450}
                        >
                          {punctualityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Legend 
                          verticalAlign="bottom" 
                          height={50}
                          iconType="circle"
                          wrapperStyle={{
                            paddingTop: '20px',
                            fontSize: '12px',
                            color: '#fff'
                          }}
                          formatter={(value, entry) => (
                            <span style={{ color: '#fff', fontSize: '12px' }}>
                              {value} {isAdminMode ? 
                                (value === 'Present' ? `(${adminMetrics?.totalPunchIn || 228})` :
                                 value === 'Absent' ? `(${(adminMetrics?.totalEmployees || 317) - (adminMetrics?.totalPunchIn || 228)})` :
                                 value === 'NonBio' ? `(${adminMetrics?.totalPresent || 73})` : '') :
                                (value === 'Normal' ? '(65%)' :
                                 value === 'Grace' ? '(20%)' :
                                 value === 'Late' ? '(15%)' : '')
                              }
                            </span>
                          )}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: '#1A1B3E',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                </div>
                
                {/* Bottom KPI Row */}
                <div className={`grid grid-cols-3 gap-3 relative z-20 ${isAdminMode ? 'mt-2' : 'mt-4'}`}>
                  {isAdminMode ? (
                    <>
                      <div className="bg-[#1A1B3E] rounded-lg p-3 text-center">
                        <div className="text-xs text-gray-400">PRESENT</div>
                        <div className="text-xl font-bold text-green-400">{adminMetrics?.totalPunchIn || 0}</div>
                      </div>
                      <div className="bg-[#1A1B3E] rounded-lg p-3 text-center">
                        <div className="text-xs text-gray-400">ABSENT</div>
                        <div className="text-xl font-bold text-red-400">{(adminMetrics?.totalEmployees || 0) - (adminMetrics?.totalPunchIn || 0)}</div>
                      </div>
                      <div className="bg-[#1A1B3E] rounded-lg p-3 text-center">
                        <div className="text-xs text-gray-400">RATE</div>
                        <div className="text-xl font-bold text-blue-400">{adminMetrics?.attendanceRate || 0}%</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-[#1A1B3E] rounded-lg p-3 text-center">
                        <div className="text-xs text-gray-400">NORMAL</div>
                        <div className="text-xl font-bold text-green-400">65%</div>
                      </div>
                      <div className="bg-[#1A1B3E] rounded-lg p-3 text-center">
                        <div className="text-xs text-gray-400">GRACE</div>
                        <div className="text-xl font-bold text-orange-400">20%</div>
                      </div>
                      <div className="bg-[#1A1B3E] rounded-lg p-3 text-center">
                        <div className="text-xs text-gray-400">LATE</div>
                        <div className="text-xl font-bold text-red-400">15%</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Chart 2: Large Hours Worked Bar Chart */}
            {currentChartIndex === 1 && (
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-white font-medium text-lg">
                      {hoursViewMode === 'weekly' ? 'Weekly Hours' : 'Monthly Hours'}
                    </h3>
                    <div className="text-sm text-gray-400">Work Time Breakdown</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setHoursViewMode('weekly')}
                      className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                        hoursViewMode === 'weekly' 
                          ? 'bg-purple-500 text-white' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Week
                    </button>
                    <button
                      onClick={() => setHoursViewMode('monthly')}
                      className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                        hoursViewMode === 'monthly' 
                          ? 'bg-purple-500 text-white' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Month
                    </button>
                  </div>
                </div>

                <div className="flex items-center mb-4">
                  {/* Large Chart Area */}
                  <div className="flex-1 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={hoursViewMode === 'weekly' ? weeklyData : monthlyData}
                        margin={{ top: 20, right: 10, left: 10, bottom: 20 }}
                        barCategoryGap="20%"
                        maxBarSize={40}
                      >
                        <XAxis 
                          dataKey="day" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 12, fill: '#9CA3AF' }}
                          interval={0}
                        />
                        <YAxis hide />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: '#1A1B3E',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              const total = data.normal + data.grace + data.late + data.overtime;
                              return (
                                <div className="bg-[#1A1B3E] rounded-lg p-3 border border-gray-700">
                                  <p className="text-white font-medium mb-2">
                                    {hoursViewMode === 'weekly' ? data.label : `Day ${label}`}
                                  </p>
                                  <p className="text-white mb-1">Total: {total.toFixed(1)}h</p>
                                  {payload.map((entry, index) => (
                                    entry.value > 0 && (
                                      <p key={index} style={{ color: entry.color }}>
                                        {entry.name}: {entry.value}h
                                      </p>
                                    )
                                  ))}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="normal" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="grace" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="late" stackId="a" fill="#EF4444" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="overtime" stackId="a" fill="#3B82F6" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    
                    {/* Hour Labels on Top of Bars */}
                    <div className="relative -mt-64 pointer-events-none">
                      <div className="flex items-start justify-around h-64 pt-4">
                        {(hoursViewMode === 'weekly' ? weeklyData : monthlyData).map((item, index) => {
                          const total = item.normal + item.grace + item.late + item.overtime;
                          return (
                            <div key={index} className="flex flex-col items-center">
                              {total > 0 && (
                                <span className="text-sm text-white font-bold bg-black/70 px-2 py-1 rounded">
                                  {total.toFixed(1)}h
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  
                  {/* Right Side Legend */}
                  <div className="w-24 ml-4 space-y-3">
                    <div className="text-center">
                      <div className="w-4 h-4 bg-green-500 rounded-sm mx-auto mb-1"></div>
                      <div className="text-xs text-gray-300">Normal</div>
                    </div>
                    <div className="text-center">
                      <div className="w-4 h-4 bg-orange-500 rounded-sm mx-auto mb-1"></div>
                      <div className="text-xs text-gray-300">Grace</div>
                    </div>
                    <div className="text-center">
                      <div className="w-4 h-4 bg-red-500 rounded-sm mx-auto mb-1"></div>
                      <div className="text-xs text-gray-300">Late</div>
                    </div>
                    <div className="text-center">
                      <div className="w-4 h-4 bg-blue-500 rounded-sm mx-auto mb-1"></div>
                      <div className="text-xs text-gray-300">Overtime</div>
                    </div>
                  </div>
                </div>
                
                {/* Bottom KPI Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#1A1B3E] rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-400">
                      {hoursViewMode === 'weekly' ? 'WEEKLY TOTAL' : 'MONTHLY TOTAL'}
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {hoursViewMode === 'weekly' 
                        ? weeklyData.reduce((sum, day) => sum + day.normal + day.grace + day.late + day.overtime, 0).toFixed(1)
                        : monthlyData.reduce((sum, day) => sum + day.normal + day.grace + day.late + day.overtime, 0).toFixed(1)
                      }h
                    </div>
                  </div>
                  <div className="bg-[#1A1B3E] rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-400">OVERTIME</div>
                    <div className="text-2xl font-bold text-blue-400">
                      {hoursViewMode === 'weekly' 
                        ? weeklyData.reduce((sum, day) => sum + day.overtime, 0).toFixed(1)
                        : monthlyData.reduce((sum, day) => sum + day.overtime, 0).toFixed(1)
                      }h
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Chart 3: Performance Trends - Redesigned Layout */}
            {currentChartIndex === 2 && (
              <div className="flex-1 flex flex-col">
                <div className="text-center mb-4">
                  <h3 className="text-white font-medium text-lg">Performance Trends</h3>
                </div>
                
                {/* Performance Metrics Grid - Centered Layout */}
                <div className="flex-1 flex items-center justify-center">
                  <div className="grid grid-cols-1 gap-4 w-full max-w-xs">
                    {/* Punctuality */}
                    <div className="flex items-center justify-between bg-[#1A1B3E] rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-green-500 rounded-sm"></div>
                        <span className="text-white font-medium">Punctuality</span>
                      </div>
                      <span className="text-2xl font-bold text-green-400">98%</span>
                    </div>
                    
                    {/* Consistency */}
                    <div className="flex items-center justify-between bg-[#1A1B3E] rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-blue-500 rounded-sm"></div>
                        <span className="text-white font-medium">Consistency</span>
                      </div>
                      <span className="text-2xl font-bold text-blue-400">95%</span>
                    </div>
                    
                    {/* Efficiency */}
                    <div className="flex items-center justify-between bg-[#1A1B3E] rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-orange-500 rounded-sm"></div>
                        <span className="text-white font-medium">Efficiency</span>
                      </div>
                      <span className="text-2xl font-bold text-orange-400">91%</span>
                    </div>
                    
                    {/* Overall */}
                    <div className="flex items-center justify-between bg-[#1A1B3E] rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-purple-500 rounded-sm"></div>
                        <span className="text-white font-medium">Overall</span>
                      </div>
                      <span className="text-2xl font-bold text-purple-400">94%</span>
                    </div>
                  </div>
                </div>
                
                {/* Bottom KPI Row */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-[#1A1B3E] rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-400">BEST DAY</div>
                    <div className="text-2xl font-bold text-green-400">Mon</div>
                  </div>
                  <div className="bg-[#1A1B3E] rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-400">COMPLETION</div>
                    <div className="text-2xl font-bold text-purple-400">80%</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#2A2B5E] rounded-xl w-full max-w-sm max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-white font-semibold text-lg flex items-center space-x-2">
                <HelpCircle className="w-5 h-5 text-purple-400" />
                <span>Attendance Rules</span>
              </h3>
              <button
                onClick={() => setShowRulesModal(false)}
                className="p-1 hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                {/* Quick Score Sheet Button */}
                <button
                  onClick={() => {
                    setShowRulesModal(false);
                    setShowScoreSheet(true);
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 rounded-lg p-3 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    <Award className="w-5 h-5 text-white" />
                    <span className="text-white font-medium">Quick Score Sheet</span>
                  </div>
                  <span className="text-purple-200 text-sm">View →</span>
                </button>

                {/* Policy Sections */}
                <div className="space-y-3">
                  <div className="bg-[#1A1B3E] rounded-lg p-3">
                    <h4 className="text-white font-medium text-sm mb-2 flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-green-400" />
                      <span>Working Schedule</span>
                    </h4>
                    <p className="text-gray-300 text-xs">
                      • Work 6 days a week<br/>
                      • Target: 700+ points monthly<br/>
                      • Maximum: 1000 points possible<br/>
                      • Points reset to 0 every month
                    </p>
                  </div>

                  <div className="bg-[#1A1B3E] rounded-lg p-3">
                    <h4 className="text-white font-medium text-sm mb-2 flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-orange-400" />
                      <span>Late Arrival System</span>
                    </h4>
                    <p className="text-gray-300 text-xs">
                      • 1st-3rd time late: Small reduction<br/>
                      • 4th-6th time late: Bigger reduction<br/>
                      • 7+ times late: Major reduction + counseling<br/>
                      • Consistent lateness: Performance review
                    </p>
                  </div>

                  <div className="bg-[#1A1B3E] rounded-lg p-3">
                    <h4 className="text-white font-medium text-sm mb-2 flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-blue-400" />
                      <span>Location Tracking</span>
                    </h4>
                    <p className="text-gray-300 text-xs">
                      • Keep app on with location services<br/>
                      • 8+ hours: +2 points<br/>
                      • 16+ hours: +4 points<br/>
                      • 24 hours: +6 points<br/>
                      • Up to 156 extra points per month!
                    </p>
                  </div>

                  <div className="bg-[#1A1B3E] rounded-lg p-3">
                    <h4 className="text-white font-medium text-sm mb-2 flex items-center space-x-2">
                      <XCircle className="w-4 h-4 text-red-400" />
                      <span>Serious Consequences</span>
                    </h4>
                    <p className="text-gray-300 text-xs">
                      • Repeated lateness may result in probation<br/>
                      • Continued poor attendance may lead to termination<br/>
                      • Employment status affected by attendance<br/>
                      • Warning: Take attendance seriously!
                    </p>
                  </div>

                  <div className="bg-[#1A1B3E] rounded-lg p-3">
                    <h4 className="text-white font-medium text-sm mb-2 flex items-center space-x-2">
                      <Award className="w-4 h-4 text-purple-400" />
                      <span>Annual Prizes</span>
                    </h4>
                    <p className="text-gray-300 text-xs">
                      • Best Average Score: 3 Months Salary<br/>
                      • Second Best: 2 Months Salary<br/>
                      • Third Best: 1 Month Salary<br/>
                      • Perfect Attendance: Car/Bike Voucher
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Score Sheet Modal */}
      {showScoreSheet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#2A2B5E] rounded-xl w-full max-w-sm max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-white font-semibold text-lg flex items-center space-x-2">
                <Award className="w-5 h-5 text-purple-400" />
                <span>Quick Score Sheet</span>
              </h3>
              <button
                onClick={() => setShowScoreSheet(false)}
                className="p-1 hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-3">
                {/* Daily Points */}
                <div className="bg-[#1A1B3E] rounded-lg p-3">
                  <h4 className="text-green-400 font-medium text-sm mb-2">Daily Attendance Points</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Early arrival (10+ min)</span>
                      <span className="text-green-400 font-medium">22 pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">On-time arrival</span>
                      <span className="text-green-400 font-medium">18 pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Late arrival (up to 30 min)</span>
                      <span className="text-orange-400 font-medium">13 pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Very late arrival</span>
                      <span className="text-red-400 font-medium">4 pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Absent (no show)</span>
                      <span className="text-red-400 font-medium">0 pts</span>
                    </div>
                  </div>
                </div>

                {/* Overtime & Location Bonuses */}
                <div className="bg-[#1A1B3E] rounded-lg p-3">
                  <h4 className="text-blue-400 font-medium text-sm mb-2">Bonus Points</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Work extra hour</span>
                      <span className="text-blue-400 font-medium">+8 pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Leave early (unauthorized)</span>
                      <span className="text-red-400 font-medium">-4 pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">App on 8+ hours</span>
                      <span className="text-purple-400 font-medium">+2 pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">App on 16+ hours</span>
                      <span className="text-purple-400 font-medium">+4 pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">App on 24 hours</span>
                      <span className="text-purple-400 font-medium">+6 pts</span>
                    </div>
                  </div>
                </div>

                {/* Monthly Bonuses */}
                <div className="bg-[#1A1B3E] rounded-lg p-3">
                  <h4 className="text-yellow-400 font-medium text-sm mb-2">Monthly Bonuses</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Come early 15+ days</span>
                      <span className="text-yellow-400 font-medium">+25 pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Work extra 20+ hours</span>
                      <span className="text-yellow-400 font-medium">+30 pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Perfect month (26 days)</span>
                      <span className="text-yellow-400 font-medium">+40 pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">10-15 day streak</span>
                      <span className="text-yellow-400 font-medium">+15 pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">16-20 day streak</span>
                      <span className="text-yellow-400 font-medium">+30 pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">21+ day streak</span>
                      <span className="text-yellow-400 font-medium">+50 pts</span>
                    </div>
                  </div>
                </div>

                {/* CRITICAL: Punch-Out Warning */}
                <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-lg p-3 border border-red-500">
                  <h4 className="text-white font-bold text-sm mb-2 flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-white" />
                    <span>⚠️ PUNCH-OUT REMINDER</span>
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center bg-red-900/50 p-2 rounded">
                      <span className="text-red-100 font-medium">Missed punch-out</span>
                      <span className="text-red-200 font-bold">-3 pts</span>
                    </div>
                    <div className="text-red-100 text-xs">
                      <strong>Don't lose points!</strong> Remember to punch out every day.
                      Missing punch-outs cost you valuable scoring points that could keep you out of the top 3 rankings.
                    </div>
                    <div className="bg-red-900/30 p-2 rounded">
                      <div className="text-red-100 text-xs">
                        <strong>Monthly impact:</strong> 10 missed punch-outs = -30 points!
                        That's enough to drop you out of the top rankings.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rewards & Targets */}
                <div className="bg-gradient-to-r from-yellow-600 to-orange-600 rounded-lg p-3">
                  <h4 className="text-white font-medium text-sm mb-2">Monthly Rewards (Top 3 Only)</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-yellow-100">🥇 1st Place</span>
                      <span className="text-yellow-100 font-bold">15% Salary</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-100">🥈 2nd Place</span>
                      <span className="text-yellow-100 font-bold">10% Salary</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-100">🥉 3rd Place</span>
                      <span className="text-yellow-100 font-bold">5% Salary</span>
                    </div>
                  </div>
                </div>

                {/* Current Score Summary */}
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-3">
                  <h4 className="text-white font-medium text-sm mb-2">Your Progress</h4>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <div className="text-lg font-bold text-white">{kpiData.performanceScore}</div>
                      <div className="text-purple-200">Current</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-white">700+</div>
                      <div className="text-purple-200">Target</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-white">#{kpiData.monthlyRank}</div>
                      <div className="text-purple-200">Rank</div>
                    </div>
                  </div>
                  <div className="mt-2 bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((kpiData.performanceScore / 1000) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-purple-200 mt-1">
                    <span>0</span>
                    <span>1000 Max</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Bottom Navigation */}
      {isAdminMode ? (
        <MobileAdminDualNavigation currentPage="dashboard" />
      ) : (
        <MobileFooter currentPage="dashboard" />
      )}
    </div>
  );
}