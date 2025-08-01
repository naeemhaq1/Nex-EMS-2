import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  RefreshCw, 
  Play, 
  Square, 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Database,
  Clock,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PollingStatus {
  data: {
    services: {
      regularPoller: {
        name: string;
        status: string;
        health: string;
        description: string;
        lastRun?: string;
        nextRun?: string;
        lastRunRecords?: number;
      };
      onDemandPoller: {
        name: string;
        status: string;
        health: string;
        description: string;
      };
      autoStitchPoller: {
        name: string;
        status: string;
        health: string;
        description: string;
        lastRun?: string;
        nextRun?: string;
      };
    };
    queue: {
      pending: number;
      processing: number;
      completed: number;
      failed: number;
    };
    statistics: {
      successRate: number;
      totalProcessed: number;
      recentlyProcessed: number;
      dailyProcessed: number;
      averageProcessingTime: string;
      lastProcessed: string;
      averageProcessingTime: number;
    };
  };
}

export default function PollingInterface() {
  const queryClient = useQueryClient();

  const { data: pollingStatus, isLoading } = useQuery<PollingStatus>({
    queryKey: ['/api/admin/polling/status'],
    refetchInterval: 10000, // 10 second refresh
  });

  const startPolling = useMutation({
    mutationFn: () => fetch('/api/admin/polling/start', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/polling/status'] });
    },
  });

  const stopPolling = useMutation({
    mutationFn: () => fetch('/api/admin/polling/stop', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/polling/status'] });
    },
  });

  const triggerOnDemand = useMutation({
    mutationFn: () => fetch('/api/admin/polling/on-demand', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/polling/status'] });
    },
  });

  const getStatusColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (health: string) => {
    switch (health) {
      case 'healthy': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'critical': return XCircle;
      default: return Activity;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4 mx-auto"></div>
          <p className="text-lg">Loading 3-Poller System...</p>
        </div>
      </div>
    );
  }

  const services = pollingStatus?.data?.services;
  const queue = pollingStatus?.data?.queue;
  const statistics = pollingStatus?.data?.statistics;

  return (
    <div className="min-h-screen bg-[#1A1B3E] text-white">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">3-Poller System</h1>
            <p className="text-gray-400 mt-1">BioTime Data Synchronization Management</p>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/polling/status'] })}
              className="bg-[#2A2B5E] border-gray-600 text-white hover:bg-[#3A3B6E]"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={() => triggerOnDemand.mutate()}
              disabled={triggerOnDemand.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Play className="w-4 h-4 mr-2" />
              On-Demand Poll
            </Button>
          </div>
        </div>

        {/* Control Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Button
            onClick={() => startPolling.mutate()}
            disabled={startPolling.isPending}
            className="h-16 bg-green-600 hover:bg-green-700 text-lg"
          >
            <Play className="w-6 h-6 mr-3" />
            Start System
          </Button>
          <Button
            onClick={() => stopPolling.mutate()}
            disabled={stopPolling.isPending}
            className="h-16 bg-red-600 hover:bg-red-700 text-lg"
          >
            <Square className="w-6 h-6 mr-3" />
            Stop System
          </Button>
          <Button
            onClick={() => triggerOnDemand.mutate()}
            disabled={triggerOnDemand.isPending}
            className="h-16 bg-blue-600 hover:bg-blue-700 text-lg"
          >
            <Database className="w-6 h-6 mr-3" />
            Manual Poll
          </Button>
        </div>

        {/* System Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="bg-[#2A2B5E] border-gray-600 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Success Rate</p>
                <p className="text-2xl font-bold text-green-400">
                  {statistics?.successRate ? `${statistics.successRate.toFixed(1)}%` : '0%'}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-green-400" />
            </div>
          </Card>
          <Card className="bg-[#2A2B5E] border-gray-600 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Processed</p>
                <p className="text-2xl font-bold text-blue-400">
                  {statistics?.totalProcessed || 0}
                </p>
              </div>
              <Database className="w-8 h-8 text-blue-400" />
            </div>
          </Card>
          <Card className="bg-[#2A2B5E] border-gray-600 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Daily Processed</p>
                <p className="text-2xl font-bold text-purple-400">
                  {statistics?.dailyProcessed || 0}
                </p>
              </div>
              <Clock className="w-8 h-8 text-purple-400" />
            </div>
          </Card>
          <Card className="bg-[#2A2B5E] border-gray-600 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Avg Processing</p>
                <p className="text-2xl font-bold text-orange-400">
                  {statistics?.averageProcessingTime || '0'}s
                </p>
              </div>
              <Activity className="w-8 h-8 text-orange-400" />
            </div>
          </Card>
        </div>

        {/* Poller Services Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {services && Object.entries(services).map(([key, service]) => {
            const StatusIcon = getStatusIcon(service.health);
            return (
              <Card key={key} className="bg-[#2A2B5E] border-gray-600 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">{service.name}</h3>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(service.health)}`}></div>
                    <StatusIcon className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-gray-400 text-sm mb-3">{service.description}</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Status:</span>
                    <Badge variant={service.status === 'running' ? 'default' : 'secondary'}>
                      {service.status}
                    </Badge>
                  </div>
                  {service.lastRun && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Last Run:</span>
                      <span className="text-sm">{new Date(service.lastRun).toLocaleTimeString()}</span>
                    </div>
                  )}
                  {service.nextRun && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Next Run:</span>
                      <span className="text-sm">{new Date(service.nextRun).toLocaleTimeString()}</span>
                    </div>
                  )}
                  {service.lastRunRecords !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Last Records:</span>
                      <span className="text-sm">{service.lastRunRecords}</span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Queue Status */}
        {queue && (
          <Card className="bg-[#2A2B5E] border-gray-600 p-6">
            <h3 className="text-xl font-semibold mb-4">Queue Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-400">{queue.pending}</p>
                <p className="text-sm text-gray-400">Pending</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-400">{queue.processing}</p>
                <p className="text-sm text-gray-400">Processing</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{queue.completed}</p>
                <p className="text-sm text-gray-400">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">{queue.failed}</p>
                <p className="text-sm text-gray-400">Failed</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}