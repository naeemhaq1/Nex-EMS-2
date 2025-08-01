import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import MobileAdminDualNavigation from '@/components/mobile/MobileAdminDualNavigation';
import { 
  Monitor, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Play,
  Square,
  Activity,
  Clock,
  Settings,
  Zap,
  Database,
  Wifi,
  Server,
  ArrowLeft,
  Pause,
  RotateCcw,
  Eye,
  Shield,
  Cpu,
  MemoryStick,
  AlertCircle,
  Timer,
  Power,
  WifiOff,
  Trash2
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ServiceDetails {
  name: string;
  status: 'healthy' | 'unhealthy' | 'stopped' | 'error';
  uptime: string;
  lastStarted: string | null;
  lastStopped: string | null;
  description: string;
  type: 'critical' | 'standard' | 'background';
  autostart: boolean;
  watchdogEnabled: boolean;
  restarts: number;
  errorCount: number;
  errors: string[];
  lastHeartbeat: string | null;
  pid: number | null;
  cpu?: number;
  memory?: number;
}

interface SystemOverview {
  totalServices: number;
  healthyServices: number;
  unhealthyServices: number;
  stoppedServices: number;
  systemUptime: string;
  lastUpdated: string;
  watchdogEnabled: boolean;
  maintenanceMode: boolean;
}

export default function MobileAdminServiceMonitoring() {
  const [, navigate] = useLocation();
  const [selectedService, setSelectedService] = useState<ServiceDetails | null>(null);
  const [showServiceDetails, setShowServiceDetails] = useState(false);
  const [animatingServices, setAnimatingServices] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  // Fetch service status
  const { data: services = [], isLoading, refetch } = useQuery<ServiceDetails[]>({
    queryKey: ['/api/admin/services'],
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  // Fetch system overview
  const { data: systemOverview } = useQuery<SystemOverview>({
    queryKey: ['/api/admin/services/system/overview'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Service control mutations
  const startServiceMutation = useMutation({
    mutationFn: async (serviceName: string) => {
      setAnimatingServices(prev => new Set(prev).add(serviceName));
      await apiRequest(`/api/service-manager/services/${serviceName}/start`, {
        method: 'POST',
      });
    },
    onSuccess: (_, serviceName) => {
      setTimeout(() => {
        setAnimatingServices(prev => {
          const newSet = new Set(prev);
          newSet.delete(serviceName);
          return newSet;
        });
      }, 2000);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/services/system/overview'] });
    },
    onError: (_, serviceName) => {
      setAnimatingServices(prev => {
        const newSet = new Set(prev);
        newSet.delete(serviceName);
        return newSet;
      });
    }
  });

  const stopServiceMutation = useMutation({
    mutationFn: async (serviceName: string) => {
      setAnimatingServices(prev => new Set(prev).add(serviceName));
      await apiRequest(`/api/service-manager/services/${serviceName}/stop`, {
        method: 'POST',
      });
    },
    onSuccess: (_, serviceName) => {
      setTimeout(() => {
        setAnimatingServices(prev => {
          const newSet = new Set(prev);
          newSet.delete(serviceName);
          return newSet;
        });
      }, 2000);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/services/system/overview'] });
    },
    onError: (_, serviceName) => {
      setAnimatingServices(prev => {
        const newSet = new Set(prev);
        newSet.delete(serviceName);
        return newSet;
      });
    }
  });

  const restartServiceMutation = useMutation({
    mutationFn: async (serviceName: string) => {
      setAnimatingServices(prev => new Set(prev).add(serviceName));
      await apiRequest(`/api/service-manager/services/${serviceName}/restart`, {
        method: 'POST',
      });
    },
    onSuccess: (_, serviceName) => {
      setTimeout(() => {
        setAnimatingServices(prev => {
          const newSet = new Set(prev);
          newSet.delete(serviceName);
          return newSet;
        });
      }, 2000);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/services/system/overview'] });
    },
    onError: (_, serviceName) => {
      setAnimatingServices(prev => {
        const newSet = new Set(prev);
        newSet.delete(serviceName);
        return newSet;
      });
    }
  });

  const toggleAutostartMutation = useMutation({
    mutationFn: async ({ serviceName, enabled }: { serviceName: string; enabled: boolean }) => {
      await apiRequest(`/api/service-manager/services/${serviceName}/autostart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/services'] });
    },
  });

  const toggleWatchdogMutation = useMutation({
    mutationFn: async ({ serviceName, enabled }: { serviceName: string; enabled: boolean }) => {
      await apiRequest(`/api/service-manager/services/${serviceName}/watchdog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/services'] });
    },
  });

  const clearErrorsMutation = useMutation({
    mutationFn: async (serviceName: string) => {
      await apiRequest(`/api/service-manager/services/${serviceName}/clear-errors`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/services'] });
    },
  });

  // Manual refresh
  const refreshMutation = useMutation({
    mutationFn: async () => {
      await refetch();
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'unhealthy': return 'bg-red-500';
      case 'stopped': return 'bg-gray-500';
      case 'error': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'unhealthy': return <XCircle className="w-5 h-5 text-red-400" />;
      case 'stopped': return <Square className="w-5 h-5 text-gray-400" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-orange-400" />;
      default: return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getServiceTypeIcon = (name: string) => {
    if (name.includes('poller') || name.includes('biotime')) return <Database className="w-5 h-5 text-blue-400" />;
    if (name.includes('whatsapp')) return <Wifi className="w-5 h-5 text-green-400" />;
    if (name.includes('backup')) return <Shield className="w-5 h-5 text-purple-400" />;
    if (name.includes('watchdog') || name.includes('monitor')) return <Eye className="w-5 h-5 text-yellow-400" />;
    return <Server className="w-5 h-5 text-gray-400" />;
  };

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-[#1A1B3E] flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin mx-auto mb-4"></div>
              <Monitor className="w-6 h-6 text-purple-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-gray-400">Loading services...</p>
          </div>
        </div>
        <MobileAdminDualNavigation />
      </div>
    );
  }

  if (showServiceDetails && selectedService) {
    return (
      <div className="h-screen bg-[#1A1B3E] overflow-hidden flex flex-col">
        {/* Service Details Header */}
        <div className="bg-[#2A2B5E] p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowServiceDetails(false)}
              className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(selectedService.status)} ${animatingServices.has(selectedService.name) ? 'animate-pulse' : ''}`}></div>
              <span className="text-sm text-gray-300 capitalize">{selectedService.status}</span>
            </div>
          </div>
          <h1 className="text-xl font-bold flex items-center space-x-3">
            {getServiceTypeIcon(selectedService.name)}
            <span>{selectedService.name}</span>
            {selectedService.type === 'critical' && (
              <div className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs font-medium">
                CRITICAL
              </div>
            )}
          </h1>
          <p className="text-gray-400 mt-1">{selectedService.description}</p>
        </div>

        {/* Service Details Content */}
        <div className="flex-1 overflow-y-auto mobile-content-scroll p-4 space-y-4">
          {/* Status Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#2A2B5E] rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <Timer className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-400">Uptime</span>
              </div>
              <div className="text-lg font-semibold text-white">{selectedService.uptime}</div>
            </div>
            
            <div className="bg-[#2A2B5E] rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <RotateCcw className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-gray-400">Restarts</span>
              </div>
              <div className="text-lg font-semibold text-white">{selectedService.restarts}</div>
            </div>
          </div>

          {/* Settings */}
          <div className="bg-[#2A2B5E] rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <Settings className="w-5 h-5 text-purple-400" />
              <span>Settings</span>
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Power className="w-4 h-4 text-green-400" />
                  <span>Autostart</span>
                </div>
                <button
                  onClick={() => toggleAutostartMutation.mutate({ serviceName: selectedService.name, enabled: !selectedService.autostart })}
                  disabled={toggleAutostartMutation.isPending}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    selectedService.autostart ? 'bg-green-500' : 'bg-gray-600'
                  } ${toggleAutostartMutation.isPending ? 'opacity-50' : ''}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    selectedService.autostart ? 'translate-x-6' : 'translate-x-0.5'
                  }`}></div>
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-yellow-400" />
                  <span>Watchdog</span>
                </div>
                <button
                  onClick={() => toggleWatchdogMutation.mutate({ serviceName: selectedService.name, enabled: !selectedService.watchdogEnabled })}
                  disabled={toggleWatchdogMutation.isPending}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    selectedService.watchdogEnabled ? 'bg-yellow-500' : 'bg-gray-600'
                  } ${toggleWatchdogMutation.isPending ? 'opacity-50' : ''}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    selectedService.watchdogEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}></div>
                </button>
              </div>
            </div>
          </div>

          {/* Control Actions */}
          <div className="bg-[#2A2B5E] rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Actions</h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => startServiceMutation.mutate(selectedService.name)}
                disabled={selectedService.status === 'healthy' || startServiceMutation.isPending}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50 text-white rounded-lg p-3 flex flex-col items-center space-y-1 transition-all duration-200 active:scale-95"
              >
                <Play className="w-5 h-5" />
                <span className="text-xs">Start</span>
              </button>
              
              <button
                onClick={() => stopServiceMutation.mutate(selectedService.name)}
                disabled={selectedService.status === 'stopped' || stopServiceMutation.isPending}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:opacity-50 text-white rounded-lg p-3 flex flex-col items-center space-y-1 transition-all duration-200 active:scale-95"
              >
                <Square className="w-5 h-5" />
                <span className="text-xs">Stop</span>
              </button>
              
              <button
                onClick={() => restartServiceMutation.mutate(selectedService.name)}
                disabled={restartServiceMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white rounded-lg p-3 flex flex-col items-center space-y-1 transition-all duration-200 active:scale-95"
              >
                <RotateCcw className="w-5 h-5" />
                <span className="text-xs">Restart</span>
              </button>
            </div>
          </div>

          {/* Error Logs */}
          {selectedService.errors.length > 0 && (
            <div className="bg-[#2A2B5E] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span>Recent Errors ({selectedService.errors.length})</span>
                </h3>
                <button
                  onClick={() => clearErrorsMutation.mutate(selectedService.name)}
                  disabled={clearErrorsMutation.isPending}
                  className="bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg px-3 py-1 text-sm transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedService.errors.slice(0, 5).map((error, index) => (
                  <div key={index} className="bg-red-500/10 border border-red-500/20 rounded p-2">
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timing Information */}
          <div className="bg-[#2A2B5E] rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-400" />
              <span>Timing</span>
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Last Started:</span>
                <span className="text-white">{formatTimeAgo(selectedService.lastStarted)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Last Stopped:</span>
                <span className="text-white">{formatTimeAgo(selectedService.lastStopped)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Last Heartbeat:</span>
                <span className="text-white">{formatTimeAgo(selectedService.lastHeartbeat)}</span>
              </div>
            </div>
          </div>
        </div>
        
        <MobileAdminDualNavigation />
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#1A1B3E] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-[#2A2B5E] p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold flex items-center space-x-3">
            <Monitor className="w-6 h-6 text-purple-400" />
            <span>Service Monitor</span>
          </h1>
          <button
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg p-2 transition-all duration-200 active:scale-95"
          >
            <RefreshCw className={`w-5 h-5 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        {/* System Overview */}
        {systemOverview && (
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="bg-[#1A1B3E] rounded-lg p-2 text-center">
              <div className="text-xs text-gray-400">Total</div>
              <div className="text-lg font-bold text-white">{systemOverview.totalServices}</div>
            </div>
            <div className="bg-[#1A1B3E] rounded-lg p-2 text-center">
              <div className="text-xs text-gray-400">Healthy</div>
              <div className="text-lg font-bold text-green-400">{systemOverview.healthyServices}</div>
            </div>
            <div className="bg-[#1A1B3E] rounded-lg p-2 text-center">
              <div className="text-xs text-gray-400">Issues</div>
              <div className="text-lg font-bold text-red-400">{systemOverview.unhealthyServices}</div>
            </div>
            <div className="bg-[#1A1B3E] rounded-lg p-2 text-center">
              <div className="text-xs text-gray-400">Stopped</div>
              <div className="text-lg font-bold text-gray-400">{systemOverview.stoppedServices}</div>
            </div>
          </div>
        )}
      </div>

      {/* Services List */}
      <div className="flex-1 overflow-y-auto mobile-content-scroll p-4 space-y-3">
        {services.map((service) => (
          <div
            key={service.name}
            onClick={() => {
              setSelectedService(service);
              setShowServiceDetails(true);
            }}
            className="bg-[#2A2B5E] rounded-lg p-4 transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                {getServiceTypeIcon(service.name)}
                <div>
                  <h3 className="font-semibold text-white">{service.name}</h3>
                  <p className="text-sm text-gray-400 truncate max-w-48">{service.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(service.status)} ${animatingServices.has(service.name) ? 'animate-pulse' : ''}`}></div>
                {getStatusIcon(service.status)}
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1 text-gray-400">
                  <Timer className="w-3 h-3" />
                  <span>{service.uptime}</span>
                </div>
                <div className="flex items-center space-x-1 text-gray-400">
                  <RotateCcw className="w-3 h-3" />
                  <span>{service.restarts}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {service.autostart && (
                  <div className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs">
                    Auto
                  </div>
                )}
                {service.watchdogEnabled && (
                  <div className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded text-xs">
                    Watch
                  </div>
                )}
                {service.type === 'critical' && (
                  <div className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs">
                    Critical
                  </div>
                )}
                {service.errorCount > 0 && (
                  <div className="bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded text-xs flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{service.errorCount}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <MobileAdminDualNavigation />
    </div>
  );
}