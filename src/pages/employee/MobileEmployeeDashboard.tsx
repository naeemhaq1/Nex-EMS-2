import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Clock, Bell, Star, Trophy, TrendingUp, Target, Award } from "lucide-react";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

// Data fetching queries
const useEmployeeData = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['/api/employee/profile', user?.employeeId],
    enabled: !!user?.employeeId,
  });
};

const useAttendanceData = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['/api/employee/attendance', user?.employeeId],
    enabled: !!user?.employeeId,
  });
};

const useDashboardMetrics = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['/api/employee/dashboard-metrics', user?.employeeId],
    enabled: !!user?.employeeId,
  });
};

export default function MobileEmployeeDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Data queries
  const employeeData = useEmployeeData();
  const attendanceData = useAttendanceData();
  const metricsData = useDashboardMetrics();

  // Timer for real-time updates
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimeWithAMPM = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
  };

  // Sample data matching the design mockup
  const attendanceBreakdown = [
    { name: 'Present', value: 85, color: '#8B5CF6' },
    { name: 'Absent', value: 15, color: '#EF4444' },
  ];

  const weeklyProgressData = [
    { day: 'M', hours: 16 },
    { day: 'Tu', hours: 26 },
    { day: 'W', hours: 34 },
    { day: 'Fr', hours: 42 },
    { day: 'S', hours: 42 },
  ];

  const recentActivity = [
    { time: '09:15 AM', action: 'Punched In', type: 'in', day: 'Tuesday' },
    { time: 'Yesterday', action: 'Missed punch out', type: 'out', day: 'Monday' },
  ];

  return (
    <div className="min-h-screen bg-[#1A1B3E] text-white">
      {/* Mobile Header - Exact match to design */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#1A1B3E] border-b border-purple-500/20 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold text-white">
            {formatTimeWithAMPM(currentTime)}
          </div>
          <div className="flex items-center space-x-2">
            {/* Signal bars */}
            <div className="flex space-x-1">
              <div className="w-1 h-4 bg-white rounded-full"></div>
              <div className="w-1 h-4 bg-white rounded-full"></div>
              <div className="w-1 h-4 bg-white rounded-full"></div>
              <div className="w-1 h-4 bg-white/60 rounded-full"></div>
            </div>
            {/* WiFi icon */}
            <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
              <path d="M12 4c-2.97 0-5.73.73-8.18 2.03L12 14.19l8.18-8.16C17.73 4.73 14.97 4 12 4zm0 2c2.34 0 4.54.57 6.5 1.59L12 13.75 5.5 7.59C7.46 6.57 9.66 6 12 6z"/>
            </svg>
            {/* Battery icon */}
            <div className="w-6 h-3 border border-white rounded-sm">
              <div className="w-4 h-1.5 bg-white rounded-sm m-0.5"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-16 px-4 pb-20">
        {/* User Profile Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Avatar className="w-12 h-12 border-2 border-purple-500/30">
              <AvatarImage src="/api/placeholder/48/48" alt="User" />
              <AvatarFallback className="bg-purple-600 text-white font-semibold">
                SJ
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold text-white">Sarah Johnson</h1>
              <p className="text-gray-300 text-sm">Senior Developer</p>
            </div>
          </div>
          <Bell className="w-6 h-6 text-purple-400" />
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="bg-[#2A2B5E] border-purple-500/30 text-white">
            <CardContent className="p-4">
              <div className="text-gray-300 text-sm mb-1">HOURS TODAY</div>
              <div className="text-3xl font-bold">8,5h</div>
            </CardContent>
          </Card>
          <Card className="bg-[#2A2B5E] border-purple-500/30 text-white">
            <CardContent className="p-4">
              <div className="text-gray-300 text-sm mb-1">THIS WEEK</div>
              <div className="text-3xl font-bold">42h</div>
            </CardContent>
          </Card>
          <Card className="bg-[#2A2B5E] border-purple-500/30 text-white">
            <CardContent className="p-4">
              <div className="text-gray-300 text-sm mb-1">ATTENDANCE</div>
              <div className="text-3xl font-bold">96%</div>
            </CardContent>
          </Card>
          <Card className="bg-[#2A2B5E] border-purple-500/30 text-white">
            <CardContent className="p-4">
              <div className="text-gray-300 text-sm mb-1">SCORE</div>
              <div className="text-3xl font-bold">850 pts</div>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Breakdown Card */}
        <Card className="bg-[#2A2B5E] border-purple-500/30 text-white mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Attendance Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="relative w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={attendanceBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={55}
                      paddingAngle={5}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {attendanceBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">Present</div>
                    <div className="text-lg text-white">85%</div>
                  </div>
                </div>
              </div>
              
              <div className="w-32 h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyProgressData}>
                    <Line 
                      type="monotone" 
                      dataKey="hours" 
                      stroke="#8B5CF6" 
                      strokeWidth={3}
                      dot={{ fill: '#8B5CF6', strokeWidth: 0, r: 4 }}
                    />
                    <XAxis 
                      dataKey="day" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#FFFFFF', fontSize: 12 }}
                    />
                    <YAxis hide />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="mt-4 flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-sm text-gray-300">Present</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-300">Absent</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="bg-[#2A2B5E] border-purple-500/30 text-white">
            <CardContent className="p-4 text-center">
              <div className="text-gray-300 text-sm mb-1">Current Streak</div>
              <div className="text-2xl font-bold">12 days</div>
            </CardContent>
          </Card>
          <Card className="bg-[#2A2B5E] border-purple-500/30 text-white">
            <CardContent className="p-4 text-center">
              <div className="text-gray-300 text-sm mb-1">Monthly Ranking</div>
              <div className="text-2xl font-bold">#4</div>
            </CardContent>
          </Card>
          <Card className="bg-[#2A2B5E] border-purple-500/30 text-white">
            <CardContent className="p-4 text-center">
              <div className="text-gray-300 text-sm mb-1">Achievement</div>
              <div className="flex justify-center space-x-1 mt-2">
                <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                  <Star className="w-4 h-4 text-white" />
                </div>
                <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                  <Award className="w-4 h-4 text-white" />
                </div>
                <div className="w-6 h-6 bg-yellow-600 rounded-full flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="bg-[#2A2B5E] border-purple-500/30 text-white">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-sm font-medium">{activity.time}</div>
                    <div className="text-sm text-gray-300">{activity.action}</div>
                  </div>
                  <div className="text-sm text-gray-300">{activity.day}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Test Button */}
        <div className="mt-6">
          <Button 
            onClick={() => toast({ title: "Test successful", description: "Mobile dashboard is working!" })}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            Test Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}