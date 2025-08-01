import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Award, TrendingUp, TrendingDown, Crown } from "lucide-react";

export default function EmployeeLeaderboard() {
  const [timeframe, setTimeframe] = useState<'Monthly' | 'Weekly'>('Monthly');

  const monthlyLeaderboard = [
    { 
      rank: 1, 
      name: "Jonathan Wilson", 
      position: "Senior",
      department: "Engineering",
      score: 47.738,
      streak: 53,
      hours: "450g",
      avatar: "JW",
      trend: "up"
    },
    { 
      rank: 2, 
      name: "Emma Davis", 
      position: "Attendant",
      department: "Dochoeten",
      score: 35.487,
      streak: 45,
      hours: "150g",
      avatar: "ED",
      trend: "up"
    },
    { 
      rank: 3, 
      name: "Michael Lee", 
      position: "Associano",
      department: "Assisdata",
      score: 33.142,
      streak: 45,
      hours: "100g",
      avatar: "ML",
      trend: "down"
    },
    { 
      rank: 4, 
      name: "John Lee", 
      position: "Developer",
      department: "Accounting",
      score: 28.822,
      streak: 31,
      hours: "8g",
      avatar: "JL",
      trend: "up"
    },
    { 
      rank: 5, 
      name: "Olivia Martin", 
      position: "Manager",
      department: "Johung",
      score: 25.503,
      streak: 30,
      hours: "2g",
      avatar: "OM",
      trend: "down"
    },
    { 
      rank: 6, 
      name: "Max Smith", 
      position: "Commlime",
      department: "Marketing",
      score: 22.402,
      streak: 26,
      hours: "150",
      avatar: "MS",
      trend: "up"
    },
    { 
      rank: 7, 
      name: "Andre Lee", 
      position: "Electronic",
      department: "Olivia",
      score: 21.758,
      streak: 22,
      hours: "12",
      avatar: "AL",
      trend: "down"
    },
  ];

  const mobileLeaderboard = [
    { name: "Sarha Johnson", score: 850, rank: 1, highlight: true },
    { name: "Emma Wilson", score: 790, rank: 2 },
    { name: "James Smith", score: 750, rank: 3 },
    { name: "Anna Brown", department: "Sales", score: 720, trend: "up" },
    { name: "Thomas Moore", department: "Marketing", score: 680, trend: "down" },
    { name: "David Lee", department: "Support", score: 640, trend: "up" },
    { name: "Olivia Taylor", department: "Marketing", score: 610, trend: "up" },
    { name: "Michael Clark", department: "Engineering", score: 580, trend: "down" },
    { name: "Sophia Martinez", department: "Support", score: 570, trend: "up" },
    { name: "Emily Davis", department: "Sales", score: 540, trend: "down" },
  ];

  const achievements = [
    { icon: "🏆", type: "gold" },
    { icon: "⭐", type: "silver" },
    { icon: "🎖️", type: "bronze" },
  ];

  const getAvatarColor = (index: number) => {
    const colors = [
      "from-yellow-400 to-orange-500",
      "from-purple-400 to-pink-500", 
      "from-blue-400 to-cyan-500",
      "from-green-400 to-teal-500",
      "from-red-400 to-rose-500",
      "from-indigo-400 to-purple-500",
      "from-pink-400 to-rose-500",
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="p-6 bg-[#1A1B3E] min-h-screen text-white">
      {/* Desktop Version */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Monthly Leaderboard - April 2024</h1>
          <div className="flex items-center space-x-4">
            <select className="bg-[#2A2B5E] border-[#3A3B7E] text-white px-4 py-2 rounded-lg">
              <option>Department</option>
              <option>Engineering</option>
              <option>Sales</option>
              <option>Marketing</option>
            </select>
            <Button 
              variant="outline" 
              className="bg-[#2A2B5E] border-[#3A3B7E] text-white hover:bg-[#3A3B7E]"
            >
              This Month
            </Button>
          </div>
        </div>

        {/* Main Leaderboard Table */}
        <Card className="bg-[#2A2B5E] border-[#3A3B7E] mb-8">
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-gray-400 text-sm border-b border-[#3A3B7E]">
                    <th className="text-left py-4 px-2">Rank</th>
                    <th className="text-left py-4 px-2">Employee</th>
                    <th className="text-left py-4 px-2">Department</th>
                    <th className="text-right py-4 px-2">Score</th>
                    <th className="text-right py-4 px-2">Streak</th>
                    <th className="text-right py-4 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyLeaderboard.map((employee, index) => (
                    <tr key={index} className="border-b border-[#3A3B7E] hover:bg-[#3A3B7E] transition-colors">
                      {/* Rank with Badge */}
                      <td className="py-4 px-2">
                        <div className="flex items-center space-x-2">
                          {index === 0 && (
                            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full">
                              <Crown className="w-4 h-4 text-white" />
                            </div>
                          )}
                          {index === 1 && (
                            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-gray-300 to-gray-500 rounded-full">
                              <Medal className="w-4 h-4 text-white" />
                            </div>
                          )}
                          {index === 2 && (
                            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-amber-600 to-amber-800 rounded-full">
                              <Award className="w-4 h-4 text-white" />
                            </div>
                          )}
                          {index > 2 && (
                            <div className="flex items-center justify-center w-8 h-8 bg-[#4A4B7E] rounded-full">
                              <span className="text-white font-bold text-sm">#{index + 1}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      
                      {/* Employee Info */}
                      <td className="py-4 px-2">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm bg-gradient-to-r ${getAvatarColor(index)}`}>
                            {employee.avatar}
                          </div>
                          <div>
                            <div className={`font-medium ${
                              index === 0 ? 'text-yellow-300' :
                              index === 1 ? 'text-gray-300' :
                              index === 2 ? 'text-amber-300' :
                              'text-white'
                            }`}>
                              {employee.name}
                            </div>
                            <div className="text-gray-400 text-sm">{employee.position}</div>
                          </div>
                        </div>
                      </td>
                      
                      {/* Department */}
                      <td className="py-4 px-2">
                        <Badge variant="secondary" className="bg-[#4A4B7E] text-gray-300">
                          {employee.department}
                        </Badge>
                      </td>
                      
                      {/* Score */}
                      <td className="py-4 px-2 text-right">
                        <div className={`font-bold text-lg ${
                          index === 0 ? 'text-yellow-300' :
                          index === 1 ? 'text-gray-300' :
                          index === 2 ? 'text-amber-300' :
                          'text-white'
                        }`}>
                          {employee.score}
                        </div>
                        <div className="text-gray-400 text-sm">points</div>
                      </td>
                      
                      {/* Streak */}
                      <td className="py-4 px-2 text-right">
                        <div className="text-white font-medium">{employee.streak}</div>
                        <div className="text-gray-400 text-sm">days</div>
                      </td>
                      
                      {/* Status */}
                      <td className="py-4 px-2 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {employee.trend === 'up' ? (
                            <TrendingUp className="w-4 h-4 text-green-400" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-400" />
                          )}
                          <span className="text-gray-400 text-sm">{employee.hours}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Team Statistics */}
          <Card className="bg-[#2A2B5E] border-[#3A3B7E]">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Team Statistics</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">85%</div>
                  <div className="text-gray-400 text-sm">Attendance Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">300h</div>
                  <div className="text-gray-400 text-sm">Total Hours</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">8 day</div>
                  <div className="text-gray-400 text-sm">Streak</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Department Comparison */}
          <Card className="bg-[#2A2B5E] border-[#3A3B7E]">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Department Comparison</h3>
              <div className="space-y-3">
                {['HR', 'Sales', 'Development', 'Marketing'].map((dept, index) => (
                  <div key={dept} className="flex items-center space-x-3">
                    <div className="text-white text-sm w-20">{dept}</div>
                    <div className="flex-1 bg-[#1A1B3E] rounded-full h-6">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-blue-500 h-6 rounded-full"
                        style={{ width: `${85 - index * 15}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Personal Achievements */}
          <Card className="bg-[#2A2B5E] border-[#3A3B7E]">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Personal Achievements</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white font-medium">Level 6</span>
                  </div>
                  <div className="w-24 bg-[#1A1B3E] rounded-full h-2">
                    <div className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {achievements.map((achievement, index) => (
                    <div
                      key={index}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                        achievement.type === 'gold' ? 'bg-yellow-500' :
                        achievement.type === 'silver' ? 'bg-gray-400' :
                        'bg-orange-500'
                      }`}
                    >
                      {achievement.icon}
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="text-gray-400 text-sm">Upcoming Challenges</div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                    <div className="text-white text-sm">Attendance Streak</div>
                  </div>
                  <div className="text-gray-400 text-xs">of % days</div>
                </div>
                <div className="space-y-2">
                  <div className="text-gray-400 text-sm">Point Breakdown</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-white text-sm">Attendance</span>
                      <span className="text-white text-sm">500 pt</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white text-sm">Punctuality</span>
                      <span className="text-white text-sm">200 pt</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white text-sm">Overtime</span>
                      <span className="text-white text-sm">130 pt</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile Version */}
      <div className="md:hidden">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-4">Leaderboard</h1>
          <div className="flex justify-center space-x-4 mb-6">
            <Button 
              variant={timeframe === 'Monthly' ? 'default' : 'ghost'}
              onClick={() => setTimeframe('Monthly')}
              className="text-white"
            >
              Monthly
            </Button>
            <Button 
              variant={timeframe === 'Weekly' ? 'default' : 'ghost'}
              onClick={() => setTimeframe('Weekly')}
              className="text-white"
            >
              Weekly
            </Button>
          </div>
        </div>

        {/* Top 3 Podium */}
        <div className="flex justify-center items-end space-x-4 mb-8">
          {/* Second Place */}
          <div className="text-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-white font-bold text-lg mb-2">
                EW
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-gray-300 to-gray-500 rounded-full flex items-center justify-center">
                <Medal className="w-3 h-3 text-white" />
              </div>
            </div>
            <div className="bg-[#2A2B5E] rounded-lg p-3 border-2 border-gray-400">
              <div className="text-gray-300 font-semibold">Emma Wilson</div>
              <div className="text-gray-300 font-bold">790 pt</div>
              <div className="text-xs text-gray-400">#2 Place</div>
            </div>
          </div>

          {/* First Place */}
          <div className="text-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white font-bold text-xl mb-2 border-4 border-yellow-400">
                SJ
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                <Crown className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-4 border-2 border-yellow-400">
              <div className="text-white font-semibold">Sarha Johnson</div>
              <div className="text-white font-bold text-lg">850 pt</div>
              <div className="text-xs text-yellow-200">#1 Champion</div>
            </div>
          </div>

          {/* Third Place */}
          <div className="text-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white font-bold text-lg mb-2">
                JS
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-amber-600 to-amber-800 rounded-full flex items-center justify-center">
                <Award className="w-3 h-3 text-white" />
              </div>
            </div>
            <div className="bg-[#2A2B5E] rounded-lg p-3 border-2 border-amber-600">
              <div className="text-amber-300 font-semibold">James Smith</div>
              <div className="text-amber-300 font-bold">750 pt</div>
              <div className="text-xs text-amber-400">#3 Place</div>
            </div>
          </div>
        </div>

        {/* Rest of Leaderboard */}
        <div className="space-y-3 mb-8">
          {mobileLeaderboard.slice(3).map((employee, index) => (
            <div key={employee.name} className="flex items-center justify-between bg-[#2A2B5E] rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(index + 3)} flex items-center justify-center text-white font-bold text-sm`}>
                  {employee.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="text-white font-semibold">{employee.name}</div>
                  {employee.department && (
                    <div className="text-gray-400 text-sm">{employee.department}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-white font-bold">{employee.score} pt</div>
                {employee.trend && (
                  <div className={`${employee.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                    {employee.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Tabs */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-white font-semibold mb-2">Achievements</div>
            <div className="flex justify-center space-x-1">
              {achievements.map((achievement, index) => (
                <div
                  key={index}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    achievement.type === 'gold' ? 'bg-yellow-500' :
                    achievement.type === 'silver' ? 'bg-gray-400' :
                    'bg-orange-500'
                  }`}
                >
                  {achievement.icon}
                </div>
              ))}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-white font-semibold mb-2">Current Challenges</div>
            <div className="text-gray-400 text-sm">Level 2</div>
            <div className="text-gray-400 text-sm">340/500</div>
          </div>
          
          <div className="text-center">
            <div className="text-white font-semibold mb-2">Earn Points</div>
            <div className="text-gray-400 text-sm">Streak</div>
          </div>
        </div>
      </div>
    </div>
  );
}