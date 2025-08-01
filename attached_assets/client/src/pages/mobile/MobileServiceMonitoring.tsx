import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, RefreshCw, Play, Square, AlertTriangle, CheckCircle, Clock, Cpu, MemoryStick, Activity } from 'lucide-react';
import { Link } from 'wouter';

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

export default function MobileServiceMonitoring() {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const queryClient = useQueryClient();

  // Fetch services status
  const { data: services = [], isLoading, error } = useQuery({
    queryKey: ['admin-services'],
    queryFn: async (): Promise<ServiceDetails[]> => {
      const response = await fetch('/api/admin/services');
      if (!response.ok) throw new Error('Failed to fetch services');
      return await response.json();
    },
    refetchInterval: autoRefresh ? 5000 : false, // 5 second refresh
    refetchIntervalInBackground: false
  });

  // Service control mutations
  const startService = useMutation({
    mutationFn: async (serviceName: string) => {
      const response = await fetch(`/api/admin/services/${serviceName}/start`, {
        method: 'POST'
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
        method: 'POST'
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
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to restart service');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'unhealthy': return 'text-yellow-400';
      case 'stopped': return 'text-red-400';
      case 'error': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4" />;
      case 'unhealthy': return <AlertTriangle className="w-4 h-4" />;
      case 'stopped': return <Square className="w-4 h-4" />;
      case 'error': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'standard': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'background': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const criticalServices = services.filter(s => s.type === 'critical');
  const standardServices = services.filter(s => s.type === 'standard' || !s.type);
  const backgroundServices = services.filter(s => s.type === 'background');

  if (isLoading) {
    return (
      <div className="h-screen bg-[#1A1B3E] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading services...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-[#1A1B3E] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-4" />
          <p className="text-red-400">Error loading services</p>
          <p className="text-gray-500 text-sm mt-2">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#1A1B3E] text-white flex flex-col">
      {/* Header */}
      <div className="bg-[#2A2B5E] p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3">
          <Link href="/mobile/admin/dashboard">
            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors active:scale-95">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="font-semibold text-lg">Service Monitoring</h1>
            <p className="text-sm text-gray-400">{services.length} services</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`p-2 rounded-lg transition-colors ${autoRefresh ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}
          >
            <Activity className="w-4 h-4" />
          </button>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-services'] })}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-scroll p-4 space-y-6">
        {/* WhatsApp API Architecture Info */}
        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
            <h3 className="text-sm font-medium text-green-400">WhatsApp API Available on Port 5000</h3>
          </div>
          <p className="text-xs text-gray-300">
            WhatsApp chat endpoints (/api/whatsapp-direct/*) now accessible on main server (port 5000) for direct mobile interface access. 
            Core messaging services continue on port 5002.
          </p>
        </div>

        {/* Critical Services */}
        {criticalServices.length > 0 && (
          <div>
            <h2 className="text-lg font-medium text-red-400 mb-3 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Critical Services ({criticalServices.length})
            </h2>
            <div className="space-y-3">
              {criticalServices.map((service) => (
                <ServiceCard
                  key={service.name}
                  service={service}
                  onStart={() => startService.mutate(service.name)}
                  onStop={() => stopService.mutate(service.name)}
                  onRestart={() => restartService.mutate(service.name)}
                  isOperating={startService.isPending || stopService.isPending || restartService.isPending}
                />
              ))}
            </div>
          </div>
        )}

        {/* Standard Services */}
        {standardServices.length > 0 && (
          <div>
            <h2 className="text-lg font-medium text-blue-400 mb-3 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              Standard Services ({standardServices.length})
            </h2>
            <div className="space-y-3">
              {standardServices.map((service) => (
                <ServiceCard
                  key={service.name}
                  service={service}
                  onStart={() => startService.mutate(service.name)}
                  onStop={() => stopService.mutate(service.name)}
                  onRestart={() => restartService.mutate(service.name)}
                  isOperating={startService.isPending || stopService.isPending || restartService.isPending}
                />
              ))}
            </div>
          </div>
        )}

        {/* Background Services */}
        {backgroundServices.length > 0 && (
          <div>
            <h2 className="text-lg font-medium text-gray-400 mb-3 flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Background Services ({backgroundServices.length})
            </h2>
            <div className="space-y-3">
              {backgroundServices.map((service) => (
                <ServiceCard
                  key={service.name}
                  service={service}
                  onStart={() => startService.mutate(service.name)}
                  onStop={() => stopService.mutate(service.name)}
                  onRestart={() => restartService.mutate(service.name)}
                  isOperating={startService.isPending || stopService.isPending || restartService.isPending}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ServiceCardProps {
  service: ServiceDetails;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  isOperating: boolean;
}

function ServiceCard({ service, onStart, onStop, onRestart, isOperating }: ServiceCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'unhealthy': return 'text-yellow-400';
      case 'stopped': return 'text-red-400';
      case 'error': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4" />;
      case 'unhealthy': return <AlertTriangle className="w-4 h-4" />;
      case 'stopped': return <Square className="w-4 h-4" />;
      case 'error': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'standard': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'background': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="bg-[#2A2B5E] rounded-lg p-4">
      {/* Service Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`${getStatusColor(service.status)}`}>
            {getStatusIcon(service.status)}
          </div>
          <div>
            <h3 className="font-medium">{service.name}</h3>
            <p className="text-sm text-gray-400">{service.description}</p>
          </div>
        </div>
        <div className={`px-2 py-1 rounded text-xs border ${getTypeColor(service.type)}`}>
          {service.type}
        </div>
      </div>

      {/* Service Details */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-400">Status</p>
          <p className={`text-sm font-medium ${getStatusColor(service.status)}`}>
            {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Uptime</p>
          <p className="text-sm text-white">{service.uptime}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Restarts</p>
          <p className="text-sm text-white">{service.restarts}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Errors</p>
          <p className="text-sm text-white">{service.errorCount}</p>
        </div>
      </div>

      {/* Service Features */}
      <div className="flex items-center space-x-4 mb-4">
        {service.autostart && (
          <div className="flex items-center text-xs text-green-400">
            <CheckCircle className="w-3 h-3 mr-1" />
            Auto-start
          </div>
        )}
        {service.watchdogEnabled && (
          <div className="flex items-center text-xs text-blue-400">
            <Activity className="w-3 h-3 mr-1" />
            Watchdog
          </div>
        )}
        {service.cpu && (
          <div className="flex items-center text-xs text-gray-400">
            <Cpu className="w-3 h-3 mr-1" />
            {service.cpu.toFixed(1)}%
          </div>
        )}
        {service.memory && (
          <div className="flex items-center text-xs text-gray-400">
            <MemoryStick className="w-3 h-3 mr-1" />
            {Math.round(service.memory)}MB
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex space-x-2">
        {service.status === 'stopped' ? (
          <button
            onClick={onStart}
            disabled={isOperating}
            className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-3 py-2 rounded text-sm font-medium flex items-center justify-center transition-colors active:scale-95"
          >
            <Play className="w-4 h-4 mr-1" />
            Start
          </button>
        ) : (
          <button
            onClick={onStop}
            disabled={isOperating}
            className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-3 py-2 rounded text-sm font-medium flex items-center justify-center transition-colors active:scale-95"
          >
            <Square className="w-4 h-4 mr-1" />
            Stop
          </button>
        )}
        <button
          onClick={onRestart}
          disabled={isOperating}
          className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-3 py-2 rounded text-sm font-medium flex items-center justify-center transition-colors active:scale-95"
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Restart
        </button>
      </div>

      {/* Recent Errors */}
      {service.errors.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-600">
          <p className="text-xs text-gray-400 mb-2">Recent Errors</p>
          <div className="space-y-1">
            {service.errors.slice(0, 2).map((error, index) => (
              <p key={index} className="text-xs text-red-400 bg-red-500/10 p-2 rounded">
                {error}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}