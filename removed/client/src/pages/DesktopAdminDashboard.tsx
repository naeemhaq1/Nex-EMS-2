import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Timer, Trophy, Target, TrendingUp, BarChart3, Clock, Users, Award, 
  CheckCircle, Zap, Globe, Activity, RefreshCw, MapPin, Wifi, WifiOff,
  Calendar, AlertTriangle, Play, Pause, ChevronLeft, ChevronRight,
  Menu, X, Home, FileText, Settings, Database, MessageSquare, 
  Shield, UserCog, Bell, Terminal, BarChart2, DollarSign, FileCheck,
  Megaphone
} from 'lucide-react';
import { SidebarVersionIndicator } from '@/components/VersionIndicator';
import { VersionHistory } from '@/components/admin/VersionHistory';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';

interface DashboardMetrics {
  totalActiveUsers: number;
  totalSystemUsers: number;
  totalPunchIn: number;
  totalPunchOut: number;
  totalPresent: number;
  totalLate: number;
  totalAttendance: number;
  attendanceRate: number;
  completedShifts: number;
  averageHours: number;
  punctualityRate: number;
  efficiencyScore: number;
}



const DesktopAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showVersionHistory, setShowVersionHistory] = useState(false);


  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(true);
  
  // Desktop announcement input state
  const [announcementInput, setAnnouncementInput] = useState('');
  const [isAnnouncementSending, setIsAnnouncementSending] = useState(false);
  const [lastDesktopAnnouncement, setLastDesktopAnnouncement] = useState<string | null>(null);
  const [announcementRepeatCount, setAnnouncementRepeatCount] = useState(1);

  // Admin-specific announcements
  const announcements = [
    "🔧 System maintenance scheduled for Sunday 2:00 AM - 4:00 AM",
    "📊 Monthly attendance reports are now available for download",
    "⚠️ 15 employees require manager approval for overtime",
    "🎯 Weekly performance metrics have been updated",
    "📈 BioTime sync running smoothly - 142,795 records processed",
    "🔐 User access audit completed - 241 active accounts verified"
  ];

  // Query for admin dashboard metrics (synced with mobile)
  const { data: dashboardMetrics, isLoading: isLoadingMetrics } = useQuery<DashboardMetrics>({
    queryKey: ['/api/admin/dashboard-metrics'],
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });



  // Time and location effects
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);



  // Desktop announcement sending function
  const sendDesktopAnnouncement = async () => {
    if (!announcementInput.trim() || isAnnouncementSending) return;
    
    setIsAnnouncementSending(true);
    try {
      const response = await fetch('/api/announcements/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: announcementInput.trim(),
          priority: 'normal',
          targetAudience: 'all',
          repeatCount: announcementRepeatCount
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setLastDesktopAnnouncement(`Sent ${announcementRepeatCount}x to ${data.recipientCount || 'all'} users: "${announcementInput.trim()}"`);
        setAnnouncementInput(''); // Clear input
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => {
          setLastDesktopAnnouncement(null);
        }, 5000);
      } else {
        setLastDesktopAnnouncement('Failed to send announcement. Please try again.');
      }
    } catch (error) {
      console.error('Desktop announcement error:', error);
      setLastDesktopAnnouncement('Network error. Please check connection and try again.');
    } finally {
      setIsAnnouncementSending(false);
    }
  };

  // Announcement bar functionality
  useEffect(() => {
    if (isPaused || announcements.length === 0) return;

    const interval = setInterval(() => {
      setCurrentAnnouncementIndex((prev) => 
        prev === announcements.length - 1 ? 0 : prev + 1
      );
    }, 4000);

    return () => clearInterval(interval);
  }, [isPaused, announcements.length]);



  // Admin-specific KPI data
  const kpiData = [
    { title: 'Active Users', value: dashboardMetrics?.totalActiveUsers || 0, suffix: '', icon: Users, color: 'text-blue-400' },
    { title: 'Present Today', value: dashboardMetrics?.totalPresent || 0, suffix: '', icon: CheckCircle, color: 'text-green-400' },
    { title: 'Attendance Rate', value: dashboardMetrics?.attendanceRate || 0, suffix: '%', icon: Trophy, color: 'text-yellow-400' },
    { title: 'Punctuality Rate', value: dashboardMetrics?.punctualityRate || 0, suffix: '%', icon: Target, color: 'text-purple-400' },
    { title: 'System Users', value: dashboardMetrics?.totalSystemUsers || 0, suffix: '', icon: Globe, color: 'text-indigo-400' },
    { title: 'Punch-Ins', value: dashboardMetrics?.totalPunchIn || 0, suffix: '', icon: Timer, color: 'text-orange-400' },
    { title: 'Completed Shifts', value: dashboardMetrics?.completedShifts || 0, suffix: '', icon: Award, color: 'text-pink-400' },
    { title: 'Avg Hours', value: dashboardMetrics?.averageHours || 0, suffix: 'h', icon: Clock, color: 'text-emerald-400' },
    { title: 'Late Arrivals', value: dashboardMetrics?.totalLate || 0, suffix: '', icon: AlertTriangle, color: 'text-red-400' },
    { title: 'Efficiency Score', value: dashboardMetrics?.efficiencyScore || 0, suffix: '%', icon: Zap, color: 'text-cyan-400' },
    { title: 'Total Attendance', value: dashboardMetrics?.totalAttendance || 0, suffix: '', icon: BarChart3, color: 'text-teal-400' },
    { title: 'Punch-Outs', value: dashboardMetrics?.totalPunchOut || 0, suffix: '', icon: RefreshCw, color: 'text-violet-400' },
    { title: 'Data Integrity', value: '98', suffix: '%', icon: Activity, color: 'text-lime-400' },
    { title: 'System Health', value: '95', suffix: '%', icon: TrendingUp, color: 'text-amber-400' },
  ];

  const punctualityData = [
    { name: 'On Time', value: 75, color: '#10B981' },
    { name: 'Late', value: 15, color: '#F59E0B' },
    { name: 'Early', value: 10, color: '#3B82F6' },
  ];

  const weeklyData = [
    { day: 'Mon', hours: 8.5, attendance: 92 },
    { day: 'Tue', hours: 8.2, attendance: 89 },
    { day: 'Wed', hours: 8.7, attendance: 94 },
    { day: 'Thu', hours: 8.3, attendance: 91 },
    { day: 'Fri', hours: 8.1, attendance: 88 },
    { day: 'Sat', hours: 6.5, attendance: 75 },
    { day: 'Sun', hours: 4.2, attendance: 45 },
  ];

  const performanceData = [
    { week: 'W1', punctuality: 88, consistency: 92, efficiency: 85 },
    { week: 'W2', punctuality: 91, consistency: 89, efficiency: 88 },
    { week: 'W3', punctuality: 87, consistency: 94, efficiency: 91 },
    { week: 'W4', punctuality: 93, consistency: 90, efficiency: 89 },
  ];

  // Admin navigation menu items
  const adminNavItems = [
    { name: 'Dashboard', icon: Home, href: '/' },
    { name: 'Employees', icon: Users, href: '/employees' },
    { name: 'Attendance', icon: Clock, href: '/attendance' },
    { name: 'Reports', icon: FileText, href: '/reports' },
    { name: 'Analytics', icon: BarChart2, href: '/analytics' },
    { name: 'Data Sync', icon: Database, href: '/data-sync' },
    { name: 'WhatsApp', icon: MessageSquare, href: '/whatsapp' },
    { name: 'User Mgmt', icon: UserCog, href: '/user-management' },
    { name: 'System', icon: Shield, href: '/system' },
    { name: 'Settings', icon: Settings, href: '/settings' },
  ];



  return (
    <div className="flex min-h-screen bg-[#1A1B3E]">
      {/* Admin Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 bg-[#2A2B5E] border-r border-gray-700 flex flex-col`}>
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className={`${sidebarOpen ? 'block' : 'hidden'} flex items-center space-x-2`}>
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-semibold">Admin Panel</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-400 hover:text-white"
            >
              {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {adminNavItems.map((item) => (
            <Button
              key={item.name}
              variant="ghost"
              className={`w-full justify-start text-gray-300 hover:text-white hover:bg-[#3A3B6E] ${
                item.href === '/' ? 'bg-[#3A3B6E] text-white' : ''
              }`}
            >
              <item.icon className="w-4 h-4 mr-2" />
              {sidebarOpen && <span>{item.name}</span>}
            </Button>
          ))}
        </nav>
        
        {/* Version Indicator in Sidebar */}
        {sidebarOpen && (
          <div className="p-4 border-t border-gray-700">
            <SidebarVersionIndicator onClick={() => setShowVersionHistory(true)} />
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-gray-400">System Administrator</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <Wifi className="w-5 h-5 text-green-400" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-400" />
              )}
              <span className="text-gray-300 text-sm">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="text-right">
              <div className="text-white font-semibold">
                {currentTime.toLocaleTimeString()}
              </div>
              <div className="text-gray-400 text-sm">
                {currentTime.toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Admin Announcement Input Bar */}
        <Card className="mb-6 bg-[#2A2B5E] border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Megaphone className="w-5 h-5 text-orange-400 flex-shrink-0" />
              <input
                type="text"
                value={announcementInput}
                onChange={(e) => setAnnouncementInput(e.target.value)}
                placeholder="Type announcement to broadcast to all users..."
                className="flex-1 bg-[#1A1B3E] border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400"
                disabled={isAnnouncementSending}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendDesktopAnnouncement();
                  }
                }}
              />
              <input
                type="number"
                value={announcementRepeatCount}
                onChange={(e) => setAnnouncementRepeatCount(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                max="10"
                className="w-16 bg-[#1A1B3E] border border-gray-600 rounded px-2 py-2 text-white text-center focus:outline-none focus:border-orange-400"
                disabled={isAnnouncementSending}
                title="Repeat count"
              />
              <Button
                onClick={sendDesktopAnnouncement}
                disabled={!announcementInput.trim() || isAnnouncementSending}
                className={`px-4 py-2 rounded flex items-center space-x-2 ${
                  isAnnouncementSending 
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : announcementInput.trim()
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                } transition-colors`}
                title={`Announce ${announcementRepeatCount}x`}
              >
                {isAnnouncementSending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Megaphone className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">Announce</span>
              </Button>
            </div>
            
            {lastDesktopAnnouncement && (
              <div className="mt-3 p-2 bg-green-900/30 border border-green-700 rounded">
                <p className="text-green-400 text-sm">✅ {lastDesktopAnnouncement}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Announcements Display Bar */}
        {isAnnouncementVisible && (
          <Card className="mb-6 bg-[#2A2B5E] border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentAnnouncementIndex(prev => 
                      prev === 0 ? announcements.length - 1 : prev - 1
                    )}
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-400" />
                  </Button>
                  
                  <div className="flex-1 text-center">
                    <p className="text-white font-medium">
                      {announcements[currentAnnouncementIndex]}
                    </p>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentAnnouncementIndex(prev => 
                      prev === announcements.length - 1 ? 0 : prev + 1
                    )}
                  >
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </Button>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsPaused(!isPaused)}
                  >
                    {isPaused ? (
                      <Play className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Pause className="w-4 h-4 text-gray-400" />
                    )}
                  </Button>
                  
                  <div className="flex space-x-1">
                    {announcements.map((_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full ${
                          index === currentAnnouncementIndex ? 'bg-purple-500' : 'bg-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Status and Punch */}
          <div className="col-span-3 space-y-6">


            {/* Admin KPIs - Scrollable */}
            <Card className="bg-[#2A2B5E] border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg">Admin KPIs (14 Total)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-hide">
                  <div className="grid grid-cols-2 gap-3">
                    {kpiData.map((kpi, index) => (
                      <div key={index} className="bg-[#1A1B3E] p-3 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                          <span className="text-gray-300 text-xs">{kpi.title}</span>
                        </div>
                        <div className="mt-1">
                          <span className="text-white font-bold text-lg">
                            {kpi.value}
                          </span>
                          <span className="text-gray-400 text-sm ml-1">
                            {kpi.suffix}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Middle Column - Charts */}
          <div className="col-span-6 space-y-6">
            {/* Attendance Distribution Chart */}
            <Card className="bg-[#2A2B5E] border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg">Attendance Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={punctualityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {punctualityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center space-x-6 mt-4">
                  {punctualityData.map((entry, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-gray-300 text-sm">
                        {entry.name} {entry.value}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Weekly Hours Chart */}
            <Card className="bg-[#2A2B5E] border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg">Weekly Hours & Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="day" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#F3F4F6'
                        }}
                      />
                      <Bar dataKey="hours" fill="#8B5CF6" name="Hours" />
                      <Bar dataKey="attendance" fill="#10B981" name="Attendance %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Performance & Activity */}
          <div className="col-span-3 space-y-6">
            {/* Performance Trends */}
            <Card className="bg-[#2A2B5E] border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg">Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="week" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#F3F4F6'
                        }}
                      />
                      <Line type="monotone" dataKey="punctuality" stroke="#8B5CF6" strokeWidth={2} />
                      <Line type="monotone" dataKey="consistency" stroke="#10B981" strokeWidth={2} />
                      <Line type="monotone" dataKey="efficiency" stroke="#F59E0B" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center space-x-1 mt-2">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                    <span className="text-xs text-gray-400">Punctuality</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-xs text-gray-400">Consistency</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                    <span className="text-xs text-gray-400">Efficiency</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Activity */}
            <Card className="bg-[#2A2B5E] border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg">System Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">BioTime Sync</span>
                    <Badge className="bg-green-600 text-white">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">Data Processing</span>
                    <Badge className="bg-blue-600 text-white">Running</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">Auto Punchout</span>
                    <Badge className="bg-yellow-600 text-white">Scheduled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">System Health</span>
                    <Badge className="bg-green-600 text-white">Healthy</Badge>
                  </div>
                  
                  <div className="border-t border-gray-600 pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Records Today</span>
                        <span className="text-white">1,247</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">API Calls</span>
                        <span className="text-white">8,932</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Avg Response</span>
                        <span className="text-white">89ms</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>


        </div>
      </div>
      
      {/* Version History Modal */}
      {showVersionHistory && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="max-w-6xl w-full max-h-[90vh] overflow-hidden relative">
            <VersionHistory />
            <button
              onClick={() => setShowVersionHistory(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 bg-black bg-opacity-50 rounded-full w-8 h-8 flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesktopAdminDashboard;