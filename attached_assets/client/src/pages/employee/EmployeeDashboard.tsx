import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, TrendingUp, Trophy, Bell, Star, Target, Award, LayoutDashboard, Calendar, BarChart3, LogIn, LogOut, AlertTriangle } from "lucide-react";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, RadialBarChart, RadialBar } from 'recharts';
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

// Sample data for demonstration - in production, this would come from your API
const attendanceData = [
  { name: 'Present', value: 85, color: '#8B5CF6' },
  { name: 'Late', value: 5, color: '#3B82F6' },
  { name: 'Absent', value: 10, color: '#EF4444' },
];

const weeklyHoursData = [
  { day: 'Mo', hours: 28 },
  { day: 'Tu', hours: 35 },
  { day: 'We', hours: 42 },
  { day: 'Fr', hours: 48 },
  { day: 'Su', hours: 50 },
];

const leaderboardData = [
  { name: 'Jonathan Wilson', points: 980, avatar: 'JW' },
  { name: 'Emma Davis', points: 920, avatar: 'ED' },
  { name: 'Michael Lee', points: 870, avatar: 'ML' },
  { name: 'Olivia Martin', points: 810, avatar: 'OM' },
];

const recentActivity = [
  { time: '09:15 AM', action: 'Punched In', type: 'in' },
  { time: 'Yesterday', action: 'Missed punch out', type: 'out' },
  { time: 'Monday', action: 'Punched Out 5:32 PM', type: 'out' },
  { time: 'Monday', action: 'Mobile check in 31mes', type: 'in' },
];

const diligenceData = [
  { day: 'M', late: 1, onTime: 6, overtime: 1, earlyExit: 0 }, // Late start (red), then on time (green), then overtime (blue)
  { day: 'T', late: 0, onTime: 8, overtime: 1, earlyExit: 0, gracePeriod: 0.5 }, // Grace period start (orange), then on time (green), then overtime (blue)
  { day: 'W', late: 0, onTime: 8, overtime: 0, earlyExit: 0, gracePeriod: 0 }, // On time start and end (green)
  { day: 'T', late: 0, onTime: 7, overtime: 0, earlyExit: 1, gracePeriod: 0 }, // On time start (green), early exit <2hrs (orange)
  { day: 'F', late: 0, onTime: 6, overtime: 0, earlyExit: 2, gracePeriod: 0 }, // On time start (green), early exit >2hrs (red)
  { day: 'S', late: 0, onTime: 5, overtime: 0, earlyExit: 0, gracePeriod: 0 }, // Weekend shorter hours
  { day: 'S', late: 0, onTime: 7, overtime: 0, earlyExit: 0, gracePeriod: 0 }  // Weekend normal hours
];

// Performance gauge data
const performanceData = [
  { name: 'Performance Score', value: 85, fill: '#8B5CF6' }
];

// Missed punch-outs data
const missedPunchOutsData = [
  { day: 'M', missed: 0 },
  { day: 'T', missed: 1 },
  { day: 'W', missed: 0 },
  { day: 'T', missed: 0 },
  { day: 'F', missed: 1 },
  { day: 'S', missed: 0 },
  { day: 'S', missed: 0 }
];

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [lastPunchType, setLastPunchType] = useState<'in' | 'out' | null>(null);
  const [punchInTime, setPunchInTime] = useState<Date | null>(null);
  const [showMissedAlert, setShowMissedAlert] = useState(false);

  // Fetch system configuration to check if scoring is live
  const { data: systemConfig } = useQuery({
    queryKey: ["/api/system-configuration"],
  });

  const isLiveMode = systemConfig?.configValue === "live";
  const isAdmin = user?.role === "admin";
  const showScoringContent = isLiveMode || isAdmin;
  const [missedDuration, setMissedDuration] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Timer for tracking missed punch-outs
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      
      // Check if punch-out is missed (more than 9 hours after punch-in)
      if (punchInTime) {
        const timeDiff = new Date().getTime() - punchInTime.getTime();
        const hoursWorked = timeDiff / (1000 * 60 * 60);
        
        if (hoursWorked > 9) {
          setShowMissedAlert(true);
          const hours = Math.floor(hoursWorked - 9);
          const minutes = Math.floor((hoursWorked - 9 - hours) * 60);
          setMissedDuration(`${hours}h ${minutes}m`);
        }
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [punchInTime, lastPunchType]);
  
  // Get current time string
  const currentTimeString = currentTime.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });

  // Punch in/out functions
  const handlePunchIn = async () => {
    setIsLoading(true);
    setLastPunchType('in');
    
    try {
      const response = await fetch('/api/attendance/punch-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          location: 'Employee Portal',
          source: 'web'
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setPunchInTime(new Date());
        setShowMissedAlert(false);
        setLastPunchType('in');
        toast({
          title: "Punch In Successful",
          description: "Your work session has started.",
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to punch in",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setLastPunchType(null);
    }
  };

  const handlePunchOut = async () => {
    setIsLoading(true);
    setLastPunchType('out');
    
    try {
      const response = await fetch('/api/attendance/punch-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          location: 'Employee Portal',
          source: 'web'
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setPunchInTime(null);
        setShowMissedAlert(false);
        setMissedDuration('');
        setLastPunchType('out');
        toast({
          title: "Punch Out Successful",
          description: "Your work session has ended.",
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to punch out",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setLastPunchType(null);
    }
  };

  // Test function to simulate missed punch-out (for demonstration)
  const testMissedPunchOut = () => {
    setPunchInTime(new Date(Date.now() - 10 * 60 * 60 * 1000)); // 10 hours ago
    setShowMissedAlert(true);
    setMissedDuration('1h 15m');
    setLastPunchType('in');
  };
  
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });

  // Mock user data - in production, fetch from API
  const userData = {
    name: user?.username || 'Employee',
    role: 'Senior Developer',
    hoursThisWeek: 42,
    attendanceRate: 96,
    gamificationScore: 850,
    avatar: user?.username?.charAt(0)?.toUpperCase() || 'E'
  };

  return (
    <div className="h-screen bg-[#1A1B3E] overflow-hidden">
      {/* Main Content */}
      <div className="h-full p-4 md:p-8 overflow-auto">
        
        {/* Top Header with Punch Buttons */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Employee Dashboard</h1>
          <div className="flex gap-3">
            <Button
              onClick={handlePunchIn}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              {isLoading && lastPunchType === 'in' ? 'Punching In...' : 'Punch In'}
            </Button>
            <Button
              onClick={handlePunchOut}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              {isLoading && lastPunchType === 'out' ? 'Punching Out...' : 'Punch Out'}
            </Button>
            <Button
              onClick={testMissedPunchOut}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              Test Alert
            </Button>
          </div>
        </div>
        
        {/* Missed Punch-Out Alert */}
        {showMissedAlert && (
          <Alert className="mb-4 bg-red-900/20 border-red-500/50 text-red-300">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="font-medium">
              Punch-out missed! You've been working for over 9 hours. Duration: {missedDuration}
            </AlertDescription>
          </Alert>
        )}

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          <Card className="bg-[#2A2B5E] border-[#3A3B6E] text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-300 text-sm font-medium">HOURS THIS WEEK</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{userData.hoursThisWeek}h</div>
            </CardContent>
          </Card>

          <Card className="bg-[#2A2B5E] border-[#3A3B6E] text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-300 text-sm font-medium">ATTENDANCE RATE</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{userData.attendanceRate}%</div>
            </CardContent>
          </Card>

          {/* Status Box with Time and Date */}
          <Card className={`bg-[#2A2B5E] text-white transition-all duration-300 ${
            showMissedAlert 
              ? 'border-red-500 border-4 alert-blink' 
              : 'border-green-500 border-2'
          }`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-300 text-sm font-medium">
                {showMissedAlert ? 'PUNCH OUT MISSED' : 'STATUS'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className={`text-lg font-bold ${showMissedAlert ? 'text-red-400' : 'text-green-400'}`}>
                  {showMissedAlert ? `MISSED ${missedDuration}` : 'STATUS OK'}
                </div>
                <div className="text-sm text-gray-300">
                  {currentTimeString}
                </div>
                <div className="text-xs text-gray-400">
                  {currentDate}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Gauge and Missed Punch-Outs */}
        <div className={`grid grid-cols-1 ${showScoringContent ? 'md:grid-cols-2' : ''} gap-4 md:gap-6 mb-6 md:mb-8`}>
          {/* Performance Gauge - Only show if scoring is enabled */}
          {showScoringContent && (
            <Card className="bg-[#2A2B5E] border-[#3A3B6E] text-white">
              <CardHeader>
                <CardTitle className="text-white text-lg">Performance Score</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="relative w-32 h-32 md:w-40 md:h-40 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={performanceData}>
                      <RadialBar dataKey="value" cornerRadius={10} fill="#8B5CF6" />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-white text-2xl md:text-3xl font-bold">85%</div>
                      <div className="text-gray-300 text-xs md:text-sm">Overall</div>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-gray-300 text-sm">Based on attendance & punctuality</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Missed Punch-Outs */}
          <Card className="bg-[#2A2B5E] border-[#3A3B6E] text-white">
            <CardHeader>
              <CardTitle className="text-white text-lg">Missed Punch-Outs (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={missedPunchOutsData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis 
                    dataKey="day" 
                    axisLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                    tickLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                    tickLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    domain={[0, 3]}
                  />
                  <Bar dataKey="missed" fill="#EF4444" />
                </BarChart>
              </ResponsiveContainer>
              <div className="text-center text-gray-300 text-sm mt-2">
                Total missed: {missedPunchOutsData.reduce((sum, day) => sum + day.missed, 0)} this week
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 h-auto md:h-[calc(100vh-280px)]">
          {/* Left Column - Attendance Charts */}
          <div className="md:col-span-4 space-y-4 md:space-y-6">
            {/* Attendance Breakdown */}
            <Card className="bg-[#2A2B5E] border-[#3A3B6E] text-white">
              <CardHeader>
                <CardTitle className="text-white text-lg">Attendance Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="relative w-32 h-32 md:w-40 md:h-40 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={attendanceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={64}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {attendanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-white text-xs md:text-sm font-medium">Present</div>
                      <div className="text-white text-xl md:text-2xl font-bold">85%</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-[#8B5CF6]"></div>
                    <span className="text-gray-300">Present</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-[#3B82F6]"></div>
                    <span className="text-gray-300">Late</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-[#EF4444]"></div>
                    <span className="text-gray-300">Absent</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Diligence Chart */}
            <Card className="bg-[#2A2B5E] border-[#3A3B6E] text-white">
              <CardHeader>
                <CardTitle className="text-white text-lg">Diligence (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={diligenceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <XAxis 
                      dataKey="day" 
                      axisLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                      tickLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                      tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    />
                    <YAxis 
                      axisLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                      tickLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                      tick={{ fill: '#9CA3AF', fontSize: 12 }}
                      domain={[0, 10]}
                      label={{ value: 'Work Hours', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#9CA3AF' } }}
                    />
                    <Bar dataKey="late" stackId="a" fill="#EF4444" />
                    <Bar dataKey="gracePeriod" stackId="a" fill="#F59E0B" />
                    <Bar dataKey="onTime" stackId="a" fill="#10B981" />
                    <Bar dataKey="overtime" stackId="a" fill="#3B82F6" />
                    <Bar dataKey="earlyExit" stackId="a" fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center space-x-2 text-xs mt-2">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-[#EF4444]"></div>
                    <span className="text-gray-300">Late/Early</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-[#F59E0B]"></div>
                    <span className="text-gray-300">Grace</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-[#10B981]"></div>
                    <span className="text-gray-300">On Time</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-[#3B82F6]"></div>
                    <span className="text-gray-300">Overtime</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Weekly Hours Chart */}
          <Card className="md:col-span-4 bg-[#2A2B5E] border-[#3A3B6E] text-white">
            <CardHeader>
              <CardTitle className="text-white text-lg">Weekly Hours</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <div className="w-full max-w-md">
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={weeklyHoursData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <XAxis 
                      dataKey="day" 
                      axisLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                      tickLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                      tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    />
                    <YAxis 
                      axisLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                      tickLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                      tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="hours" 
                      stroke="#8B5CF6" 
                      strokeWidth={3}
                      dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Leaderboard and Recent Activity */}
          <div className="md:col-span-4 space-y-4 md:space-y-6">
            {/* Monthly Leaderboard - Only show if scoring is enabled */}
            {showScoringContent && (
              <Card className="bg-[#2A2B5E] border-[#3A3B6E] text-white">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Monthly Leaderboard</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {leaderboardData.map((person, index) => (
                      <div key={index} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-[#3A3B7E] transition-colors">
                        {/* Rank Badge */}
                        <div className="relative">
                          {index === 0 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-xs font-bold text-white z-10">
                              🏆
                            </div>
                          )}
                          {index === 1 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-gray-300 to-gray-500 rounded-full flex items-center justify-center text-xs font-bold text-white z-10">
                              🥈
                            </div>
                          )}
                          {index === 2 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-amber-600 to-amber-800 rounded-full flex items-center justify-center text-xs font-bold text-white z-10">
                              🥉
                            </div>
                          )}
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className={`${
                              index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                              index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-500' :
                              index === 2 ? 'bg-gradient-to-r from-amber-600 to-amber-800' :
                              'bg-gradient-to-r from-purple-500 to-blue-500'
                            } text-white text-xs font-bold`}>
                              {person.avatar}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        
                        <div className="flex-1">
                          <div className={`font-medium text-sm ${
                            index === 0 ? 'text-yellow-300' :
                            index === 1 ? 'text-gray-300' :
                            index === 2 ? 'text-amber-300' :
                            'text-white'
                          }`}>
                            {person.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            #{index + 1} Place
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className={`font-bold text-sm ${
                            index === 0 ? 'text-yellow-300' :
                            index === 1 ? 'text-gray-300' :
                            index === 2 ? 'text-amber-300' :
                            'text-white'
                          }`}>
                            {person.points}
                          </div>
                          <div className="text-xs text-gray-400">pts</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Coming Soon Message for Development Mode */}
            {!showScoringContent && (
              <Card className="bg-[#2A2B5E] border-[#3A3B6E] text-white">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Performance Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold text-white mb-2">Coming Soon!</h3>
                    <p className="text-gray-300 text-sm">
                      Performance scores, leaderboards, and analytics will be available once the system goes live.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Activity */}
            <Card className="bg-[#2A2B5E] border-[#3A3B6E] text-white">
              <CardHeader>
                <CardTitle className="text-white text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-gray-300 text-sm">{activity.time}</div>
                        <div className="text-white text-sm">{activity.action}</div>
                      </div>
                      {activity.type === 'out' && activity.action.includes('Missed') && (
                        <Badge variant="destructive" className="bg-red-500/20 text-red-300 border-red-500/30 text-xs">
                          Missed
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
      </div>
    </div>
  );
}