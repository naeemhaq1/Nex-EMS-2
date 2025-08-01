import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Trophy, 
  Medal, 
  Award, 
  Target, 
  TrendingUp, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Settings,
  Star,
  Crown,
  Zap,
  Activity,
  BarChart3,
  Download,
  Edit,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  PlayCircle,
  PauseCircle,
  RefreshCw
} from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ScoringData {
  employeeId: string;
  employeeName: string;
  department: string;
  monthlyPoints: number;
  yearlyAverage: number;
  rank: number;
  streakDays: number;
  earlyDays: number;
  overtimeHours: number;
  locationPoints: number;
  totalBonuses: number;
  lastUpdated: string;
}

interface MonthlyLeaderboard {
  rank: number;
  employeeName: string;
  department: string;
  points: number;
  bonus: string;
  badge: string;
}

interface ScoringRules {
  earlyPoints: number;
  onTimePoints: number;
  latePoints: number;
  veryLatePoints: number;
  overtimeBonus: number;
  earlyLeaveDeduction: number;
  locationPoints8h: number;
  locationPoints16h: number;
  locationPoints24h: number;
  streakBonus: { days: string; bonus: number }[];
  monthlyBonuses: { condition: string; points: number }[];
}

export default function ScoringSystem() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isEditing, setIsEditing] = useState(false);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: systemStatus } = useQuery({
    queryKey: ["/api/scoring/system-status"],
    queryFn: async () => {
      const response = await fetch("/api/scoring/system-status");
      return response.json();
    },
  });

  const { data: rulesData, isLoading: rulesLoading } = useQuery({
    queryKey: ["/api/scoring/rules"],
    queryFn: async () => {
      const response = await fetch("/api/scoring/rules");
      return response.json();
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ["/api/scoring/stats"],
    queryFn: async () => {
      const response = await fetch("/api/scoring/stats");
      return response.json();
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/scoring/rules", {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scoring/rules"] });
      toast({
        title: "Success",
        description: "Scoring rules updated successfully",
      });
      setIsEditing(false);
      setEditingRule(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update scoring rules",
        variant: "destructive",
      });
    },
  });

  const toggleSystemMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      return apiRequest("/api/scoring/system-toggle", {
        method: "POST",
        body: JSON.stringify({ enabled }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scoring/system-status"] });
      toast({
        title: "Success",
        description: "Scoring system status updated",
      });
    },
  });

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <Badge className="bg-purple-500 text-white"><Crown className="w-3 h-3 mr-1" />1st Place</Badge>;
      case 2:
        return <Badge className="bg-blue-400 text-white"><Medal className="w-3 h-3 mr-1" />2nd Place</Badge>;
      case 3:
        return <Badge className="bg-indigo-500 text-white"><Award className="w-3 h-3 mr-1" />3rd Place</Badge>;
      default:
        return <Badge className="bg-slate-600 text-white">#{rank}</Badge>;
    }
  };

  const getRewardBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <Badge className="bg-green-600 text-white">15% Bonus</Badge>;
      case 2:
        return <Badge className="bg-blue-600 text-white">10% Bonus</Badge>;
      case 3:
        return <Badge className="bg-purple-600 text-white">5% Bonus</Badge>;
      default:
        return <Badge className="bg-gray-600 text-white">No Bonus</Badge>;
    }
  };

  const mockLeaderboard: MonthlyLeaderboard[] = [
    { rank: 1, employeeName: "Ahmed Hassan", department: "LHE-OFC", points: 947, bonus: "15%", badge: "champion" },
    { rank: 2, employeeName: "Sarah Khan", department: "FSD", points: 914, bonus: "10%", badge: "strong" },
    { rank: 3, employeeName: "Ali Raza", department: "LHE-Safecity", points: 816, bonus: "5%", badge: "competitive" },
    { rank: 4, employeeName: "Fatima Sheikh", department: "PSH", points: 784, bonus: "0%", badge: "good" },
    { rank: 5, employeeName: "Omar Malik", department: "ISB", points: 756, bonus: "0%", badge: "good" },
  ];

  const mockTrends = [
    { month: "Jan", avgPoints: 720, participants: 310 },
    { month: "Feb", avgPoints: 735, participants: 315 },
    { month: "Mar", avgPoints: 748, participants: 318 },
    { month: "Apr", avgPoints: 762, participants: 320 },
    { month: "May", avgPoints: 771, participants: 322 },
    { month: "Jun", avgPoints: 785, participants: 322 },
    { month: "Jul", avgPoints: 792, participants: 322 },
  ];

  const mockRules: ScoringRules = {
    earlyPoints: 22,
    onTimePoints: 18,
    latePoints: 13,
    veryLatePoints: 4,
    overtimeBonus: 8,
    earlyLeaveDeduction: -4,
    locationPoints8h: 2,
    locationPoints16h: 4,
    locationPoints24h: 6,
    streakBonus: [
      { days: "10-15 days", bonus: 15 },
      { days: "16-20 days", bonus: 30 },
      { days: "21+ days", bonus: 50 },
    ],
    monthlyBonuses: [
      { condition: "Come Early 15+ Days", points: 25 },
      { condition: "Work Extra 20+ Hours", points: 30 },
      { condition: "Perfect Month (26 Days)", points: 40 },
      { condition: "Use App with Location", points: 15 },
    ],
  };

  return (
    <div className="min-h-screen bg-[#1A1B3E] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Attendance Scoring System
            </h1>
            <p className="text-slate-300 mt-1">Management Dashboard for Points & Rewards System</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Label htmlFor="system-toggle" className="text-white">System Status</Label>
              <Switch 
                id="system-toggle" 
                checked={systemStatus?.enabled || false}
                onCheckedChange={(checked) => toggleSystemMutation.mutate(checked)}
              />
              <Badge className={`${systemStatus?.enabled ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                {systemStatus?.enabled ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0">
              <RefreshCw className="w-4 h-4 mr-2" />
              Recalculate
            </Button>
          </div>
        </div>

        {/* System Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-[#2A2B5E] border-[#4A4B7E] overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-300">System Status</p>
                  <p className="text-2xl font-bold text-white">
                    {systemStatus?.enabled ? 'Active' : 'Inactive'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {systemStatus?.enabled ? 'Points being calculated' : 'System paused'}
                  </p>
                </div>
                <div className={`h-12 w-12 rounded-full ${systemStatus?.enabled ? 'bg-green-500' : 'bg-red-500'} flex items-center justify-center`}>
                  {systemStatus?.enabled ? <PlayCircle className="h-6 w-6 text-white" /> : <PauseCircle className="h-6 w-6 text-white" />}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#2A2B5E] border-[#4A4B7E] overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-300">Total Participants</p>
                  <p className="text-2xl font-bold text-white">322</p>
                  <p className="text-xs text-slate-400 mt-1">Active employees</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#2A2B5E] border-[#4A4B7E] overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-300">Monthly Target</p>
                  <p className="text-2xl font-bold text-purple-400">700+</p>
                  <p className="text-xs text-slate-400 mt-1">Points required</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <Target className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#2A2B5E] border-[#4A4B7E] overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-300">Rules Updated</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {rulesData?.lastUpdated ? 'Today' : 'Never'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Configuration status</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <Settings className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="configuration" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-[#2A2B5E] border-[#4A4B7E]">
            <TabsTrigger value="configuration" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white">
              <Settings className="w-4 h-4 mr-2" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="rules" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white">
              <Edit className="w-4 h-4 mr-2" />
              Point Rules
            </TabsTrigger>
            <TabsTrigger value="rewards" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white">
              <Trophy className="w-4 h-4 mr-2" />
              Rewards
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white">
              <Activity className="w-4 h-4 mr-2" />
              Monitoring
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4 mr-2" />
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="configuration" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* System Configuration */}
              <Card className="bg-[#2A2B5E] border-[#4A4B7E]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    System Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white font-medium">Enable Scoring System</Label>
                      <p className="text-sm text-slate-300">Turn on/off the entire scoring system</p>
                    </div>
                    <Switch 
                      checked={systemStatus?.enabled || false}
                      onCheckedChange={(checked) => toggleSystemMutation.mutate(checked)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-white font-medium">Monthly Target Points</Label>
                    <Input 
                      type="number"
                      defaultValue="700"
                      className="bg-[#1A1B3E] border-[#4A4B7E] text-white"
                    />
                    <p className="text-xs text-slate-300">Minimum points to be eligible for rewards</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white font-medium">Maximum Points Cap</Label>
                    <Input 
                      type="number"
                      defaultValue="1000"
                      className="bg-[#1A1B3E] border-[#4A4B7E] text-white"
                    />
                    <p className="text-xs text-slate-300">Maximum points an employee can earn per month</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white font-medium">Calculation Period</Label>
                    <select className="w-full bg-[#1A1B3E] border-[#4A4B7E] text-white px-3 py-2 rounded-md">
                      <option value="monthly">Monthly Reset</option>
                      <option value="quarterly">Quarterly Reset</option>
                      <option value="yearly">Yearly Reset</option>
                    </select>
                  </div>

                  <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
                    <Save className="w-4 h-4 mr-2" />
                    Save Configuration
                  </Button>
                </CardContent>
              </Card>

              {/* Trial System Warning */}
              <Card className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-purple-500/50">
                <CardHeader>
                  <CardTitle className="text-purple-400 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Trial System Notice
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-white">
                    <p className="text-sm">
                      This is a trial attendance scoring system. Management reserves the right to revise, 
                      modify, or discontinue any aspect of this program at any time without prior notice.
                    </p>
                    <div className="bg-purple-500/10 p-3 rounded-lg">
                      <h4 className="font-medium text-purple-400 mb-2">Key Features:</h4>
                      <ul className="text-sm space-y-1">
                        <li>• 6 Days work week</li>
                        <li>• 700+ Points monthly target</li>
                        <li>• 1000 Points maximum</li>
                        <li>• Monthly points reset</li>
                        <li>• Annual prizes based on average</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="bg-[#2A2B5E] border-[#4A4B7E]">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Recalculate All Points
                  </Button>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Download className="w-4 h-4 mr-2" />
                    Export Monthly Report
                  </Button>
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset Monthly Points
                  </Button>
                  <Button className="bg-red-600 hover:bg-red-700 text-white">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Daily Points */}
            <Card className="bg-[#2A2B5E] border-[#4A4B7E]">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Daily Points System
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
                    <span className="text-green-400 font-medium">Early (10+ min)</span>
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">+{mockRules.earlyPoints} pts</Badge>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg border border-blue-500/20">
                    <span className="text-blue-400 font-medium">On Time</span>
                    <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0">+{mockRules.onTimePoints} pts</Badge>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-lg border border-purple-500/20">
                    <span className="text-purple-400 font-medium">Late (up to 30 min)</span>
                    <Badge className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-0">+{mockRules.latePoints} pts</Badge>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-red-500/10 to-pink-500/10 rounded-lg border border-red-500/20">
                    <span className="text-red-400 font-medium">Very Late</span>
                    <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white border-0">+{mockRules.veryLatePoints} pts</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location Tracking */}
            <Card className="bg-[#2A2B5E] border-[#4A4B7E]">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  24/7 Location Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-lg border border-purple-500/20">
                    <span className="text-purple-400 font-medium">8+ Hours</span>
                    <Badge className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-0">+{mockRules.locationPoints8h} pts</Badge>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-lg border border-purple-500/20">
                    <span className="text-purple-400 font-medium">16+ Hours</span>
                    <Badge className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-0">+{mockRules.locationPoints16h} pts</Badge>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-lg border border-purple-500/20">
                    <span className="text-purple-400 font-medium">24 Hours</span>
                    <Badge className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-0">+{mockRules.locationPoints24h} pts</Badge>
                  </div>
                  <div className="text-xs text-slate-300 mt-2">
                    Up to 156 extra points per month!
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Streak Bonuses */}
            <Card className="border-[#4A4B7E] bg-[#2A2B5E]">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Streak Bonuses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockRules.streakBonus.map((streak, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <span className="text-purple-400 font-medium">{streak.days}</span>
                      <Badge className="bg-purple-500 text-white">+{streak.bonus} pts</Badge>
                    </div>
                  ))}
                  <div className="text-xs text-slate-300 mt-2">
                    Maximum 50 points per month
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Bonuses */}
            <Card className="border-slate-700 bg-[#2A2B5E]">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Monthly Bonuses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockRules.monthlyBonuses.map((bonus, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                      <span className="text-indigo-400 font-medium text-sm">{bonus.condition}</span>
                      <Badge className="bg-indigo-500 text-white">+{bonus.points} pts</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-slate-700 bg-[#2A2B5E]">
              <CardHeader>
                <CardTitle className="text-white">Monthly Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mockTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="month" stroke="#9CA3AF" />
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
                        dataKey="avgPoints" 
                        stroke="#10B981" 
                        strokeWidth={2}
                        name="Average Points"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-700 bg-[#2A2B5E]">
              <CardHeader>
                <CardTitle className="text-white">Participation Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mockTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="month" stroke="#9CA3AF" />
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
                      <Bar dataKey="participants" fill="#3B82F6" name="Participants" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-slate-700 bg-[#2A2B5E]">
              <CardHeader>
                <CardTitle className="text-white">Monthly Rewards</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                    <div className="flex items-center gap-3">
                      <Crown className="w-6 h-6 text-yellow-500" />
                      <span className="text-yellow-400 font-medium">1st Place</span>
                    </div>
                    <Badge className="bg-yellow-500 text-white">15% Salary Bonus</Badge>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-500/10 rounded-lg border border-gray-500/20">
                    <div className="flex items-center gap-3">
                      <Medal className="w-6 h-6 text-gray-400" />
                      <span className="text-gray-400 font-medium">2nd Place</span>
                    </div>
                    <Badge className="bg-gray-500 text-white">10% Salary Bonus</Badge>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                    <div className="flex items-center gap-3">
                      <Award className="w-6 h-6 text-orange-500" />
                      <span className="text-orange-400 font-medium">3rd Place</span>
                    </div>
                    <Badge className="bg-orange-500 text-white">5% Salary Bonus</Badge>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-slate-500/10 rounded-lg border border-slate-500/20">
                    <div className="flex items-center gap-3">
                      <Users className="w-6 h-6 text-slate-400" />
                      <span className="text-slate-400 font-medium">Others</span>
                    </div>
                    <Badge className="bg-slate-500 text-white">No Bonus</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-700 bg-[#2A2B5E]">
              <CardHeader>
                <CardTitle className="text-white">Annual Prizes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                    <span className="text-green-400 font-medium">Best Average Score</span>
                    <Badge className="bg-green-500 text-white">3 Months Salary</Badge>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <span className="text-blue-400 font-medium">Second Best Average</span>
                    <Badge className="bg-blue-500 text-white">2 Months Salary</Badge>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <span className="text-purple-400 font-medium">Third Best Average</span>
                    <Badge className="bg-purple-500 text-white">1 Month Salary</Badge>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                    <span className="text-indigo-400 font-medium">Perfect Attendance</span>
                    <Badge className="bg-indigo-500 text-white">Car/Bike Voucher</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-slate-700 bg-[#2A2B5E]">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-2">89</div>
                  <div className="text-sm text-slate-400">Above 700 Points</div>
                  <Progress value={89/322*100} className="mt-2" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-700 bg-[#2A2B5E]">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-2">47</div>
                  <div className="text-sm text-slate-400">Above 800 Points</div>
                  <Progress value={47/322*100} className="mt-2" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-700 bg-[#2A2B5E]">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-2">12</div>
                  <div className="text-sm text-slate-400">Above 900 Points</div>
                  <Progress value={12/322*100} className="mt-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}