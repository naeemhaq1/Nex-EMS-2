import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Search, Filter, Download, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function EmployeeAttendance() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");

  // Sample attendance data
  const attendanceRecords = [
    {
      id: 1,
      date: "2024-01-15",
      day: "Monday",
      checkIn: "09:00 AM",
      checkOut: "05:30 PM",
      status: "present",
      hours: 8.5,
      location: "Office",
      notes: "Regular day"
    },
    {
      id: 2,
      date: "2024-01-16",
      day: "Tuesday",
      checkIn: "09:15 AM",
      checkOut: "05:45 PM",
      status: "late",
      hours: 8.5,
      location: "Office",
      notes: "Late arrival"
    },
    {
      id: 3,
      date: "2024-01-17",
      day: "Wednesday",
      checkIn: "08:45 AM",
      checkOut: "05:15 PM",
      status: "present",
      hours: 8.5,
      location: "Office",
      notes: "Early arrival"
    },
    {
      id: 4,
      date: "2024-01-18",
      day: "Thursday",
      checkIn: "09:00 AM",
      checkOut: "--",
      status: "incomplete",
      hours: 0,
      location: "Office",
      notes: "Missed punch out"
    },
    {
      id: 5,
      date: "2024-01-19",
      day: "Friday",
      checkIn: "--",
      checkOut: "--",
      status: "absent",
      hours: 0,
      location: "--",
      notes: "Sick leave"
    },
    {
      id: 6,
      date: "2024-01-20",
      day: "Saturday",
      checkIn: "10:00 AM",
      checkOut: "02:00 PM",
      status: "half-day",
      hours: 4,
      location: "Office",
      notes: "Half day"
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-500 text-white">Present</Badge>;
      case 'late':
        return <Badge className="bg-yellow-500 text-white">Late</Badge>;
      case 'absent':
        return <Badge className="bg-red-500 text-white">Absent</Badge>;
      case 'incomplete':
        return <Badge className="bg-orange-500 text-white">Incomplete</Badge>;
      case 'half-day':
        return <Badge className="bg-blue-500 text-white">Half Day</Badge>;
      default:
        return <Badge className="bg-gray-500 text-white">Unknown</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'late':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'absent':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'incomplete':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'half-day':
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const filteredRecords = attendanceRecords.filter(record => {
    const matchesSearch = record.day.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.date.includes(searchTerm) ||
                         record.status.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = dateFilter === "all" || 
                         (dateFilter === "present" && record.status === "present") ||
                         (dateFilter === "late" && record.status === "late") ||
                         (dateFilter === "absent" && record.status === "absent");
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-6 bg-[#1A1B3E] min-h-screen text-white">
      {/* Desktop Version */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">My Attendance</h1>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search attendance..."
                className="pl-10 bg-[#2A2B5E] border-[#3A3B7E] text-white placeholder-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="bg-[#2A2B5E] border-[#3A3B7E] text-white px-4 py-2 rounded-lg"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="all">All Records</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
            </select>
            <Button className="bg-[#2A2B5E] border-[#3A3B7E] text-white hover:bg-[#3A3B7E]">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-[#2A2B5E] border-[#3A3B7E]">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <div className="text-gray-400 text-sm">Present Days</div>
                  <div className="text-2xl font-bold text-white">22</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#2A2B5E] border-[#3A3B7E]">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-yellow-500" />
                <div>
                  <div className="text-gray-400 text-sm">Late Days</div>
                  <div className="text-2xl font-bold text-white">3</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#2A2B5E] border-[#3A3B7E]">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <div>
                  <div className="text-gray-400 text-sm">Absent Days</div>
                  <div className="text-2xl font-bold text-white">2</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#2A2B5E] border-[#3A3B7E]">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-blue-500" />
                <div>
                  <div className="text-gray-400 text-sm">Total Hours</div>
                  <div className="text-2xl font-bold text-white">184h</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Table */}
        <Card className="bg-[#2A2B5E] border-[#3A3B7E]">
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-gray-400 text-sm border-b border-[#3A3B7E]">
                    <th className="text-left py-3">Date</th>
                    <th className="text-left py-3">Day</th>
                    <th className="text-left py-3">Check In</th>
                    <th className="text-left py-3">Check Out</th>
                    <th className="text-left py-3">Hours</th>
                    <th className="text-left py-3">Status</th>
                    <th className="text-left py-3">Location</th>
                    <th className="text-left py-3">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="border-b border-[#3A3B7E] hover:bg-[#3A3B7E] transition-colors">
                      <td className="py-4 text-white">{format(new Date(record.date), 'MMM dd, yyyy')}</td>
                      <td className="py-4 text-white">{record.day}</td>
                      <td className="py-4 text-white">{record.checkIn}</td>
                      <td className="py-4 text-white">{record.checkOut}</td>
                      <td className="py-4 text-white">{record.hours}h</td>
                      <td className="py-4">{getStatusBadge(record.status)}</td>
                      <td className="py-4 text-white">{record.location}</td>
                      <td className="py-4 text-gray-400 text-sm">{record.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Version */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">My Attendance</h1>
          <Button className="bg-[#2A2B5E] border-[#3A3B7E] text-white hover:bg-[#3A3B7E]">
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search attendance..."
            className="pl-10 bg-[#2A2B5E] border-[#3A3B7E] text-white placeholder-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="bg-[#2A2B5E] border-[#3A3B7E]">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <div>
                  <div className="text-gray-400 text-xs">Present</div>
                  <div className="text-lg font-bold text-white">22</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#2A2B5E] border-[#3A3B7E]">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-yellow-500" />
                <div>
                  <div className="text-gray-400 text-xs">Late</div>
                  <div className="text-lg font-bold text-white">3</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#2A2B5E] border-[#3A3B7E]">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <div>
                  <div className="text-gray-400 text-xs">Absent</div>
                  <div className="text-lg font-bold text-white">2</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#2A2B5E] border-[#3A3B7E]">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="text-gray-400 text-xs">Total Hours</div>
                  <div className="text-lg font-bold text-white">184h</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Attendance List */}
        <div className="space-y-4">
          {filteredRecords.map((record) => (
            <Card key={record.id} className="bg-[#2A2B5E] border-[#3A3B7E]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(record.status)}
                    <div>
                      <div className="text-white font-semibold">{record.day}</div>
                      <div className="text-gray-400 text-sm">{format(new Date(record.date), 'MMM dd, yyyy')}</div>
                    </div>
                  </div>
                  {getStatusBadge(record.status)}
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <div className="text-gray-400 text-xs">Check In</div>
                    <div className="text-white text-sm">{record.checkIn}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs">Check Out</div>
                    <div className="text-white text-sm">{record.checkOut}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs">Hours</div>
                    <div className="text-white text-sm">{record.hours}h</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs">Location</div>
                    <div className="text-white text-sm">{record.location}</div>
                  </div>
                </div>
                
                {record.notes && (
                  <div className="text-gray-400 text-xs">{record.notes}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Export Button */}
        <div className="mt-6">
          <Button className="w-full bg-[#2A2B5E] border-[#3A3B7E] text-white hover:bg-[#3A3B7E]">
            <Download className="w-4 h-4 mr-2" />
            Export Attendance
          </Button>
        </div>
      </div>
    </div>
  );
}