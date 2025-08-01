import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Crown, Medal, Award, TrendingUp, Clock, Target, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface LeaderboardEntry {
  rank: number;
  employeeCode: string;
  name: string;
  department: string;
  attendanceScore: number;
  streak: number;
  totalHours: string;
  level: number;
  progress: number;
}

interface Achievement {
  id: string;
  name: string;
  type: 'gold' | 'silver' | 'bronze' | 'platinum';
  earned: boolean;
}

// Mock data for demonstration
const mockLeaderboardData: LeaderboardEntry[] = [
  {
    rank: 1,
    employeeCode: "EMP001",
    name: "Jonathan Wilson",
    department: "Senior",
    attendanceScore: 47.738,
    streak: 53,
    totalHours: "450g",
    level: 6,
    progress: 75
  },
  {
    rank: 2,
    employeeCode: "EMP002", 
    name: "Emma Davis",
    department: "Dochoeten",
    attendanceScore: 35.487,
    streak: 45,
    totalHours: "150g",
    level: 5,
    progress: 60
  },
  {
    rank: 3,
    employeeCode: "EMP003",
    name: "Michael Lee",
    department: "Assisdata",
    attendanceScore: 33.142,
    streak: 45,
    totalHours: "100g",
    level: 4,
    progress: 80
  },
  {
    rank: 4,
    employeeCode: "EMP004",
    name: "John Lee",
    department: "Accounting",
    attendanceScore: 28.822,
    streak: 31,
    totalHours: "8g",
    level: 3,
    progress: 45
  },
  {
    rank: 5,
    employeeCode: "EMP005",
    name: "Olivia Martin",
    department: "Johung",
    attendanceScore: 25.503,
    streak: 30,
    totalHours: "2g",
    level: 3,
    progress: 30
  },
  {
    rank: 6,
    employeeCode: "EMP006",
    name: "Max Smith",
    department: "Marketing",
    attendanceScore: 22.402,
    streak: 26,
    totalHours: "150",
    level: 2,
    progress: 65
  },
  {
    rank: 7,
    employeeCode: "EMP007",
    name: "Andre Lee",
    department: "Olivia",
    attendanceScore: 21.758,
    streak: 22,
    totalHours: "12",
    level: 2,
    progress: 40
  }
];

const mockAchievements: Achievement[] = [
  { id: "1", name: "Perfect Attendance", type: "gold", earned: true },
  { id: "2", name: "Early Bird", type: "silver", earned: true },
  { id: "3", name: "Team Player", type: "bronze", earned: true },
  { id: "4", name: "Consistency Master", type: "platinum", earned: false }
];

const departmentStats = [
  { name: 'HR', value: 85 },
  { name: 'Sales', value: 78 },
  { name: 'Development', value: 92 },
  { name: 'Marketing', value: 88 },
  { name: 'Support', value: 81 }
];

const monthlyTrends = [
  { day: 1, score: 65 },
  { day: 3, score: 72 },
  { day: 8, score: 78 },
  { day: 13, score: 85 },
  { day: 19, score: 88 },
  { day: 23, score: 92 },
  { day: 31, score: 95 }
];

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="h-5 w-5 text-yellow-500" />;
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />;
    case 3:
      return <Award className="h-5 w-5 text-amber-600" />;
    default:
      return null;
  }
};

const getRankBadgeColor = (rank: number) => {
  switch (rank) {
    case 1:
      return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white";
    case 2:
      return "bg-gradient-to-r from-gray-300 to-gray-500 text-white";
    case 3:
      return "bg-gradient-to-r from-amber-400 to-amber-600 text-white";
    default:
      return "bg-gradient-to-r from-blue-500 to-purple-600 text-white";
  }
};

const getAchievementBadgeColor = (type: Achievement['type'], earned: boolean) => {
  if (!earned) return "bg-gray-200 text-gray-500";
  
  switch (type) {
    case 'platinum':
      return "bg-gradient-to-r from-purple-400 to-pink-400 text-white";
    case 'gold':
      return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white";
    case 'silver':
      return "bg-gradient-to-r from-gray-300 to-gray-500 text-white";
    case 'bronze':
      return "bg-gradient-to-r from-amber-400 to-amber-600 text-white";
    default:
      return "bg-gray-200 text-gray-700";
  }
};

export default function Leaderboard() {
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("this-month");

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1B3E] to-[#2A2B5E] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Monthly Leaderboard - April 2024
            </h1>
            <p className="text-gray-300">Track performance and achievements across teams</p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-48 bg-[#2A2B5E] border-gray-600 text-white">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="senior">Senior</SelectItem>
                <SelectItem value="accounting">Accounting</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="bg-[#2A2B5E] border-gray-600 text-white hover:bg-[#3A3B6E]">
              {selectedPeriod === "this-month" ? "This Month" : "Custom Range"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Main Leaderboard */}
          <div className="col-span-8">
            <Card className="bg-[#2A2B5E] border-gray-600">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Ranking Table
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-600">
                        <th className="text-left py-4 px-2 text-gray-300 font-medium">RANK</th>
                        <th className="text-left py-4 px-2 text-gray-300 font-medium">EMPLOYEE</th>
                        <th className="text-left py-4 px-2 text-gray-300 font-medium">DEPARTMENT</th>
                        <th className="text-left py-4 px-2 text-gray-300 font-medium">ATTENDANCE SCORE</th>
                        <th className="text-left py-4 px-2 text-gray-300 font-medium">STREAK</th>
                        <th className="text-left py-4 px-2 text-gray-300 font-medium">TOTAL HOURS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockLeaderboardData.map((entry) => (
                        <tr key={entry.employeeCode} className={`border-b border-gray-700 hover:bg-[#3A3B6E] transition-colors ${entry.rank <= 3 ? 'bg-gradient-to-r from-[#3A3B6E]/30 to-transparent' : ''}`}>
                          <td className="py-4 px-2">
                            <div className="flex items-center gap-2">
                              <Badge className={`${getRankBadgeColor(entry.rank)} min-w-[32px] h-8 flex items-center justify-center text-sm font-bold`}>
                                {entry.rank}
                              </Badge>
                              {getRankIcon(entry.rank)}
                            </div>
                          </td>
                          <td className="py-4 px-2">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                                  {entry.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-white">{entry.name}</div>
                                <div className="text-sm text-gray-400">{entry.employeeCode}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-2 text-gray-300">{entry.department}</td>
                          <td className="py-4 px-2">
                            <div className="text-white font-semibold">{entry.attendanceScore.toLocaleString()}</div>
                          </td>
                          <td className="py-4 px-2">
                            <Badge variant="outline" className="text-green-400 border-green-400 bg-green-400/10">
                              {entry.streak} days
                            </Badge>
                          </td>
                          <td className="py-4 px-2 text-white font-medium">{entry.totalHours}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Team Statistics */}
            <Card className="bg-[#2A2B5E] border-gray-600 mt-6">
              <CardHeader>
                <CardTitle className="text-white">Team Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-8">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-2">85%</div>
                    <div className="text-gray-400">Attendance Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-2">300h</div>
                    <div className="text-gray-400">Total Hours</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-2">8 day</div>
                    <div className="text-gray-400">Streak</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Department Comparison */}
            <Card className="bg-[#2A2B5E] border-gray-600 mt-6">
              <CardHeader>
                <CardTitle className="text-white">Department Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={departmentStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#374151', 
                        border: 'none', 
                        borderRadius: '8px',
                        color: '#white'
                      }} 
                    />
                    <Bar dataKey="value" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8B5CF6" />
                        <stop offset="100%" stopColor="#3B82F6" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="col-span-4 space-y-6">
            {/* Personal Achievements */}
            <Card className="bg-[#2A2B5E] border-gray-600">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Personal Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                      6
                    </div>
                    <div>
                      <div className="text-white font-semibold">Level 6</div>
                      <Progress value={75} className="w-20 h-2 mt-1" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {mockAchievements.map((achievement) => (
                      <Badge
                        key={achievement.id}
                        className={`${getAchievementBadgeColor(achievement.type, achievement.earned)} p-2 text-xs text-center justify-center`}
                      >
                        {achievement.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Challenges */}
            <Card className="bg-[#2A2B5E] border-gray-600">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Upcoming Challenges
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-green-400" />
                    </div>
                    <div>
                      <div className="text-white text-sm font-medium">Attendance Streak</div>
                      <div className="text-gray-400 text-xs">of % days</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Point Breakdown */}
            <Card className="bg-[#2A2B5E] border-gray-600">
              <CardHeader>
                <CardTitle className="text-white">Point Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Attendance</span>
                    <span className="text-white font-semibold">500 pt</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Punctuality</span>
                    <span className="text-white font-semibold">200 pt</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Overtime</span>
                    <span className="text-white font-semibold">130 pt</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Trends */}
            <Card className="bg-[#2A2B5E] border-gray-600">
              <CardHeader>
                <CardTitle className="text-white">Monthly Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="day" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#374151', 
                        border: 'none', 
                        borderRadius: '8px',
                        color: '#white'
                      }} 
                    />
                    <Line type="monotone" dataKey="score" stroke="#8B5CF6" strokeWidth={3} dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}