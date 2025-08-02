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

import { InlineLoader, CardSkeleton, ChartSkeleton, PlayfulLoader } from '@/components/ui/LoadingAnimations';
// Removed LocationInstructions import to make location alert more compact

// Enhanced geocoding function for detailed location information
const geocodeLocation = async (lat: number, lng: number): Promise<{city: string, area: string}> => {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('Geocoding API request failed');
    }

    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      let city = '';
      let area = '';

      // Extract city and area from address components
      for (const component of result.address_components) {
        if (component.types.includes('locality')) {
          city = component.long_name;
        } else if (component.types.includes('sublocality') || component.types.includes('sublocality_level_1')) {
          area = component.long_name;
        } else if (!city && component.types.includes('administrative_area_level_2')) {
          city = component.long_name;
        } else if (!area && component.types.includes('neighborhood')) {
          area = component.long_name;
        }
      }

      // Fallback: use formatted address parts if specific components not found
      if (!city || !area) {
        const addressParts = result.formatted_address.split(', ');
        if (addressParts.length >= 2) {
          if (!city) city = addressParts[addressParts.length - 3] || addressParts[0];
          if (!area) area = addressParts[0];
        }
      }

      return {
        city: city || 'Unknown City',
        area: area || 'Unknown Area'
      };
    } else {
      throw new Error('No geocoding results found');
    }
  } catch (error) {
    console.warn('Geocoding failed:', error);
    // Return default values instead of throwing
    return {
      city: 'Location Available',
      area: 'Coordinates Only'
    };
  }
};

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function MobileEmployeeDashboard() {
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('MobileEmployeeDashboard mounted, user:', user);
    setIsLoading(false);
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

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
  const [isLoadingPunch, setIsLoadingPunch] = useState(false);
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [punchInTime, setPunchInTime] = useState<Date | null>(null);
  const [punchOutTime, setPunchOutTime] = useState<Date | null>(null);
  const [shiftStartTime, setShiftStartTime] = useState<Date | null>(null);
  const [punchStatus, setPunchStatus] = useState<any>(null);
  const [userStatus, setUserStatus] = useState('Active');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [tempPhotoUrl, setTempPhotoUrl] = useState<string | null>(null);
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [avatarImageUrl, setAvatarImageUrl] = useState<string | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [showManualLocationModal, setShowManualLocationModal] = useState(false);
  const [manualLocationName, setManualLocationName] = useState('');
  const [punchStatusMessage, setPunchStatusMessage] = useState('');
  const [showPunchStatus, setShowPunchStatus] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<any>(null);

  // Refs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // One-click location services enablement - triggers browser permission request
  const handleLocationStatusClick = async () => {
    console.log('📍 Location status clicked - enabling location services');

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
        console.log('🔍 Current location permission:', permission.state);

        if (permission.state === 'denied') {
          console.log('❌ Location permission denied - opening manual settings');
          setLocationError('Location permission denied');
          return;
        }
      }

      // Trigger location permission request and get position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('✅ Location services enabled successfully:', position);
          setHasLocation(true);
          setLocationError(null);
          setLocationSuccess(true);

          // Enhanced location storage with geocoding
          const locationData = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now(),
            enabled: true,
            city: '',
            area: ''
          };

          // Perform reverse geocoding to get city and area information
          geocodeLocation(position.coords.latitude, position.coords.longitude)
            .then((geocodedData) => {
              locationData.city = geocodedData.city;
              locationData.area = geocodedData.area;

              setCurrentLocation(locationData);
              localStorage.setItem('lastKnownLocation', JSON.stringify(locationData));
              console.log('📍 Enhanced location with geocoding:', geocodedData);
            })
            .catch((error) => {
              console.warn('⚠️ Geocoding failed, using coordinates only:', error);
              setCurrentLocation(locationData);
              localStorage.setItem('lastKnownLocation', JSON.stringify(locationData));
            });

          // Update location status globally
          localStorage.setItem('locationServicesEnabled', 'true');

          // Auto-dismiss success message after 3 seconds
          setTimeout(() => {
            setLocationSuccess(false);
          }, 3000);
        },
        (error) => {
          console.log('❌ Location access failed:', error.code, error.message);

          let errorMessage = 'Unable to enable location services';

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied';
              // Update status to show manual option
              setLocationError(errorMessage);
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              setLocationError(errorMessage);
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              setLocationError(errorMessage);
              break;
            default:
              setLocationError(errorMessage);
              break;
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0  // Force fresh location to trigger permission request
        }
      );

      // Also setup location watching for continuous access
      if (navigator.geolocation.watchPosition) {
        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            console.log('📍 Location watching active:', position.coords);
            setHasLocation(true);
            setLocationError(null);
          },
          (error) => {
            console.log('⚠️ Location watching error:', error);
          },
          {
            enableHighAccuracy: false,
            timeout: 30000,
            maximumAge: 60000
          }
        );

        // Store watch ID for cleanup
        localStorage.setItem('locationWatchId', watchId.toString());
      }

    } catch (error) {
      console.error('❌ Location enablement error:', error);
      setLocationError('Failed to enable location services');
    }
  };

  // Function to open device-specific location settings with Always On instructions
  const openDeviceLocationSettings = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroid = userAgent.includes('android');
    const isIOS = /iphone|ipad|ipod/.test(userAgent);

    if (isIOS) {
      // For iOS, attempt to open Settings app with detailed instructions
      alert('To enable location services:\n\n1. Opening iOS Settings → Privacy & Security → Location Services\n2. Enable Location Services (main toggle)\n3. Find this app in the list and set to "While Using App"\n4. Also enable "Precise Location"\n5. For best results, set app to "Always On" in iOS Settings → Battery');
      window.open('prefs:root=Privacy&path=LOCATION', '_blank');
    } else if (isAndroid) {
      // For Android, attempt to open location settings with Always On instructions
      alert('To enable location services:\n\n1. Opening Android Settings → Apps & notifications\n2. Find this app → Permissions → Location\n3. Select "Allow all the time" for best performance\n4. Also go to Settings → Apps → This app → Battery → Battery optimization → "Don\'t optimize"\n5. This keeps the app "Always On" for location access');
      window.open('intent://settings/location_source_settings#Intent;scheme=android-app;package=com.android.settings;end', '_blank');
    } else {
      // For desktop browsers, provide instructions with Always On for PWA
      alert('To enable location services:\n\n1. Click the location icon in your browser address bar\n2. Select "Allow" when prompted\n3. For browser settings: go to Site Settings → Location → Allow\n4. If using as PWA: Enable "Always On" notifications in browser settings\n5. Consider pinning this app for persistent access');
    }
  };

  // Additional state variables (non-duplicates)
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showScoreSheet, setShowScoreSheet] = useState(false);
  const [hoursViewMode, setHoursViewMode] = useState<'weekly' | 'monthly'>('weekly');
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollingMessages, setShowScrollingMessages] = useState(true);
  const [kpiScrollPosition, setKpiScrollPosition] = useState(0);
  const [draggedKPI, setDraggedKPI] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [locationRefreshInterval, setLocationRefreshInterval] = useState<number>(60);
  const [showLocationSettings, setShowLocationSettings] = useState(false);
  const [showDeviceChecker, setShowDeviceChecker] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({
    isOnline: navigator.onLine,
    isMobile: /Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(navigator.userAgent),
    hasLocationAccess: false,
    batteryLevel: null as number | null
  });
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const kpiContainerRef = useRef<HTMLDivElement>(null);

  // Initialize location piggyback service and load existing location data
  useEffect(() => {
    if (user) {
      locationPiggybackService.initialize({
        id: user.id.toString(),
        code: user.username,
        name: (user as any).employeeId || user.username
      });
    }

    // Load existing location data from localStorage
    const savedLocation = localStorage.getItem('lastKnownLocation');
    if (savedLocation) {
      try {
        const locationData = JSON.parse(savedLocation);
        // Check if location is recent (within 6 hours)
        const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
        if (locationData.timestamp && locationData.timestamp > sixHoursAgo) {
          setCurrentLocation(locationData);
          setHasLocation(true);
          console.log('📍 Loaded recent location from cache:', locationData);
        } else {
          console.log('⏰ Cached location is too old, will request fresh location');
          localStorage.removeItem('lastKnownLocation');
        }
      } catch (error) {
        console.warn('Failed to parse saved location data:', error);
        localStorage.removeItem('lastKnownLocation');
      }
    }

    return () => {
      locationPiggybackService.stop();
    };
  }, [user]);

  // Query for punch status with offline support  
  const { data: punchStatusData, isLoading: punchStatusLoading, refetch: refetchPunchStatus } = useQuery({
    queryKey: ['/api/mobile-attendance/punch-status'],
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 0 // Always fresh data
  });

  // Dashboard metrics with offline support for employee dashboard
  const { data: dashboardMetrics, isLoading: metricsLoading, isOffline } = useOfflineDashboardMetrics();
  const { isOnline: connectionStatus } = useConnectionStatus();

  // Sync manager for offline data collection and transmission
  const { queueAttendancePunch, queueLocationUpdate, queueUserAction } = useSyncManager();

  // Smart punch button handlers with offline sync capability
  const handlePunchIn = async () => {
    setIsLoadingPunch(true);

    try {
      // Get location data for attendance
      const locationData = await locationPiggybackService.getLocationForAttendance(user?.username || '', 'in');

      const punchData = {
        employeeId: user?.username || '',
        action: 'in' as const,
        timestamp: Date.now(),
        location: locationData ? {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          source: locationData.source
        } : undefined,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          online: connectionStatus
        }
      };

      if (connectionStatus) {
        // Online - try immediate API call
        try {
          const response = await fetch(`/api/mobile-attendance/punch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'in',
              location: punchData.location
            })
          });

          if (response.ok) {
            setPunchStatusMessage('Successfully punched in!');
            setIsPunchedIn(true);
            setPunchInTime(new Date());
            // Refresh punch status to get latest data
            refetchPunchStatus();
          } else {
            throw new Error('API call failed');
          }
        } catch (error) {
          // API failed but online - queue for retry
          await queueAttendancePunch(punchData);
          setPunchStatusMessage('Punch recorded locally. Will sync when stable connection is available.');
        }
      } else {
        // Offline - queue for sync
        await queueAttendancePunch(punchData);
        setPunchStatusMessage('Offline mode: Punch recorded locally. Will sync when internet is restored.');
        setIsPunchedIn(true);
        setPunchInTime(new Date());
      }

      setShowPunchStatus(true);

      // Auto-hide status message after 3 seconds
      setTimeout(() => {
        setShowPunchStatus(false);
      }, 3000);

    } catch (error) {
      console.error('Punch-in failed:', error);
      setPunchStatusMessage('Failed to record punch. Please try again.');
      setShowPunchStatus(true);

      // Auto-hide error message after 5 seconds
      setTimeout(() => {
        setShowPunchStatus(false);
      }, 5000);
    } finally {
      setIsLoadingPunch(false);
    }
  };

  const handlePunchOut = async () => {
    setIsLoadingPunch(true);

    try {
      // Get location data for attendance
      const locationData = await locationPiggybackService.getLocationForAttendance(user?.username || '', 'out');

      const punchData = {
        employeeId: user?.username || '',
        action: 'out' as const,
        timestamp: Date.now(),
        location: locationData ? {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          source: locationData.source
        } : undefined,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          online: connectionStatus
        }
      };

      if (connectionStatus) {
        // Online - try immediate API call
        try {
          const response = await fetch(`/api/mobile-attendance/punch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'out',
              location: punchData.location
            })
          });

          if (response.ok) {
            setPunchStatusMessage('Successfully punched out!');
            setIsPunchedIn(false);
            setPunchOutTime(new Date());
            // Refresh punch status to get latest data
            refetchPunchStatus();
          } else {
            throw new Error('API call failed');
          }
        } catch (error) {
          // API failed but online - queue for retry
          await queueAttendancePunch(punchData);
          setPunchStatusMessage('Punch recorded locally. Will sync when stable connection is available.');
        }
      } else {
        // Offline - queue for sync
        await queueAttendancePunch(punchData);
        setPunchStatusMessage('Offline mode: Punch recorded locally. Will sync when internet is restored.');
        setIsPunchedIn(false);
        setPunchOutTime(new Date());
      }

      setShowPunchStatus(true);

      // Auto-hide status message after 3 seconds
      setTimeout(() => {
        setShowPunchStatus(false);
      }, 3000);

    } catch (error) {
      console.error('Punch-out failed:', error);
      setPunchStatusMessage('Failed to record punch. Please try again.');
      setShowPunchStatus(true);

      // Auto-hide error message after 5 seconds
      setTimeout(() => {
        setShowPunchStatus(false);
      }, 5000);
    } finally {
      setIsLoadingPunch(false);
    }
  };

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
  const punctualityData = [
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

  // Fetch employee data
  const { data: employeeData, isLoading: isLoadingEmployee } = useQuery({
    queryKey: ['/api/employees/me'],
    enabled: !!user
  });

  // Fetch employee KPI metrics
  const { data: kpiData, isLoading: isLoadingKPIs, refetch: refetchKPIs } = useQuery({
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

  // Default KPI values if API data not available
  const defaultKpiData = {
    hoursToday: 0,
    hoursWeek: 0,
    attendanceRate: 0,
    performanceScore: 0,
    currentStreak: 0,
    monthlyRank: 0,
    missedPunches: 0,
    overtime: 0,
    productivity: 0,
    weeklyTotal: 0,
    weeklyOvertime: 0
  };

  // Use API data or fallback to defaults
  const displayKpiData = kpiData || defaultKpiData;

  // Function to get color for missed punches based on count
  const getMissedPunchesColor = (count: number) => {
    if (count === 0) return 'text-green-400';
    if (count <= 2) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Dynamic scrolling messages - prioritize urgent announcements with red text
  const scrollingMessages = (() => {
    if (urgentAnnouncements && urgentAnnouncements.length > 0) {
      // Show urgent announcements as red text scrollers
      return urgentAnnouncements.map((announcement: any, index: number) => ({
        id: `urgent_${announcement.id}`,
        type: 'urgent',
        message: announcement.message,
        color: 'text-red-400', // RED TEXT for urgent announcements
        priority: announcement.priority
      }));
    } else {
      // Fallback to standard messages only if no urgent announcements
      return [
        { id: 1, type: 'alert', message: 'Team meeting scheduled for 2:00 PM today', color: 'text-blue-400' },
        { id: 2, type: 'announcement', message: 'New overtime policy effective next week', color: 'text-yellow-400' },
        { id: 3, type: 'reminder', message: 'Submit timesheets by Friday 5 PM', color: 'text-green-400' },
        { id: 4, type: 'celebration', message: 'Congratulations on 15-day attendance streak!', color: 'text-purple-400' },
        { id: 5, type: 'warning', message: 'Update your profile information', color: 'text-orange-400' }
      ];
    }
  })();

  // KPI panel configuration with draggable items - uses real API data with loading state
  const kpiPanelsBase = [
    { id: 'hours_today', title: 'Today', value: isLoadingKPIs ? '...' : (displayKpiData?.hoursToday || 0), suffix: 'h', icon: Clock, color: 'text-blue-400' },
    { id: 'hours_week', title: 'Week', value: isLoadingKPIs ? '...' : (displayKpiData?.hoursWeek || 0), suffix: 'h', icon: BarChart3, color: 'text-cyan-400' },
    { id: 'attendance_rate', title: 'Attend', value: isLoadingKPIs ? '...' : (displayKpiData?.attendanceRate || 0), suffix: '%', icon: CheckCircle, color: 'text-green-400' },
    { id: 'performance', title: 'Score', value: isLoadingKPIs ? '...' : (displayKpiData?.performanceScore || 0), suffix: '%', icon: Trophy, color: 'text-purple-400' },
    { id: 'monthly_rank', title: 'Rank', value: isLoadingKPIs ? '...' : `#${displayKpiData?.monthlyRank || 0}`, suffix: '', icon: Award, color: 'text-orange-400' },
    { id: 'current_streak', title: 'Streak', value: isLoadingKPIs ? '...' : (displayKpiData?.currentStreak || 0), suffix: ' days', icon: Zap, color: 'text-green-400' },
    { id: 'missed_punches', title: 'Missed', value: isLoadingKPIs ? '...' : (displayKpiData?.missedPunches || 0), suffix: '', icon: AlertCircle, color: getMissedPunchesColor(displayKpiData?.missedPunches || 0) },
    { id: 'overtime', title: 'Overtime', value: isLoadingKPIs ? '...' : (displayKpiData?.overtime || 0), suffix: 'h', icon: Clock, color: 'text-blue-400' },
    { id: 'productivity', title: 'Productivity', value: isLoadingKPIs ? '...' : (displayKpiData?.productivity || 0), suffix: '%', icon: TrendingUp, color: 'text-indigo-400' },
    { id: 'weekly_total', title: 'Weekly Total', value: isLoadingKPIs ? '...' : (displayKpiData?.weeklyTotal || 0), suffix: 'h', icon: Calendar, color: 'text-yellow-400' },
    { id: 'weekly_overtime', title: 'Overtime', value: isLoadingKPIs ? '...' : (displayKpiData?.weeklyOvertime || 0), suffix: 'h', icon: Clock, color: 'text-blue-400' }
  ];

  // Get ordered KPI panels based on current order state
  const kpiPanels = kpiPanelsOrder.length > 0 
    ? kpiPanelsOrder.map(id => kpiPanelsBase.find(panel => panel.id === String(id))).filter(Boolean) as typeof kpiPanelsBase
    : kpiPanelsBase;

  // Status options with colors and icons
  const statusOptions = [
    { value: 'available', label: 'Available', color: 'text-green-400', bgColor: 'bg-green-500', icon: CheckCircle },
    { value: 'busy', label: 'Busy', color: 'text-orange-400', bgColor: 'bg-orange-500', icon: Clock },
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

  // Enhanced location detection optimized for Safari and mobile browsers
  useEffect(() => {
    const checkLocation = () => {
      console.log('🔍 Safari/Mobile location check starting...');

      if (!navigator.geolocation) {
        console.log('❌ Geolocation not supported by browser');
        setLocationError('Tap to set location manually');
        setHasLocation(false);
        return;
      }

      console.log('📍 Requesting current position (Safari optimized)...');
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          console.log('✅ Safari location access granted:', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });

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

            const locationData = {
              ...coords,
              address,
              city: city || 'Unknown City',
              area: area || 'Unknown Area',
              timestamp: Date.now()
            };

            setCurrentLocation(locationData);
            setHasLocation(true);
            setLocationError(null);

            // Store enhanced location for fallback
            localStorage.setItem('lastKnownLocation', JSON.stringify(locationData));
          } catch (error) {
            console.error('Geocoding error:', error);
            const locationData = {
              ...coords,
              address: `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`,
              city: 'Unknown City',
              area: 'Unknown Area',
              timestamp: Date.now()
            };

            setCurrentLocation(locationData);
            setHasLocation(true);
            setLocationError(null);

            localStorage.setItem('lastKnownLocation', JSON.stringify(locationData));
          }
        },
        (error) => {
          console.log('❌ Safari location error:', error);
          setHasLocation(false);

          // Check for manual or stored location fallback
          const manualLocation = localStorage.getItem('manualWorkLocation');
          const storedLocation = localStorage.getItem('lastKnownLocation');

          if (manualLocation) {
            console.log('📍 Using manual work location as fallback');
            setHasLocation(true);
            setLocationError(null);
            return;
          }

          if (storedLocation) {
            const location = JSON.parse(storedLocation);
            const isRecent = Date.now() - location.timestamp < 6 * 60 * 60 * 1000; // 6 hours
            if (isRecent) {
              console.log('📍 Using recent stored location as fallback');
              setHasLocation(true);
              setLocationError(null);
              return;
            }
          }

          switch (error.code) {
            case error.PERMISSION_DENIED:
              console.log('🚫 Safari location permission denied');
              setLocationError('Tap to set location manually');
              break;
            case error.POSITION_UNAVAILABLE:
              console.log('📍 Safari position unavailable');
              setLocationError('Tap to set location manually');
              break;
            case error.TIMEOUT:
              console.log('⏰ Safari location timeout');
              setLocationError('Tap to set location manually');
              break;
            default:
              console.log('🔧 Unknown Safari location error');
              setLocationError('Tap to set location manually');
              break;
          }
        },
        { 
          timeout: 15000, // Shorter timeout for better UX
          enableHighAccuracy: true, // Safari handles this well
          maximumAge: 300000 // 5 minutes cache
        }
      );
    };

    // Safari-optimized permission checking with fallback system
    const checkSafariPermissions = async () => {
      // Check manual location first (best option for Replit app users)
      const manualLocation = localStorage.getItem('manualWorkLocation');
      if (manualLocation) {
        console.log('📍 Manual work location found, using as primary');
        setHasLocation(true);
        setLocationError(null);
        return;
      }

      // Check stored location as fallback
      const storedLocation = localStorage.getItem('lastKnownLocation');
      if (storedLocation) {
        const location = JSON.parse(storedLocation);
        const isRecent = Date.now() - location.timestamp < 6 * 60 * 60 * 1000; // 6 hours
        if (isRecent) {
          console.log('📍 Recent location found, using as fallback');
          setHasLocation(true);
          setLocationError(null);
          return;
        }
      }

      // Try native geolocation (works well in Safari)
      if ('permissions' in navigator) {
        try {
          const result = await navigator.permissions.query({ name: 'geolocation' });
          console.log('🔒 Safari geolocation permission:', result.state);

          if (result.state === 'granted') {
            checkLocation();
          } else if (result.state === 'denied') {
            setLocationError('Tap to set location manually');
            setHasLocation(false);
          } else {
            // Permission prompt state - Safari will show proper dialog
            checkLocation();
          }
        } catch (error) {
          console.log('📝 Safari permissions check, trying direct location');
          checkLocation();
        }
      } else {
        console.log('📱 Safari fallback - trying direct location access');
        checkLocation();
      }
    };

    checkSafariPermissions();

    // Check location every 5 minutes (less frequent for better performance)
    const locationInterval = setInterval(checkSafariPermissions, 5 * 60 * 1000);

    return () => clearInterval(locationInterval);
  }, []); // Run once on mount

  // Handle manual location entry
  const handleManualLocationSave = () => {
    if (manualLocationName.trim()) {
      localStorage.setItem('manualWorkLocation', JSON.stringify({
        name: manualLocationName.trim(),
        timestamp: Date.now()
      }));
      setHasLocation(true);
      setLocationError(null);
      setShowManualLocationModal(false);
      setManualLocationName('');
      console.log('📍 Manual location saved:', manualLocationName.trim());
    }
  };



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

  // Get real shift and punch data from API - includes all punch types (biometric, mobile, admin)
  useEffect(() => {
    if (punchStatus && (punchStatus as any)?.data?.data) {
      // Use real data from API instead of demo data
      const statusData = (punchStatus as any).data.data;
      if (statusData.shift_start_time) {
        setShiftStartTime(new Date(statusData.shift_start_time));
      }

      // Track most recent punch-in time from any source (biometric, mobile, admin)
      if (statusData.punch_in_time || statusData.last_punch_in) {
        const latestPunchIn = statusData.punch_in_time || statusData.last_punch_in;
        setPunchInTime(new Date(latestPunchIn));
        setIsPunchedIn(true);
      } else {
        setIsPunchedIn(false);
        setPunchInTime(null);
      }

      // Track most recent punch-out time from any source (biometric, mobile, admin)
      if (statusData.punch_out_time || statusData.last_punch_out) {
        const latestPunchOut = statusData.punch_out_time || statusData.last_punch_out;
        setPunchOutTime(new Date(latestPunchOut));
      }
    }
  }, [punchStatus]);

  // Initialize KPI panels order from localStorage or default - separate effect
  useEffect(() => {
    const savedOrder = localStorage.getItem('kpiPanelsOrder');
    const expectedKPIs = kpiPanelsBase.map(panel => panel.id);

    if (savedOrder) {
      try {
        const parsedOrder = JSON.parse(savedOrder);
        if (Array.isArray(parsedOrder) && parsedOrder.length === expectedKPIs.length) {
          // Check if all expected KPIs are present
          const hasAllKPIs = expectedKPIs.every(id => parsedOrder.includes(id));
          if (hasAllKPIs) {
            setKpiPanelsOrder(parsedOrder);
          } else {
            // Missing KPIs, reset to default
            setKpiPanelsOrder([0, 1, 2, 3]);
            localStorage.setItem('kpiPanelsOrder', JSON.stringify([0, 1, 2, 3]));
          }
        } else {
          // Wrong length, reset to default
          setKpiPanelsOrder([0, 1, 2, 3]);
          localStorage.setItem('kpiPanelsOrder', JSON.stringify([0, 1, 2, 3]));
        }
      } catch (e) {
        setKpiPanelsOrder([0, 1, 2, 3]);
        localStorage.setItem('kpiPanelsOrder', JSON.stringify([0, 1, 2, 3]));
      }
    } else {
      // No saved order, use default
      setKpiPanelsOrder([0, 1, 2, 3]);
      localStorage.setItem('kpiPanelsOrder', JSON.stringify([0, 1, 2, 3]));
    }
  }, []); // Only run once on mount

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
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  // Calculate elapsed time since punch action
  const formatElapsedTime = (startTime: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - startTime.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return "now";
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getName = () => {
    return (employeeData as any)?.firstName && (employeeData as any)?.lastName 
      ? `${(employeeData as any).firstName} ${(employeeData as any).lastName}`
      : user?.username || 'Employee';
  };

  const getInitials = () => {
    const name = getName();
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
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
  const handleStatusChange = (newStatus: "available" | "busy" | "on_job" | "not_available") => {
    setUserStatus(newStatus);
    setShowStatusMenu(false);
    // In real app, would save to API
  };

  const handleAvatarClick = () => {
    setShowAvatarMenu(!showAvatarMenu);
  };

  // Avatar photo handlers with professional photo editor
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
        setTempPhotoUrl(imageUrl);
        setShowPhotoEditor(true);
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
        setTempPhotoUrl(imageUrl);
        setShowPhotoEditor(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoSave = async (croppedImageUrl: string) => {
    setAvatarImageUrl(croppedImageUrl);
    setTempPhotoUrl(null);

    // Save cropped image to server
    try {
      // Convert base64 to blob
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();

      // Create FormData for upload
      const formData = new FormData();
      formData.append('avatar', blob, 'avatar.png');
      formData.append('employeeCode', user?.username || '');

      // Upload to server
      const uploadResponse = await fetch('/api/avatar/upload', {
        method: 'POST',
        body: formData
      });

      if (uploadResponse.ok) {
        console.log('Professional avatar saved successfully with zoom and crop adjustments');
      } else {
        console.error('Failed to upload avatar to server');
      }
    } catch (error) {
      console.error('Failed to save professional avatar:', error);
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

  return (
    <div className="min-h-screen bg-[#1A1B3E] p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-white text-center mb-6">
          <h1 className="text-2xl font-bold">Nexlinx EMS</h1>
          <p className="text-gray-300">Welcome, {user?.username || 'Employee'}</p>
          <p className="text-sm text-gray-400">Role: {user?.role || 'employee'}</p>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <h2 className="text-white font-semibold mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <button className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-lg font-medium transition-colors">
                Clock In
              </button>
              <button className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-lg font-medium transition-colors">
                Clock Out
              </button>
            </div>
          </div>

          {/* Status Card */}
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <h2 className="text-white font-semibold mb-3">Today's Status</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">Status:</span>
                <span className="text-green-400">Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Hours Worked:</span>
                <span className="text-white">0.0 hrs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Last Punch:</span>
                <span className="text-gray-400">Not punched in</span>
              </div>
            </div>
          </div>

          {/* Menu Options */}
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <h2 className="text-white font-semibold mb-3">Menu</h2>
            <div className="space-y-2">
              <button className="w-full text-left text-gray-300 hover:text-white p-2 rounded transition-colors">
                📊 My Attendance
              </button>
              <button className="w-full text-left text-gray-300 hover:text-white p-2 rounded transition-colors">
                👤 My Profile
              </button>
              <button className="w-full text-left text-gray-300 hover:text-white p-2 rounded transition-colors">
                ⚙️ Settings
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