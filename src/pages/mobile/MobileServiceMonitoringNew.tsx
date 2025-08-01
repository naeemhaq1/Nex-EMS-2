/* 
 * ⚠️  CRITICAL WARNING: DO NOT CHANGE PORT ASSIGNMENTS
 * 
 * Three-tier architecture:
 * - Port 5000: Frontend/Web Interface (Main Server)
 * - Port 5001: Essential Services (Core Services, Three Poller System, BioTime Integration)  
 * - Port 5002: WhatsApp Services (API Monitor, Core Services, Chatbot)
 * 
 * Services are architecturally separated but currently integrated into main server for deployment efficiency.
 * Changing these port assignments will break the service monitoring and deployment architecture.
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, RefreshCw, Play, Square, AlertTriangle, CheckCircle, 
  Clock, Cpu, MemoryStick, Activity, Zap, Shield, RotateCcw,
  Eye, EyeOff, Settings, Server, Database, Wifi
} from 'lucide-react';
import { Link } from 'wouter';
import MobileAdminDualNavigation from '@/components/mobile/MobileAdminDualNavigation';

interface ServiceDetails {
  name: string;
  status: 'healthy' | 'unhealthy' | 'stopped' | 'error' | 'unknown' | 'running';
  uptime: string;
  uptimeSeconds: number;
  lastStarted: string | null;
  lastStopped: string | null;
  lastHeartbeat: string | null;
  description: string;
  type: 'critical' | 'standard';
  restartCount: number;
  errorCount: number;
  errors: string[];
  autostart: boolean;
  watchdogEnabled: boolean;
  port?: number;
  category?: string;
  pid?: number | null;
  cpu?: number;
  memory?: number;
  runningTime?: string;
  startupMethod?: 'dev' | 'admin' | 'watchdog' | 'system' | 'auto' | 'manual' | 'unknown';
  lastShutdownReason?: 'admin_stop' | 'admin_restart' | 'watchdog_restart' | 'system_shutdown' | 'error' | 'crash' | 'maintenance' | 'unknown';
  startedBy?: string;
  stoppedBy?: string;
  healthIndicator?: {
    color: string;
    pulse: boolean;
    text: string;
  };
}

interface ServiceOverview {
  totalServices: number;
  healthyServices: number;
  unhealthyServices: number;
  stoppedServices: number;
  criticalServices: number;
  uptime: string;
}

export default function MobileServiceMonitoringNew() {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch three-tier services status with detailed information (ports 5000, 5001, 5002)
  const { data: services = [], isLoading, error, refetch } = useQuery({
    queryKey: ['admin-services'],
    queryFn: async (): Promise<ServiceDetails[]> => {
      const response = await fetch('/api/admin/services', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Try to refresh auth and retry once
          window.location.reload();
          throw new Error('Authentication failed - refreshing page...');
        }
        throw new Error('Failed to fetch services');
      }
      return await response.json();
    },
    refetchInterval: autoRefresh ? 3000 : false, // 3 second refresh
    refetchIntervalInBackground: false,
    retry: (failureCount, error: any) => {
      // Don't retry authentication errors
      if (error?.message?.includes('Authentication failed')) {
        return false;
      }
      return failureCount < 2;
    }
  });

  // Fetch port management data for dynamic service monitoring
  const { data: portConfig, isLoading: portLoading } = useQuery({
    queryKey: ['/api/port-management/config'],
    refetchInterval: 5000,
  });

  // Fetch port availability data
  const { data: portAvailability } = useQuery({
    queryKey: ['/api/port-management/availability'],
    refetchInterval: 10000,
  });

  // Fetch three-tier architecture status
  const { data: threeTierStatus, refetch: refetchThreeTier } = useQuery({
    queryKey: ['three-tier-status'],
    queryFn: async () => {
      const response = await fetch('/api/admin/three-tier/status', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to fetch three-tier status');
      return await response.json();
    },
    refetchInterval: autoRefresh ? 5000 : false,
    refetchIntervalInBackground: false
  });

  // Fetch system overview
  const { data: overview } = useQuery({
    queryKey: ['admin-services-overview'],
    queryFn: async (): Promise<ServiceOverview> => {
      const response = await fetch('/api/admin/services/system/overview', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to fetch overview');
      return await response.json();
    },
    refetchInterval: autoRefresh ? 5000 : false
  });

  // Service control mutations
  const startService = useMutation({
    mutationFn: async (serviceName: string) => {
      const response = await fetch(`/api/admin/services/${serviceName}/start`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to start service');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
    }
  });

  const stopService = useMutation({
    mutationFn: async (serviceName: string) => {
      const response = await fetch(`/api/admin/services/${serviceName}/stop`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to stop service');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
    }
  });

  const restartService = useMutation({
    mutationFn: async (serviceName: string) => {
      const response = await fetch(`/api/admin/services/${serviceName}/restart`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to restart service');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
    }
  });

  // Get service icon based on name
  const getServiceIcon = (serviceName: string) => {
    if (serviceName.toLowerCase().includes('database') || serviceName.toLowerCase().includes('poller')) {
      return <Database className="w-5 h-5" />;
    }
    if (serviceName.toLowerCase().includes('whatsapp') || serviceName.toLowerCase().includes('monitor')) {
      return <Wifi className="w-5 h-5" />;
    }
    return <Server className="w-5 h-5" />;
  };

  // Status indicator with animation
  const StatusIndicator = ({ service }: { service: ServiceDetails }) => {
    const getStatusDisplay = (status: string) => {
      switch (status) {
        case 'healthy':
        case 'running':
          return { color: 'green', text: 'Running', pulse: false };
        case 'unhealthy':
        case 'error':
          return { color: 'red', text: 'Error', pulse: true };
        case 'stopped':
          return { color: 'gray', text: 'Stopped', pulse: false };
        default:
          return { color: 'yellow', text: 'Unknown', pulse: true };
      }
    };

    const statusDisplay = getStatusDisplay(service.status);

    return (
      <div className="flex items-center space-x-2">
        <div 
          className={`w-3 h-3 rounded-full ${
            statusDisplay.color === 'green' ? 'bg-green-500' :
            statusDisplay.color === 'yellow' ? 'bg-yellow-500' :
            statusDisplay.color === 'red' ? 'bg-red-500' : 'bg-gray-500'
          } ${statusDisplay.pulse ? 'animate-pulse' : ''}`}
        />
        <span className={`text-sm font-medium ${
          statusDisplay.color === 'green' ? 'text-green-400' :
          statusDisplay.color === 'yellow' ? 'text-yellow-400' :
          statusDisplay.color === 'red' ? 'text-red-400' : 'text-gray-400'
        }`}>
          {statusDisplay.text}
        </span>
      </div>
    );
  };

  // Service control buttons
  const ServiceControls = ({ service }: { service: ServiceDetails }) => (
    <div className="flex space-x-2">
      {(service.status === 'stopped' || service.status === 'unhealthy' || service.status === 'error') && (
        <button
          onClick={() => startService.mutate(service.name)}
          disabled={startService.isPending}
          className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 disabled:opacity-50 transition-all active:scale-95"
        >
          <Play className="w-3 h-3" />
          <span>Start</span>
        </button>
      )}
      
      {(service.status === 'healthy' || service.status === 'running') && (
        <button
          onClick={() => stopService.mutate(service.name)}
          disabled={stopService.isPending}
          className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700 disabled:opacity-50 transition-all active:scale-95"
        >
          <Square className="w-3 h-3" />
          <span>Stop</span>
        </button>
      )}
      
      <button
        onClick={() => restartService.mutate(service.name)}
        disabled={restartService.isPending}
        className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95"
      >
        <RotateCcw className="w-3 h-3" />
        <span>Restart</span>
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="h-screen bg-gradient-to-br from-[#1A1B3E] to-[#2A2B5E] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
          <p className="text-gray-300">Loading services...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-gradient-to-br from-[#1A1B3E] to-[#2A2B5E] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 mb-4">Failed to load services</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-[#1A1B3E] to-[#2A2B5E] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-black/20 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Link to="/mobile/admin/dashboard">
              <button className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all active:scale-95">
                <ArrowLeft className="w-4 h-4 text-white" />
              </button>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white">Service Monitor</h1>
              <p className="text-xs text-gray-300">
                {services.length}/14 services • {services.filter(s => s.status === 'healthy').length} healthy • {services.filter(s => s.status === 'error' || s.status === 'unhealthy').length} failed
                {threeTierStatus && ` • ${threeTierStatus.overall?.healthyServices || 0}/3 tiers`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-1.5 rounded-lg transition-all active:scale-95 ${
                autoRefresh ? 'bg-green-600 text-white' : 'bg-white/10 text-gray-400'
              }`}
            >
              <Activity className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => {
                refetch();
                refetchThreeTier();
              }}
              className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Three-Tier Architecture Overview */}
      <div className="flex-shrink-0 p-4 bg-black/10">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-white mb-2">Three-Tier Architecture Status</h2>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="text-sm font-bold text-blue-400">Port 5000</div>
              <div className="text-xs text-gray-400">Main Interface</div>
              <div className="text-xs text-green-400 mt-1">
                {services.filter(s => s.port === 5000 && s.status === 'healthy').length}/{services.filter(s => s.port === 5000).length} healthy
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="text-sm font-bold text-orange-400">Port 5001</div>
              <div className="text-xs text-gray-400">Core Services</div>
              <div className="text-xs text-green-400 mt-1">
                {services.filter(s => s.port === 5001 && s.status === 'healthy').length}/{services.filter(s => s.port === 5001).length} healthy
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="text-sm font-bold text-purple-400">Port 5002</div>
              <div className="text-xs text-gray-400">WhatsApp Services</div>
              <div className="text-xs text-green-400 mt-1">
                {services.filter(s => s.port === 5002 && s.status === 'healthy').length}/{services.filter(s => s.port === 5002).length} healthy
              </div>
            </div>
          </div>
        </div>
        
        {/* Overall System Stats */}
        {overview && (
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-green-400">{services.filter(s => s.status === 'healthy').length}/{services.length}</div>
              <div className="text-xs text-gray-400">Running</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-yellow-400">{services.filter(s => s.status === 'unhealthy').length}</div>
              <div className="text-xs text-gray-400">Issues</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-red-400">{services.filter(s => s.status === 'stopped' || s.status === 'error').length}</div>
              <div className="text-xs text-gray-400">Stopped</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-purple-400">{services.filter(s => s.type === 'critical').length}</div>
              <div className="text-xs text-gray-400">Critical</div>
            </div>
          </div>
        )}
      </div>

      {/* Services List - Fixed Mobile Scrolling */}
      <div 
        className="flex-1 overflow-hidden"
        style={{ minHeight: 0 }}
      >
        <div 
          className="h-full overflow-y-scroll p-4 pb-20 space-y-3" 
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            touchAction: 'pan-y'
          }}
        >
          {/* Group services by port for better visualization */}
          {[5000, 5001, 5002].map(port => {
            const portServices = services.filter(s => s.port === port);
            if (portServices.length === 0) return null;
            
            const portName = port === 5000 ? 'Main Interface & Management' : 
                           port === 5001 ? 'Core Services' : 'WhatsApp Services';
            const portColor = port === 5000 ? 'text-blue-400 border-blue-500/30' : 
                            port === 5001 ? 'text-orange-400 border-orange-500/30' : 'text-purple-400 border-purple-500/30';
            
            return (
              <div key={port} className="mb-6">
                <div className={`mb-3 pb-2 border-b ${portColor}`}>
                  <h3 className={`text-sm font-semibold ${portColor.split(' ')[0]} flex items-center gap-2`}>
                    <Server className="w-4 h-4" />
                    Port {port}: {portName}
                    <span className="text-xs text-gray-400">({portServices.length} services)</span>
                  </h3>
                </div>
                
                {portServices.map((service) => (
                  <div
                    key={service.name}
                    className="bg-[#2A2B5E]/80 backdrop-blur-sm border border-white/10 rounded-xl p-4 mb-3 transition-all hover:bg-[#2A2B5E]/90"
                  >
                    {/* Service Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${
                          service.type === 'critical' ? 'bg-red-600/20 text-red-400' : 'bg-blue-600/20 text-blue-400'
                        }`}>
                          {getServiceIcon(service.name)}
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-white capitalize">
                            {service.name.replace(/([A-Z])/g, ' $1').trim()}
                          </h3>
                          <p className="text-xs text-gray-400">{service.description}</p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => setShowDetails(showDetails === service.name ? null : service.name)}
                        className="p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-all active:scale-95"
                      >
                        {showDetails === service.name ? 
                          <EyeOff className="w-4 h-4 text-gray-400" /> : 
                          <Eye className="w-4 h-4 text-gray-400" />
                        }
                      </button>
                    </div>

              {/* Status and Runtime */}
              <div className="flex items-center justify-between mb-3">
                <StatusIndicator service={service} />
                <div className="text-xs text-gray-400">{service.uptime || '2h 30m'}</div>
              </div>

              {/* Service Indicators */}
              <div className="flex items-center space-x-4 mb-3">
                <div className="flex items-center space-x-1">
                  <Zap className={`w-3 h-3 ${service.autostart ? 'text-green-400' : 'text-gray-500'}`} />
                  <span className="text-xs text-gray-400">
                    {service.autostart ? 'Auto' : 'Manual'}
                  </span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Shield className={`w-3 h-3 ${service.watchdogEnabled ? 'text-blue-400' : 'text-gray-500'}`} />
                  <span className="text-xs text-gray-400">
                    {service.watchdogEnabled ? 'Protected' : 'Unprotected'}
                  </span>
                </div>
                
                {service.restartCount > 0 && (
                  <div className="flex items-center space-x-1">
                    <RotateCcw className="w-3 h-3 text-yellow-400" />
                    <span className="text-xs text-yellow-400">{service.restartCount} restarts</span>
                  </div>
                )}

                {(service.errorCount > 0 || (service.errors && service.errors.length > 0)) && (
                  <div className="flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                    <span className="text-xs text-red-400">{service.errorCount || service.errors?.length || 0} errors</span>
                  </div>
                )}
              </div>

              {/* Control Buttons */}
              <div className="flex justify-end">
                <ServiceControls service={service} />
              </div>

              {/* Expanded Details */}
              {showDetails === service.name && (
                <div className="mt-4 pt-4 border-t border-white/10 space-y-3 animate-in slide-in-from-top duration-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Uptime</div>
                      <div className="text-sm text-white">{service.uptime}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Port</div>
                      <div className="text-sm text-white">{service.port || 'N/A'}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Category</div>
                      <div className="text-sm text-white capitalize">{service.category || 'Core'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">PID</div>
                      <div className="text-sm text-white">{service.pid || 'N/A'}</div>
                    </div>
                  </div>

                  {service.cpu && service.cpu > 0 && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-400 mb-1">CPU</div>
                        <div className="text-sm text-blue-400">{service.cpu.toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Memory</div>
                        <div className="text-sm text-blue-400">{service.memory ? (service.memory / 1024 / 1024).toFixed(1) : 'N/A'} MB</div>
                      </div>
                    </div>
                  )}

                  {/* Startup Method and User Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Startup Method</div>
                      <div className={`text-sm font-medium ${
                        service.startupMethod === 'admin' ? 'text-purple-400' :
                        service.startupMethod === 'watchdog' ? 'text-orange-400' :
                        service.startupMethod === 'dev' ? 'text-blue-400' :
                        'text-green-400'
                      }`}>
                        {service.startupMethod?.toUpperCase() || 'SYSTEM'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Started By</div>
                      <div className="text-sm text-white">{service.startedBy || 'system'}</div>
                    </div>
                  </div>

                  {/* Shutdown Reason (if available) */}
                  {service.lastShutdownReason && service.lastShutdownReason !== 'unknown' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Last Shutdown</div>
                        <div className={`text-sm font-medium ${
                          service.lastShutdownReason.includes('admin') ? 'text-purple-400' :
                          service.lastShutdownReason.includes('watchdog') ? 'text-orange-400' :
                          service.lastShutdownReason.includes('error') || service.lastShutdownReason.includes('crash') ? 'text-red-400' :
                          'text-yellow-400'
                        }`}>
                          {service.lastShutdownReason.replace(/_/g, ' ').toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Stopped By</div>
                        <div className="text-sm text-white">{service.stoppedBy || 'system'}</div>
                      </div>
                    </div>
                  )}

                  {service.lastStarted && (
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Last Started</div>
                      <div className="text-sm text-green-400">
                        {new Date(service.lastStarted).toLocaleString()}
                      </div>
                    </div>
                  )}

                  {service.lastStopped && (
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Last Stopped</div>
                      <div className="text-sm text-red-400">
                        {new Date(service.lastStopped).toLocaleString()}
                      </div>
                    </div>
                  )}

                  {service.lastHeartbeat && (
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Last Heartbeat</div>
                      <div className="text-sm text-blue-400">
                        {new Date(service.lastHeartbeat).toLocaleString()}
                      </div>
                    </div>
                  )}

                  {service.errors && service.errors.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-400 mb-2">Recent Errors</div>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {service.errors.slice(-3).map((error, index) => (
                          <div key={index} className="bg-red-900/20 border border-red-500/20 rounded-lg p-2">
                            <div className="text-xs text-red-400 font-mono">{error}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Mobile Admin Navigation */}
      <MobileAdminDualNavigation currentPage="service-monitoring" />
    </div>
  );
}