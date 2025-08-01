import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { 
  ArrowLeft, 
  Activity, 
  Clock, 
  Cpu, 
  HardDrive, 
  Wifi, 
  Database, 
  CheckCircle,
  AlertTriangle,
  Server,
  Zap,
  RefreshCw,
  Settings
} from 'lucide-react';

interface SystemMetrics {
  uptime: string;
  latency: number;
  cpu: {
    usage: number;
    temperature: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    status: 'connected' | 'disconnected';
    speed: number;
  };
  database: {
    status: 'healthy' | 'warning' | 'error';
    connections: number;
    queries: number;
  };
  lastBackup: string;
  systemHealth: number;
}

// Mock data for system metrics
const mockSystemMetrics: SystemMetrics = {
  uptime: "15d 8h 42m",
  latency: 45,
  cpu: {
    usage: 68,
    temperature: 72
  },
  memory: {
    used: 3.2,
    total: 8.0,
    percentage: 40
  },
  disk: {
    used: 45.6,
    total: 100.0,
    percentage: 46
  },
  network: {
    status: 'connected',
    speed: 1000
  },
  database: {
    status: 'healthy',
    connections: 12,
    queries: 2847
  },
  lastBackup: "2025-01-17T02:30:00Z",
  systemHealth: 87
};

export default function MobileAdminSystem() {
  const [, navigate] = useLocation();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch system metrics
  const { data: metrics = mockSystemMetrics, isLoading, refetch } = useQuery<SystemMetrics>({
    queryKey: ['/api/admin/system-metrics'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getHealthColor = (health: number) => {
    if (health >= 80) return 'text-green-500';
    if (health >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getHealthBgColor = (health: number) => {
    if (health >= 80) return 'bg-green-500';
    if (health >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatLastBackup = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] flex items-center justify-center">
        <div className="text-white">Loading system metrics...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#1A1B3E] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-[#2A2B5E] p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/mobile/admin/dashboard')}
            className="p-2 rounded-lg bg-blue-500 text-white active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-white text-lg font-semibold">System Status</h1>
            <p className="text-gray-400 text-sm">Real-time system monitoring</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2 rounded-lg bg-blue-500 text-white active:scale-95 transition-transform"
          disabled={refreshing}
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* System Health Overview */}
      <div className="flex-1 overflow-y-scroll overflow-x-hidden mobile-admin-content-scroll p-4">
        <div className="bg-[#2A2B5E] rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white text-lg font-semibold">System Health</h2>
            <span className={`text-2xl font-bold ${getHealthColor(metrics.systemHealth)}`}>
              {metrics.systemHealth}%
            </span>
          </div>
          <div className="bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${getHealthBgColor(metrics.systemHealth)}`}
              style={{ width: `${metrics.systemHealth}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-sm text-gray-400">
            <span>Poor</span>
            <span>Excellent</span>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-[#2A2B5E] rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <span className="text-white font-medium">Uptime</span>
            </div>
            <p className="text-2xl font-bold text-white">{metrics.uptime}</p>
          </div>
          
          <div className="bg-[#2A2B5E] rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              <span className="text-white font-medium">Latency</span>
            </div>
            <p className="text-2xl font-bold text-white">{metrics.latency}ms</p>
          </div>
        </div>

        {/* Resource Usage */}
        <div className="space-y-4">
          {/* CPU Usage */}
          <div className="bg-[#2A2B5E] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Cpu className="w-5 h-5 text-blue-500" />
                <span className="text-white font-medium">CPU Usage</span>
              </div>
              <span className="text-white font-bold">{metrics.cpu.usage}%</span>
            </div>
            <div className="bg-gray-700 rounded-full h-2 mb-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${metrics.cpu.usage}%` }}
              />
            </div>
            <p className="text-sm text-gray-400">Temperature: {metrics.cpu.temperature}°C</p>
          </div>

          {/* Memory Usage */}
          <div className="bg-[#2A2B5E] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-green-500" />
                <span className="text-white font-medium">Memory</span>
              </div>
              <span className="text-white font-bold">{metrics.memory.percentage}%</span>
            </div>
            <div className="bg-gray-700 rounded-full h-2 mb-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${metrics.memory.percentage}%` }}
              />
            </div>
            <p className="text-sm text-gray-400">
              {metrics.memory.used}GB / {metrics.memory.total}GB
            </p>
          </div>

          {/* Disk Usage */}
          <div className="bg-[#2A2B5E] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <HardDrive className="w-5 h-5 text-purple-500" />
                <span className="text-white font-medium">Disk Storage</span>
              </div>
              <span className="text-white font-bold">{metrics.disk.percentage}%</span>
            </div>
            <div className="bg-gray-700 rounded-full h-2 mb-2">
              <div 
                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${metrics.disk.percentage}%` }}
              />
            </div>
            <p className="text-sm text-gray-400">
              {metrics.disk.used}GB / {metrics.disk.total}GB
            </p>
          </div>

          {/* Network Status */}
          <div className="bg-[#2A2B5E] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Wifi className="w-5 h-5 text-blue-500" />
                <span className="text-white font-medium">Network</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-white font-bold capitalize">{metrics.network.status}</span>
              </div>
            </div>
            <p className="text-sm text-gray-400">Speed: {metrics.network.speed} Mbps</p>
          </div>

          {/* Database Status */}
          <div className="bg-[#2A2B5E] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-orange-500" />
                <span className="text-white font-medium">Database</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-white font-bold capitalize">{metrics.database.status}</span>
              </div>
            </div>
            <div className="flex justify-between text-sm text-gray-400">
              <span>Connections: {metrics.database.connections}</span>
              <span>Queries: {metrics.database.queries}</span>
            </div>
          </div>

          {/* Last Backup */}
          <div className="bg-[#2A2B5E] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Server className="w-5 h-5 text-indigo-500" />
                <span className="text-white font-medium">Last Backup</span>
              </div>
              <span className="text-white font-bold">{formatLastBackup(metrics.lastBackup)}</span>
            </div>
            <p className="text-sm text-gray-400">
              {new Date(metrics.lastBackup).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}