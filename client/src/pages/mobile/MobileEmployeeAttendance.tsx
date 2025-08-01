import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, MapPin, Download, Filter, Search, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link } from "wouter";

// Sample attendance data
const attendanceHistory = [
  {
    date: "2025-01-10",
    dayName: "Today",
    checkIn: "09:15",
    checkOut: "17:30",
    hoursWorked: "8h 15m",
    status: "Present",
    location: "Office - Main Building"
  },
  {
    date: "2025-01-09", 
    dayName: "Yesterday",
    checkIn: "09:00",
    checkOut: "Missed",
    hoursWorked: "8h 0m",
    status: "Incomplete",
    location: "Office - Main Building"
  },
  {
    date: "2025-01-08",
    dayName: "Tuesday",
    checkIn: "08:45",
    checkOut: "17:15",
    hoursWorked: "8h 30m",
    status: "Present",
    location: "Remote"
  },
  {
    date: "2025-01-07",
    dayName: "Monday",
    checkIn: "09:30",
    checkOut: "17:45",
    hoursWorked: "8h 15m",
    status: "Late",
    location: "Office - Main Building"
  },
];

export default function MobileEmployeeAttendance() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Present': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'Late': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'Incomplete': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const filteredAttendance = attendanceHistory.filter(record => {
    const matchesSearch = record.dayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || record.status.toLowerCase() === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-[#1A1B3E] text-white">
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#1A1B3E] border-b border-purple-500/20">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <Link href="/mobile/dashboard">
              <ArrowLeft className="w-6 h-6 text-purple-400" />
            </Link>
            <h1 className="text-lg font-semibold text-white">Attendance</h1>
          </div>
          <div className="text-sm text-gray-300">
            {formatTime(new Date())}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-16 px-4 pb-20">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="bg-[#2A2B5E] border-purple-500/20">
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <p className="text-sm text-gray-300">This Week</p>
              <p className="text-xl font-bold text-white">42h</p>
            </CardContent>
          </Card>

          <Card className="bg-[#2A2B5E] border-purple-500/20">
            <CardContent className="p-4 text-center">
              <Calendar className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-gray-300">This Month</p>
              <p className="text-xl font-bold text-white">96%</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex space-x-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search attendance..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#2A2B5E] border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-2 mb-6 overflow-x-auto">
          {["all", "present", "late", "incomplete"].map((filter) => (
            <button
              key={filter}
              onClick={() => setFilterStatus(filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                filterStatus === filter
                  ? "bg-purple-600 text-white"
                  : "bg-[#2A2B5E] text-gray-300 border border-purple-500/20"
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>

        {/* Attendance History */}
        <div className="space-y-4">
          {filteredAttendance.map((record, index) => (
            <Card key={index} className="bg-[#2A2B5E] border-purple-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-white">{record.dayName}</p>
                    <p className="text-sm text-gray-400">{record.date}</p>
                  </div>
                  <Badge className={`${getStatusColor(record.status)} border`}>
                    {record.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="text-xs text-gray-400">Check In</p>
                      <p className="text-sm font-medium text-white">{record.checkIn}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      record.checkOut === "Missed" ? "bg-red-500" : "bg-blue-500"
                    }`}></div>
                    <div>
                      <p className="text-xs text-gray-400">Check Out</p>
                      <p className={`text-sm font-medium ${
                        record.checkOut === "Missed" ? "text-red-300" : "text-white"
                      }`}>
                        {record.checkOut}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">{record.location}</span>
                  </div>
                  <span className="text-sm font-medium text-purple-400">{record.hoursWorked}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Export Button */}
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Attendance
          </Button>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#2A2B5E] border-t border-purple-500/20">
        <div className="flex justify-around py-3">
          <Link href="/mobile/dashboard">
            <button className="flex flex-col items-center space-y-1">
              <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-sm"></div>
              </div>
              <span className="text-xs text-gray-400">Dashboard</span>
            </button>
          </Link>
          <button className="flex flex-col items-center space-y-1">
            <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs text-purple-300">Attendance</span>
          </button>
          <Link href="/mobile/analytics">
            <button className="flex flex-col items-center space-y-1">
              <div className="w-6 h-6 text-gray-400">📊</div>
              <span className="text-xs text-gray-400">Analytics</span>
            </button>
          </Link>
          <Link href="/mobile/schedule">
            <button className="flex flex-col items-center space-y-1">
              <Calendar className="w-6 h-6 text-gray-400" />
              <span className="text-xs text-gray-400">Schedule</span>
            </button>
          </Link>
          <Link href="/mobile/leaderboard">
            <button className="flex flex-col items-center space-y-1">
              <div className="w-6 h-6 text-gray-400">🏆</div>
              <span className="text-xs text-gray-400">Leaderboard</span>
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}