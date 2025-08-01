import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Trophy, 
  Medal, 
  Award, 
  ArrowLeft, 
  Crown, 
  Star, 
  TrendingUp, 
  TrendingDown,
  Users,
  Timer,
  CalendarDays,
  BarChart3,
  Clock,
  Calendar,
  Settings,
  Mail
} from "lucide-react";
import { useLocation, Link } from "wouter";
import MobileFooter from '@/components/mobile/MobileFooter';

// Mock leaderboard data showing competitive rankings
const mockLeaderboardData = [
  { rank: 1, name: "Ahmad Hassan", department: "LHE-OFC", score: 1285, change: "+45", trend: "up", avatar: "AH" },
  { rank: 2, name: "Fatima Khan", department: "FSD", score: 1201, change: "+28", trend: "up", avatar: "FK" },
  { rank: 3, name: "Muhammad Ali", department: "LHE-Sales", score: 1156, change: "-12", trend: "down", avatar: "MA" },
  { rank: 4, name: "Sarah Ahmed", department: "LHE-Finance", score: 1098, change: "+67", trend: "up", avatar: "SA" },
  { rank: 5, name: "Omar Malik", department: "Tech", score: 1034, change: "+23", trend: "up", avatar: "OM" },
  { rank: 6, name: "Ayesha Butt", department: "LHE-HR", score: 987, change: "-8", trend: "down", avatar: "AB" },
  { rank: 7, name: "Hassan Raza", department: "PSH", score: 945, change: "+15", trend: "up", avatar: "HR" },
  { rank: 8, name: "Zara Qureshi", department: "LHE-Support", score: 912, change: "+34", trend: "up", avatar: "ZQ" },
  { rank: 9, name: "Bilal Sheikh", department: "ISB", score: 889, change: "-5", trend: "down", avatar: "BS" },
  { rank: 10, name: "Maryam Siddiq", department: "LHE-Accounts", score: 867, change: "+19", trend: "up", avatar: "MS" },
  { rank: 11, name: "Ali Haider", department: "KHI", score: 834, change: "+8", trend: "up", avatar: "AH" },
  { rank: 12, name: "Test Employee", department: "LHE-OFC", score: 785, change: "-3", trend: "down", avatar: "TE", isCurrentUser: true },
];

// Top performers summary
const topPerformers = {
  thisWeek: { name: "Ahmad Hassan", department: "LHE-OFC", points: 245 },
  thisMonth: { name: "Fatima Khan", department: "FSD", points: 1201 },
  mostImproved: { name: "Sarah Ahmed", department: "LHE-Finance", improvement: "+67" }
};

const currentUser = mockLeaderboardData.find(emp => emp.isCurrentUser);
const top3 = mockLeaderboardData.slice(0, 3);

export default function MobileEmployeeLeaderboard() {
  const [, navigate] = useLocation();
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-gray-400 font-bold">#{rank}</span>;
  };

  const getAvatarGradient = (rank: number) => {
    if (rank === 1) return "from-yellow-400 to-yellow-600";
    if (rank === 2) return "from-gray-400 to-gray-600";
    if (rank === 3) return "from-amber-500 to-amber-700";
    return "from-purple-500 to-blue-600";
  };

  return (
    <div className="h-screen bg-[#1A1B3E] text-white flex flex-col overflow-hidden">
      {/* Mobile Header */}
      <div className="bg-[#1A1B3E] border-b border-purple-500/20 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => navigate('/mobile')}
              className="p-1 rounded-lg hover:bg-gray-800"
            >
              <ArrowLeft className="w-6 h-6 text-purple-400" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold text-white">Leaderboard</h1>
              <span className="text-red-500 text-xs font-bold">COMING SOON</span>
            </div>
          </div>
          <div className="text-sm text-gray-300">
            {formatTime(new Date())}
          </div>
        </div>
      </div>

      {/* Content - Fixed height, scrollable */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Top Performers Podium */}
        <div className="p-4 pb-2">
          <div className="bg-[#2A2B5E] rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Top Performers
              </h2>
              <Badge variant="outline" className="text-purple-400 border-purple-400">
                Monthly
              </Badge>
            </div>
            
            {/* Podium Layout */}
            <div className="flex items-end justify-center gap-2 mb-4">
              {/* 2nd Place */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-bold text-sm mb-2">
                  {top3[1]?.avatar}
                </div>
                <div className="bg-gray-600 rounded-t-lg px-2 py-3 text-center min-w-16">
                  <div className="text-gray-300 text-xs">2nd</div>
                  <div className="text-white font-bold text-sm">{top3[1]?.score}</div>
                </div>
              </div>
              
              {/* 1st Place */}
              <div className="flex flex-col items-center">
                <Crown className="w-6 h-6 text-yellow-400 mb-1" />
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white font-bold mb-2">
                  {top3[0]?.avatar}
                </div>
                <div className="bg-yellow-600 rounded-t-lg px-2 py-4 text-center min-w-16">
                  <div className="text-yellow-100 text-xs">1st</div>
                  <div className="text-white font-bold">{top3[0]?.score}</div>
                </div>
              </div>
              
              {/* 3rd Place */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-bold text-sm mb-2">
                  {top3[2]?.avatar}
                </div>
                <div className="bg-amber-600 rounded-t-lg px-2 py-2 text-center min-w-16">
                  <div className="text-amber-100 text-xs">3rd</div>
                  <div className="text-white font-bold text-sm">{top3[2]?.score}</div>
                </div>
              </div>
            </div>
            
            {/* Winner Names */}
            <div className="flex justify-center gap-4 text-center">
              <div className="text-xs">
                <div className="text-gray-400">{top3[1]?.name}</div>
                <div className="text-gray-500">{top3[1]?.department}</div>
              </div>
              <div className="text-xs">
                <div className="text-yellow-400 font-semibold">{top3[0]?.name}</div>
                <div className="text-gray-400">{top3[0]?.department}</div>
              </div>
              <div className="text-xs">
                <div className="text-amber-400">{top3[2]?.name}</div>
                <div className="text-gray-500">{top3[2]?.department}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Current User Position */}
        {currentUser && (
          <div className="px-4 pb-2">
            <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                    {currentUser.avatar}
                  </div>
                  <div>
                    <div className="text-white font-semibold">{currentUser.name}</div>
                    <div className="text-gray-400 text-sm">{currentUser.department}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-bold text-white">#{currentUser.rank}</span>
                    <div className={`flex items-center text-sm ${currentUser.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                      {currentUser.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      <span className="ml-1">{currentUser.change}</span>
                    </div>
                  </div>
                  <div className="text-gray-400 text-sm">{currentUser.score} pts</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Full Rankings */}
        <div className="px-4 pb-4">
          <div className="bg-[#2A2B5E] rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              All Rankings
            </h3>
            
            <div className="space-y-3">
              {mockLeaderboardData.map((employee, index) => (
                <div 
                  key={index} 
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    employee.isCurrentUser 
                      ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30' 
                      : 'bg-[#1A1B3E]/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-6">
                      {getRankIcon(employee.rank)}
                    </div>
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(employee.rank)} flex items-center justify-center text-white font-bold text-xs`}>
                      {employee.avatar}
                    </div>
                    <div>
                      <div className={`font-semibold ${employee.isCurrentUser ? 'text-white' : 'text-gray-200'}`}>
                        {employee.name}
                      </div>
                      <div className="text-gray-400 text-xs">{employee.department}</div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-bold">{employee.score}</span>
                      <div className={`flex items-center text-xs ${employee.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                        {employee.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span className="ml-1">{employee.change}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <MobileFooter currentPage="leaderboard" />
    </div>
  );
}