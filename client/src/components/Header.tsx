import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { FolderSync, MapPin } from "lucide-react";
import { NavbarVersionIndicator } from "@/components/VersionIndicator";
import { VersionHistory } from "@/components/admin/VersionHistory";
import { useState, useEffect } from "react";

export function Header() {
  const { user, logout } = useAuth();
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [hasLocation, setHasLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const { data: syncStatus } = useQuery({
    queryKey: ["/api/sync/status"],
    refetchInterval: 5000,
  }) as { data: any };

  const handleLogout = async () => {
    await logout();
  };

  // Cross-platform one-click location enablement for header
  const handleLocationStatusClick = () => {
    console.log('📍 Header location clicked - attempting cross-platform GPS access');
    
    // Detect platform for optimized location handling
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroid = userAgent.includes('android');
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isDesktop = !(/android|iphone|ipad|ipod|blackberry|windows phone/.test(userAgent));
    const isWebApp = window.matchMedia('(display-mode: standalone)').matches || (window as any).navigator?.standalone;
    
    console.log('🔍 Header platform detection:', { isAndroid, isIOS, isDesktop, isWebApp });
    
    if (!navigator.geolocation) {
      console.log('❌ Geolocation not supported on header platform');
      setLocationError('GPS not available on this platform');
      return;
    }

    // Platform-optimized GPS configuration for header
    const headerGpsOptions = {
      timeout: 20000, // Standard timeout for header
      enableHighAccuracy: true,
      maximumAge: 300000 // 5 minutes cache for general use
    };
    
    if (isIOS) {
      headerGpsOptions.timeout = 10000;
      headerGpsOptions.maximumAge = 360000; // 6 hours for iOS
    } else if (isAndroid) {
      headerGpsOptions.timeout = 20000;
      headerGpsOptions.maximumAge = 300000; // 5 minutes for Android
    } else if (isDesktop) {
      headerGpsOptions.timeout = 25000;
      headerGpsOptions.maximumAge = 240000; // 4 minutes for desktop
    } else if (isWebApp) {
      headerGpsOptions.timeout = 15000;
      headerGpsOptions.maximumAge = 240000; // 4 minutes for PWA
    }

    console.log('⚙️ Header GPS options applied:', headerGpsOptions);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const platform = isIOS ? 'iOS' : isAndroid ? 'Android' : isDesktop ? 'Desktop' : 'WebApp';
        console.log(`✅ ${platform} Header GPS access successful:`, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          platform: platform,
          role: user?.role || 'header_user'
        });
        
        setHasLocation(true);
        setLocationError(null);
        
        // Store location with platform info
        localStorage.setItem('headerLastKnownLocation', JSON.stringify({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
          platform: platform,
          role: user?.role || 'header_user',
          source: 'header_gps_click'
        }));
      },
      (error) => {
        const platform = isIOS ? 'iOS' : isAndroid ? 'Android' : isDesktop ? 'Desktop' : 'WebApp';
        console.log(`❌ ${platform} Header GPS failed:`, error);
        
        // Platform-specific header error messages
        let headerErrorMessage = 'Location access failed';
        
        if (error.code === error.PERMISSION_DENIED) {
          if (isIOS) {
            headerErrorMessage = 'Enable location in iOS Settings';
          } else if (isAndroid) {
            headerErrorMessage = 'Grant location permission in Android';
          } else if (isDesktop) {
            headerErrorMessage = 'Allow location access in browser';
          } else {
            headerErrorMessage = 'Enable location permission';
          }
        } else if (error.code === error.TIMEOUT) {
          headerErrorMessage = `${platform} GPS timeout - try again`;
        } else {
          headerErrorMessage = `${platform} location unavailable`;
        }
        
        setLocationError(headerErrorMessage);
        
        // Fallback to stored location
        const storedLocation = localStorage.getItem('headerLastKnownLocation');
        if (storedLocation) {
          const stored = JSON.parse(storedLocation);
          const hoursSinceStored = (Date.now() - stored.timestamp) / (1000 * 60 * 60);
          
          if (hoursSinceStored < 6) { // 6 hour fallback for header
            console.log('📍 Using stored header location (fallback)');
            setHasLocation(true);
            setLocationError(`Using stored location (${hoursSinceStored.toFixed(1)}h old)`);
          }
        }
      },
      headerGpsOptions
    );
  };

  // Check for existing location on component mount
  useEffect(() => {
    const storedLocation = localStorage.getItem('headerLastKnownLocation');
    if (storedLocation) {
      const stored = JSON.parse(storedLocation);
      const hoursSinceStored = (Date.now() - stored.timestamp) / (1000 * 60 * 60);
      
      if (hoursSinceStored < 6) { // 6 hour validity for header
        setHasLocation(true);
        console.log('📍 Header location available from storage');
      }
    }
  }, []);

  return (
    <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">
            {user?.role === "employee" ? "Employee Portal" : "Dashboard"}
          </h2>
          <p className="text-slate-400 text-sm">
            {user?.role === "employee" 
              ? "View your attendance records and information"
              : "Welcome back! Here's what's happening today."
            }
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {syncStatus && (
            <div className="flex items-center space-x-2 bg-slate-700 rounded-lg px-3 py-2">
              <div className={`w-2 h-2 rounded-full ${
                syncStatus.some((s: any) => s.status === "running") 
                  ? "bg-yellow-500 animate-pulse" 
                  : "bg-green-500"
              }`}></div>
              <span className="text-sm text-slate-300">
                {syncStatus.some((s: any) => s.status === "running") 
                  ? "Syncing..." 
                  : "Synced"
                }
              </span>
            </div>
          )}
          
          {/* One-Click Location Status */}
          <div 
            className="flex items-center space-x-2 cursor-pointer hover:bg-slate-600 rounded-lg px-3 py-2 transition-colors"
            onClick={handleLocationStatusClick}
            title="Click to enable location access"
          >
            <div className={`w-2 h-2 rounded-full ${hasLocation ? 'bg-green-400' : 'bg-red-400 animate-pulse'}`}></div>
            <MapPin className={`w-4 h-4 ${hasLocation ? 'text-green-400' : 'text-red-400'}`} />
            <span className="text-slate-300 text-sm">
              {hasLocation ? 'GPS' : 'GPS'}
            </span>
          </div>
          
          {/* Version Indicator */}
          <NavbarVersionIndicator onClick={() => setShowVersionHistory(true)} />
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="text-slate-300 border-slate-600 hover:bg-slate-700"
          >
            Logout
          </Button>
        </div>
      </div>
      
      {/* Version History Modal */}
      {showVersionHistory && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="max-w-6xl w-full max-h-[90vh] overflow-hidden relative">
            <VersionHistory />
            <button
              onClick={() => setShowVersionHistory(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
