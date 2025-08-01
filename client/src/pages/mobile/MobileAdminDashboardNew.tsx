import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Activity, 
  Server, 
  BarChart3, 
  MessageSquare,
  Clock,
  Database,
  Settings,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Shield,
  Calendar,
  Map,
  Bell,
  UserCheck,
  UserPlus,
  Timer,
  Target,
  Signal,
  Search,
  MessageCircle,
  Send,
  MonitorSpeaker,
  Smartphone
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';

interface SystemMetrics {
  totalEmployees: number;
  activeEmployees: number;
  totalPunchIn: number;
  totalPunchOut: number;
  totalPresent: number;
  attendanceRate: number;
  servicesStatus: {
    timestampPolling: boolean;
    automatedPolling: boolean;
    autoPunchout: boolean;
    whatsappService: boolean;
  };
  systemHealth: 'healthy' | 'warning' | 'critical';
}

export default function MobileAdminDashboardNew() {
  const [, setLocation] = useLocation();
  const [currentTab, setCurrentTab] = useState('dashboard');

  const { data: metrics, isLoading } = useQuery<SystemMetrics>({
    queryKey: ['/api/admin/system-metrics'],
    refetchInterval: 30000,
  });

  const { data: recentActivity } = useQuery({
    queryKey: ['/api/admin/recent-activity'],
    refetchInterval: 60000,
  });

  const { data: pollingStatus } = useQuery({
    queryKey: ['/api/admin/polling/status'],
    refetchInterval: 15000,
  });

  // Bottom navigation tabs
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'communicate', label: 'Communicate', icon: MessageSquare },
    { id: 'my-dashboard', label: 'My Dashboard', icon: UserCheck },
  ];

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return CheckCircle2;
      case 'warning': return AlertTriangle;
      case 'critical': return XCircle;
      default: return AlertTriangle;
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const calculateServiceHealth = (servicesStatus: any) => {
    if (!servicesStatus) return { status: 'unknown', operational: 0, total: 0 };
    
    const services = Object.values(servicesStatus);
    const operational = services.filter(status => status === true).length;
    const total = services.length;
    const downServices = total - operational;

    let status = 'healthy';
    if (downServices === 1) status = 'warning';
    if (downServices >= 2) status = 'critical';

    return { status, operational, total };
  };

  const renderDashboardTab = () => {
    return (
      <div className="space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-[#2A2B4E] border-[#3A3B5E]">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">
                {metrics?.totalEmployees || 0}
              </div>
              <div className="text-xs text-gray-400">Total Active Employees</div>
            </CardContent>
          </Card>
          <Card className="bg-[#2A2B4E] border-[#3A3B5E]">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-400">
                {metrics?.activeEmployees || 0}
              </div>
              <div className="text-xs text-gray-400">Active Today</div>
            </CardContent>
          </Card>
          <Card className="bg-[#2A2B4E] border-[#3A3B5E]">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">
                {metrics?.totalPunchIn || 0}
              </div>
              <div className="text-xs text-gray-400">Punch Ins</div>
            </CardContent>
          </Card>
          <Card className="bg-[#2A2B4E] border-[#3A3B5E]">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-400">
                {metrics?.attendanceRate || 0}%
              </div>
              <div className="text-xs text-gray-400">Attendance</div>
            </CardContent>
          </Card>
        </div>

        {/* Service Status */}
        <Card className="bg-[#2A2B4E] border-[#3A3B5E]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-sm">Service Status</CardTitle>
              {(() => {
                const health = calculateServiceHealth(metrics?.servicesStatus);
                const HealthIcon = getHealthIcon(health.status);
                return (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">
                      {health.operational} / {health.total} operational
                    </span>
                    <div className={`w-3 h-3 rounded-full ${getHealthColor(health.status)}`}>
                      <HealthIcon className="w-3 h-3 text-white" />
                    </div>
                  </div>
                );
              })()}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="max-h-32 overflow-y-auto space-y-2">
              {metrics?.servicesStatus && Object.entries(metrics.servicesStatus).map(([service, status]) => (
                <div key={service} className="flex items-center justify-between py-1">
                  <span className="text-xs text-gray-300 capitalize">
                    {service.replace(/([A-Z])/g, ' $1')}
                  </span>
                  <Badge className={`text-[10px] px-1.5 py-0.5 ${status ? 'bg-green-500' : 'bg-red-500'}`}>
                    {status ? 'Active' : 'Down'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-[#2A2B4E] border-[#3A3B5E]">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="ghost"
                className="h-auto p-2 bg-[#3A3B5E] hover:bg-[#4A4B6E] text-white flex flex-col items-center space-y-1"
                onClick={() => setCurrentTab('attendance')}
              >
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <div className="text-xs">Attendance</div>
              </Button>
              <Button
                variant="ghost"
                className="h-auto p-2 bg-[#3A3B5E] hover:bg-[#4A4B6E] text-white flex flex-col items-center space-y-1"
                onClick={() => setCurrentTab('analytics')}
              >
                <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <div className="text-xs">Analytics</div>
              </Button>
              <Button
                variant="ghost"
                className="h-auto p-2 bg-[#3A3B5E] hover:bg-[#4A4B6E] text-white flex flex-col items-center space-y-1"
                onClick={() => setCurrentTab('communicate')}
              >
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <div className="text-xs">WhatsApp</div>
              </Button>
              <Button
                variant="ghost"
                className="h-auto p-2 bg-[#3A3B5E] hover:bg-[#4A4B6E] text-white flex flex-col items-center space-y-1"
                onClick={() => setLocation('/mobile/admin/polling')}
              >
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
                  <Database className="w-4 h-4 text-white" />
                </div>
                <div className="text-xs">3-Pollers</div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 3-Poller System Status */}
        <Card className="bg-[#2A2B4E] border-[#3A3B5E]">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">3-Poller System</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {pollingStatus?.data?.services && Object.entries(pollingStatus.data.services).map(([key, service]: [string, any]) => (
                <div key={key} className="flex items-center justify-between py-1">
                  <div className="flex-1">
                    <div className="text-xs text-gray-300">{service.name}</div>
                    <div className="text-[10px] text-gray-500">{service.description}</div>
                  </div>
                  <Badge className={`text-[10px] px-1.5 py-0.5 ${
                    service.health === 'healthy' ? 'bg-green-500' : 
                    service.health === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}>
                    {service.status}
                  </Badge>
                </div>
              ))}
              {pollingStatus?.data?.queue && (
                <div className="mt-2 pt-2 border-t border-gray-600">
                  <div className="text-[10px] text-gray-400">
                    Queue: {pollingStatus.data.queue.pending} pending, {pollingStatus.data.queue.processing} processing
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        {recentActivity && (
          <Card className="bg-[#2A2B4E] border-[#3A3B5E]">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {recentActivity.slice(0, 3).map((activity: any, index: number) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <div className="text-xs text-gray-300">{activity.message}</div>
                      <div className="text-[10px] text-gray-500">{activity.timestamp}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderAttendanceTab = () => {
    return (
      <div className="space-y-4">
        <Card className="bg-[#2A2B4E] border-[#3A3B5E]">
          <CardHeader>
            <CardTitle className="text-white text-lg">Attendance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-gray-300">
              Real-time attendance monitoring and 48-hour searchable records
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderAnalyticsTab = () => {
    return (
      <div className="space-y-4">
        <Card className="bg-[#2A2B4E] border-[#3A3B5E]">
          <CardHeader>
            <CardTitle className="text-white text-lg">Analytics Suite</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-gray-300">
              8-10 performance graphs with horizontal scrolling
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderCommunicateTab = () => {
    return (
      <div className="space-y-4">
        <Card className="bg-[#2A2B4E] border-[#3A3B5E]">
          <CardHeader>
            <CardTitle className="text-white text-lg">Communication Center</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="ghost"
                className="h-auto p-4 bg-[#3A3B5E] hover:bg-[#4A4B6E] text-white flex flex-col items-center space-y-2"
              >
                <MessageSquare className="w-8 h-8" />
                <div className="text-sm">WhatsApp Console</div>
              </Button>
              <Button
                variant="ghost"
                className="h-auto p-4 bg-[#3A3B5E] hover:bg-[#4A4B6E] text-white flex flex-col items-center space-y-2"
              >
                <Send className="w-8 h-8" />
                <div className="text-sm">Announcements</div>
              </Button>
              <Button
                variant="ghost"
                className="h-auto p-4 bg-[#3A3B5E] hover:bg-[#4A4B6E] text-white flex flex-col items-center space-y-2"
              >
                <MessageCircle className="w-8 h-8" />
                <div className="text-sm">Employee Messages</div>
              </Button>
              <Button
                variant="ghost"
                className="h-auto p-4 bg-[#3A3B5E] hover:bg-[#4A4B6E] text-white flex flex-col items-center space-y-2"
              >
                <Bell className="w-8 h-8" />
                <div className="text-sm">Notifications</div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderMyDashboardTab = () => {
    // Redirect to personal employee dashboard
    setLocation('/mobile/employee/dashboard');
    return null;
  };

  const renderLeaderboardTab = () => {
    return (
      <div className="space-y-4">
        <Card className="bg-[#2A2B4E] border-[#3A3B5E]">
          <CardHeader>
            <CardTitle className="text-white text-lg">Admin Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="ghost"
                className="h-auto p-4 bg-[#3A3B5E] hover:bg-[#4A4B6E] text-white flex flex-col items-center space-y-2"
              >
                <Users className="w-8 h-8" />
                <div className="text-sm">Employee Directory</div>
              </Button>
              <Button
                variant="ghost"
                className="h-auto p-4 bg-[#3A3B5E] hover:bg-[#4A4B6E] text-white flex flex-col items-center space-y-2"
              >
                <Server className="w-8 h-8" />
                <div className="text-sm">Service Monitor</div>
              </Button>
              <Button
                variant="ghost"
                className="h-auto p-4 bg-[#3A3B5E] hover:bg-[#4A4B6E] text-white flex flex-col items-center space-y-2"
              >
                <Map className="w-8 h-8" />
                <div className="text-sm">Employee Map</div>
              </Button>
              <Button
                variant="ghost"
                className="h-auto p-4 bg-[#3A3B5E] hover:bg-[#4A4B6E] text-white flex flex-col items-center space-y-2"
              >
                <Database className="w-8 h-8" />
                <div className="text-sm">Data Continuity</div>
              </Button>
              <Button
                variant="ghost"
                className="h-auto p-4 bg-[#3A3B5E] hover:bg-[#4A4B6E] text-white flex flex-col items-center space-y-2"
              >
                <Settings className="w-8 h-8" />
                <div className="text-sm">User Management</div>
              </Button>
              <Button
                variant="ghost"
                className="h-auto p-4 bg-[#3A3B5E] hover:bg-[#4A4B6E] text-white flex flex-col items-center space-y-2"
              >
                <Smartphone className="w-8 h-8" />
                <div className="text-sm">Device Management</div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderCurrentTab = () => {
    switch (currentTab) {
      case 'dashboard':
        return renderDashboardTab();
      case 'attendance':
        return renderAttendanceTab();
      case 'analytics':
        return renderAnalyticsTab();
      case 'communicate':
        return renderCommunicateTab();
      case 'my-dashboard':
        return renderMyDashboardTab();
      case 'leaderboard':
        return renderLeaderboardTab();
      default:
        return renderDashboardTab();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] flex items-center justify-center">
        <div className="text-white">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1B3E] text-white pb-20">
      {/* Header */}
      <div className="bg-[#2A2B4E] p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Admin Panel</h1>
            <p className="text-sm text-gray-300">System Overview</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={`${getHealthColor(metrics?.systemHealth || 'warning')} text-white`}>
            {metrics?.systemHealth || 'Unknown'}
          </Badge>
        </div>
      </div>

      {/* System KPIs - Top Row */}
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-4 gap-3">
          <Card className="bg-[#2A2B4E] border-[#3A3B5E]">
            <CardContent className="p-3 text-center">
              <div className="text-sm text-gray-400 mb-1">TODAY</div>
              <div className="text-2xl font-bold text-blue-400">
                {metrics?.totalEmployees || 0}
              </div>
              <div className="text-xs text-gray-400">Total</div>
            </CardContent>
          </Card>

          <Card className="bg-[#2A2B4E] border-[#3A3B5E]">
            <CardContent className="p-3 text-center">
              <div className="text-sm text-gray-400 mb-1">ACTIVE</div>
              <div className="text-2xl font-bold text-green-400">
                {metrics?.activeEmployees || 0}
              </div>
              <div className="text-xs text-gray-400">Users</div>
            </CardContent>
          </Card>

          <Card className="bg-[#2A2B4E] border-[#3A3B5E]">
            <CardContent className="p-3 text-center">
              <div className="text-sm text-gray-400 mb-1">SERVICES</div>
              <div className="text-2xl font-bold text-purple-400">
                {metrics?.totalPunchIn || 4}
              </div>
              <div className="text-xs text-gray-400">Running</div>
            </CardContent>
          </Card>

          <Card className="bg-[#2A2B4E] border-[#3A3B5E]">
            <CardContent className="p-3 text-center">
              <div className="text-sm text-gray-400 mb-1">UPTIME</div>
              <div className="text-2xl font-bold text-orange-400">
                {metrics?.attendanceRate || 99}%
              </div>
              <div className="text-xs text-gray-400">System</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="pb-4">
          {renderCurrentTab()}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#2A2B4E] border-t border-[#3A3B5E]">
        <div className="flex justify-around items-center py-1">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <Button
                key={tab.id}
                variant="ghost"
                size="sm"
                className={`flex flex-col items-center space-y-0.5 px-2 py-1 rounded-lg transition-colors h-auto
                  ${isActive 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-[#3A3B5E]'
                  }`}
                onClick={() => setCurrentTab(tab.id)}
              >
                <IconComponent className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                <span className={`text-[10px] ${isActive ? 'text-white' : 'text-gray-400'}`}>
                  {tab.label}
                </span>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}