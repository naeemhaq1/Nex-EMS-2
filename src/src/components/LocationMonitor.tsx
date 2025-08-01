import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, MapPin, Users, Clock, Database, Wifi, WifiOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LocationData {
  employeeCode: string;
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
  };
  locationName: string | null;
  isWorkLocation: boolean;
  batteryLevel: number | null;
  networkType: string | null;
  status: string;
}

interface LocationStats {
  totalRecordsCollected: number;
  activeEmployees: number;
  lastCollectionTime: string | null;
  successRate: number;
  failureCount: number;
  averageAccuracy: number;
  dataRetentionDays: number;
}

export function LocationMonitor() {
  const [currentLocations, setCurrentLocations] = useState<LocationData[]>([]);
  const [stats, setStats] = useState<LocationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<'running' | 'stopped' | 'unknown'>('unknown');
  const { toast } = useToast();

  const fetchCurrentLocations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/location-tracking/current');
      const data = await response.json();
      
      if (data.success) {
        setCurrentLocations(data.locations);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch current locations",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch location data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/location-tracking/stats');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch location stats:', error);
    }
  };

  const handleServiceControl = async (action: 'start' | 'stop' | 'restart') => {
    try {
      setLoading(true);
      const response = await fetch(`/api/location-tracking/service/${action}`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Success",
          description: data.message,
        });
        
        setServiceStatus(action === 'stop' ? 'stopped' : 'running');
        await fetchStats();
      } else {
        toast({
          title: "Error",
          description: data.message || `Failed to ${action} service`,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${action} location tracking service`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getAccuracyColor = (accuracy: number | null) => {
    if (!accuracy) return 'bg-gray-500';
    if (accuracy <= 10) return 'bg-green-500';
    if (accuracy <= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getLocationIcon = (isWorkLocation: boolean) => {
    return isWorkLocation ? '🏢' : '📍';
  };

  useEffect(() => {
    fetchCurrentLocations();
    fetchStats();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchCurrentLocations();
      fetchStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Service Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Location Tracking Service
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant={serviceStatus === 'running' ? 'default' : 'secondary'}>
                {serviceStatus === 'running' ? 'Running' : 'Stopped'}
              </Badge>
              
              {stats && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  {stats.activeEmployees} active employees
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleServiceControl('start')}
                disabled={loading || serviceStatus === 'running'}
              >
                Start Service
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleServiceControl('stop')}
                disabled={loading || serviceStatus === 'stopped'}
              >
                Stop Service
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleServiceControl('restart')}
                disabled={loading}
              >
                Restart
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Location Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.totalRecordsCollected}</div>
                <div className="text-sm text-muted-foreground">Total Records</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.activeEmployees}</div>
                <div className="text-sm text-muted-foreground">Active Employees</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.averageAccuracy.toFixed(1)}m</div>
                <div className="text-sm text-muted-foreground">Avg Accuracy</div>
              </div>
            </div>
            
            {stats.lastCollectionTime && (
              <div className="mt-4 text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Last collection: {formatTimestamp(stats.lastCollectionTime)}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Current Locations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Current Employee Locations
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCurrentLocations}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentLocations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No current location data available
            </div>
          ) : (
            <div className="space-y-4">
              {currentLocations.map((location, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {getLocationIcon(location.isWorkLocation)}
                    </div>
                    <div>
                      <div className="font-medium">{location.employeeCode}</div>
                      <div className="text-sm text-muted-foreground">
                        {location.locationName || 'Unknown location'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {location.location.latitude.toFixed(6)}, {location.location.longitude.toFixed(6)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTimestamp(location.timestamp)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {location.location.accuracy && (
                        <Badge
                          variant="secondary"
                          className={`${getAccuracyColor(location.location.accuracy)} text-white`}
                        >
                          ±{location.location.accuracy.toFixed(0)}m
                        </Badge>
                      )}
                      
                      {location.networkType && (
                        <div className="flex items-center gap-1">
                          {location.networkType.includes('wifi') ? (
                            <Wifi className="w-4 h-4" />
                          ) : (
                            <WifiOff className="w-4 h-4" />
                          )}
                          <span className="text-xs">{location.networkType}</span>
                        </div>
                      )}
                      
                      {location.batteryLevel && (
                        <div className="text-xs">
                          🔋 {location.batteryLevel}%
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}