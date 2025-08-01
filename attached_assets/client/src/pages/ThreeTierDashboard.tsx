import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Monitor, 
  Database, 
  MessageSquare, 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  RefreshCw,
  Server,
  Globe,
  Shield
} from 'lucide-react';

interface ServiceHealth {
  port: number;
  status: 'healthy' | 'unhealthy';
  name: string;
  description: string;
  details?: any;
  error?: string;
}

interface ThreeTierStatus {
  timestamp: string;
  architecture: string;
  services: {
    mainApp: ServiceHealth;
    essentialServices: ServiceHealth;
    whatsappServer: ServiceHealth;
  };
  overall: {
    health: 'healthy' | 'warning' | 'unhealthy';
    healthyServices: number;
    totalServices: number;
    percentage: number;
  };
}

interface EndpointInfo {
  port: number;
  endpoints: Array<{
    path: string;
    description: string;
  }>;
}

interface TestResults {
  timestamp: string;
  tests: {
    essentialServices?: { status: string; responseTime?: string; error?: string };
    whatsappServer?: { status: string; responseTime?: string; error?: string };
    whatsappWebhook?: { status: string; response?: string; verified?: boolean; error?: string };
  };
  summary: {
    passed: number;
    total: number;
    success: boolean;
    percentage: number;
  };
}

export default function ThreeTierDashboard() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const queryClient = useQueryClient();

  // Fetch three-tier status
  const { data: status, isLoading, error, refetch } = useQuery<ThreeTierStatus>({
    queryKey: ['/api/admin/three-tier/status'],
    refetchInterval: autoRefresh ? 5000 : false,
    refetchIntervalInBackground: false
  });

  // Fetch endpoint information
  const { data: endpoints } = useQuery<{ [key: string]: EndpointInfo }>({
    queryKey: ['/api/admin/three-tier/endpoints'],
    refetchInterval: autoRefresh ? 30000 : false
  });

  // Test connectivity mutation
  const testMutation = useMutation<TestResults>({
    mutationFn: async () => {
      const response = await fetch('/api/admin/three-tier/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Test failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/three-tier/status'] });
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      case 'unhealthy': return <XCircle className="h-4 w-4 text-red-400" />;
      default: return <XCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'unhealthy': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getServiceIcon = (serviceName: string) => {
    switch (serviceName) {
      case 'mainApp': return Monitor;
      case 'essentialServices': return Database;
      case 'whatsappServer': return MessageSquare;
      default: return Server;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1B3E] to-[#2A2B5E] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-white text-lg">Loading three-tier architecture status...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1B3E] to-[#2A2B5E] p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="border-red-700 bg-red-900/20">
            <CardContent className="p-6">
              <div className="text-red-400 text-lg">Failed to load three-tier status</div>
              <div className="text-red-300 text-sm mt-2">{error.message}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1B3E] to-[#2A2B5E] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Three-Tier Architecture</h1>
            <p className="text-gray-300">Monitor and manage service isolation across ports 5000, 5001, and 5002</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
            >
              <Activity className="w-4 h-4 mr-2" />
              Auto Refresh
            </Button>
            
            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            
            <Button
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
              variant="outline"
              size="sm"
            >
              <Shield className="w-4 h-4 mr-2" />
              {testMutation.isPending ? 'Testing...' : 'Test All'}
            </Button>
          </div>
        </div>

        {/* Overall Status */}
        {status && (
          <Card className="border-slate-700 bg-[#2A2B5E]/50">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Globe className="h-5 w-5 mr-2 text-blue-400" />
                Overall System Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(status.overall.health)}
                  <span className={`text-lg font-semibold ${getStatusColor(status.overall.health)}`}>
                    {status.overall.health.toUpperCase()}
                  </span>
                  <Badge variant="outline" className="text-white border-white/20">
                    {status.overall.healthyServices}/{status.overall.totalServices} Services
                  </Badge>
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">{status.overall.percentage}%</div>
                  <div className="text-sm text-gray-400">Health Score</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Service Status Cards */}
        {status && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(status.services).map(([key, service]) => {
              const IconComponent = getServiceIcon(key);
              
              return (
                <Card key={key} className="border-slate-700 bg-[#2A2B5E]/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-white text-sm">
                      <IconComponent className="h-4 w-4 mr-2 text-blue-400" />
                      {service.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(service.status)}
                          <span className={`font-medium ${getStatusColor(service.status)}`}>
                            {service.status.toUpperCase()}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-white border-white/20">
                          Port {service.port}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-400">
                        {service.description}
                      </div>
                      
                      {service.error && (
                        <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded">
                          {service.error}
                        </div>
                      )}
                      
                      {service.details && (
                        <div className="text-xs text-gray-500">
                          <div>Uptime: {Math.round(service.details.uptime || 0)}s</div>
                          {service.details.memory && (
                            <div>Memory: {Math.round(service.details.memory.heapUsed / 1024 / 1024)}MB</div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Endpoint Information */}
        {endpoints && (
          <Card className="border-slate-700 bg-[#2A2B5E]/50">
            <CardHeader>
              <CardTitle className="text-white">Service Endpoints</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(endpoints).map(([serviceName, serviceInfo]) => (
                  <div key={serviceName} className="space-y-3">
                    <h4 className="font-medium text-white capitalize">
                      {serviceName.replace(/([A-Z])/g, ' $1')} (Port {serviceInfo.port})
                    </h4>
                    <div className="space-y-2">
                      {serviceInfo.endpoints.map((endpoint, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <code className="text-blue-300 bg-blue-900/20 px-2 py-1 rounded">
                            {endpoint.path}
                          </code>
                          <span className="text-gray-400 text-xs">
                            {endpoint.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test Results */}
        {testMutation.data && (
          <Card className="border-slate-700 bg-[#2A2B5E]/50">
            <CardHeader>
              <CardTitle className="text-white">Connectivity Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-white">Overall Test Result</span>
                  <Badge 
                    variant={testMutation.data.summary.success ? "default" : "destructive"}
                    className={testMutation.data.summary.success ? "bg-green-600" : "bg-red-600"}
                  >
                    {testMutation.data.summary.passed}/{testMutation.data.summary.total} Passed ({testMutation.data.summary.percentage}%)
                  </Badge>
                </div>
                
                <Separator className="bg-slate-600" />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(testMutation.data.tests).map(([testName, result]) => (
                    <div key={testName} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white capitalize">
                          {testName.replace(/([A-Z])/g, ' $1')}
                        </span>
                        <Badge 
                          variant={result.status === 'pass' ? "default" : "destructive"}
                          className={result.status === 'pass' ? "bg-green-600" : "bg-red-600"}
                        >
                          {result.status}
                        </Badge>
                      </div>
                      
                      {result.error && (
                        <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded">
                          {result.error}
                        </div>
                      )}
                      
                      {'verified' in result && result.verified !== undefined && (
                        <div className="text-xs text-gray-400">
                          Webhook Verified: {result.verified ? 'Yes' : 'No'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Production URLs */}
        <Card className="border-slate-700 bg-[#2A2B5E]/50">
          <CardHeader>
            <CardTitle className="text-white">Production URLs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white">Main Application</span>
                <code className="text-blue-300 bg-blue-900/20 px-3 py-1 rounded">
                  https://nex-ems.replit.app
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white">Essential Services</span>
                <code className="text-blue-300 bg-blue-900/20 px-3 py-1 rounded">
                  https://nex-ems.replit.app:5001
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white">WhatsApp Server</span>
                <code className="text-blue-300 bg-blue-900/20 px-3 py-1 rounded">
                  https://nex-ems.replit.app:5002
                </code>
              </div>
              
              <Separator className="bg-slate-600" />
              
              <div className="bg-yellow-900/20 p-4 rounded border border-yellow-700">
                <h4 className="text-yellow-400 font-medium mb-2">Meta Business Manager Configuration</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-white">Webhook URL:</span>
                    <code className="text-yellow-300 bg-yellow-900/30 px-2 py-1 rounded">
                      https://nex-ems.replit.app:5002/webhook
                    </code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white">Verify Token:</span>
                    <code className="text-yellow-300 bg-yellow-900/30 px-2 py-1 rounded">
                      nexlinx_webhook_secure_token_2024
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}