import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Navigation,
  Wifi,
  Battery,
  Shield,
  Target,
  Activity,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import { googleMapsService, type LocationInfo } from '@/services/googleMapsService';

interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  address?: string;
  city?: string;
  state?: string;
}

interface PunchValidation {
  isValid: boolean;
  canPunch: boolean;
  locationType: 'home' | 'office' | 'field_site' | 'unknown';
  distance: number;
  confidence: number;
  violations: string[];
  warnings: string[];
  requiredApproval: boolean;
}

export default function MobilePunchInterface() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState<GeolocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [punchValidation, setPunchValidation] = useState<PunchValidation | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [lastPunch, setLastPunch] = useState<{ type: 'checkin' | 'checkout', time: Date } | null>(null);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Get current location with Google Maps enhancement
  const getCurrentLocation = async (): Promise<GeolocationData | null> => {
    try {
      // Try Google Maps enhanced location first
      const locationInfo: LocationInfo = await googleMapsService.getCurrentLocationWithAddress();
      
      return {
        latitude: locationInfo.coordinates.latitude,
        longitude: locationInfo.coordinates.longitude,
        accuracy: locationInfo.coordinates.accuracy,
        timestamp: Date.now(),
        address: locationInfo.address.formatted,
        city: locationInfo.address.city,
        state: locationInfo.address.state
      };
    } catch (error) {
      console.warn('Google Maps location failed, falling back to basic geolocation:', error);
      
      // Fallback to basic geolocation
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation is not supported'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('Mobile location obtained:', position);
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp,
              address: 'Address unavailable',
              city: 'Unknown',
              state: 'Unknown'
            });
          },
          (error) => {
            console.error('Mobile geolocation error:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            reject(error);
          },
          {
            enableHighAccuracy: false, // Less aggressive for mobile data usage
            timeout: 30000, // Longer timeout for mobile
            maximumAge: 600000 // 10 minutes cache for mobile data optimization
          }
        );
      });
    }
  };

  // Check location permission and get location
  useEffect(() => {
    const checkLocationAndPermission = async () => {
      if (!navigator.geolocation) {
        console.error('Geolocation is not supported');
        setLocationPermission('denied');
        return;
      }

      try {
        // Check permission first
        if (navigator.permissions) {
          const result = await navigator.permissions.query({ name: 'geolocation' });
          console.log('Initial permission state:', result.state);
          setLocationPermission(result.state as 'granted' | 'denied' | 'prompt');
          
          // Log the permission state for debugging
          console.log('Location permission set to:', result.state);
          
          if (result.state === 'granted') {
            // Permission already granted, get location
            const locationData = await getCurrentLocation();
            setLocation(locationData);
          }
          // Don't automatically request permission - let user click button
        } else {
          // Fallback for browsers without permissions API - set as prompt
          setLocationPermission('prompt');
        }
      } catch (error) {
        console.error('Error checking location permission:', error);
        setLocationPermission('prompt');
      }
    };

    checkLocationAndPermission();
  }, []);

  // Validate punch location
  const validatePunchLocation = async (punchType: 'checkin' | 'checkout') => {
    if (!location) return null;

    // Mock validation - in real app, this would call the mobile punch validation service
    const mockValidation: PunchValidation = {
      isValid: location.accuracy < 100,
      canPunch: location.accuracy < 100,
      locationType: 'office',
      distance: 45,
      confidence: 85,
      violations: location.accuracy > 100 ? ['GPS accuracy too low'] : [],
      warnings: location.accuracy > 50 ? ['GPS accuracy is moderate'] : [],
      requiredApproval: false
    };

    return mockValidation;
  };

  // Handle punch action
  const handlePunch = async (punchType: 'checkin' | 'checkout') => {
    setIsLoading(true);
    
    try {
      // Get current location
      const currentLocation = await getCurrentLocation();
      setLocation(currentLocation);
      
      // Validate location
      const validation = await validatePunchLocation(punchType);
      setPunchValidation(validation);
      
      if (validation?.canPunch) {
        // Process punch (mock success)
        setLastPunch({ type: punchType, time: new Date() });
        
        // Navigate back to dashboard after successful punch
        setTimeout(() => {
          navigate('/mobile');
        }, 2000);
      }
    } catch (error) {
      console.error('Punch failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false 
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

  const getLocationStatusColor = () => {
    if (locationPermission === 'denied') return 'text-red-400';
    if (locationPermission === 'prompt') return 'text-orange-400';
    if (!location) return 'text-yellow-400';
    if (location.accuracy < 50) return 'text-green-400';
    if (location.accuracy < 100) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getLocationStatusText = () => {
    if (locationPermission === 'denied') return 'Location permission denied';
    if (locationPermission === 'prompt') return 'Location permission required';
    if (!location) return 'Getting location...';
    if (location.accuracy < 50) return 'Excellent GPS signal';
    if (location.accuracy < 100) return 'Good GPS signal';
    return 'Poor GPS signal';
  };

  return (
    <div className="h-screen bg-[#1A1B3E] text-white overflow-hidden flex flex-col">
      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 text-sm flex-shrink-0">
        <div className="font-medium">{formatTime(currentTime)}</div>
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
          </div>
          <Wifi className="w-3 h-3" />
          <Battery className="w-3 h-3" />
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate('/mobile')}
            className="p-1 rounded-lg hover:bg-gray-800"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div className="flex items-center space-x-2">
            <Target className="w-6 h-6 text-purple-400" />
            <h2 className="text-white font-semibold text-base">Mobile Punch</h2>
          </div>
        </div>
        <button 
          onClick={() => getCurrentLocation().then(setLocation).catch(console.error)}
          className="p-2 rounded-lg hover:bg-gray-800"
        >
          <RefreshCw className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Date and Time */}
        <div className="text-center space-y-2">
          <div className="text-2xl font-bold text-white">{formatTime(currentTime)}</div>
          <div className="text-sm text-gray-400">{formatDate(currentTime)}</div>
        </div>

        {/* Location Status */}
        <div className="bg-[#2A2B5E] rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-purple-400" />
              <span className="text-white font-medium">Location Status</span>
            </div>
            <div className="flex items-center space-x-2">
              <Navigation className={`w-4 h-4 ${getLocationStatusColor()}`} />
              <span className={`text-xs ${getLocationStatusColor()}`}>
                {getLocationStatusText()}
              </span>
            </div>
          </div>
          
          {location && (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400">Accuracy:</span>
                  <span className="ml-2 text-white">{location.accuracy.toFixed(0)}m</span>
                </div>
                <div>
                  <span className="text-gray-400">City:</span>
                  <span className="ml-2 text-white">{location.city || 'Unknown'}</span>
                </div>
              </div>
              {location.address && (
                <div>
                  <span className="text-gray-400">Address:</span>
                  <div className="mt-1 text-white text-xs leading-relaxed">{location.address}</div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400">Lat:</span>
                  <span className="ml-1 text-white">{location.latitude.toFixed(6)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Lng:</span>
                  <span className="ml-1 text-white">{location.longitude.toFixed(6)}</span>
                </div>
              </div>
            </div>
          )}
          
          {!location && (
            <div className="text-center space-y-2">
              <div className="text-orange-400 text-sm">
                {locationPermission === 'denied' 
                  ? 'Location permission denied. Please enable location services in your browser settings.'
                  : locationPermission === 'prompt'
                  ? 'Location access is required for remote attendance. Please enable location services.'
                  : 'Unable to get location. Please check your GPS and internet connection.'
                }
              </div>
              <button
                onClick={async () => {
                  try {
                    console.log('Requesting location permission...');
                    const locationData = await getCurrentLocation();
                    setLocation(locationData);
                    setLocationPermission('granted');
                    console.log('Location permission granted and location obtained');
                  } catch (error) {
                    console.error('Location request failed:', error);
                    setLocationPermission('denied');
                  }
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
              >
                {locationPermission === 'prompt' ? 'Enable Location Services' : 'Retry Location'}
              </button>
            </div>
          )}
        </div>

        {/* Validation Status */}
        {punchValidation && (
          <div className={`rounded-lg p-4 ${punchValidation.isValid ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
            <div className="flex items-center space-x-2 mb-2">
              {punchValidation.isValid ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-400" />
              )}
              <span className="text-white font-medium">
                {punchValidation.isValid ? 'Location Validated' : 'Validation Failed'}
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Location Type:</span>
                <span className="text-white capitalize">{punchValidation.locationType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Distance:</span>
                <span className="text-white">{punchValidation.distance.toFixed(0)}m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Confidence:</span>
                <span className="text-white">{punchValidation.confidence}%</span>
              </div>
            </div>
            
            {punchValidation.violations.length > 0 && (
              <div className="mt-3 space-y-1">
                {punchValidation.violations.map((violation, index) => (
                  <div key={index} className="text-red-400 text-sm">• {violation}</div>
                ))}
              </div>
            )}
            
            {punchValidation.warnings.length > 0 && (
              <div className="mt-3 space-y-1">
                {punchValidation.warnings.map((warning, index) => (
                  <div key={index} className="text-yellow-400 text-sm">• {warning}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Last Punch Status */}
        {lastPunch && (
          <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-white font-medium">
                {lastPunch.type === 'checkin' ? 'Check-in' : 'Check-out'} Successful
              </span>
            </div>
            <div className="text-sm text-gray-400 mt-1">
              {formatTime(lastPunch.time)}
            </div>
          </div>
        )}

        {/* Punch Buttons */}
        <div className="space-y-3">
          <button
            onClick={!location ? undefined : () => handlePunch('checkin')}
            disabled={isLoading || !location}
            title={!location ? 'Please enable Location services' : ''}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg flex items-center justify-center space-x-2 transition-colors"
          >
            {isLoading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : !location ? (
              <>
                <MapPin className="w-5 h-5" />
                <span>Please enable Location services</span>
              </>
            ) : (
              <>
                <Clock className="w-5 h-5" />
                <span>Check In</span>
              </>
            )}
          </button>
          
          <button
            onClick={!location ? undefined : () => handlePunch('checkout')}
            disabled={isLoading || !location}
            title={!location ? 'Please enable Location services' : ''}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg flex items-center justify-center space-x-2 transition-colors"
          >
            {isLoading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : !location ? (
              <>
                <MapPin className="w-5 h-5" />
                <span>Please enable Location services</span>
              </>
            ) : (
              <>
                <Clock className="w-5 h-5" />
                <span>Check Out</span>
              </>
            )}
          </button>
        </div>

        {/* Security Notice */}
        <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="w-5 h-5 text-purple-400" />
            <span className="text-white font-medium">Security Notice</span>
          </div>
          <div className="text-sm text-gray-400 space-y-1">
            <div>• Location is verified for all mobile punches</div>
            <div>• All activities are logged for security</div>
            <div>• Maximum 12 hours per day policy applies</div>
          </div>
        </div>
      </div>
    </div>
  );
}