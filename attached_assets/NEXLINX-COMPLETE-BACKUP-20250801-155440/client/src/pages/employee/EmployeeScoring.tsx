import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Trophy, 
  Award, 
  Star, 
  TrendingUp, 
  Calendar, 
  Clock, 
  Target, 
  Medal,
  Crown,
  Zap,
  MapPin,
  Users,
  Gift,
  CheckCircle,
  Download
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

const COLORS = ['#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];

export default function EmployeeScoring() {
  const { user } = useAuth();
  
  // Use real employee data - using employee code 10090632 (Mujahid Ali)
  const employeeCode = user?.employeeCode || '10090632';
  
  const { data: employeeData, isLoading } = useQuery({
    queryKey: ['/api/employee-scoring/scoring', employeeCode],
    enabled: !!employeeCode,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] text-white p-4 md:p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading scoring data...</p>
        </div>
      </div>
    );
  }

  if (!employeeData) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] text-white p-4 md:p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-2">Failed to load scoring data</p>
          <p className="text-gray-400 text-sm">Please try again later</p>
        </div>
      </div>
    );
  }

  const progressPercentage = (employeeData.currentPoints / employeeData.monthlyGoal) * 100;
  const rankPercentage = ((employeeData.totalEmployees - employeeData.rank) / employeeData.totalEmployees) * 100;

  return (
    <div className="min-h-screen bg-[#1A1B3E] text-white p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">My Scoring Dashboard</h1>
        <p className="text-gray-400">Track your attendance points and performance</p>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-[#2A2B5E] border-[#3A3B6E]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Current Points</p>
                <p className="text-2xl font-bold text-white">{employeeData.currentPoints}</p>
                <p className="text-xs text-green-400">+23 from last week</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#2A2B5E] border-[#3A3B6E]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Monthly Goal</p>
                <p className="text-2xl font-bold text-white">{employeeData.monthlyGoal}</p>
                <Progress value={progressPercentage} className="mt-2 h-2" />
              </div>
              <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                <Target className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#2A2B5E] border-[#3A3B6E]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">My Rank</p>
                <p className="text-2xl font-bold text-white">#{employeeData.rank}</p>
                <p className="text-xs text-purple-400">Top {Math.round(rankPercentage)}%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <Medal className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#2A2B5E] border-[#3A3B6E]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Streak Days</p>
                <p className="text-2xl font-bold text-white">{employeeData.streakDays}</p>
                <p className="text-xs text-orange-400">Current streak</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
                <Zap className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Weekly Progress */}
        <Card className="bg-[#2A2B5E] border-[#3A3B6E]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Weekly Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={employeeData.weeklyProgress}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="day" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }} 
                />
                <Bar dataKey="points" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="target" fill="#374151" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Points Breakdown */}
        <Card className="bg-[#2A2B5E] border-[#3A3B6E]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Points Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={employeeData.pointsBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="points"
                >
                  {employeeData.pointsBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {employeeData.pointsBreakdown.map((item, index) => (
                <div key={item.category} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-gray-300">{item.category}</span>
                  <span className="text-sm font-semibold text-white">{item.points}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Badges and Monthly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Achievement Badges */}
        <Card className="bg-[#2A2B5E] border-[#3A3B6E]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Award className="h-5 w-5" />
              Achievement Badges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {employeeData.badges.map((badge, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-lg border-2 ${
                    badge.earned 
                      ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30' 
                      : 'bg-gray-500/10 border-gray-500/30'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">{badge.icon}</div>
                    <div className="text-sm font-medium text-white">{badge.name}</div>
                    <div className="text-xs text-gray-400 mt-1">+{badge.points} points</div>
                    {badge.earned && (
                      <Badge className="mt-2 bg-green-500 text-white">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Earned
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card className="bg-[#2A2B5E] border-[#3A3B6E]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={employeeData.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="points" 
                  stroke="#8B5CF6" 
                  strokeWidth={3}
                  dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Point Rules Reference */}
      <Card className="bg-[#2A2B5E] border-[#3A3B6E] mb-6">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Star className="h-5 w-5" />
            Point System Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-white">Daily Points</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-400">Early (10+ min)</span>
                  <span className="text-white">+10 pts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-400">On Time</span>
                  <span className="text-white">+8 pts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-400">Late (up to 30 min)</span>
                  <span className="text-white">+5 pts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-400">Very Late</span>
                  <span className="text-white">+1 pt</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-white">Location Tracking</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-purple-400">8+ Hours</span>
                  <span className="text-white">+5 pts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-400">16+ Hours</span>
                  <span className="text-white">+10 pts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-400">24 Hours</span>
                  <span className="text-white">+15 pts</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-white">Streak Bonuses</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-yellow-400">7 Days</span>
                  <span className="text-white">+20 pts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-400">14 Days</span>
                  <span className="text-white">+40 pts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-400">30 Days</span>
                  <span className="text-white">+100 pts</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white flex-1">
          <Download className="h-4 w-4 mr-2" />
          Download Monthly Report
        </Button>
        <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700 flex-1">
          <Trophy className="h-4 w-4 mr-2" />
          View Full Leaderboard
        </Button>
      </div>
    </div>
  );
}