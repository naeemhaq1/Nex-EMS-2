import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  MapPin, 
  Bell, 
  Camera, 
  Wifi,
  Battery,
  Shield,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface PermissionStatus {
  location: 'granted' | 'denied' | 'prompt' | 'unknown';
  notification: 'granted' | 'denied' | 'default' | 'unknown';
  camera: 'granted' | 'denied' | 'prompt' | 'unknown';
}

interface DeviceInfo {
  isOnline: boolean;
  batteryLevel: number | null;
  isCharging: boolean;
  userAgent: string;
  screenSize: string;
  orientation: string;
}

export function DevicePermissionChecker() {
  const [permissions, setPermissions] = useState<PermissionStatus>({
    location: 'unknown',
    notification: 'unknown',
    camera: 'unknown'
  });
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isOnline: navigator.onLine,
    batteryLevel: null,
    isCharging: false,
    userAgent: navigator.userAgent,
    screenSize: `${window.screen.width}x${window.screen.height}`,
    orientation: screen.orientation?.type || 'unknown'
  });
  const [showCriticalAlert, setShowCriticalAlert] = useState(false);
  const [checkCount, setCheckCount] = useState(0);

  // Check all permissions on component mount and regularly
  useEffect(() => {
    checkAllPermissions();
    
    // Set up interval to check permissions every 30 seconds
    const interval = setInterval(() => {
      checkAllPermissions();
      setCheckCount(prev => prev + 1);
    }, 30000);

    // Set up online/offline listeners
    const handleOnline = () => setDeviceInfo(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setDeviceInfo(prev => ({ ...prev, isOnline: false }));
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check battery status if available
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBatteryInfo = () => {
          setDeviceInfo(prev => ({
            ...prev,
            batteryLevel: Math.round(battery.level * 100),
            isCharging: battery.charging
          }));
        };
        
        updateBatteryInfo();
        battery.addEventListener('chargingchange', updateBatteryInfo);
        battery.addEventListener('levelchange', updateBatteryInfo);
      });
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkAllPermissions = async () => {
    const newPermissions: PermissionStatus = {
      location: 'unknown',
      notification: 'unknown',
      camera: 'unknown'
    };

    // Check location permission
    if ('geolocation' in navigator && 'permissions' in navigator) {
      try {
        const locationPermission = await navigator.permissions.query({ name: 'geolocation' });
        newPermissions.location = locationPermission.state as 'granted' | 'denied' | 'prompt';
      } catch (error) {
        newPermissions.location = 'unknown';
      }
    }

    // Check notification permission
    if ('Notification' in window) {
      newPermissions.notification = Notification.permission as 'granted' | 'denied' | 'default';
    }

    // Check camera permission
    if ('permissions' in navigator) {
      try {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        newPermissions.camera = cameraPermission.state as 'granted' | 'denied' | 'prompt';
      } catch (error) {
        newPermissions.camera = 'unknown';
      }
    }

    setPermissions(newPermissions);
    
    // Show critical alert if location or notifications are denied
    if (newPermissions.location === 'denied' || newPermissions.notification === 'denied') {
      setShowCriticalAlert(true);
    }
  };

  const requestLocationPermission = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
          checkAllPermissions();
        },
        (error) => {
          console.error('Location permission denied:', error);
          setShowCriticalAlert(true);
        }
      );
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'denied') {
        setShowCriticalAlert(true);
      }
      checkAllPermissions();
    }
  };

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      checkAllPermissions();
    } catch (error) {
      console.error('Camera permission denied:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'granted':
        return <Badge className="bg-green-600 text-white"><CheckCircle className="w-3 h-3 mr-1" />Granted</Badge>;
      case 'denied':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Denied</Badge>;
      case 'prompt':
      case 'default':
        return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const criticalIssues = [
    permissions.location === 'denied' && 'Location services are disabled',
    permissions.notification === 'denied' && 'Push notifications are disabled',
    !deviceInfo.isOnline && 'Device is offline',
    deviceInfo.batteryLevel !== null && deviceInfo.batteryLevel < 20 && 'Battery level is critically low'
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      {/* Critical Alert */}
      {showCriticalAlert && criticalIssues.length > 0 && (
        <Alert className="border-red-500 bg-red-50 dark:bg-red-900/20">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            <div className="font-semibold mb-2">CRITICAL: System Requirements Not Met</div>
            <ul className="list-disc list-inside text-sm space-y-1">
              {criticalIssues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
            <div className="mt-3 text-xs">
              These issues will prevent proper attendance tracking and may result in payroll discrepancies.
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Device Permissions Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Device Permissions & Security Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Location Permission */}
          <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-red-600 dark:text-red-400" />
              <div>
                <p className="font-medium text-sm">Location Services</p>
                <p className="text-xs text-muted-foreground">Required for mobile punch tracking</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(permissions.location)}
              {permissions.location !== 'granted' && (
                <Button size="sm" variant="outline" onClick={requestLocationPermission}>
                  Enable
                </Button>
              )}
            </div>
          </div>

          {/* Notification Permission */}
          <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <div>
                <p className="font-medium text-sm">Push Notifications</p>
                <p className="text-xs text-muted-foreground">Required for work updates & alerts</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(permissions.notification)}
              {permissions.notification !== 'granted' && (
                <Button size="sm" variant="outline" onClick={requestNotificationPermission}>
                  Enable
                </Button>
              )}
            </div>
          </div>

          {/* Camera Permission */}
          <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-3">
              <Camera className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <div>
                <p className="font-medium text-sm">Camera Access</p>
                <p className="text-xs text-muted-foreground">Future biometric verification</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(permissions.camera)}
              {permissions.camera !== 'granted' && (
                <Button size="sm" variant="outline" onClick={requestCameraPermission}>
                  Enable
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Device Status */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Wifi className={`w-4 h-4 ${deviceInfo.isOnline ? 'text-green-600' : 'text-red-600'}`} />
              <span>Network: {deviceInfo.isOnline ? 'Online' : 'Offline'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Battery className={`w-4 h-4 ${deviceInfo.batteryLevel && deviceInfo.batteryLevel < 20 ? 'text-red-600' : 'text-green-600'}`} />
              <span>Battery: {deviceInfo.batteryLevel ? `${deviceInfo.batteryLevel}%` : 'Unknown'}</span>
            </div>
          </div>

          {/* System Info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Screen: {deviceInfo.screenSize}</p>
            <p>Orientation: {deviceInfo.orientation}</p>
            <p>Checks performed: {checkCount}</p>
          </div>
        </CardContent>
      </Card>

      {/* Enforcement Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">
            ⚠️ MANDATORY PERMISSION REQUIREMENTS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <p className="font-semibold text-red-800 dark:text-red-200 mb-2">
              If you have disabled location services or notifications:
            </p>
            <ol className="list-decimal list-inside text-sm text-red-700 dark:text-red-300 space-y-1">
              <li>Go to your device Settings</li>
              <li>Find "Privacy & Security" or "Apps & Notifications"</li>
              <li>Locate this app and enable ALL permissions</li>
              <li>Restart the app to apply changes</li>
              <li>Contact IT support if you cannot enable permissions</li>
            </ol>
          </div>
          
          <div className="text-xs text-muted-foreground">
            <p>This system continuously monitors device permissions for compliance with company attendance policies.</p>
            <p>Unauthorized permission changes will be reported to management.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}