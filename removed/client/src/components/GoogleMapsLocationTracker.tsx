import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MapPin, 
  Navigation, 
  Target, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Map,
  Clock
} from 'lucide-react';
import { googleMapsService, LocationData, GeofenceArea } from '@/services/googleMapsService';

interface GoogleMapsLocationTrackerProps {
  onLocationUpdate?: (location: LocationData) => void;
  onValidationResult?: (isValid: boolean, message: string) => void;
  showMap?: boolean;
  workplaceLocations?: GeofenceArea[];
  autoTrack?: boolean;
}

export function GoogleMapsLocationTracker({
  onLocationUpdate,
  onValidationResult,
  showMap = true,
  workplaceLocations = [],
  autoTrack = false
}: GoogleMapsLocationTrackerProps) {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message: string;
    distance?: number;
  } | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const watchIdRef = useRef<number | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    if (autoTrack) {
      startLocationTracking();
    }
    
    return () => {
      stopLocationTracking();
    };
  }, [autoTrack]);

  const getCurrentLocation = async () => {
    setLocationStatus('loading');
    setError(null);
    
    try {
      const location = await googleMapsService.getCurrentLocation();
      setCurrentLocation(location);
      setLocationStatus('success');
      setLastUpdate(new Date());
      
      // Validate location against workplace geofences
      if (workplaceLocations.length > 0) {
        const validation = await googleMapsService.validateWorkplaceLocation(
          location,
          workplaceLocations
        );
        setValidationResult({
          isValid: validation.isValid,
          message: validation.validationMessage,
          distance: validation.distance
        });
        onValidationResult?.(validation.isValid, validation.validationMessage);
      }
      
      onLocationUpdate?.(location);
      
      // Update map if visible
      if (showMap && mapRef.current) {
        initializeMap(location);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get location';
      setError(errorMessage);
      setLocationStatus('error');
    }
  };

  const startLocationTracking = async () => {
    if (isTracking) return;
    
    setIsTracking(true);
    try {
      const watchId = await googleMapsService.trackLocationContinuously(
        (location) => {
          setCurrentLocation(location);
          setLocationStatus('success');
          setLastUpdate(new Date());
          onLocationUpdate?.(location);
          
          // Validate location if workplaces are defined
          if (workplaceLocations.length > 0) {
            googleMapsService.validateWorkplaceLocation(location, workplaceLocations)
              .then(validation => {
                setValidationResult({
                  isValid: validation.isValid,
                  message: validation.validationMessage,
                  distance: validation.distance
                });
                onValidationResult?.(validation.isValid, validation.validationMessage);
              });
          }
          
          // Update map
          if (showMap && mapInstanceRef.current) {
            mapInstanceRef.current.setCenter({ lat: location.lat, lng: location.lng });
          }
        },
        {
          interval: 15000, // Update every 15 seconds
          highAccuracy: true,
          timeout: 10000
        }
      );
      
      watchIdRef.current = watchId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start tracking';
      setError(errorMessage);
      setIsTracking(false);
    }
  };

  const stopLocationTracking = () => {
    if (watchIdRef.current !== null) {
      googleMapsService.stopLocationTracking(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  };

  const initializeMap = async (location: LocationData) => {
    if (!mapRef.current) return;
    
    try {
      await googleMapsService.initialize();
      
      const mapOptions: google.maps.MapOptions = {
        center: { lat: location.lat, lng: location.lng },
        zoom: 16,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'cooperative'
      };
      
      const map = new google.maps.Map(mapRef.current, mapOptions);
      mapInstanceRef.current = map;
      
      // Add current location marker
      new google.maps.Marker({
        position: { lat: location.lat, lng: location.lng },
        map: map,
        title: 'Current Location',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="8" fill="#3B82F6" stroke="#FFFFFF" stroke-width="2"/>
              <circle cx="12" cy="12" r="3" fill="#FFFFFF"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(24, 24)
        }
      });
      
      // Add workplace geofences
      workplaceLocations.forEach((workplace, index) => {
        // Add workplace marker
        new google.maps.Marker({
          position: workplace.center,
          map: map,
          title: workplace.name,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="6" y="10" width="20" height="16" fill="#10B981" stroke="#FFFFFF" stroke-width="2" rx="2"/>
                <rect x="10" y="6" width="12" height="8" fill="#059669" stroke="#FFFFFF" stroke-width="2" rx="1"/>
                <circle cx="16" cy="18" r="2" fill="#FFFFFF"/>
              </svg>
            `),
            scaledSize: new google.maps.Size(32, 32)
          }
        });
        
        // Add geofence circle
        new google.maps.Circle({
          center: workplace.center,
          radius: workplace.radius,
          map: map,
          fillColor: workplace.type === 'office' ? '#10B981' : '#F59E0B',
          fillOpacity: 0.1,
          strokeColor: workplace.type === 'office' ? '#10B981' : '#F59E0B',
          strokeOpacity: 0.3,
          strokeWeight: 2
        });
      });
      
    } catch (err) {
      console.error('Failed to initialize map:', err);
    }
  };

  const getStatusIcon = () => {
    switch (locationStatus) {
      case 'loading':
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  const getValidationBadge = () => {
    if (!validationResult) return null;
    
    return (
      <Badge 
        variant={validationResult.isValid ? "default" : "destructive"}
        className={validationResult.isValid ? "bg-green-600" : "bg-red-600"}
      >
        {validationResult.isValid ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
        {validationResult.isValid ? 'Valid Location' : 'Invalid Location'}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5" />
            Google Maps Location Tracker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Location Status */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-sm font-medium">
                {locationStatus === 'loading' && 'Getting location...'}
                {locationStatus === 'success' && 'Location acquired'}
                {locationStatus === 'error' && 'Location failed'}
                {locationStatus === 'idle' && 'Location not requested'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {getValidationBadge()}
              <Badge variant={isTracking ? "default" : "secondary"}>
                {isTracking ? 'Tracking' : 'Stopped'}
              </Badge>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <Button
              onClick={getCurrentLocation}
              disabled={locationStatus === 'loading'}
              size="sm"
              variant="outline"
            >
              <Target className="w-4 h-4 mr-2" />
              Get Location
            </Button>
            <Button
              onClick={isTracking ? stopLocationTracking : startLocationTracking}
              size="sm"
              variant={isTracking ? "destructive" : "default"}
            >
              <Navigation className="w-4 h-4 mr-2" />
              {isTracking ? 'Stop Tracking' : 'Start Tracking'}
            </Button>
          </div>

          {/* Location Details */}
          {currentLocation && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Coordinates:</p>
                  <p className="text-muted-foreground">
                    {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Accuracy:</p>
                  <p className="text-muted-foreground">±{Math.round(currentLocation.accuracy)}m</p>
                </div>
              </div>
              
              {currentLocation.address && (
                <div>
                  <p className="font-medium text-sm">Address:</p>
                  <p className="text-sm text-muted-foreground">{currentLocation.address}</p>
                </div>
              )}
              
              {lastUpdate && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  Last updated: {lastUpdate.toLocaleTimeString()}
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 dark:text-red-200">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Validation Result */}
          {validationResult && (
            <Alert className={validationResult.isValid ? 
              "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20" : 
              "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
            }>
              <AlertDescription className={validationResult.isValid ? 
                "text-green-800 dark:text-green-200" : 
                "text-red-800 dark:text-red-200"
              }>
                {validationResult.message}
                {validationResult.distance && (
                  <p className="text-xs mt-1">
                    Distance: {Math.round(validationResult.distance)}m
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Map Display */}
      {showMap && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="w-5 h-5" />
              Location Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              ref={mapRef}
              className="h-64 w-full rounded-lg border"
              style={{ minHeight: '256px' }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}