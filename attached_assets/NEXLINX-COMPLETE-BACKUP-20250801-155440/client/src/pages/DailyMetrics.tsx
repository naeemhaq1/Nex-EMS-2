import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Calendar, TrendingUp, TrendingDown, Users, Clock, CheckCircle, XCircle, BarChart3, Activity, RefreshCw, UserCheck, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface DailyMetric {
  id: number;
  date: string;
  totalEmployees: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  completeCount: number;
  incompleteCount: number;
  nonbioCount: number;
  attendanceRate: number;
  createdAt: string;
  updatedAt: string;
}

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6'];

export default function DailyMetrics() {
  const [refreshing, setRefreshing] = useState(false);

  const { data: todayMetrics, isLoading: todayLoading, error: todayError, refetch: refetchToday } = useQuery<DailyMetric>({
    queryKey: ['/api/daily-metrics/today'],
    queryFn: async () => {
      const response = await fetch('/api/daily-metrics/today');
      if (!response.ok) throw new Error('Failed to fetch today metrics');
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: metrics, isLoading: metricsLoading, error: metricsError, refetch: refetchMetrics } = useQuery<DailyMetric[]>({
    queryKey: ['/api/daily-metrics/latest-metrics'],
    queryFn: async () => {
      const response = await fetch('/api/daily-metrics/latest-metrics?limit=7');
      if (!response.ok) throw new Error('Failed to fetch daily metrics');
      return response.json();
    },
  });

  const { data: monthlyTrends, isLoading: trendsLoading, refetch: refetchTrends } = useQuery<DailyMetric[]>({
    queryKey: ['/api/daily-metrics/monthly-trend'],
    queryFn: async () => {
      const response = await fetch('/api/daily-metrics/monthly-trend');
      if (!response.ok) throw new Error('Failed to fetch monthly trends');
      return response.json();
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchToday(), refetchMetrics(), refetchTrends()]);
      toast({
        title: "Success",
        description: "Daily metrics refreshed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh daily metrics",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Transform data for charts
  const transformChartData = (data: DailyMetric[]) => {
    return data.map(metric => ({
      date: format(parseISO(metric.date), 'MMM dd'),
      attendance: metric.attendanceRate || 0,
      present: metric.presentCount,
      absent: metric.absentCount,
      late: metric.lateCount,
      complete: metric.completeCount,
      incomplete: metric.incompleteCount,
      nonBio: metric.nonbioCount,
      total: metric.totalEmployees
    }));
  };

  const getPieData = (metric: DailyMetric) => [
    { name: 'Present', value: metric.presentCount, color: '#10B981' },
    { name: 'Late', value: metric.lateCount, color: '#F59E0B' },
    { name: 'Absent', value: metric.absentCount, color: '#EF4444' },
    { name: 'NonBio', value: metric.nonbioCount, color: '#8B5CF6' },
  ];

  if (todayLoading || metricsLoading || trendsLoading) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-white">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white">Daily Metrics</h1>
              <p className="text-slate-400 mt-1">Today's attendance overview</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="bg-[#1E293B] border-slate-700 animate-pulse">
                <CardHeader className="pb-3">
                  <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-slate-700 rounded w-1/2"></div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (todayError || metricsError) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-white">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white">Daily Metrics</h1>
              <p className="text-slate-400 mt-1">Today's attendance overview</p>
            </div>
            <Button onClick={handleRefresh} disabled={refreshing} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
          <Card className="bg-[#1E293B] border-slate-700">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Error Loading Data
              </CardTitle>
              <p className="text-slate-400">
                Failed to load daily metrics. Please try refreshing the page.
              </p>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-h-screen bg-[#1A1B3E] text-white">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Daily Metrics</h1>
            <p className="text-slate-400 mt-1">
              Today's attendance overview - {todayMetrics ? format(parseISO(todayMetrics.date), 'MMMM d, yyyy') : 'Loading...'}
            </p>
          </div>
          <Button onClick={handleRefresh} disabled={refreshing} className="bg-blue-600 hover:bg-blue-700">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-[#2A2B5E] border-slate-700">
            <TabsTrigger value="today" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300">
              <Calendar className="w-4 h-4 mr-2" />
              Today
            </TabsTrigger>
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300">
              <BarChart3 className="w-4 h-4 mr-2" />
              Week Overview
            </TabsTrigger>
            <TabsTrigger value="trends" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300">
              <Activity className="w-4 h-4 mr-2" />
              Monthly Trends
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-6 mt-6">
            {todayMetrics && (
              <>
                {/* Today's Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="cursor-pointer hover:bg-[#2A2B5E] transition-colors border-slate-700 bg-[#2A2B5E]">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-400">Total Employees</p>
                          <p className="text-2xl font-bold text-white">{todayMetrics.totalEmployees}</p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                          <Users className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:bg-[#2A2B5E] transition-colors border-slate-700 bg-[#2A2B5E]">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-400">Present Today</p>
                          <p className="text-2xl font-bold text-green-400">{todayMetrics.presentCount}</p>
                          <p className="text-xs text-slate-400">
                            {((todayMetrics.presentCount / todayMetrics.totalEmployees) * 100).toFixed(1)}% attendance
                          </p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
                          <UserCheck className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:bg-[#2A2B5E] transition-colors border-slate-700 bg-[#2A2B5E]">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-400">Late Arrivals</p>
                          <p className="text-2xl font-bold text-orange-400">{todayMetrics.lateCount}</p>
                          <p className="text-xs text-slate-400">
                            {((todayMetrics.lateCount / todayMetrics.totalEmployees) * 100).toFixed(1)}% late
                          </p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center">
                          <Clock className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:bg-[#2A2B5E] transition-colors border-slate-700 bg-[#2A2B5E]">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-400">Absent Today</p>
                          <p className="text-2xl font-bold text-red-400">{todayMetrics.absentCount}</p>
                          <p className="text-xs text-slate-400">
                            {((todayMetrics.absentCount / todayMetrics.totalEmployees) * 100).toFixed(1)}% absent
                          </p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center">
                          <XCircle className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Today's Detailed Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Attendance Breakdown Doughnut Chart */}
                  <Card className="border-slate-700 bg-[#2A2B5E]">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Attendance Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={getPieData(todayMetrics)}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              innerRadius={40}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {getPieData(todayMetrics).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#2A2B5E', 
                                border: '1px solid #475569',
                                borderRadius: '8px',
                                color: 'white'
                              }} 
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Punctuality Breakdown Doughnut Chart */}
                  <Card className="border-slate-700 bg-[#2A2B5E]">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Punctuality Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'On Time', value: todayMetrics.presentCount - todayMetrics.lateCount, color: '#10B981' },
                                { name: 'Late', value: todayMetrics.lateCount, color: '#F59E0B' },
                                { name: 'NonBio', value: todayMetrics.nonbioCount, color: '#8B5CF6' }
                              ]}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              innerRadius={40}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {[
                                { name: 'On Time', value: todayMetrics.presentCount - todayMetrics.lateCount, color: '#10B981' },
                                { name: 'Late', value: todayMetrics.lateCount, color: '#F59E0B' },
                                { name: 'NonBio', value: todayMetrics.nonbioCount, color: '#8B5CF6' }
                              ].map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#2A2B5E', 
                                border: '1px solid #475569',
                                borderRadius: '8px',
                                color: 'white'
                              }} 
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Attendance Status Summary */}
                  <Card className="border-slate-700 bg-[#2A2B5E]">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Attendance Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Complete Attendance</span>
                        <Badge className="bg-green-600 text-white">
                          {todayMetrics.completeCount}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Incomplete Attendance</span>
                        <Badge className="bg-orange-600 text-white">
                          {todayMetrics.incompleteCount}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">NonBio Employees</span>
                        <Badge className="bg-purple-600 text-white">
                          {todayMetrics.nonbioCount}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-600">
                        <span className="text-slate-400 font-medium">Attendance Rate</span>
                        <Badge className={`${(todayMetrics.attendanceRate || 0) >= 75 ? 'bg-green-600' : 'bg-red-600'} text-white text-lg px-3 py-1`}>
                          {Number(todayMetrics.attendanceRate || 0).toFixed(1)}%
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Completion Status Stacked Bar Chart */}
                <Card className="border-slate-700 bg-[#2A2B5E]">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Attendance Completion Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            {
                              name: 'Today',
                              complete: todayMetrics.completeCount,
                              incomplete: todayMetrics.incompleteCount,
                              nonbio: todayMetrics.nonbioCount,
                              absent: todayMetrics.absentCount
                            }
                          ]}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="name" stroke="#9CA3AF" />
                          <YAxis stroke="#9CA3AF" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#2A2B5E', 
                              border: '1px solid #475569',
                              borderRadius: '8px',
                              color: 'white'
                            }} 
                          />
                          <Legend />
                          <Bar dataKey="complete" stackId="a" fill="#10B981" name="Complete" />
                          <Bar dataKey="incomplete" stackId="a" fill="#F59E0B" name="Incomplete" />
                          <Bar dataKey="nonbio" stackId="a" fill="#8B5CF6" name="NonBio" />
                          <Bar dataKey="absent" stackId="a" fill="#EF4444" name="Absent" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {metrics && metrics.length > 0 && (
              <>
                {/* Weekly Attendance Stacked Bar Chart */}
                <Card className="border-slate-700 bg-[#2A2B5E]">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Weekly Attendance Composition
                    </CardTitle>
                    <p className="text-slate-400">Stacked view showing attendance patterns over the last 7 days</p>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={transformChartData(metrics.slice().reverse())}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="date" stroke="#9CA3AF" />
                          <YAxis stroke="#9CA3AF" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#2A2B5E', 
                              border: '1px solid #475569',
                              borderRadius: '8px',
                              color: 'white'
                            }} 
                          />
                          <Legend />
                          <Bar dataKey="present" stackId="a" fill="#10B981" name="Present" />
                          <Bar dataKey="late" stackId="a" fill="#F59E0B" name="Late" />
                          <Bar dataKey="absent" stackId="a" fill="#EF4444" name="Absent" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Weekly Completion Status Chart */}
                <Card className="border-slate-700 bg-[#2A2B5E]">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Weekly Completion Status
                    </CardTitle>
                    <p className="text-slate-400">Complete vs Incomplete attendance patterns</p>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={metrics.slice().reverse().map(m => ({
                          date: format(parseISO(m.date), 'MMM d'),
                          complete: m.completeCount,
                          incomplete: m.incompleteCount,
                          nonbio: m.nonbioCount
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="date" stroke="#9CA3AF" />
                          <YAxis stroke="#9CA3AF" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#2A2B5E', 
                              border: '1px solid #475569',
                              borderRadius: '8px',
                              color: 'white'
                            }} 
                          />
                          <Legend />
                          <Bar dataKey="complete" stackId="b" fill="#10B981" name="Complete" />
                          <Bar dataKey="incomplete" stackId="b" fill="#F59E0B" name="Incomplete" />
                          <Bar dataKey="nonbio" stackId="b" fill="#8B5CF6" name="NonBio" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Weekly Attendance Trends Line Chart */}
                <Card className="border-slate-700 bg-[#2A2B5E]">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Weekly Attendance Trends
                    </CardTitle>
                    <p className="text-slate-400">Attendance rate and punctuality trends over time</p>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={transformChartData(metrics.slice().reverse())}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="date" stroke="#9CA3AF" />
                          <YAxis stroke="#9CA3AF" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#2A2B5E', 
                              border: '1px solid #475569',
                              borderRadius: '8px',
                              color: 'white'
                            }} 
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="present" 
                            stroke="#10B981" 
                            strokeWidth={3}
                            name="Present"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="late" 
                            stroke="#F59E0B" 
                            strokeWidth={3}
                            name="Late"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="absent" 
                            stroke="#EF4444" 
                            strokeWidth={3}
                            name="Absent"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Weekly Summary Table */}
                <Card className="border-slate-700 bg-[#2A2B5E]">
                  <CardHeader>
                    <CardTitle className="text-white">Weekly Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-600">
                            <th className="text-left p-3 text-slate-400">Date</th>
                            <th className="text-center p-3 text-slate-400">Present</th>
                            <th className="text-center p-3 text-slate-400">Late</th>
                            <th className="text-center p-3 text-slate-400">Complete</th>
                            <th className="text-center p-3 text-slate-400">Incomplete</th>
                            <th className="text-center p-3 text-slate-400">Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {metrics.map((metric) => (
                            <tr key={metric.id} className="border-b border-slate-700 hover:bg-[#1A1B3E]">
                              <td className="p-3 text-white font-medium">
                                {format(parseISO(metric.date), 'MMM d, yyyy')}
                              </td>
                              <td className="text-center p-3 text-green-400 font-medium">{metric.presentCount}</td>
                              <td className="text-center p-3 text-orange-400">{metric.lateCount}</td>
                              <td className="text-center p-3 text-blue-400">{metric.completeCount}</td>
                              <td className="text-center p-3 text-yellow-400">{metric.incompleteCount}</td>
                              <td className="text-center p-3">
                                <Badge className={`${(metric.attendanceRate || 0) >= 75 ? 'bg-green-600' : 'bg-red-600'} text-white`}>
                                  {Number(metric.attendanceRate || 0).toFixed(1)}%
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="trends" className="space-y-6 mt-6">
            {monthlyTrends && monthlyTrends.length > 0 && (
              <>
                <Card className="bg-[#1E293B] border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Monthly Attendance Trends
                    </CardTitle>
                    <p className="text-slate-400">30-day attendance pattern analysis</p>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={transformChartData(monthlyTrends)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="date" stroke="#9CA3AF" />
                          <YAxis stroke="#9CA3AF" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1E293B', 
                              border: '1px solid #475569',
                              borderRadius: '8px',
                              color: 'white'
                            }} 
                          />
                          <Legend />
                          <Bar dataKey="present" fill="#10B981" name="Present" />
                          <Bar dataKey="late" fill="#F59E0B" name="Late" />
                          <Bar dataKey="absent" fill="#EF4444" name="Absent" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}