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

  if (isLoading) {
    return (
      <div className="h-screen bg-[#1A1B3E] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#1A1B3E] text-white overflow-hidden flex flex-col fixed inset-0">
      {/* Location troubleshooting removed - using integrated location handling */}
      
      {/* Professional Photo Editor Modal */}
      <PhotoEditor
        isOpen={showPhotoEditor}
        onClose={() => {
          setShowPhotoEditor(false);
          setTempPhotoUrl(null);
        }}
        onSave={handlePhotoSave}
        imageUrl={tempPhotoUrl || undefined}
      />
      
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
        capture="user"
        onChange={handlePhotoCapture}
        className="hidden"
      />
      
      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-1 text-sm">
        <div className="font-medium">{formatTime(currentTime)}</div>
        <div className="flex items-center space-x-2">
          {/* Sync Status Indicator */}
          <SyncStatusIndicator />
          {/* Connectivity Status - Green dot for online, Red for offline */}
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`} title={isOnline ? 'Online' : 'Offline'}></div>
          {/* Location Status - Green dot for available, Red for unavailable, clickable for GPS/manual entry */}
          <div 
            className={`w-2 h-2 rounded-full ${hasLocation ? 'bg-green-400' : 'bg-red-400'} cursor-pointer`} 
            title={hasLocation && currentLocation ? `${currentLocation.city}, ${currentLocation.area}` : (locationError || 'Location Unavailable - Tap to set')}
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

      {/* Location Information Bar - Shows city/area when location is available */}
      {hasLocation && currentLocation && (
        <div className="flex items-center justify-center px-4 py-1 bg-[#2A2B5E] border-b border-gray-800">
          <div className="flex items-center space-x-2 text-xs text-gray-300">
            <MapPin className="w-3 h-3 text-green-400" />
            <span className="text-green-400 font-medium">{currentLocation.city}</span>
            {currentLocation.area && currentLocation.area !== currentLocation.city && (
              <>
                <span className="text-gray-500">•</span>
                <span>{currentLocation.area}</span>
              </>
            )}
            <span className="text-gray-500">•</span>
            <span className="text-gray-400">{Math.round(currentLocation.accuracy)}m accuracy</span>
          </div>
        </div>
      )}

      {/* Punch Status Notification */}
      {showPunchStatus && (
        <div className={`mx-4 mt-2 p-2 rounded-lg text-center text-sm font-medium ${
          punchStatusMessage.includes('successful') 
            ? 'bg-green-600/20 text-green-400 border border-green-600/30' 
            : 'bg-red-600/20 text-red-400 border border-red-600/30'
        }`}>
          {punchStatusMessage}
        </div>
      )}

      {/* Header with Profile and Status */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 relative">
        <div className="flex items-center space-x-3">
          {/* Avatar with Photo Change Option */}
          <div className="relative">
            <div 
              onClick={handleAvatarClick}
              className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer relative"
              style={{ 
                background: avatarImageUrl ? `url(${avatarImageUrl})` : 'linear-gradient(to bottom right, #8B5CF6, #3B82F6)',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              {!avatarImageUrl && (
                <span className="text-white font-semibold text-base">{getInitials()}</span>
              )}
              <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full border border-[#1A1B3E] flex items-center justify-center">
                <Camera className="w-2.5 h-2.5 text-white" />
              </div>
            </div>
            
            {/* Status indicator */}
            <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${getCurrentStatus().bgColor} border border-[#1A1B3E] flex items-center justify-center`}>
              <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
            </div>
          </div>
          
          {/* User Info and Status */}
          <div>
            <h2 className="text-white font-semibold text-base">{getName()}</h2>
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
          {/* Biometric Auth Button */}
          {biometricEnabled && (
            <button
              onClick={handleBiometricAuth}
              className="p-2 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg"
            >
              <Fingerprint className="w-4 h-4 text-purple-400" />
            </button>
          )}
          
          {/* Punch IN Button with Time */}
          <div className="flex flex-col items-center">
            <button
              onClick={handlePunchIn}
              disabled={isLoadingPunch || !isOnline || !hasLocation || isPunchedIn}
              title={!hasLocation ? 'Please enable Location services' : ''}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center justify-center space-x-1 w-16 ${
                !isOnline || !hasLocation || isPunchedIn
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isLoadingPunch ? (
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <LogIn className="w-3 h-3" />
              )}
              <span>IN</span>
            </button>
            {isPunchedIn && punchInTime && (
              <div className="text-[9px] text-green-400 mt-1">
                {formatElapsedTime(punchInTime)}
              </div>
            )}
          </div>
          
          {/* Punch OUT Button with Time */}
          <div className="flex flex-col items-center">
            <button
              onClick={handlePunchOut}
              disabled={isLoadingPunch || !isOnline || !hasLocation || !isPunchedIn}
              title={!hasLocation ? 'Please enable Location services' : ''}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center justify-center space-x-1 w-16 ${
                !isOnline || !hasLocation || !isPunchedIn
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {isLoadingPunch ? (
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <LogOut className="w-3 h-3" />
              )}
              <span>OUT</span>
            </button>
            {!isPunchedIn && punchOutTime && (
              <div className="text-[9px] text-red-400 mt-1 w-16 text-center">
                {formatElapsedTime(punchOutTime)}
              </div>
            )}
          </div>
          
          {/* Return to Admin Button (if accessed from admin) */}
          {isFromAdmin && (
            <button
              onClick={() => navigate('/mobile/admin/dashboard')}
              className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 rounded-md text-xs text-blue-400 font-medium flex items-center space-x-1"
              title="Return to Admin Dashboard"
            >
              <User className="w-3 h-3" />
              <span>Admin</span>
            </button>
          )}
          
          {/* Settings */}
          <button
            onClick={() => navigate('/mobile/settings')}
            className="p-1 bg-gray-600/20 hover:bg-gray-600/30 rounded-md mt-1"
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
              <div>
                <div>Take Photo</div>
                <div className="text-xs text-gray-400">Camera with professional editing</div>
              </div>
            </button>
            <button
              onClick={handleChoosePhoto}
              className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 flex items-center space-x-2"
            >
              <User className="w-4 h-4" />
              <div>
                <div>Choose Photo</div>
                <div className="text-xs text-gray-400">Gallery with zoom & crop</div>
              </div>
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
                onClick={() => handleStatusChange(status.value as "available" | "busy" | "on_job" | "not_available")}
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
      
      {/* Only show connectivity alert for offline status - location handled by enhanced overlay */}
      {!isOnline && (
        <div className="bg-red-600/20 border border-red-500/50 mx-4 mt-1 px-3 py-2 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-sm font-medium">No internet connection</span>
          </div>
        </div>
      )}
      
      {/* Scrolling Messages/Alerts */}
      {showScrollingMessages && scrollingMessages.length > 0 && (
        <div className="bg-[#2A2B5E] border-b border-gray-800 py-2 px-4 relative overflow-hidden">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <div className="flex-1 overflow-hidden">
              <div className="animate-pulse">
                <span className={`text-sm ${scrollingMessages[currentMessageIndex]?.color || 'text-white'}`}>
                  {scrollingMessages[currentMessageIndex]?.message}
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowScrollingMessages(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 p-2 overflow-hidden pb-20">
        <div className="h-full flex flex-col space-y-2 overflow-hidden">
          {/* KPI Panels - Enhanced with Headings */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2 px-2">
              <h2 className="text-white font-semibold text-base">Performance Overview</h2>
              <div className="flex items-center space-x-1">
                <Grip className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-400">Drag to reorder</span>
              </div>
            </div>
            <div 
              ref={kpiContainerRef}
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
              const draggedIndex = kpiPanelsOrder.findIndex(id => id === Number(draggedId));
              
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
                localStorage.setItem('kpiPanelsOrder', JSON.stringify(newOrder));
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
                    <span className="text-[9px] text-gray-400 mt-0.5 leading-none">
                      {panel.title}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CENTERPIECE: Analytics Charts - Expanded Maximum Space */}
          <div 
            ref={chartContainerRef}
            className="bg-[#2A2B5E] rounded-xl p-4 flex-1 flex flex-col min-h-[65vh]"
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
                  <h3 className="text-white font-medium text-base mb-0">Attendance Punctuality</h3>
                  <div className="text-xs text-gray-400">Last 30 Days Performance</div>
                </div>
                
                <div className="flex-1 flex items-center">
                  {/* Large Chart Area */}
                  <div className="flex-1 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={punctualityData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={100}
                          dataKey="value"
                          startAngle={90}
                          endAngle={450}
                        >
                          {punctualityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
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
                  
                  {/* Right Side Legend */}
                  <div className="w-24 ml-4 space-y-4">
                    {punctualityData.map((item, index) => (
                      <div key={index} className="text-center">
                        <div className="w-4 h-4 rounded-full mx-auto mb-1" style={{ backgroundColor: item.color }}></div>
                        <div className="text-xs text-gray-300">{item.name}</div>
                        <div className="text-lg font-bold text-white">{item.value}%</div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Bottom KPI Row */}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="bg-[#1A1B3E] rounded-lg p-2 text-center">
                    <div className="text-[10px] text-gray-400">NORMAL</div>
                    <div className="text-lg font-bold text-green-400">65%</div>
                  </div>
                  <div className="bg-[#1A1B3E] rounded-lg p-2 text-center">
                    <div className="text-[10px] text-gray-400">GRACE</div>
                    <div className="text-lg font-bold text-orange-400">20%</div>
                  </div>
                  <div className="bg-[#1A1B3E] rounded-lg p-2 text-center">
                    <div className="text-[10px] text-gray-400">LATE</div>
                    <div className="text-lg font-bold text-red-400">15%</div>
                  </div>
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
                                    entry.value && Number(entry.value) > 0 && (
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

            {/* Chart 3: Performance Trends Line Chart */}
            {currentChartIndex === 2 && (
              <div className="flex-1 flex flex-col">
                <div className="text-center mb-2">
                  <h3 className="text-white font-medium text-base mb-0">Performance Trends</h3>
                  <div className="text-xs text-gray-400">Weekly Performance Analysis</div>
                </div>
                
                <div className="flex items-center mb-2">
                  {/* Large Chart Area */}
                  <div className="flex-1 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart 
                        data={performanceTrendsData} 
                        margin={{ top: 20, right: 10, left: 10, bottom: 20 }}
                      >
                        <XAxis 
                          dataKey="week" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 12, fill: '#9CA3AF' }}
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
                              return (
                                <div className="bg-[#1A1B3E] rounded-lg p-3 border border-gray-700">
                                  <p className="text-white font-medium mb-2">{label}</p>
                                  <p className="text-green-400">Punctuality: {payload[0].value}%</p>
                                  <p className="text-blue-400">Consistency: {payload[1].value}%</p>
                                  <p className="text-orange-400">Efficiency: {payload[2].value}%</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="punctuality" 
                          stroke="#10B981" 
                          strokeWidth={3}
                          dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="consistency" 
                          stroke="#3B82F6" 
                          strokeWidth={3}
                          dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="efficiency" 
                          stroke="#F59E0B" 
                          strokeWidth={3}
                          dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Right Side Performance Metrics */}
                  <div className="w-24 ml-4 space-y-3">
                    <div className="text-center">
                      <div className="w-4 h-4 bg-green-500 rounded-sm mx-auto mb-1"></div>
                      <div className="text-xs text-gray-300">Punctuality</div>
                      <div className="text-lg font-bold text-green-400">98%</div>
                    </div>
                    <div className="text-center">
                      <div className="w-4 h-4 bg-blue-500 rounded-sm mx-auto mb-1"></div>
                      <div className="text-xs text-gray-300">Consistency</div>
                      <div className="text-lg font-bold text-blue-400">95%</div>
                    </div>
                    <div className="text-center">
                      <div className="w-4 h-4 bg-orange-500 rounded-sm mx-auto mb-1"></div>
                      <div className="text-xs text-gray-300">Efficiency</div>
                      <div className="text-lg font-bold text-orange-400">91%</div>
                    </div>
                    <div className="text-center">
                      <div className="w-4 h-4 bg-purple-500 rounded-sm mx-auto mb-1"></div>
                      <div className="text-xs text-gray-300">Overall</div>
                      <div className="text-lg font-bold text-purple-400">94%</div>
                    </div>
                  </div>
                </div>
                
                {/* Bottom KPI Row */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-[#1A1B3E] rounded-lg p-2 text-center">
                    <div className="text-[10px] text-gray-400">BEST DAY</div>
                    <div className="text-lg font-bold text-green-400">Mon</div>
                  </div>
                  <div className="bg-[#1A1B3E] rounded-lg p-2 text-center">
                    <div className="text-[10px] text-gray-400">COMPLETION</div>
                    <div className="text-lg font-bold text-purple-400">80%</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-purple-500/20">
        <div className="flex items-center justify-around px-1 py-1">
          <button className="flex flex-col items-center space-y-0.5">
            <div className="p-0.5 rounded-lg bg-blue-500">
              <BarChart3 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-[10px] text-white">Dashboard</span>
          </button>
          <button 
            onClick={() => navigate('/mobile/attendance')}
            className="flex flex-col items-center space-y-0.5"
          >
            <div className="p-0.5 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <span className="text-[10px] text-gray-400">Attendance</span>
          </button>
          <button 
            onClick={() => navigate('/mobile/analytics')}
            className="flex flex-col items-center space-y-0.5"
          >
            <div className="p-0.5 rounded-lg">
              <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <span className="text-[10px] text-gray-400">Analytics</span>
          </button>
          <button 
            onClick={() => navigate('/mobile/schedule')}
            className="flex flex-col items-center space-y-0.5"
          >
            <div className="p-0.5 rounded-lg">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <span className="text-[10px] text-gray-400">Schedule</span>
          </button>
          <button 
            onClick={() => navigate('/mobile/leaderboard')}
            className="flex flex-col items-center space-y-0.5"
          >
            <div className="p-0.5 rounded-lg">
              <Trophy className="w-4 h-4 text-gray-400" />
            </div>
            <span className="text-[10px] text-gray-400">Leaderboard</span>
          </button>
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

      {/* Manual Location Entry Modal */}
      {showManualLocationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1A1B3E] rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium text-lg">Set Work Location</h3>
              <button
                onClick={() => setShowManualLocationModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Location Name
                </label>
                <input
                  type="text"
                  value={manualLocationName}
                  onChange={(e) => setManualLocationName(e.target.value)}
                  placeholder="e.g., Head Office, Branch Office, Home"
                  className="w-full p-3 bg-[#2A2B5E] text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                />
              </div>
              
              <div className="bg-[#2A2B5E] rounded-lg p-3">
                <div className="text-sm text-gray-300 mb-2">
                  <strong className="text-purple-400">For Native Apps:</strong>
                </div>
                <div className="text-xs text-gray-400 space-y-1">
                  <p>• Your native app will have full GPS access</p>
                  <p>• Location permissions work properly in native apps</p>
                  <p>• This manual entry is a backup option</p>
                </div>
              </div>
              
              <div className="bg-[#2A2B5E] rounded-lg p-3">
                <div className="text-sm text-gray-300 mb-2">
                  <strong className="text-blue-400">For Safari/Browser:</strong>
                </div>
                <div className="text-xs text-gray-400 space-y-1">
                  <p>• Safari will show "Allow Location" dialog</p>
                  <p>• Much better than Replit app environment</p>
                  <p>• Use manual entry if GPS unavailable</p>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowManualLocationModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleManualLocationSave}
                  disabled={!manualLocationName.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  Save Location
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Location Settings Modal */}
      {showLocationSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1A1B3E] rounded-lg p-6 w-full max-w-md">
            <LocationSettings
              currentInterval={locationRefreshInterval}
              onIntervalChange={(interval) => {
                setLocationRefreshInterval(interval);
                setShowLocationSettings(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Location Panel - Success/Failure States */}
      {locationSuccess && (
        <div className="fixed bottom-24 left-4 right-4 z-40 bg-green-600/20 backdrop-blur-sm rounded-lg p-2 shadow-lg border border-green-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <div className="text-green-100 text-sm font-medium">Services successfully enabled</div>
            </div>
          </div>
        </div>
      )}
      
      {(!hasLocation || locationError) && !locationSuccess && (
        <div className="fixed bottom-24 left-4 right-4 z-40 bg-red-600/20 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-red-500/30">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-red-100 text-sm font-medium mb-2">Location Services Disabled</div>
              <div className="text-red-200 text-xs space-y-1">
                <div>⚠️ Potential data loss during attendance tracking</div>
                <div>⚠️ Remote punch-in functionality may be limited</div>
                <div>⚠️ Performance scoring accuracy reduced</div>
              </div>
              {locationError && (
                <div className="text-red-300 text-xs mt-2 italic">{locationError}</div>
              )}
            </div>
            <div className="flex flex-col space-y-1">
              <button
                onClick={handleLocationStatusClick}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-md font-medium transition-colors"
              >
                Enable
              </button>
              <button
                onClick={() => setShowManualLocationModal(true)}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-md font-medium transition-colors"
              >
                Manual
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Device Permission Checker Modal */}
      {showDeviceChecker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1A1B3E] rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-white font-semibold text-lg flex items-center space-x-2">
                <Shield className="w-5 h-5 text-blue-400" />
                <span>Device Permissions</span>
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

      {/* Use MobileFooter component instead of custom navigation */}
      <MobileFooter currentPage="dashboard" />
    </div>
  );
}