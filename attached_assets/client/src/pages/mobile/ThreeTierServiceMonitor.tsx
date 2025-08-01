import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCcw, ExternalLink, Activity, Server } from 'lucide-react';

interface ServiceStatus {
  name: string;
  status: string;
  uptime: number;
  type: string;
  port: number;
}

interface PortHealth {
  status: string;
  port: number;
  services: ServiceStatus[];
  healthy: number;
  total: number;
  error?: string;
}

export function ThreeTierServiceMonitor() {
  const [portStatuses, setPortStatuses] = useState<Record<number, PortHealth>>({});
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchPortStatus = async (port: number): Promise<PortHealth> => {
    try {
      let endpoint = '';
      let servicesEndpoint = '';
      
      switch (port) {
        case 5001:
          endpoint = `http://localhost:5001/api/core/health`;
          servicesEndpoint = `http://localhost:5001/api/core/services`;
          break;
        case 5002:
          endpoint = `http://localhost:5002/api/whatsapp/health`;
          servicesEndpoint = `http://localhost:5002/api/whatsapp/services`;
          break;
        default:
          throw new Error(`Unknown port: ${port}`);
      }

      const [healthResponse, servicesResponse] = await Promise.all([
        fetch(endpoint).catch(() => null),
        fetch(servicesEndpoint).catch(() => null)
      ]);

      if (!healthResponse || !healthResponse.ok) {
        return {
          status: 'offline',
          port,
          services: [],
          healthy: 0,
          total: 0,
          error: 'Port not accessible'
        };
      }

      const healthData = await healthResponse.json();
      let services: ServiceStatus[] = [];

      if (servicesResponse && servicesResponse.ok) {
        services = await servicesResponse.json();
      }

      const healthy = services.filter(s => s.status === 'healthy').length;

      return {
        status: healthData.status || 'unknown',
        port,
        services,
        healthy,
        total: services.length,
      };
    } catch (error) {
      return {
        status: 'error',
        port,
        services: [],
        healthy: 0,
        total: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const fetchAllStatuses = async () => {
    setIsRefreshing(true);
    try {
      const [port5001Status, port5002Status] = await Promise.all([
        fetchPortStatus(5001),
        fetchPortStatus(5002)
      ]);

      setPortStatuses({
        5001: port5001Status,
        5002: port5002Status
      });
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching service statuses:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllStatuses();
    const interval = setInterval(fetchAllStatuses, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'offline':
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'unhealthy':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPortInfo = (port: number) => {
    switch (port) {
      case 5001:
        return {
          name: 'Core Services',
          description: 'Attendance, monitoring, backup services',
          icon: <Server className="h-4 w-4" />,
          statusUrl: `http://localhost:5001/status`
        };
      case 5002:
        return {
          name: 'WhatsApp Services',
          description: 'Messaging, chatbot, contact management',
          icon: <Activity className="h-4 w-4" />,
          statusUrl: `http://localhost:5002/status`
        };
      default:
        return {
          name: 'Unknown',
          description: 'Unknown service group',
          icon: <Server className="h-4 w-4" />,
          statusUrl: ''
        };
    }
  };

  const totalServices = Object.values(portStatuses).reduce((sum, port) => sum + port.total, 0);
  const totalHealthy = Object.values(portStatuses).reduce((sum, port) => sum + port.healthy, 0);
  const overallHealthRate = totalServices > 0 ? Math.round((totalHealthy / totalServices) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Three-Tier Service Monitor</h1>
          <p className="text-gray-600">Monitor services across all ports with individual status pages</p>
        </div>
        <Button 
          onClick={fetchAllStatuses}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCcw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overall Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{totalServices}</div>
              <div className="text-sm text-gray-600">Total Services</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{totalHealthy}</div>
              <div className="text-sm text-gray-600">Healthy</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{totalServices - totalHealthy}</div>
              <div className="text-sm text-gray-600">Unhealthy</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{overallHealthRate}%</div>
              <div className="text-sm text-gray-600">Health Rate</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Port Status Tabs */}
      <Tabs defaultValue="5001" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="5001">
            Port 5001 - Core Services
            <Badge className={`ml-2 ${getStatusColor(portStatuses[5001]?.status || 'unknown')}`}>
              {portStatuses[5001]?.healthy || 0}/{portStatuses[5001]?.total || 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="5002">
            Port 5002 - WhatsApp Services
            <Badge className={`ml-2 ${getStatusColor(portStatuses[5002]?.status || 'unknown')}`}>
              {portStatuses[5002]?.healthy || 0}/{portStatuses[5002]?.total || 0}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {[5001, 5002].map(port => {
          const portStatus = portStatuses[port];
          const portInfo = getPortInfo(port);

          return (
            <TabsContent key={port} value={port.toString()} className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {portInfo.icon}
                      <div>
                        <CardTitle>{portInfo.name}</CardTitle>
                        <p className="text-sm text-gray-600">{portInfo.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(portStatus?.status || 'unknown')}>
                        {portStatus?.status || 'Unknown'}
                      </Badge>
                      {portInfo.statusUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(portInfo.statusUrl, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Status Page
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {portStatus?.error ? (
                    <Alert>
                      <AlertDescription>
                        {portStatus.error}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {portStatus?.services.map((service) => (
                        <Card key={service.name}>
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium text-sm">{service.name}</div>
                              <Badge 
                                className={getStatusColor(service.status)}
                                variant="secondary"
                              >
                                {service.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-gray-600">
                              <div>Uptime: {Math.round(service.uptime / 1000)}s</div>
                              <div>Port: {service.port}</div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      <div className="text-center text-sm text-gray-500">
        Last updated: {lastUpdate.toLocaleTimeString()} | 
        Auto-refresh every 30 seconds
      </div>
    </div>
  );
}