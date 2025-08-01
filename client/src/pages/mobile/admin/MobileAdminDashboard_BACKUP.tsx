import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { 
  Users, 
  Settings, 
  Activity, 
  MessageSquare, 
  Calendar, 
  BarChart3,
  Map,
  Shield,
  FileText,
  Smartphone,
  Bug,
  Menu,
  X,
  Bell,
  Search,
  ChevronRight,
  TrendingUp,
  Clock,
  MapPin,
  UserCheck,
  MessageCircle,
  Database,
  Wifi,
  AlertTriangle,
  Trophy,
  GripHorizontal,
  Plus,
  Minus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title
);

interface AdminMetrics {
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

interface AdminFeature {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  route: string;
  badge?: string;
  color: string;
}

const adminFeatures: AdminFeature[] = [
  {
    id: 'directory',
    title: 'Employee Directory',
    icon: <Users className="w-5 h-5" />,
    description: 'Full employee directory with groups',
    route: '/mobile/admin/directory',
    color: 'bg-blue-500'
  },
  {
    id: 'services',
    title: 'Service Monitor',
    icon: <Activity className="w-5 h-5" />,
    description: 'Monitor and control services',
    route: '/mobile/admin/services',
    badge: 'Live',
    color: 'bg-green-500'
  },
  {
    id: 'analytics',
    title: 'Analytics Suite',
    icon: <BarChart3 className="w-5 h-5" />,
    description: 'Full suite of analytics',
    route: '/mobile/admin/analytics',
    color: 'bg-purple-500'
  },
  {
    id: 'map',
    title: 'Employee Map',
    icon: <Map className="w-5 h-5" />,
    description: 'Google map with employee locations',
    route: '/mobile/admin/map',
    color: 'bg-orange-500'
  },
  {
    id: 'announcements',
    title: 'Announcements',
    icon: <MessageSquare className="w-5 h-5" />,
    description: 'Send announcements to groups',
    route: '/mobile/admin/announcements',
    color: 'bg-cyan-500'
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp Console',
    icon: <MessageCircle className="w-5 h-5" />,
    description: 'Mobile-friendly messaging',
    route: '/mobile/admin/whatsapp',
    color: 'bg-green-600'
  },
  {
    id: 'attendance',
    title: 'Attendance Records',
    icon: <Clock className="w-5 h-5" />,
    description: 'Last 48 hours attendance',
    route: '/mobile/admin/attendance',
    color: 'bg-indigo-500'
  },
  {
    id: 'continuity',
    title: 'Data Continuity',
    icon: <Database className="w-5 h-5" />,
    description: 'Heatmap with polling control',
    route: '/mobile/admin/continuity',
    color: 'bg-red-500'
  },
  {
    id: 'users',
    title: 'User Management',
    icon: <UserCheck className="w-5 h-5" />,
    description: 'Password reset & settings',
    route: '/mobile/admin/users',
    color: 'bg-yellow-500'
  },
  {
    id: 'requests',
    title: 'Employee Requests',
    icon: <FileText className="w-5 h-5" />,
    description: 'Messaging for employee requests',
    route: '/mobile/admin/requests',
    color: 'bg-pink-500'
  },
  {
    id: 'devices',
    title: 'Device Management',
    icon: <Smartphone className="w-5 h-5" />,
    description: 'Connected devices control',
    route: '/mobile/admin/devices',
    color: 'bg-teal-500'
  },
  {
    id: 'support',
    title: 'Bug Reports',
    icon: <Bug className="w-5 h-5" />,
    description: 'Feature & bug reporting',
    route: '/mobile/admin/support',
    color: 'bg-gray-500'
  }
];

export default function MobileAdminDashboard() {
  const [location, setLocation] = useLocation();
  const [showMenu, setShowMenu] = useState(false);

  // Fetch admin metrics using same endpoint as desktop
  const { data: adminMetrics, isLoading } = useQuery<AdminMetrics>({
    queryKey: ['/api/admin/system-metrics'],
    refetchInterval: 30000,
  });

  // KPI Cards Data
  const kpiCards = [
    {
      title: 'Total Employees',
      value: adminMetrics?.totalEmployees || 0,
      icon: <Users className="w-5 h-5" />,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20'
    },
    {
      title: 'Present Today',
      value: adminMetrics?.totalPresent || 0,
      icon: <UserCheck className="w-5 h-5" />,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20'
    },
    {
      title: 'Punch-In',
      value: adminMetrics?.totalPunchIn || 0,
      icon: <Clock className="w-5 h-5" />,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20'
    },
    {
      title: 'Attendance Rate',
      value: `${adminMetrics?.attendanceRate || 0}%`,
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20'
    },
    {
      title: 'Active Services',
      value: adminMetrics?.servicesStatus ? 
        Object.values(adminMetrics.servicesStatus).filter(Boolean).length : 0,
      icon: <Activity className="w-5 h-5" />,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/20'
    }
  ];

  // System Health Badge
  const getHealthBadge = (health: string) => {
    switch (health) {
      case 'healthy':
        return <Badge className="bg-green-500 text-white">Healthy</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500 text-white">Warning</Badge>;
      case 'critical':
        return <Badge className="bg-red-500 text-white">Critical</Badge>;
      default:
        return <Badge className="bg-gray-500 text-white">Unknown</Badge>;
    }
  };

  // Attendance Chart Data
  const attendanceChartData = {
    labels: ['Normal', 'Grace', 'Late'],
    datasets: [
      {
        data: [65, 20, 15],
        backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.label}: ${context.parsed}%`,
        },
      },
    },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] flex items-center justify-center">
        <div className="text-white">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1B3E] text-white">
      {/* Header */}
      <div className="bg-[#2A2B5E] px-4 py-3 flex items-center justify-between mt-16">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMenu(!showMenu)}
            className="p-2"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Admin Dashboard</h1>
        </div>
        <div className="flex items-center space-x-2">
          {getHealthBadge(adminMetrics?.systemHealth || 'unknown')}
          <Button variant="ghost" size="sm" className="p-2">
            <Bell className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Side Menu Overlay */}
      {showMenu && (
        <div className="fixed inset-0 bg-black/50 z-50">
          <div className="bg-[#2A2B5E] w-80 h-full p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Admin Menu</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMenu(false)}
                className="p-2"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="space-y-2">
              {adminFeatures.map((feature) => (
                <Link
                  key={feature.id}
                  href={feature.route}
                  onClick={() => setShowMenu(false)}
                >
                  <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-[#1A1B3E] transition-colors">
                    <div className={`p-2 rounded-lg ${feature.color}`}>
                      {feature.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{feature.title}</div>
                      <div className="text-sm text-gray-400">{feature.description}</div>
                    </div>
                    {feature.badge && (
                      <Badge className="bg-green-500 text-white text-xs">
                        {feature.badge}
                      </Badge>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-4 pb-24">
        {/* KPI Horizontal Scroller */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">System Overview</h2>
          <div className="flex space-x-3 overflow-x-auto pb-2">
            {kpiCards.map((kpi, index) => (
              <Card key={index} className="bg-[#2A2B5E] border-gray-700 min-w-[140px] flex-shrink-0">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                      {kpi.icon}
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">{kpi.title}</div>
                  <div className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* System Status Chart */}
        <Card className="bg-[#2A2B5E] border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Today's Attendance Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <Doughnut data={attendanceChartData} options={chartOptions} />
            </div>
            <div className="flex justify-center space-x-4 mt-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">Normal 65%</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm">Grace 20%</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm">Late 15%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Grid */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {adminFeatures.slice(0, 8).map((feature) => (
              <Link key={feature.id} href={feature.route}>
                <Card className="bg-[#2A2B5E] border-gray-700 hover:bg-[#363756] transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${feature.color} flex-shrink-0`}>
                        {feature.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{feature.title}</div>
                        <div className="text-xs text-gray-400 truncate">{feature.description}</div>
                      </div>
                      {feature.badge && (
                        <Badge className="bg-green-500 text-white text-xs">
                          {feature.badge}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Service Status */}
        <Card className="bg-[#2A2B5E] border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Service Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Timestamp Polling</span>
                <Badge className={adminMetrics?.servicesStatus?.timestampPolling ? 'bg-green-500' : 'bg-red-500'}>
                  {adminMetrics?.servicesStatus?.timestampPolling ? 'Active' : 'Stopped'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Automated Polling</span>
                <Badge className={adminMetrics?.servicesStatus?.automatedPolling ? 'bg-green-500' : 'bg-red-500'}>
                  {adminMetrics?.servicesStatus?.automatedPolling ? 'Active' : 'Stopped'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Auto Punchout</span>
                <Badge className={adminMetrics?.servicesStatus?.autoPunchout ? 'bg-green-500' : 'bg-red-500'}>
                  {adminMetrics?.servicesStatus?.autoPunchout ? 'Active' : 'Stopped'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">WhatsApp Service</span>
                <Badge className={adminMetrics?.servicesStatus?.whatsappService ? 'bg-green-500' : 'bg-red-500'}>
                  {adminMetrics?.servicesStatus?.whatsappService ? 'Active' : 'Stopped'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Notification Bar */}
        <div className="fixed bottom-16 left-0 right-0 mx-4 mb-2">
          <div className="bg-red-500/90 backdrop-blur-md rounded-lg p-3 border border-red-400/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="text-sm font-medium text-white">STATUS</div>
                <div className="text-sm text-red-200">MISSED PUNCH OUT!</div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-xs text-red-200">SHIFT</div>
                <div className="text-sm font-medium text-white">6:00 PM - 11:28 AM</div>
              </div>
            </div>
          </div>
        </div>

        {/* Upper Navigation Bar */}
        <div className="fixed top-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-b border-gray-700 z-50">
          <div className="flex justify-around py-2 px-1">
            <Link href="/mobile/admin/analytics">
              <Button variant="ghost" className="flex flex-col items-center space-y-1 text-gray-400 px-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs">Analytics</span>
              </Button>
            </Link>
            <Link href="/mobile/admin/data">
              <Button variant="ghost" className="flex flex-col items-center space-y-1 text-gray-400 px-2">
                <Database className="w-4 h-4" />
                <span className="text-xs">Data</span>
              </Button>
            </Link>
            <Link href="/mobile/admin/directory">
              <Button variant="ghost" className="flex flex-col items-center space-y-1 text-gray-400 px-2">
                <Users className="w-4 h-4" />
                <span className="text-xs">Directory</span>
              </Button>
            </Link>
            <Link href="/mobile/admin/communicate">
              <Button variant="ghost" className="flex flex-col items-center space-y-1 text-gray-400 px-2">
                <MessageSquare className="w-4 h-4" />
                <span className="text-xs">Communicate</span>
              </Button>
            </Link>
            <Link href="/mobile/admin/attendance">
              <Button variant="ghost" className="flex flex-col items-center space-y-1 text-gray-400 px-2">
                <Clock className="w-4 h-4" />
                <span className="text-xs">Attendance</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Bottom Navigation Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-gray-700">
          <div className="flex justify-around py-1 px-0.5">
            <Link href="/mobile/admin/dashboard">
              <Button variant="ghost" className="flex flex-col items-center space-y-0.5 text-blue-400 px-1 py-1 h-auto">
                <BarChart3 className="w-3.5 h-3.5" />
                <span className="text-[10px]">Dashboard</span>
              </Button>
            </Link>
            <Link href="/mobile/admin/system">
              <Button variant="ghost" className="flex flex-col items-center space-y-0.5 text-gray-400 px-1 py-1 h-auto">
                <Settings className="w-3.5 h-3.5" />
                <span className="text-[10px]">System</span>
              </Button>
            </Link>
            <Link href="/mobile/admin/map">
              <Button variant="ghost" className="flex flex-col items-center space-y-0.5 text-gray-400 px-1 py-1 h-auto">
                <MapPin className="w-3.5 h-3.5" />
                <span className="text-[10px]">Map</span>
              </Button>
            </Link>
            <Link href="/mobile/admin/services">
              <Button variant="ghost" className="flex flex-col items-center space-y-0.5 text-gray-400 px-1 py-1 h-auto">
                <Activity className="w-3.5 h-3.5" />
                <span className="text-[10px]">Services</span>
              </Button>
            </Link>
            <Link href="/mobile/admin/whatsapp">
              <Button variant="ghost" className="flex flex-col items-center space-y-1 text-gray-400 px-2">
                <MessageCircle className="w-4 h-4" />
                <span className="text-xs">Whatsapp</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Bottom spacing for navigation */}
        <div className="h-20"></div>
      </div>
    </div>
  );
}