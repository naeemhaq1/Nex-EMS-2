import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, 
  PieChart, Pie, Cell, Calendar as CalendarIcon, AreaChart, Area
} from "recharts";
import { Calendar, MapPin, Download, Share } from "lucide-react";

export default function EmployeeAnalytics() {
  const [timeframe, setTimeframe] = useState('Last 30 days');

  // Sample data for analytics
  const weeklyPunchData = [
    { day: 'M', hours: 8.5 },
    { day: 'T', hours: 7.8 },
    { day: 'W', hours: 8.2 },
    { day: 'T', hours: 8.1 },
    { day: 'F', hours: 7.5 },
    { day: 'S', hours: 6.0 },
    { day: 'S', hours: 0 },
  ];

  const monthlyAttendance = [
    { week: 'Week 1', present: 5, absent: 0 },
    { week: 'Week 2', present: 4, absent: 1 },
    { week: 'Week 3', present: 5, absent: 0 },
    { week: 'Week 4', present: 5, absent: 0 },
  ];

  const departmentData = [
    { name: 'Sales', value: 35, color: '#6366F1' },
    { name: 'Engineering', value: 25, color: '#8B5CF6' },
    { name: 'HR', value: 20, color: '#06B6D4' },
    { name: 'Support', value: 20, color: '#10B981' },
  ];

  const overtimeData = [
    { day: 'M', hours: 2 },
    { day: 'T', hours: 5 },
    { day: 'W', hours: 4 },
    { day: 'T', hours: 6 },
    { day: 'F', hours: 3.5 },
    { day: 'S', hours: 7 },
  ];

  const peakHoursData = [
    { time: '6A', count: 2 },
    { time: '7A', count: 8 },
    { time: '8A', count: 15 },
    { time: '9A', count: 25 },
    { time: '10A', count: 30 },
    { time: '11A', count: 35 },
    { time: '12P', count: 40 },
    { time: '1P', count: 35 },
    { time: '2P', count: 30 },
    { time: '3P', count: 25 },
    { time: '4P', count: 20 },
    { time: '5P', count: 15 },
    { time: '6P', count: 8 },
  ];

  const calendarData = Array.from({ length: 35 }, (_, i) => ({
    day: i + 1,
    status: Math.random() > 0.8 ? 'absent' : Math.random() > 0.6 ? 'half' : 'present'
  }));

  return (
    <div className="p-6 bg-[#1A1B3E] min-h-screen text-white">
      {/* Desktop Version */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Analytics</h1>
          <div className="flex items-center space-x-4">
            <select 
              className="bg-[#2A2B5E] border-[#3A3B7E] text-white px-4 py-2 rounded-lg"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
            >
              <option>Last 30 days</option>
              <option>Last 7 days</option>
              <option>Last 3 months</option>
              <option>Last year</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Monthly Attendance Calendar */}
          <Card className="bg-[#2A2B5E] border-[#3A3B7E]">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Monthly Attendance</h3>
              <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                  <div key={day} className="py-1">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarData.map((day, index) => (
                  <div 
                    key={index}
                    className={`aspect-square flex items-center justify-center text-xs rounded ${
                      day.status === 'present' ? 'bg-blue-500' :
                      day.status === 'half' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                  >
                    {day.day > 31 ? '' : day.day}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Overtime Hours */}
          <Card className="bg-[#2A2B5E] border-[#3A3B7E]">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Overtime Hours</h3>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={overtimeData}>
                  <Line 
                    type="monotone" 
                    dataKey="hours" 
                    stroke="#6366F1" 
                    strokeWidth={2}
                    dot={{ fill: '#6366F1', strokeWidth: 2, r: 4 }}
                  />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  />
                  <YAxis hide />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Weekly Punch-in/out Times */}
          <Card className="bg-[#2A2B5E] border-[#3A3B7E]">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Weekly Punch-in/out Times</h3>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={weeklyPunchData}>
                  <Bar dataKey="hours" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  />
                  <YAxis hide />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* By Department */}
          <Card className="bg-[#2A2B5E] border-[#3A3B7E]">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">By Department</h3>
              <div className="flex justify-center mb-4">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={departmentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {departmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">Total</div>
                    <div className="text-2xl font-bold text-white">52%</div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {departmentData.map((dept, index) => (
                  <div key={dept.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color }}></div>
                      <span className="text-white text-sm">{dept.name}</span>
                    </div>
                    <span className="text-gray-400 text-sm">{dept.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Work Patterns */}
          <Card className="bg-[#2A2B5E] border-[#3A3B7E]">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Work Patterns</h3>
              <div className="mb-4">
                <div className="text-gray-400 text-sm mb-2">Peak Hours</div>
                <ResponsiveContainer width="100%" height={80}>
                  <BarChart data={peakHoursData}>
                    <Bar dataKey="count" fill="#6366F1" radius={[2, 2, 0, 0]} />
                    <XAxis 
                      dataKey="time" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#9CA3AF', fontSize: 10 }}
                    />
                    <YAxis hide />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Location-Based Check-ins */}
          <Card className="bg-[#2A2B5E] border-[#3A3B7E]">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Location-Based Check-ins</h3>
              <div className="bg-[#1A1B3E] rounded-lg p-4 h-32 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-500/20 to-purple-500/20 rounded-lg"></div>
                <div className="relative z-10 flex items-center justify-center h-full">
                  <div className="space-y-2">
                    <div className="w-2 h-2 bg-white rounded-full mx-auto"></div>
                    <div className="w-1 h-1 bg-white rounded-full mx-auto"></div>
                    <div className="w-2 h-2 bg-white rounded-full mx-auto"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Export/Share Buttons */}
        <div className="flex justify-center space-x-4 mt-8">
          <Button className="bg-[#2A2B5E] border-[#3A3B7E] text-white hover:bg-[#3A3B7E]">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button className="bg-[#2A2B5E] border-[#3A3B7E] text-white hover:bg-[#3A3B7E]">
            <Share className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Mobile Version */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <select 
            className="bg-[#2A2B5E] border-[#3A3B7E] text-white px-3 py-2 rounded-lg text-sm"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
          >
            <option>Last 30 days</option>
            <option>Last 7 days</option>
            <option>Last 3 months</option>
          </select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="bg-[#2A2B5E] border-[#3A3B7E]">
            <CardContent className="p-4">
              <div className="text-gray-400 text-sm mb-1">Missed Punch-outs</div>
              <div className="text-2xl font-bold text-white">3</div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#2A2B5E] border-[#3A3B7E]">
            <CardContent className="p-4">
              <div className="text-gray-400 text-sm mb-1">Mobile Check-ins</div>
              <div className="text-2xl font-bold text-white">15</div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#2A2B5E] border-[#3A3B7E]">
            <CardContent className="p-4">
              <div className="text-gray-400 text-sm mb-1">Late Arrivals</div>
              <div className="text-2xl font-bold text-white">2</div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#2A2B5E] border-[#3A3B7E]">
            <CardContent className="p-4">
              <div className="text-gray-400 text-sm mb-1">Early Departures</div>
              <div className="text-2xl font-bold text-white">1</div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Attendance */}
        <Card className="bg-[#2A2B5E] border-[#3A3B7E] mb-6">
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Monthly Attendance</h3>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                <div key={day} className="py-1">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarData.map((day, index) => (
                <div 
                  key={index}
                  className={`aspect-square flex items-center justify-center text-xs rounded ${
                    day.status === 'present' ? 'bg-blue-500' :
                    day.status === 'half' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                >
                  {day.day > 31 ? '' : day.day}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Overtime Hours */}
        <Card className="bg-[#2A2B5E] border-[#3A3B7E] mb-6">
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Overtime Hours</h3>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={overtimeData}>
                <Line 
                  type="monotone" 
                  dataKey="hours" 
                  stroke="#6366F1" 
                  strokeWidth={2}
                  dot={{ fill: '#6366F1', strokeWidth: 2, r: 4 }}
                />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                />
                <YAxis hide />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weekly Punch-in/out Times */}
        <Card className="bg-[#2A2B5E] border-[#3A3B7E] mb-6">
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Weekly Punch-in/out Times</h3>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={weeklyPunchData}>
                <Bar dataKey="hours" fill="#6366F1" radius={[4, 4, 0, 0]} />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                />
                <YAxis hide />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* By Department */}
        <Card className="bg-[#2A2B5E] border-[#3A3B7E] mb-6">
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold text-white mb-4">By Department</h3>
            <div className="flex justify-center mb-4">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={departmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {departmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {departmentData.map((dept, index) => (
                <div key={dept.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color }}></div>
                    <span className="text-white text-sm">{dept.name}</span>
                  </div>
                  <span className="text-gray-400 text-sm">{dept.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Work Patterns */}
        <Card className="bg-[#2A2B5E] border-[#3A3B7E] mb-6">
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Work Patterns</h3>
            <div className="mb-4">
              <div className="text-gray-400 text-sm mb-2">Peak Hours</div>
              <ResponsiveContainer width="100%" height={80}>
                <BarChart data={peakHoursData}>
                  <Bar dataKey="count" fill="#6366F1" radius={[2, 2, 0, 0]} />
                  <XAxis 
                    dataKey="time" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  />
                  <YAxis hide />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Location-Based Check-ins */}
        <Card className="bg-[#2A2B5E] border-[#3A3B7E] mb-6">
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Location-Based Check-ins</h3>
            <div className="bg-[#1A1B3E] rounded-lg p-4 h-32 relative">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-500/20 to-purple-500/20 rounded-lg"></div>
              <div className="relative z-10 flex items-center justify-center h-full">
                <div className="space-y-2">
                  <div className="w-2 h-2 bg-white rounded-full mx-auto"></div>
                  <div className="w-1 h-1 bg-white rounded-full mx-auto"></div>
                  <div className="w-2 h-2 bg-white rounded-full mx-auto"></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export/Share Buttons */}
        <div className="flex space-x-4">
          <Button className="flex-1 bg-[#2A2B5E] border-[#3A3B7E] text-white hover:bg-[#3A3B7E]">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button className="flex-1 bg-[#2A2B5E] border-[#3A3B7E] text-white hover:bg-[#3A3B7E]">
            <Share className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </div>
    </div>
  );
}