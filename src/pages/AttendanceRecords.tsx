import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { EmployeeAvatar } from "@/components/EmployeeAvatar";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Search, Filter, Download, Calendar, TrendingUp, BarChart3, Users, Clock, CheckCircle } from "lucide-react";

export default function AttendanceRecords() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("");

  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ["/api/attendance", { page, search, dateFrom, dateTo, status }],
    queryFn: async ({ queryKey }) => {
      const [, params] = queryKey as [string, { page: number; search: string; dateFrom: string; dateTo: string; status: string; }];
      const searchParams = new URLSearchParams();
      searchParams.append("page", String(params.page));
      searchParams.append("limit", "10");
      if (params.search) searchParams.append("search", params.search);
      if (params.dateFrom) searchParams.append("dateFrom", params.dateFrom);
      if (params.dateTo) searchParams.append("dateTo", params.dateTo);
      if (params.status) searchParams.append("status", params.status);
      
      const response = await fetch(`/api/attendance?${searchParams}`);
      return response.json();
    },
  });

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ["/api/analytics/90-day-attendance"],
    queryFn: async () => {
      const response = await fetch("/api/analytics/90-day-attendance");
      return response.json();
    },
  });

  const { data: monthlyData, isLoading: monthlyLoading } = useQuery({
    queryKey: ["/api/analytics/90-day-attendance"],
    queryFn: async () => {
      const response = await fetch("/api/analytics/90-day-attendance");
      return response.json();
    },
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      present: { className: "bg-green-600 text-white", label: "Present" },
      late: { className: "bg-orange-600 text-white", label: "Late" },
      absent: { className: "bg-red-600 text-white", label: "Absent" },
      partial: { className: "bg-yellow-600 text-white", label: "Partial" },
      complete: { className: "bg-blue-600 text-white", label: "Complete" },
    };
    
    const config = variants[status as keyof typeof variants] || variants.present;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const transformMonthlyData = (data: any[]) => {
    if (!data || data.length === 0) return [];
    
    return data.map(item => ({
      date: item.date, // Already formatted as "MMM dd" from server
      present: item.present || 0,
      late: item.late || 0,
      absent: item.absent || 0,
      complete: item.complete || 0,
      incomplete: item.incomplete || 0,
      nonBio: item.nonBio || 0,
      total: item.total || 0,
      attendanceRate: item.attendanceRate || 0
    }));
  };

  const getMonthlyStats = () => {
    if (!monthlyData || monthlyData.length === 0) return null;
    
    const totalDays = monthlyData.length;
    const avgPresent = Math.round(monthlyData.reduce((sum: number, day: any) => sum + (day.present || 0), 0) / totalDays);
    const avgLate = Math.round(monthlyData.reduce((sum: number, day: any) => sum + (day.late || 0), 0) / totalDays);
    const avgComplete = Math.round(monthlyData.reduce((sum: number, day: any) => sum + (day.complete || 0), 0) / totalDays);
    const avgRate = (monthlyData.reduce((sum: number, day: any) => sum + (day.attendanceRate || 0), 0) / totalDays).toFixed(1);
    
    return { totalDays, avgPresent, avgLate, avgComplete, avgRate };
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return "N/A";
    return new Date(timeString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };



  const monthlyStats = getMonthlyStats();

  return (
    <div className="space-y-6 min-h-screen bg-[#1A1B3E] p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Attendance Records</h1>
          <p className="text-slate-400 mt-1">90-day attendance overview and detailed records</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Download className="w-4 h-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* 90-Day Statistics Cards */}
      {monthlyStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:bg-[#2A2B5E] transition-colors border-slate-700 bg-[#2A2B5E]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-400">Avg Daily Present (90 days)</p>
                  <p className="text-2xl font-bold text-green-400">{monthlyStats.avgPresent}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
                  <Users className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-[#2A2B5E] transition-colors border-slate-700 bg-[#2A2B5E]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-400">Avg Late Arrivals (90 days)</p>
                  <p className="text-2xl font-bold text-orange-400">{monthlyStats.avgLate}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-[#2A2B5E] transition-colors border-slate-700 bg-[#2A2B5E]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-400">Avg Complete (90 days)</p>
                  <p className="text-2xl font-bold text-blue-400">{monthlyStats.avgComplete}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-[#2A2B5E] transition-colors border-slate-700 bg-[#2A2B5E]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-400">Avg Attendance Rate (90 days)</p>
                  <p className="text-2xl font-bold text-purple-400">{monthlyStats.avgRate}%</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Monthly Attendance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-700 bg-[#2A2B5E]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              90-Day Attendance Trends
            </CardTitle>
            <p className="text-slate-400">Last 90 days attendance patterns (left to right)</p>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={transformMonthlyData(monthlyData || [])}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" />
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
                    dataKey="present" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    name="Present"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="late" 
                    stroke="#F59E0B" 
                    strokeWidth={2}
                    name="Late"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="absent" 
                    stroke="#EF4444" 
                    strokeWidth={2}
                    name="Absent"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-[#2A2B5E]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              90-Day Completion Status
            </CardTitle>
            <p className="text-slate-400">Complete vs Incomplete attendance (last 15 days)</p>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={transformMonthlyData(monthlyData || []).slice(-15)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" />
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
                  <Bar dataKey="complete" stackId="a" fill="#10B981" name="Complete" />
                  <Bar dataKey="incomplete" stackId="a" fill="#F59E0B" name="Incomplete" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Records */}
      <Card className="border-slate-700 bg-[#2A2B5E]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-lg">Detailed Attendance Records</CardTitle>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search by employee name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-[#1A1B3E] border-slate-600 text-white placeholder-slate-400"
              />
            </form>
            <div className="flex items-center space-x-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40 bg-[#1A1B3E] border-slate-600 text-white"
              />
              <span className="text-slate-400">to</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40 bg-[#1A1B3E] border-slate-600 text-white"
              />
            </div>
            <Button type="submit" onClick={handleSearch} className="bg-purple-600 hover:bg-purple-700 text-white">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
          
          <div className="rounded-lg border border-slate-600 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#1A1B3E] hover:bg-[#1A1B3E]">
                  <TableHead className="text-slate-300">Employee</TableHead>
                  <TableHead className="text-slate-300">Date</TableHead>
                  <TableHead className="text-slate-300">Punch In</TableHead>
                  <TableHead className="text-slate-300">Punch Out</TableHead>
                  <TableHead className="text-slate-300">Total Hours</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                  <TableHead className="text-slate-300">Late (min)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                      Loading attendance records...
                    </TableCell>
                  </TableRow>
                ) : attendanceData?.records?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                      No attendance records found
                    </TableCell>
                  </TableRow>
                ) : (
                  attendanceData?.records?.map((record: any) => (
                    <TableRow key={record.id} className="hover:bg-[#1A1B3E] border-slate-700">
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <EmployeeAvatar 
                            employeeName={record.employeeName || record.employeeCode}
                            employeeCode={record.employeeCode}
                            size="sm" 
                          />
                          <div>
                            <div className="font-medium text-white">
                              {record.employeeName || record.employeeCode}
                            </div>
                            <div className="text-sm text-slate-400">
                              {record.employeeCode}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-white">
                        {formatDate(record.date)}
                      </TableCell>
                      <TableCell className="text-white">
                        {formatTime(record.checkIn)}
                      </TableCell>
                      <TableCell className="text-white">
                        {formatTime(record.checkOut)}
                      </TableCell>
                      <TableCell className="text-white">
                        {record.totalHours ? `${record.totalHours}h` : "N/A"}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(record.status)}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {record.lateMinutes || 0}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {attendanceData?.records?.length > 0 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-slate-400">
                Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, attendanceData.total)} of {attendanceData.total} results
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="bg-[#1A1B3E] border-slate-600 text-white hover:bg-[#2A2B5E]"
                >
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.ceil(attendanceData.total / 10) }, (_, i) => (
                    <Button
                      key={i + 1}
                      variant={page === i + 1 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(i + 1)}
                      className={page === i + 1 ? 
                        "bg-purple-600 hover:bg-purple-700 text-white" : 
                        "bg-[#1A1B3E] border-slate-600 text-white hover:bg-[#2A2B5E]"
                      }
                    >
                      {i + 1}
                    </Button>
                  )).slice(Math.max(0, page - 3), Math.min(Math.ceil(attendanceData.total / 10), page + 2))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(Math.ceil(attendanceData.total / 10), page + 1))}
                  disabled={page === Math.ceil(attendanceData.total / 10)}
                  className="bg-[#1A1B3E] border-slate-600 text-white hover:bg-[#2A2B5E]"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
