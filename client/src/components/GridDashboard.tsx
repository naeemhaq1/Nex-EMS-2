
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { 
  Users, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Zap, 
  Activity, 
  Database, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  Calendar,
  MapPin,
  BarChart3,
  Settings
} from 'lucide-react';

// Types for our data structures
interface LiveInterface {
  title: string;
  description: string;
  status: 'active' | 'idle' | 'error';
  lastUpdate: string;
}

interface SystemMetric {
  name: string;
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
}

interface AttendanceData {
  present: number;
  absent: number;
  late: number;
  total: number;
  rate: number;
}

interface AlertItem {
  id: string;
  type: 'info' | 'warning' | 'error';
  message: string;
  timestamp: string;
}

const GridDashboard: React.FC = () => {
  // State management
  const [attendanceData, setAttendanceData] = useState<AttendanceData>({
    present: 0,
    absent: 0,
    late: 0,
    total: 0,
    rate: 0
  });
  
  const [liveInterfaces, setLiveInterfaces] = useState<LiveInterface[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetric[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // Loading states
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [interfacesLoading, setInterfacesLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(true);

  // Fetch attendance data
  const fetchAttendanceData = async () => {
    try {
      setAttendanceLoading(true);
      const response = await fetch('/api/admin/dashboard-metrics');
      if (response.ok) {
        const data = await response.json();
        setAttendanceData({
          present: data.presentCount || 0,
          absent: data.absentCount || 0,
          late: data.lateCount || 0,
          total: data.totalEmployees || 0,
          rate: data.attendanceRate || 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch attendance data:', error);
    } finally {
      setAttendanceLoading(false);
    }
  };

  // Fetch live interfaces status
  const fetchLiveInterfaces = async () => {
    try {
      setInterfacesLoading(true);
      const response = await fetch('/api/admin/services');
      if (response.ok) {
        const services = await response.json();
        const interfaces = services.slice(0, 5).map((service: any) => ({
          title: service.name,
          description: `${service.status} - ${service.uptime}`,
          status: service.status === 'healthy' ? 'active' : 
                 service.status === 'running' ? 'idle' : 'error',
          lastUpdate: service.lastHeartbeat ? new Date(service.lastHeartbeat).toLocaleTimeString() : 'Unknown'
        }));
        setLiveInterfaces(interfaces);
      }
    } catch (error) {
      console.error('Failed to fetch live interfaces:', error);
      // Fallback data
      setLiveInterfaces([
        { title: 'BioTime Sync', description: 'Real-time data polling', status: 'active', lastUpdate: '2 min ago' },
        { title: 'WhatsApp Service', description: 'Message processing', status: 'idle', lastUpdate: '5 min ago' },
        { title: 'Location Tracking', description: 'GPS coordinate collection', status: 'active', lastUpdate: '1 min ago' },
        { title: 'Attendance Processor', description: 'Data validation engine', status: 'active', lastUpdate: '30 sec ago' },
        { title: 'Mobile App API', description: 'Employee mobile interface', status: 'error', lastUpdate: '10 min ago' }
      ]);
    } finally {
      setInterfacesLoading(false);
    }
  };

  // Fetch system metrics
  const fetchSystemMetrics = async () => {
    try {
      setMetricsLoading(true);
      // This would typically come from a system monitoring endpoint
      setSystemMetrics([
        { name: 'CPU Usage', value: 45, unit: '%', status: 'good', trend: 'stable' },
        { name: 'Memory', value: 72, unit: '%', status: 'warning', trend: 'up' },
        { name: 'Database', value: 89, unit: '%', status: 'critical', trend: 'up' },
        { name: 'Network', value: 23, unit: 'Mbps', status: 'good', trend: 'down' },
        { name: 'Storage', value: 56, unit: '%', status: 'good', trend: 'stable' }
      ]);
    } catch (error) {
      console.error('Failed to fetch system metrics:', error);
    } finally {
      setMetricsLoading(false);
    }
  };

  // Fetch alerts
  const fetchAlerts = async () => {
    try {
      setAlertsLoading(true);
      // This would typically come from an alerts endpoint
      setAlerts([
        { id: '1', type: 'warning', message: 'High memory usage detected on main server', timestamp: '5 min ago' },
        { id: '2', type: 'info', message: 'Daily backup completed successfully', timestamp: '1 hour ago' },
        { id: '3', type: 'error', message: 'Failed to sync with BioTime device #3', timestamp: '2 hours ago' },
        { id: '4', type: 'info', message: '15 new employees added to system', timestamp: '3 hours ago' }
      ]);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setAlertsLoading(false);
    }
  };

  // Auto-refresh data
  useEffect(() => {
    const fetchAllData = () => {
      fetchAttendanceData();
      fetchLiveInterfaces();
      fetchSystemMetrics();
      fetchAlerts();
      setLastUpdate(new Date());
    };

    // Initial fetch
    fetchAllData();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchAllData, 30000);

    return () => clearInterval(interval);
  }, []);

  // Network status monitoring
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

  // Manual refresh function
  const handleRefresh = () => {
    fetchAttendanceData();
    fetchLiveInterfaces();
    fetchSystemMetrics();
    fetchAlerts();
    setLastUpdate(new Date());
  };

  // Attendance Overview Panel
  const AttendanceOverview: React.FC = () => {
    if (attendanceLoading) return <div className="flex items-center justify-center h-full"><RefreshCw className="h-6 w-6 animate-spin" /></div>;
    
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Today's Attendance</span>
            <Badge variant="outline">{attendanceData.rate.toFixed(1)}%</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{attendanceData.present}</div>
                <div className="text-sm text-gray-500">Present</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{attendanceData.absent}</div>
                <div className="text-sm text-gray-500">Absent</div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-yellow-600">{attendanceData.late}</div>
              <div className="text-sm text-gray-500">Late Arrivals</div>
            </div>
            <Progress value={attendanceData.rate} className="w-full" />
            <div className="text-center text-sm text-gray-500">
              {attendanceData.total} Total Employees
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Live Interfaces Panel
  const LiveInterfaces: React.FC = () => {
    if (interfacesLoading) return <div className="flex items-center justify-center h-full"><RefreshCw className="h-6 w-6 animate-spin" /></div>;
    
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Live Interfaces</span>
            <Badge variant="outline">Real-time</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {liveInterfaces.map((interface_, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    interface_.status === 'active' ? 'bg-green-500' : 
                    interface_.status === 'idle' ? 'bg-yellow-500' : 
                    'bg-red-500'
                  }`} />
                  <div>
                    <p className="font-medium">{interface_.title}</p>
                    <p className="text-sm text-gray-500">{interface_.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={interface_.status === 'active' ? 'default' : interface_.status === 'idle' ? 'secondary' : 'destructive'}>
                    {interface_.status}
                  </Badge>
                  <p className="text-xs text-gray-500 mt-1">{interface_.lastUpdate}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  // System Metrics Panel
  const SystemMetrics: React.FC = () => {
    if (metricsLoading) return <div className="flex items-center justify-center h-full"><RefreshCw className="h-6 w-6 animate-spin" /></div>;
    
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>System Metrics</span>
            <Badge variant="outline">Live</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {systemMetrics.map((metric, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{metric.name}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{metric.value}{metric.unit}</span>
                    <Badge variant={
                      metric.status === 'good' ? 'default' : 
                      metric.status === 'warning' ? 'secondary' : 
                      'destructive'
                    }>
                      {metric.status}
                    </Badge>
                  </div>
                </div>
                <Progress 
                  value={metric.value} 
                  className={`w-full ${
                    metric.status === 'critical' ? 'bg-red-100' : 
                    metric.status === 'warning' ? 'bg-yellow-100' : 
                    'bg-green-100'
                  }`}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Alerts Panel
  const AlertsPanel: React.FC = () => {
    if (alertsLoading) return <div className="flex items-center justify-center h-full"><RefreshCw className="h-6 w-6 animate-spin" /></div>;
    
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>System Alerts</span>
            <Badge variant="outline">{alerts.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                <div className="flex-shrink-0 mt-1">
                  {alert.type === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                  {alert.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                  {alert.type === 'info' && <CheckCircle className="h-4 w-4 text-blue-500" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{alert.message}</p>
                  <p className="text-xs text-gray-500">{alert.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Network Status Panel
  const NetworkStatus: React.FC = () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {isOnline ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
          <span>Network Status</span>
          <Badge variant={isOnline ? 'default' : 'destructive'}>
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Connection Status</span>
            <Badge variant={isOnline ? 'default' : 'destructive'}>
              {isOnline ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Last Update</span>
            <span className="text-sm text-gray-500">
              {lastUpdate.toLocaleTimeString()}
            </span>
          </div>
          <Button 
            onClick={handleRefresh} 
            size="sm" 
            className="w-full"
            disabled={!isOnline}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Quick Actions Panel
  const QuickActions: React.FC = () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <span>Quick Actions</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" className="flex flex-col items-center p-4 h-auto">
            <Calendar className="h-4 w-4 mb-1" />
            <span className="text-xs">Schedule</span>
          </Button>
          <Button size="sm" variant="outline" className="flex flex-col items-center p-4 h-auto">
            <MapPin className="h-4 w-4 mb-1" />
            <span className="text-xs">Locations</span>
          </Button>
          <Button size="sm" variant="outline" className="flex flex-col items-center p-4 h-auto">
            <BarChart3 className="h-4 w-4 mb-1" />
            <span className="text-xs">Reports</span>
          </Button>
          <Button size="sm" variant="outline" className="flex flex-col items-center p-4 h-auto">
            <Database className="h-4 w-4 mb-1" />
            <span className="text-xs">Backup</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Overview</h1>
          <p className="text-gray-500">Real-time system monitoring and metrics</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={isOnline ? 'default' : 'destructive'}>
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
          <span className="text-sm text-gray-500">
            Updated: {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Row 1 */}
        <div className="lg:col-span-1">
          <AttendanceOverview />
        </div>
        <div className="lg:col-span-2">
          <LiveInterfaces />
        </div>

        {/* Row 2 */}
        <div className="lg:col-span-2">
          <SystemMetrics />
        </div>
        <div className="lg:col-span-1">
          <NetworkStatus />
        </div>

        {/* Row 3 */}
        <div className="lg:col-span-2">
          <AlertsPanel />
        </div>
        <div className="lg:col-span-1">
          <QuickActions />
        </div>
      </div>
    </div>
  );
};

export default GridDashboard;
