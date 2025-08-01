import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { 
  MapPin, 
  Home, 
  Building, 
  Navigation,
  Target,
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  Activity,
  Wifi,
  Battery
} from 'lucide-react';

interface LocationCluster {
  id: string;
  type: 'home' | 'office' | 'field_site' | 'unknown';
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  confidence: number;
  punchCount: number;
  lastSeen: Date;
  isActive: boolean;
}

export default function MobileLocationManager() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number, accuracy: number} | null>(null);
  const [learnedLocations, setLearnedLocations] = useState<LocationCluster[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [autolearningEnabled, setAutolearningEnabled] = useState(true);

  // Mock learned locations data
  useEffect(() => {
    const mockLocations: LocationCluster[] = [
      {
        id: '1',
        type: 'office',
        name: 'Main Office',
        latitude: 24.8607,
        longitude: 67.0011,
        radius: 50,
        confidence: 92,
        punchCount: 156,
        lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000),
        isActive: true
      },
      {
        id: '2',
        type: 'home',
        name: 'Home Location',
        latitude: 24.8467,
        longitude: 67.0299,
        radius: 75,
        confidence: 87,
        punchCount: 89,
        lastSeen: new Date(Date.now() - 12 * 60 * 60 * 1000),
        isActive: true
      },
      {
        id: '3',
        type: 'field_site',
        name: 'Field Site Alpha',
        latitude: 24.8737,
        longitude: 67.0428,
        radius: 100,
        confidence: 74,
        punchCount: 23,
        lastSeen: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        isActive: true
      }
    ];
    setLearnedLocations(mockLocations);
  }, []);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Get current location
  const getCurrentLocation = async () => {
    setIsLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });
      
      setCurrentLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      });
    } catch (error) {
      console.error('Location error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  // Get current location cluster
  const getCurrentLocationCluster = (): LocationCluster | null => {
    if (!currentLocation) return null;
    
    for (const cluster of learnedLocations) {
      const distance = calculateDistance(
        currentLocation.lat, currentLocation.lng,
        cluster.latitude, cluster.longitude
      );
      
      if (distance <= cluster.radius) {
        return cluster;
      }
    }
    
    return null;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'home': return Home;
      case 'office': return Building;
      case 'field_site': return MapPin;
      default: return Target;
    }
  };

  const getLocationColor = (type: string) => {
    switch (type) {
      case 'home': return 'text-blue-400';
      case 'office': return 'text-green-400';
      case 'field_site': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-400';
    if (confidence >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const currentCluster = getCurrentLocationCluster();

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
            onClick={() => navigate('/mobile/settings')}
            className="p-1 rounded-lg hover:bg-gray-800"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div className="flex items-center space-x-2">
            <Navigation className="w-6 h-6 text-purple-400" />
            <h2 className="text-white font-semibold text-base">Location Manager</h2>
          </div>
        </div>
        <button 
          onClick={getCurrentLocation}
          disabled={isLoading}
          className="p-2 rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Current Location Status */}
        <div className="bg-[#2A2B5E] rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-purple-400" />
              <span className="text-white font-medium">Current Location</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setAutolearningEnabled(!autolearningEnabled)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  autolearningEnabled ? 'bg-purple-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    autolearningEnabled ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-xs text-gray-400">Auto-learn</span>
            </div>
          </div>
          
          {currentLocation ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Accuracy:</span>
                  <span className="ml-2 text-white">{currentLocation.accuracy.toFixed(0)}m</span>
                </div>
                <div>
                  <span className="text-gray-400">Status:</span>
                  <span className={`ml-2 ${currentCluster ? 'text-green-400' : 'text-yellow-400'}`}>
                    {currentCluster ? 'Recognized' : 'Learning'}
                  </span>
                </div>
              </div>
              
              {currentCluster && (
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-white font-medium">In {currentCluster.name}</span>
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    {calculateDistance(
                      currentLocation.lat, currentLocation.lng,
                      currentCluster.latitude, currentCluster.longitude
                    ).toFixed(0)}m from center
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-400 text-sm">
              Location not available. Tap refresh to get current location.
            </div>
          )}
        </div>

        {/* Autolearning Stats */}
        <div className="bg-[#2A2B5E] rounded-lg p-4 space-y-3">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-purple-400" />
            <span className="text-white font-medium">Learning Statistics</span>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-white">{learnedLocations.length}</div>
              <div className="text-xs text-gray-400">Locations</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-white">
                {learnedLocations.reduce((sum, loc) => sum + loc.punchCount, 0)}
              </div>
              <div className="text-xs text-gray-400">Total Punches</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-white">
                {Math.round(learnedLocations.reduce((sum, loc) => sum + loc.confidence, 0) / learnedLocations.length)}%
              </div>
              <div className="text-xs text-gray-400">Avg Confidence</div>
            </div>
          </div>
        </div>

        {/* Learned Locations */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-medium">Learned Locations</h3>
            <span className="text-xs text-gray-400">{learnedLocations.length} locations</span>
          </div>
          
          {learnedLocations.map((location) => {
            const Icon = getLocationIcon(location.type);
            return (
              <div key={location.id} className="bg-[#2A2B5E] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                      <Icon className={`w-5 h-5 ${getLocationColor(location.type)}`} />
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium">{location.name}</div>
                      <div className="text-xs text-gray-400 capitalize">{location.type.replace('_', ' ')}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${getConfidenceColor(location.confidence)}`}>
                      {location.confidence}%
                    </div>
                    <div className="text-xs text-gray-400">confidence</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Radius:</span>
                    <span className="ml-2 text-white">{location.radius}m</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Punches:</span>
                    <span className="ml-2 text-white">{location.punchCount}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Last seen:</span>
                    <span className="ml-2 text-white">{formatRelativeTime(location.lastSeen)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Privacy Notice */}
        <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-purple-400" />
            <span className="text-white font-medium">Privacy Notice</span>
          </div>
          <div className="text-sm text-gray-400 space-y-1">
            <div>• Location data is stored securely and used only for attendance validation</div>
            <div>• Auto-learning improves accuracy over time</div>
            <div>• You can disable auto-learning at any time</div>
          </div>
        </div>
      </div>
    </div>
  );
}