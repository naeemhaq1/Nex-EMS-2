import React, { useState, useEffect } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Save, RotateCcw, Users, Clock, CheckCircle, AlertCircle, Calendar, Activity, TrendingUp, TrendingDown, Target, Zap, Settings, RefreshCw, User, Building2, Clock4 } from 'lucide-react';
import { format } from 'date-fns';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardProfile {
  id: number;
  name: string;
  layout: any[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

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
  activeShifts: number;
}

interface YesterdayMetrics {
  totalActiveUsers: number;
  totalPunchIn: number;
  totalPunchOut: number;
  totalPresent: number;
  totalLate: number;
  totalAttendance: number;
  attendanceRate: number;
  completedShifts: number;
  activeShifts: number;
}

interface TodayActivity {
  hour: string;
  punchIn: number;
  punchOut: number;
  isNewDay: boolean;
}

interface LiveInterface {
  type: string;
  title: string;
  description: string;
  status: 'active' | 'idle' | 'error';
  lastUpdate: string;
  metrics?: any;
}

// Default layout configuration
const defaultLayout = [
  { i: 'today-kpis', x: 0, y: 0, w: 8, h: 4, minW: 4, minH: 3 },
  { i: 'yesterday-performance', x: 8, y: 0, w: 4, h: 4, minW: 3, minH: 3 },
  { i: 'today-activity', x: 0, y: 4, w: 6, h: 6, minW: 4, minH: 4 },
  { i: 'live-interfaces', x: 6, y: 4, w: 6, h: 6, minW: 4, minH: 4 },
];

const GridDashboard: React.FC = () => {
  const [layout, setLayout] = useState(defaultLayout);
  const [selectedProfile, setSelectedProfile] = useState<number | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch dashboard profiles
  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['/api/dashboard/profiles'],
    refetchInterval: 30000,
  });

  // Fetch dashboard metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ['/api/dashboard/metrics'],
    refetchInterval: 30000,
  });

  // Fetch yesterday metrics
  const { data: yesterdayMetrics, isLoading: yesterdayLoading } = useQuery<YesterdayMetrics>({
    queryKey: ['/api/dashboard/yesterday-metrics'],
    refetchInterval: 30000,
  });

  // Fetch today's activity (hourly punch data)
  const { data: todayActivity = [], isLoading: activityLoading } = useQuery<TodayActivity[]>({
    queryKey: ['/api/dashboard/today-activity'],
    refetchInterval: 30000,
  });

  // Fetch live interfaces
  const { data: liveInterfaces = [], isLoading: interfacesLoading } = useQuery<LiveInterface[]>({
    queryKey: ['/api/dashboard/live-interfaces'],
    refetchInterval: 30000,
  });

  // Load selected profile layout
  useEffect(() => {
    if (selectedProfile && profiles.length > 0) {
      const profile = profiles.find((p: DashboardProfile) => p.id === selectedProfile);
      if (profile && profile.layout) {
        setLayout(profile.layout);
        setIsDirty(false);
      }
    }
  }, [selectedProfile, profiles]);

  // Handle layout changes
  const handleLayoutChange = (newLayout: any[]) => {
    setLayout(newLayout);
    setIsDirty(true);
  };

  // Save current layout as new profile
  const saveProfile = async () => {
    const name = prompt('Enter profile name:');
    if (!name) return;

    try {
      await apiRequest({
        url: '/api/dashboard/profiles',
        method: 'POST',
        data: { name, layout, isDefault: false },
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/profiles'] });
      toast({
        title: 'Profile Saved',
        description: `Dashboard profile "${name}" has been saved successfully.`,
      });
      setIsDirty(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save profile. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Set profile as default
  const setAsDefault = async () => {
    if (!selectedProfile) return;

    try {
      await apiRequest({
        url: `/api/dashboard/profiles/${selectedProfile}/set-default`,
        method: 'POST',
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/profiles'] });
      toast({
        title: 'Default Profile Set',
        description: 'Profile has been set as default successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to set as default. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Reset to default layout
  const resetLayout = () => {
    setLayout(defaultLayout);
    setSelectedProfile(null);
    setIsDirty(true);
  };

  // KPI Card Component
  const KPICard: React.FC<{ title: string; value: string | number; subtitle?: string; icon: React.ReactNode; trend?: 'up' | 'down' | 'stable'; change?: string }> = ({ title, value, subtitle, icon, trend, change }) => (
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {icon}
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
              {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>
          </div>
          {trend && change && (
            <div className="flex items-center space-x-1">
              {trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
              {trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
              {trend === 'stable' && <Target className="h-4 w-4 text-gray-500" />}
              <span className={`text-sm ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500'}`}>
                {change}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Today's KPIs Panel
  const TodaysKPIs: React.FC = () => {
    if (metricsLoading) return <div className="flex items-center justify-center h-full"><RefreshCw className="h-6 w-6 animate-spin" /></div>;
    
    const kpis = [
      { title: 'Total Active Employees', value: metrics?.totalActiveUsers || 0, icon: <Users className="h-5 w-5 text-blue-500" /> },
      { title: 'Punch In', value: metrics?.totalPunchIn || 0, icon: <Clock className="h-5 w-5 text-green-500" /> },
      { title: 'Present', value: metrics?.totalPresent || 0, icon: <CheckCircle className="h-5 w-5 text-green-600" /> },
      { title: 'Late', value: metrics?.totalLate || 0, icon: <AlertCircle className="h-5 w-5 text-red-500" /> },
      { title: 'Total Attendance', value: metrics?.totalAttendance || 0, icon: <Activity className="h-5 w-5 text-purple-500" /> },
      { title: 'Completed Shifts', value: metrics?.completedShifts || 0, icon: <Target className="h-5 w-5 text-orange-500" /> },
    ];

    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Today's KPIs</span>
            <Badge variant="secondary">{format(new Date(), 'MMM dd, yyyy')}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {kpis.map((kpi, index) => (
              <KPICard key={index} {...kpi} />
            ))}
          </div>
          <Separator className="my-4" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Attendance Rate</span>
            <div className="flex items-center space-x-2">
              <Progress value={metrics?.attendanceRate || 0} className="w-24" />
              <span className="text-sm font-medium">{metrics?.attendanceRate?.toFixed(1) || 0}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Yesterday's Performance Panel
  const YesterdaysPerformance: React.FC = () => {
    if (yesterdayLoading) return <div className="flex items-center justify-center h-full"><RefreshCw className="h-6 w-6 animate-spin" /></div>;
    
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);

    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock4 className="h-5 w-5" />
            <span>Yesterday's Performance</span>
            <Badge variant="outline">{format(yesterdayDate, 'MMM dd')}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{yesterdayMetrics?.totalPunchIn || 0}</p>
                <p className="text-sm text-gray-500">Punch In</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{yesterdayMetrics?.totalPresent || 0}</p>
                <p className="text-sm text-gray-500">Present</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Attendance Rate</span>
                <span className="text-sm font-medium">{yesterdayMetrics?.attendanceRate?.toFixed(1) || 0}%</span>
              </div>
              <Progress value={yesterdayMetrics?.attendanceRate || 0} />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Completed Shifts</span>
                <span className="text-sm font-medium">{yesterdayMetrics?.completedShifts || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Late Arrivals</span>
                <span className="text-sm font-medium text-red-500">{yesterdayMetrics?.totalLate || 0}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Today's Activity Panel (Hourly Chart)
  const TodaysActivity: React.FC = () => {
    if (activityLoading) return <div className="flex items-center justify-center h-full"><RefreshCw className="h-6 w-6 animate-spin" /></div>;
    
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Today's Activity (Last 24 Hours)</span>
            <Badge variant="secondary">Live</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 overflow-x-auto">
            <div className="flex space-x-1 min-w-max">
              {todayActivity.map((activity, index) => (
                <div key={index} className="flex flex-col items-center space-y-1 px-2">
                  {activity.isNewDay && (
                    <div className="w-px h-full bg-gray-400 border-l-2 border-dashed border-gray-400" />
                  )}
                  <div className="text-xs text-gray-500">{activity.hour}</div>
                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-4 h-8 bg-green-500 rounded-t" style={{ height: `${Math.max(activity.punchIn * 4, 4)}px` }} title={`Punch In: ${activity.punchIn}`} />
                    <div className="w-4 h-8 bg-red-500 rounded-b" style={{ height: `${Math.max(activity.punchOut * 4, 4)}px` }} title={`Punch Out: ${activity.punchOut}`} />
                  </div>
                  <div className="text-xs font-medium">{activity.punchIn + activity.punchOut}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span className="text-sm text-gray-600">Punch In</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded" />
              <span className="text-sm text-gray-600">Punch Out</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-px h-4 border-l-2 border-dashed border-gray-400" />
              <span className="text-sm text-gray-600">Calendar Day</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Live Interfaces Panel
  const LiveInterfaces: React.FC = () => {
    if (interfacesLoading) return <div className="flex items-center justify-center h-full"><RefreshCw className="h-6 w-6 animate-spin" /></div>;
    
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Live Interfaces</span>
            <Badge variant="outline">Real-time</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {liveInterfaces.map((interface_, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    interface_.status === 'active' ? 'bg-green-500' : 
                    interface_.status === 'idle' ? 'bg-yellow-500' : 
                    'bg-red-500'
                  }`} />
                  <div>
                    <p className="font-medium">{interface_.title}</p>
                    <p className="text-sm text-gray-500">{interface_.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={interface_.status === 'active' ? 'default' : interface_.status === 'idle' ? 'secondary' : 'destructive'}>
                    {interface_.status}
                  </Badge>
                  <p className="text-xs text-gray-500 mt-1">{interface_.lastUpdate}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render grid items
  const renderGridItem = (key: string) => {
    switch (key) {
      case 'today-kpis':
        return <TodaysKPIs />;
      case 'yesterday-performance':
        return <YesterdaysPerformance />;
      case 'today-activity':
        return <TodaysActivity />;
      case 'live-interfaces':
        return <LiveInterfaces />;
      default:
        return <div>Unknown panel: {key}</div>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Dashboard Layout Control</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Select value={selectedProfile?.toString() || ''} onValueChange={(value) => setSelectedProfile(value ? parseInt(value) : null)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select profile..." />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile: DashboardProfile) => (
                    <SelectItem key={profile.id} value={profile.id.toString()}>
                      {profile.name} {profile.isDefault && '(Default)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={saveProfile} disabled={!isDirty}>
              <Save className="h-4 w-4 mr-2" />
              Save Profile
            </Button>
            
            <Button onClick={setAsDefault} disabled={!selectedProfile} variant="outline">
              Set as Default
            </Button>
            
            <Button onClick={resetLayout} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Layout
            </Button>
          </div>
          
          {isDirty && (
            <div className="mt-2 text-sm text-orange-600">
              Layout has been modified. Save to preserve changes.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grid Layout */}
      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: layout }}
        onLayoutChange={handleLayoutChange}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={60}
        isDraggable={true}
        isResizable={true}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        useCSSTransforms={true}
        compactType="vertical"
      >
        {layout.map((item) => (
          <div key={item.i} className="grid-item">
            {renderGridItem(item.i)}
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
};

export default GridDashboard;