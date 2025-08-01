import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { MobileLayout } from '@/components/MobileLayout';
import { useToast } from '@/hooks/use-toast';
import { locationService } from '@/services/locationService';
import { offlineService } from '@/services/offlineService';
import { 
  Wifi, 
  WifiOff, 
  MapPin, 
  Clock, 
  Database, 
  RotateCcw, 
  AlertCircle, 
  CheckCircle,
  Navigation,
  Smartphone,
  RefreshCw,
  Shield,
  Signal,
  Activity,
  Upload,
  Download,
  Zap
} from 'lucide-react';

interface OfflineRecord {
  id: string;
  employeeId: string;
  punchType: 'in' | 'out';
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  isOnline: boolean;
  synced: boolean;
}

export default function MobileOfflinePunch() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [pendingRecords, setPendingRecords] = useState<OfflineRecord[]>([]);
  const [storageStats, setStorageStats] = useState<any>(null);
  const [syncProgress, setSyncProgress] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const { toast } = useToast();

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back Online",
        description: "Connection restored - syncing offline data",
      });
      handleAutoSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Offline Mode",
        description: "Data will be stored locally and synced when connection is restored",
        variant: "destructive"
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize services and load data
  useEffect(() => {
    const initializeServices = async () => {
      try {
        await offlineService.initialize();
        await offlineService.setupAutoSync();
        await loadOfflineData();
        await getCurrentLocation();
      } catch (error) {
        console.error('Failed to initialize services:', error);
      }
    };

    initializeServices();
  }, []);

  // Load offline data
  const loadOfflineData = async () => {
    try {
      const records = await offlineService.getPendingRecords();
      const stats = await offlineService.getStorageStats();
      setPendingRecords(records);
      setStorageStats(stats);
    } catch (error) {
      console.error('Failed to load offline data:', error);
    }
  };

  // Get current location
  const getCurrentLocation = async () => {
    try {
      const location = await locationService.getCurrentLocation();
      setCurrentLocation(location);
    } catch (error) {
      console.error('Failed to get location:', error);
      setCurrentLocation({ error: error.message });
    }
  };

  // Handle auto sync
  const handleAutoSync = async () => {
    if (!isOnline) return;
    
    setIsSyncing(true);
    setSyncProgress(0);
    
    try {
      const records = await offlineService.getPendingRecords();
      let syncedCount = 0;
      
      for (let i = 0; i < records.length; i++) {
        try {
          await offlineService.syncRecord(records[i]);
          syncedCount++;
          setSyncProgress(((i + 1) / records.length) * 100);
        } catch (error) {
          console.error(`Failed to sync record ${records[i].id}:`, error);
        }
      }
      
      setLastSyncTime(new Date().toISOString());
      await loadOfflineData();
      
      toast({
        title: "Sync Complete",
        description: `${syncedCount} records synchronized successfully`,
      });
    } catch (error) {
      toast({
        title: "Sync Error",
        description: error.message || "Failed to sync offline data",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
      setSyncProgress(0);
    }
  };

  // Manual sync trigger
  const handleManualSync = async () => {
    if (!isOnline) {
      toast({
        title: "Offline",
        description: "Cannot sync while offline",
        variant: "destructive"
      });
      return;
    }
    
    await handleAutoSync();
  };

  // Clear synced records
  const handleClearSynced = async () => {
    try {
      await offlineService.clearSyncedRecords();
      await loadOfflineData();
      toast({
        title: "Cleared",
        description: "Synced records cleared from local storage",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear synced records",
        variant: "destructive"
      });
    }
  };

  // Test location services
  const testLocationServices = async () => {
    toast({
      title: "Testing Location",
      description: "Checking GPS, BLE, and network location services...",
    });
    
    try {
      const location = await locationService.getCurrentLocation();
      setCurrentLocation(location);
      toast({
        title: "Location Test Success",
        description: `Location acquired via ${location.source.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Location Test Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Get location accuracy color
  const getLocationAccuracyColor = (accuracy: number) => {
    if (accuracy <= 10) return 'text-green-400';
    if (accuracy <= 50) return 'text-yellow-400';
    if (accuracy <= 100) return 'text-orange-400';
    return 'text-red-400';
  };

  // Get source icon
  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'gps':
        return <Navigation className="h-4 w-4 text-green-400" />;
      case 'ble':
        return <Smartphone className="h-4 w-4 text-blue-400" />;
      case 'network':
        return <Signal className="h-4 w-4 text-purple-400" />;
      default:
        return <MapPin className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <MobileLayout title="Offline Punch System">
      <div className="flex flex-col h-screen bg-[#1A1B3E] p-4 space-y-4">
        {/* Connection Status */}
        <Card className="bg-[#2A2B5E] border-slate-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-lg flex items-center space-x-2">
                <Shield className="h-5 w-5 text-green-400" />
                <span>System Status</span>
              </CardTitle>
              <div className="flex items-center space-x-2">
                {isOnline ? (
                  <Badge className="bg-green-600 text-white">
                    <Wifi className="h-3 w-3 mr-1" />
                    Online
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <WifiOff className="h-3 w-3 mr-1" />
                    Offline
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {storageStats?.pendingRecords || 0}
                </div>
                <div className="text-xs text-slate-400">Pending Sync</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {storageStats?.syncedRecords || 0}
                </div>
                <div className="text-xs text-slate-400">Synced</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location Status */}
        <Card className="bg-[#2A2B5E] border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm flex items-center space-x-2">
              <MapPin className="h-4 w-4" />
              <span>Location Services</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {currentLocation ? (
              currentLocation.error ? (
                <div className="flex items-center space-x-2 text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{currentLocation.error}</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getSourceIcon(currentLocation.source)}
                      <span className="text-sm text-white">
                        {currentLocation.source.toUpperCase()}
                      </span>
                    </div>
                    <div className={`text-sm ${getLocationAccuracyColor(currentLocation.accuracy)}`}>
                      ±{currentLocation.accuracy}m
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">
                    {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                  </div>
                </div>
              )
            ) : (
              <div className="text-sm text-slate-400">Acquiring location...</div>
            )}
          </CardContent>
        </Card>

        {/* Sync Controls */}
        <Card className="bg-[#2A2B5E] border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm flex items-center space-x-2">
              <RotateCcw className="h-4 w-4" />
              <span>Sync Controls</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {isSyncing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white">Syncing...</span>
                  <span className="text-slate-400">{Math.round(syncProgress)}%</span>
                </div>
                <Progress value={syncProgress} className="h-2" />
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleManualSync}
                disabled={!isOnline || isSyncing}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 text-sm touch-manipulation"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </Button>
              <Button
                onClick={handleClearSynced}
                disabled={isSyncing}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700 py-2 text-sm touch-manipulation"
              >
                <Database className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={testLocationServices}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700 py-2 text-sm touch-manipulation"
              >
                <Navigation className="h-4 w-4 mr-2" />
                Test GPS
              </Button>
              <Button
                onClick={loadOfflineData}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700 py-2 text-sm touch-manipulation"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
            
            {lastSyncTime && (
              <div className="text-xs text-slate-400 text-center">
                Last sync: {formatTimestamp(lastSyncTime)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Records */}
        <Card className="bg-[#2A2B5E] border-slate-700 flex-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Pending Records ({pendingRecords.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-64">
              {pendingRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-400 mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">All Synced</h3>
                  <p className="text-slate-400 text-sm">No pending records to sync</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRecords.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center space-x-3 p-3 bg-[#1A1B3E] rounded-lg"
                    >
                      <div className="flex-shrink-0">
                        <div className={`w-3 h-3 rounded-full ${
                          record.punchType === 'in' ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-white">
                            {record.punchType === 'in' ? 'Punch In' : 'Punch Out'}
                          </span>
                          <span className="text-xs text-slate-400">
                            {formatTimestamp(record.timestamp)}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          Employee: {record.employeeId}
                        </div>
                        <div className="text-xs text-slate-400">
                          Location: ±{record.location.accuracy}m
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {record.isOnline ? (
                          <Wifi className="h-4 w-4 text-green-400" />
                        ) : (
                          <WifiOff className="h-4 w-4 text-red-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}