import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Cpu,
  MemoryStick,
  RefreshCw,
  Play,
  Pause,
  RotateCcw,
  Settings,
  Eye,
  Zap,
  Heart,
  Server,
  TrendingUp,
  AlertCircle,
  Timer,
  Monitor,
  Shield,
  Database,
  Wifi,
  Bot
} from 'lucide-react';

interface ServiceStatus {
  name: string;
  displayName: string;
  isRunning: boolean;
  health: 'healthy' | 'warning' | 'critical' | 'stopped';
  lastHeartbeat: string | null;
  errorCount: number;
  restartCount: number;
  uptime: number;
  description: string;
  category: string;
  isCritical: boolean;
  icon: any;
  autostart?: boolean;
  watchdogEnabled?: boolean;
}

interface SystemHealth {
  overallHealth: number;
  totalServices: number;
  healthyServices: number;
  warningServices: number;
  criticalServices: number;
  stoppedServices: number;
  maintenanceMode: boolean;
  uptime: number;
}

const SERVICE_CONFIG = {
  timestampPolling: {
    displayName: 'Timestamp Polling',
    description: 'Real-time attendance data polling from BioTime API',
    category: 'Data Collection',
    icon: Timer,
    isCritical: true
  },
  automatedPolling: {
    displayName: 'Automated Polling',
    description: 'Scheduled attendance data synchronization',
    category: 'Data Collection',
    icon: Bot,
    isCritical: true
  },
  checkAttend: {
    displayName: 'Attendance Processing',
    description: 'Processes raw attendance data into records',
    category: 'Data Processing',
    icon: Database,
    isCritical: false
  },
  autoPunchout: {
    displayName: 'Auto Punch-out',
    description: 'Automatic punch-out for employees exceeding 12 hours',
    category: 'Automation',
    icon: Clock,
    isCritical: false
  },
  lateEarlyAnalysis: {
    displayName: 'Late/Early Analysis',
    description: 'Analyzes attendance patterns and timing',
    category: 'Analytics',
    icon: TrendingUp,
    isCritical: false
  },
  watchdog: {
    displayName: 'Watchdog Monitor',
    description: 'Monitors service health and auto-restarts failed services',
    category: 'Monitoring',
    icon: Shield,
    isCritical: false
  },
  processMonitor: {
    displayName: 'Process Monitor',
    description: 'Monitors system resources and performance',
    category: 'Monitoring',
    icon: Monitor,
    isCritical: false
  }
};

const getHealthColor = (health: string) => {
  switch (health) {
    case 'healthy': return 'text-green-500';
    case 'warning': return 'text-yellow-500';
    case 'critical': return 'text-red-500';
    case 'stopped': return 'text-gray-500';
    default: return 'text-gray-500';
  }
};

const getHealthBadgeColor = (health: string) => {
  switch (health) {
    case 'healthy': return 'bg-green-600';
    case 'warning': return 'bg-yellow-600';
    case 'critical': return 'bg-red-600';
    case 'stopped': return 'bg-gray-600';
    default: return 'bg-gray-600';
  }
};

const ServiceCard = ({ service, onAction, onToggleAutostart, onToggleWatchdog }: { 
  service: ServiceStatus; 
  onAction: (action: string, serviceName: string) => void;
  onToggleAutostart: (serviceName: string, enabled: boolean) => void;
  onToggleWatchdog: (serviceName: string, enabled: boolean) => void;
}) => {
  const config = SERVICE_CONFIG[service.name as keyof typeof SERVICE_CONFIG];
  const IconComponent = config?.icon || Activity;
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (service.health === 'healthy' && service.isRunning) {
      const interval = setInterval(() => {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 1000);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [service.health, service.isRunning]);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <Card className={`bg-[#2A2B5E] border-purple-500/30 hover:border-purple-500/50 transition-all duration-300 ${
      isAnimating ? 'scale-102 shadow-lg shadow-purple-500/20' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-purple-500/20 ${isAnimating ? 'animate-pulse' : ''}`}>
              <IconComponent className={`w-5 h-5 ${getHealthColor(service.health)}`} />
            </div>
            <div>
              <CardTitle className="text-lg text-white">{config?.displayName || service.name}</CardTitle>
              <p className="text-sm text-gray-400">{config?.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {config?.isCritical && (
              <Badge className="bg-red-600 text-white">Critical</Badge>
            )}
            <Badge className={`${getHealthBadgeColor(service.health)} text-white`}>
              {service.health}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Status</span>
            <div className="flex items-center gap-2">
              {service.isRunning ? (
                <div className="flex items-center gap-1 text-green-500">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Running
                </div>
              ) : (
                <div className="flex items-center gap-1 text-gray-500">
                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  Stopped
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Uptime</span>
            <span className="text-white">{formatUptime(service.uptime)}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Restarts</span>
            <span className="text-white">{service.restartCount}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Errors</span>
            <span className={service.errorCount > 0 ? 'text-red-500' : 'text-green-500'}>
              {service.errorCount}
            </span>
          </div>
          
          {service.lastHeartbeat && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Last Heartbeat</span>
              <span className="text-white">
                {new Date(service.lastHeartbeat).toLocaleTimeString()}
              </span>
            </div>
          )}
          
          {/* Autostart Toggle */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Autostart</span>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${service.autostart ? 'text-green-400' : 'text-gray-500'}`}>
                {service.autostart ? 'ON' : 'OFF'}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onToggleAutostart(service.name, !service.autostart)}
                className={`h-6 w-12 p-0 ${
                  service.autostart 
                    ? 'bg-green-500/20 border-green-500/50 text-green-400' 
                    : 'bg-gray-500/20 border-gray-500/50 text-gray-500'
                }`}
              >
                {service.autostart ? <Zap className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              </Button>
            </div>
          </div>
          
          {/* Watchdog Toggle */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Watchdog</span>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${service.watchdogEnabled ? 'text-blue-400' : 'text-gray-500'}`}>
                {service.watchdogEnabled ? 'ON' : 'OFF'}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onToggleWatchdog(service.name, !service.watchdogEnabled)}
                className={`h-6 w-12 p-0 ${
                  service.watchdogEnabled 
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' 
                    : 'bg-gray-500/20 border-gray-500/50 text-gray-500'
                }`}
              >
                {service.watchdogEnabled ? <Shield className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              </Button>
            </div>
          </div>
          
          <div className="flex gap-2 pt-2">
            {service.isRunning ? (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => onAction('stop', service.name)}
                className="flex-1 border-red-500/30 hover:border-red-500/50 text-red-500 hover:text-red-400"
              >
                <Pause className="w-4 h-4 mr-1" />
                Stop
              </Button>
            ) : (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => onAction('start', service.name)}
                className="flex-1 border-green-500/30 hover:border-green-500/50 text-green-500 hover:text-green-400"
              >
                <Play className="w-4 h-4 mr-1" />
                Start
              </Button>
            )}
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onAction('restart', service.name)}
              className="flex-1 border-purple-500/30 hover:border-purple-500/50 text-purple-400 hover:text-purple-300"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Restart
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const SystemOverview = ({ systemHealth }: { systemHealth: SystemHealth }) => {
  const getOverallHealthColor = (health: number) => {
    if (health >= 80) return 'text-green-500';
    if (health >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getOverallHealthBg = (health: number) => {
    if (health >= 80) return 'bg-green-600';
    if (health >= 60) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="bg-[#2A2B5E] border-purple-500/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Overall Health</p>
              <p className={`text-2xl font-bold ${getOverallHealthColor(systemHealth.overallHealth)}`}>
                {systemHealth.overallHealth}%
              </p>
            </div>
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Heart className={`w-6 h-6 ${getOverallHealthColor(systemHealth.overallHealth)}`} />
            </div>
          </div>
          <Progress 
            value={systemHealth.overallHealth} 
            className={`mt-2 h-2 ${getOverallHealthBg(systemHealth.overallHealth)}`}
          />
        </CardContent>
      </Card>

      <Card className="bg-[#2A2B5E] border-purple-500/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Services</p>
              <p className="text-2xl font-bold text-white">{systemHealth.totalServices}</p>
            </div>
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Server className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            <Badge className="bg-green-600 text-white">{systemHealth.healthyServices}</Badge>
            <Badge className="bg-yellow-600 text-white">{systemHealth.warningServices}</Badge>
            <Badge className="bg-red-600 text-white">{systemHealth.criticalServices}</Badge>
            <Badge className="bg-gray-600 text-white">{systemHealth.stoppedServices}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#2A2B5E] border-purple-500/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">System Uptime</p>
              <p className="text-2xl font-bold text-white">
                {Math.floor(systemHealth.uptime / 3600)}h {Math.floor((systemHealth.uptime % 3600) / 60)}m
              </p>
            </div>
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Clock className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#2A2B5E] border-purple-500/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Maintenance Mode</p>
              <p className="text-2xl font-bold text-white">
                {systemHealth.maintenanceMode ? 'ON' : 'OFF'}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Settings className={`w-6 h-6 ${systemHealth.maintenanceMode ? 'text-yellow-400' : 'text-green-400'}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default function ServiceHealthDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch service status
  const { data: services, isLoading, error } = useQuery({
    queryKey: ['/api/admin/services'],
    refetchInterval: autoRefresh ? 5000 : false,
    staleTime: 2000,
    gcTime: 10000
  });

  // Calculate system health from services data
  const systemHealth: SystemHealth = {
    overallHealth: services ? Math.round(
      (services.filter((s: any) => s.status === 'healthy').length / services.length) * 100) : 0,
    totalServices: services ? services.length : 0,
    healthyServices: services ? services.filter((s: any) => s.status === 'healthy').length : 0,
    warningServices: services ? services.filter((s: any) => s.status === 'unhealthy').length : 0,
    criticalServices: services ? services.filter((s: any) => s.status === 'error').length : 0,
    stoppedServices: services ? services.filter((s: any) => s.status === 'stopped').length : 0,
    maintenanceMode: false,
    uptime: 0
  };

  // Service actions mutation
  const serviceActionMutation = useMutation({
    mutationFn: async ({ action, serviceName }: { action: string; serviceName: string }) => {
      return await apiRequest(`/api/admin/services/${serviceName}/${action}`, {
        method: 'POST'
      });
    },
    onSuccess: (data, variables) => {
      toast({
        title: 'Service Action Successful',
        description: `${variables.serviceName} ${variables.action} completed successfully`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/services'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Service Action Failed',
        description: error.message || 'Failed to perform service action',
        variant: 'destructive'
      });
    }
  });

  // Toggle mutations for autostart and watchdog
  const toggleAutostartMutation = useMutation({
    mutationFn: async ({ serviceName, enabled }: { serviceName: string; enabled: boolean }) => {
      return await apiRequest(`/api/admin/services/${serviceName}/autostart`, {
        method: 'POST',
        data: { enabled }
      });
    },
    onSuccess: (data, variables) => {
      toast({
        title: 'Autostart Updated',
        description: `Autostart ${variables.enabled ? 'enabled' : 'disabled'} for ${variables.serviceName}`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/services'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Autostart Update Failed',
        description: error.message || 'Failed to update autostart setting',
        variant: 'destructive'
      });
    }
  });

  const toggleWatchdogMutation = useMutation({
    mutationFn: async ({ serviceName, enabled }: { serviceName: string; enabled: boolean }) => {
      return await apiRequest(`/api/admin/services/${serviceName}/watchdog`, {
        method: 'POST',
        data: { enabled }
      });
    },
    onSuccess: (data, variables) => {
      toast({
        title: 'Watchdog Updated',
        description: `Watchdog ${variables.enabled ? 'enabled' : 'disabled'} for ${variables.serviceName}`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/services'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Watchdog Update Failed',
        description: error.message || 'Failed to update watchdog setting',
        variant: 'destructive'
      });
    }
  });

  const handleServiceAction = (action: string, serviceName: string) => {
    serviceActionMutation.mutate({ action, serviceName });
  };

  const handleToggleAutostart = (serviceName: string, enabled: boolean) => {
    toggleAutostartMutation.mutate({ serviceName, enabled });
  };

  const handleToggleWatchdog = (serviceName: string, enabled: boolean) => {
    toggleWatchdogMutation.mutate({ serviceName, enabled });
  };

  const categories = ['all', 'Data Collection', 'Data Processing', 'Automation', 'Analytics', 'Monitoring'];

  const filteredServices = services?.filter((service: ServiceStatus) => {
    if (selectedCategory === 'all') return true;
    const config = SERVICE_CONFIG[service.name as keyof typeof SERVICE_CONFIG];
    return config?.category === selectedCategory;
  }) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] p-6">
        <Alert className="bg-red-500/10 border-red-500/20">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-400">
            Failed to load service status. Please check your authentication.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1B3E] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Service Health Dashboard</h1>
            <p className="text-gray-400 mt-1">Real-time monitoring and management of all system services</p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`border-purple-500/30 ${autoRefresh ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400'}`}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/services'] })}
              className="border-purple-500/30 text-purple-400 hover:text-purple-300"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Now
            </Button>
          </div>
        </div>

        {/* System Overview */}
        {systemHealth && <SystemOverview systemHealth={systemHealth} />}

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-6">
          <TabsList className="bg-[#2A2B5E] border-purple-500/30">
            {categories.map((category) => (
              <TabsTrigger 
                key={category} 
                value={category}
                className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400"
              >
                {category === 'all' ? 'All Services' : category}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedCategory} className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.map((service: ServiceStatus) => (
                <ServiceCard
                  key={service.name}
                  service={service}
                  onAction={handleServiceAction}
                  onToggleAutostart={handleToggleAutostart}
                  onToggleWatchdog={handleToggleWatchdog}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Empty State */}
        {filteredServices.length === 0 && (
          <div className="text-center py-12">
            <Activity className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">No services found</h3>
            <p className="text-gray-500">No services match the current filter criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}