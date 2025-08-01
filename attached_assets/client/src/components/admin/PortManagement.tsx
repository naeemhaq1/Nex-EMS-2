import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AlertCircle, Settings, Play, Square, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface PortConfig {
  id: string;
  name: string;
  port: number;
  description: string;
  status: 'running' | 'stopped' | 'unknown';
  services: string[];
  locked?: boolean; // Optional flag for locked ports
}

interface PortManagementProps {
  className?: string;
}

export function PortManagement({ className }: PortManagementProps) {
  const [newPorts, setNewPorts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const queryClient = useQueryClient();

  // Fetch current port configuration
  const { data: portConfig, isLoading, error: fetchError } = useQuery<PortConfig[]>({
    queryKey: ['/api/port-management/config'],
    refetchInterval: 5000,
  });

  // Fetch port availability
  const { data: portAvailability } = useQuery<Record<number, boolean>>({
    queryKey: ['/api/port-management/availability'],
    refetchInterval: 10000,
  });

  // Apply configuration mutation
  const applyConfigMutation = useMutation({
    mutationFn: async (config: Record<string, number>) => {
      return apiRequest('/api/port-management/config', {
        method: 'POST',
        body: JSON.stringify(config),
      });
    },
    onSuccess: () => {
      setSuccess('Port configuration applied successfully');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['/api/port-management'] });
    },
    onError: (error: Error) => {
      setError(error.message || 'Failed to apply configuration');
      setSuccess('');
    },
  });

  // Start service mutation
  const startServiceMutation = useMutation({
    mutationFn: async (portId: string) => {
      return apiRequest(`/api/port-management/services/${portId}/start`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/port-management'] });
    },
  });

  // Stop service mutation
  const stopServiceMutation = useMutation({
    mutationFn: async (portId: string) => {
      return apiRequest(`/api/port-management/services/${portId}/stop`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/port-management'] });
    },
  });

  useEffect(() => {
    if (portConfig && Array.isArray(portConfig) && !Object.keys(newPorts).length) {
      const initialPorts: Record<string, number> = {};
      portConfig.forEach((config: PortConfig) => {
        // Only add configurable ports to newPorts
        if (!config.locked) {
          initialPorts[config.id] = config.port;
        }
      });
      setNewPorts(initialPorts);
    }
  }, [portConfig, newPorts]);

  const handlePortChange = (portId: string, value: string) => {
    // Skip validation for locked ports
    if (portConfig && Array.isArray(portConfig) && portConfig.find((config: PortConfig) => config.id === portId)?.locked) {
      return;
    }
    
    const port = parseInt(value);
    if (isNaN(port) || port < 1024 || port > 65535) {
      setError('Port must be between 1024 and 65535');
      return;
    }
    setError('');
    setNewPorts(prev => ({ ...prev, [portId]: port }));
  };

  const handleApplyConfiguration = () => {
    if (!portConfig || !Array.isArray(portConfig)) return;
    
    // Filter out locked ports from configuration
    const configurablePorts = Object.fromEntries(
      Object.entries(newPorts).filter(([portId]) => {
        const config = portConfig.find((c: PortConfig) => c.id === portId);
        return !config?.locked;
      })
    );
    
    // Add locked frontend port
    configurablePorts.frontend = 5000;

    // Validate ports
    const ports = Object.values(configurablePorts);
    const uniquePorts = new Set(ports);
    if (ports.length !== uniquePorts.size) {
      setError('Ports must be unique');
      return;
    }

    // Check availability (skip check for locked frontend port)
    for (const [portId, port] of Object.entries(configurablePorts)) {
      if (portId !== 'frontend' && portAvailability && !portAvailability[port]) {
        setError(`Port ${port} is not available`);
        return;
      }
    }

    applyConfigMutation.mutate(configurablePorts);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'stopped':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'running' ? 'default' : status === 'stopped' ? 'destructive' : 'secondary';
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {status.toUpperCase()}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load port configuration: {fetchError.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5" />
        <h2 className="text-xl font-semibold">Port Management</h2>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {portConfig && Array.isArray(portConfig) && portConfig.map((config: PortConfig) => (
          <Card key={config.id} className="bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{config.name}</CardTitle>
                {getStatusBadge(config.status)}
              </div>
              <CardDescription>{config.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor={`port-${config.id}`}>
                  Port Number {config.locked && <span className="text-xs text-gray-500">(Locked)</span>}
                </Label>
                <Input
                  id={`port-${config.id}`}
                  type="number"
                  min={1024}
                  max={65535}
                  value={newPorts[config.id] || config.port}
                  onChange={(e) => handlePortChange(config.id, e.target.value)}
                  className={`mt-1 ${config.locked ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                  disabled={config.locked}
                  readOnly={config.locked}
                />
                {config.locked ? (
                  <p className="text-sm mt-1 text-gray-500">
                    Port 5000 is locked for frontend and port manager services
                  </p>
                ) : (
                  portAvailability && newPorts[config.id] && (
                    <p className={`text-sm mt-1 ${portAvailability[newPorts[config.id]] ? 'text-green-600' : 'text-red-600'}`}>
                      {portAvailability[newPorts[config.id]] ? 'Available' : 'In use'}
                    </p>
                  )
                )}
              </div>

              <div>
                <Label>Services ({config.services.length})</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {config.services.slice(0, 3).map((service: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {service}
                    </Badge>
                  ))}
                  {config.services.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{config.services.length - 3}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Service Control Buttons - Hide for locked frontend */}
              {!config.locked && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={config.status === 'running' ? 'secondary' : 'default'}
                    onClick={() => startServiceMutation.mutate(config.id)}
                    disabled={config.status === 'running' || startServiceMutation.isPending}
                    className="flex-1"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Start
                  </Button>
                  <Button
                    size="sm"
                    variant={config.status === 'stopped' ? 'secondary' : 'destructive'}
                    onClick={() => stopServiceMutation.mutate(config.id)}
                    disabled={config.status === 'stopped' || stopServiceMutation.isPending}
                    className="flex-1"
                  >
                    <Square className="w-3 h-3 mr-1" />
                    Stop
                  </Button>
                </div>
              )}
              {config.locked && (
                <div className="text-center text-gray-500 text-sm py-2">
                  Frontend and port manager service controls are disabled
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Apply Configuration</CardTitle>
          <CardDescription>
            Apply the new port configuration. This will restart affected services.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleApplyConfiguration}
            disabled={applyConfigMutation.isPending}
            className="w-full"
          >
            {applyConfigMutation.isPending ? 'Applying...' : 'Apply Configuration'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}