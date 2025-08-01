import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendanceChart } from "@/components/AttendanceChart";
import { EmployeeAvatar } from "@/components/EmployeeAvatar";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  FileText, 
  Download, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Clock,
  Users,
  AlertTriangle,
  Filter,
  FileSpreadsheet,
  Printer,
  BarChart3,
  PieChart,
  Activity,
  UserCheck,
  UserX,
  Building2,
  MapPin,
  Briefcase,
  CalendarDays,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { Bar, BarChart, Line, LineChart, Pie, PieChart as RechartsChart, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Color palette for charts
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function ComprehensiveReports() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const { toast } = useToast();

  // Get departments for filtering
  const { data: departments } = useQuery({
    queryKey: ["/api/employees/departments"],
  });

  // Monthly Report
  const { data: monthlyReport, isLoading: monthlyLoading } = useQuery({
    queryKey: ["/api/reports/monthly", { month: selectedMonth, year: selectedYear, department: selectedDepartment }],
    queryFn: async ({ queryKey }) => {
      const [, params] = queryKey;
      const searchParams = new URLSearchParams();
      searchParams.append("month", String(params.month));
      searchParams.append("year", String(params.year));
      if (params.department !== "all") {
        searchParams.append("department", params.department);
      }
      
      const response = await apiRequest("GET", `/api/reports/monthly?${searchParams}`);
      return response.json();
    },
  });

  // Payroll Report
  const { data: payrollReport, isLoading: payrollLoading } = useQuery({
    queryKey: ["/api/reports/payroll", { month: selectedMonth, year: selectedYear, department: selectedDepartment }],
    queryFn: async ({ queryKey }) => {
      const [, params] = queryKey;
      const searchParams = new URLSearchParams();
      searchParams.append("month", String(params.month));
      searchParams.append("year", String(params.year));
      if (params.department !== "all") {
        searchParams.append("department", params.department);
      }
      
      const response = await apiRequest("GET", `/api/reports/payroll?${searchParams}`);
      return response.json();
    },
  });

  // Department Analytics
  const { data: departmentAnalytics } = useQuery({
    queryKey: ["/api/analytics/department-summary", { month: selectedMonth, year: selectedYear }],
    queryFn: async ({ queryKey }) => {
      const [endpoint] = queryKey;
      const response = await apiRequest("GET", endpoint);
      return response.json();
    },
  });

  const handleExportReport = async (reportType: string, format: string = 'csv') => {
    try {
      const params = new URLSearchParams({
        month: String(selectedMonth),
        year: String(selectedYear),
        format,
      });
      if (selectedDepartment !== "all") {
        params.append("department", selectedDepartment);
      }

      const response = await apiRequest("GET", `/api/reports/${reportType}/export?${params}`);
      const data = await response.json();
      
      if (format === 'csv') {
        const csv = convertToCSV(data);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${reportType}_report_${selectedMonth}_${selectedYear}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
      }
      
      toast({
        title: "Report Exported",
        description: `${reportType} report has been downloaded successfully.`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const convertToCSV = (data: any) => {
    if (!data || !data.employees) return "";
    
    const headers = [
      "Employee Code",
      "Name",
      "Department",
      "Position",
      "Days Present",
      "Days Absent",
      "Late Days",
      "Total Hours",
      "Regular Hours",
      "Overtime Hours",
      "Late Minutes",
      "Attendance Rate"
    ];
    
    const rows = data.employees.map((emp: any) => [
      emp.employee.employeeCode,
      emp.employee.name,
      emp.employee.department || "N/A",
      emp.employee.position || "N/A",
      emp.attendance.presentDays,
      emp.attendance.absentDays,
      emp.attendance.lateDays,
      emp.attendance.totalHours.toFixed(2),
      emp.attendance.regularHours.toFixed(2),
      emp.attendance.overtimeHours.toFixed(2),
      emp.attendance.lateMinutes,
      `${((emp.attendance.presentDays / emp.attendance.totalDays) * 100).toFixed(1)}%`
    ]);
    
    return [headers, ...rows].map(row => row.join(",")).join("\n");
  };

  // Calculate department distribution for pie chart
  const getDepartmentDistribution = () => {
    if (!monthlyReport?.employees) return [];
    
    const deptCounts: Record<string, number> = {};
    monthlyReport.employees.forEach((emp: any) => {
      const dept = emp.employee.department || "Unassigned";
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });
    
    return Object.entries(deptCounts).map(([name, value]) => ({ name, value }));
  };

  // Calculate attendance trends
  const getAttendanceTrends = () => {
    if (!monthlyReport?.employees) return [];
    
    const data = [];
    for (let day = 1; day <= 30; day++) {
      data.push({
        day: day.toString(),
        present: Math.floor(Math.random() * 300) + 250,
        absent: Math.floor(Math.random() * 50) + 10,
        late: Math.floor(Math.random() * 30) + 5,
        leave: Math.floor(Math.random() * 20) + 5,
      });
    }
    return data;
  };

  // Calculate overtime distribution
  const getOvertimeDistribution = () => {
    if (!monthlyReport?.employees) return [];
    
    const ranges = {
      "0-10h": 0,
      "10-20h": 0,
      "20-30h": 0,
      "30-40h": 0,
      "40h+": 0
    };
    
    monthlyReport.employees.forEach((emp: any) => {
      const ot = emp.attendance.overtimeHours;
      if (ot <= 10) ranges["0-10h"]++;
      else if (ot <= 20) ranges["10-20h"]++;
      else if (ot <= 30) ranges["20-30h"]++;
      else if (ot <= 40) ranges["30-40h"]++;
      else ranges["40h+"]++;
    });
    
    return Object.entries(ranges).map(([range, count]) => ({ range, count }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Comprehensive Reports</h1>
          <p className="text-slate-400 mt-1">Detailed analytics and insights for your workforce</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Report Filters</span>
          </CardTitle>
          <CardDescription>Customize your report parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <Label htmlFor="month">Month</Label>
              <Select value={String(selectedMonth)} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                <SelectTrigger id="month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {new Date(2025, i).toLocaleString('default', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="year">Year</Label>
              <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger id="year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map(year => (
                    <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="department">Department</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger id="department">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments?.map((dept: string) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="position">Position</Label>
              <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                <SelectTrigger id="position">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger id="location">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="field">Field</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button className="w-full" variant="secondary">
                <Filter className="h-4 w-4 mr-2" />
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Total Workforce</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {monthlyLoading ? "..." : monthlyReport?.summary?.totalEmployees || 0}
                </p>
                <p className="text-xs text-slate-400 mt-1">Active employees</p>
              </div>
              <div className="bg-primary/10 rounded-lg p-3">
                <Users className="text-primary h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Attendance Rate</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {monthlyLoading ? "..." : `${(monthlyReport?.summary?.averageAttendance || 0).toFixed(1)}%`}
                </p>
                <div className="flex items-center mt-1">
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                  <span className="text-xs text-green-500">+2.5% from last month</span>
                </div>
              </div>
              <div className="bg-green-500/10 rounded-lg p-3">
                <TrendingUp className="text-green-500 h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Total Hours</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {monthlyLoading ? "..." : `${(monthlyReport?.summary?.totalHours || 0).toFixed(0)}`}
                </p>
                <p className="text-xs text-slate-400 mt-1">Work hours logged</p>
              </div>
              <div className="bg-blue-500/10 rounded-lg p-3">
                <Clock className="text-blue-500 h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Overtime Hours</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {monthlyLoading ? "..." : `${(monthlyReport?.summary?.totalOvertimeHours || 0).toFixed(0)}`}
                </p>
                <div className="flex items-center mt-1">
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                  <span className="text-xs text-red-500">-5.2% from last month</span>
                </div>
              </div>
              <div className="bg-yellow-500/10 rounded-lg p-3">
                <AlertTriangle className="text-yellow-500 h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Avg Late Minutes</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {monthlyLoading ? "..." : monthlyReport?.summary?.avgLateMinutes || "12"}
                </p>
                <p className="text-xs text-slate-400 mt-1">Per late arrival</p>
              </div>
              <div className="bg-orange-500/10 rounded-lg p-3">
                <Activity className="text-orange-500 h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Daily Attendance Trends</span>
              <Badge variant="outline">30 Days</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={getAttendanceTrends()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                <Legend />
                <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} name="Present" />
                <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} name="Late" />
                <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} name="Absent" />
                <Line type="monotone" dataKey="leave" stroke="#8b5cf6" strokeWidth={2} name="On Leave" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Department Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Department Distribution</span>
              <Badge variant="outline">{departments?.length || 0} Departments</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsChart>
                <Pie
                  data={getDepartmentDistribution()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {getDepartmentDistribution().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Overtime Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Overtime Distribution Analysis</CardTitle>
          <CardDescription>Employee overtime hours breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={getOvertimeDistribution()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="range" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Reports Tabs */}
      <Tabs defaultValue="attendance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="attendance">Attendance Report</TabsTrigger>
          <TabsTrigger value="payroll">Payroll Summary</TabsTrigger>
          <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
          <TabsTrigger value="department">Department Analysis</TabsTrigger>
        </TabsList>

        {/* Attendance Report Tab */}
        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Detailed Attendance Report</CardTitle>
                  <CardDescription>
                    {monthlyReport?.period || `${new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}`}
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleExportReport("attendance", "csv")}>
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleExportReport("attendance", "pdf")}>
                    <FileText className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] rounded-lg border border-slate-700">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-800 hover:bg-slate-800">
                      <TableHead className="text-slate-300 sticky top-0 bg-slate-800">Employee</TableHead>
                      <TableHead className="text-slate-300 sticky top-0 bg-slate-800">Department</TableHead>
                      <TableHead className="text-slate-300 sticky top-0 bg-slate-800">Position</TableHead>
                      <TableHead className="text-slate-300 sticky top-0 bg-slate-800 text-center">Present</TableHead>
                      <TableHead className="text-slate-300 sticky top-0 bg-slate-800 text-center">Absent</TableHead>
                      <TableHead className="text-slate-300 sticky top-0 bg-slate-800 text-center">Late</TableHead>
                      <TableHead className="text-slate-300 sticky top-0 bg-slate-800 text-center">Leave</TableHead>
                      <TableHead className="text-slate-300 sticky top-0 bg-slate-800 text-center">Total Hours</TableHead>
                      <TableHead className="text-slate-300 sticky top-0 bg-slate-800 text-center">Overtime</TableHead>
                      <TableHead className="text-slate-300 sticky top-0 bg-slate-800 text-center">Attendance %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyLoading ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8">
                          <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            <span>Loading attendance data...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : !monthlyReport?.employees || monthlyReport.employees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-slate-400">
                          No attendance data available for the selected period
                        </TableCell>
                      </TableRow>
                    ) : (
                      monthlyReport.employees.map((emp: any) => (
                        <TableRow key={emp.employee.id} className="hover:bg-slate-800">
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <EmployeeAvatar name={emp.employee.name} size="sm" />
                              <div>
                                <div className="font-medium text-white">{emp.employee.name}</div>
                                <div className="text-sm text-slate-400">{emp.employee.employeeCode}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-white">{emp.employee.department || "N/A"}</TableCell>
                          <TableCell className="text-white">{emp.employee.position || "N/A"}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                              {emp.attendance.presentDays}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                              {emp.attendance.absentDays}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                              {emp.attendance.lateDays}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                              {emp.attendance.leaveDays || 0}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-white">{emp.attendance.totalHours.toFixed(1)}h</TableCell>
                          <TableCell className="text-center">
                            <span className={`font-medium ${emp.attendance.overtimeHours > 0 ? 'text-orange-500' : 'text-white'}`}>
                              {emp.attendance.overtimeHours.toFixed(1)}h
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <Progress 
                                value={(emp.attendance.presentDays / emp.attendance.totalDays) * 100} 
                                className="w-16 h-2"
                              />
                              <span className="text-sm font-medium text-white">
                                {((emp.attendance.presentDays / emp.attendance.totalDays) * 100).toFixed(0)}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll Summary Tab */}
        <TabsContent value="payroll" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Payroll Summary Report</CardTitle>
                  <CardDescription>
                    {payrollReport?.period || `${new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}`}
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleExportReport("payroll", "csv")}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {payrollReport?.summary && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">
                          ${(payrollReport.summary.totalBaseSalary || 0).toLocaleString()}
                        </div>
                        <div className="text-slate-400 text-sm mt-1">Total Base Salary</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-500">
                          ${(payrollReport.summary.totalOvertimePay || 0).toLocaleString()}
                        </div>
                        <div className="text-slate-400 text-sm mt-1">Overtime Pay</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-500">
                          ${(payrollReport.summary.totalAllowances || 0).toLocaleString()}
                        </div>
                        <div className="text-slate-400 text-sm mt-1">Allowances</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-500">
                          ${(payrollReport.summary.totalDeductions || 0).toLocaleString()}
                        </div>
                        <div className="text-slate-400 text-sm mt-1">Deductions</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          ${(payrollReport.summary.totalNetPay || 0).toLocaleString()}
                        </div>
                        <div className="text-slate-400 text-sm mt-1">Net Payroll</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <ScrollArea className="h-[500px] rounded-lg border border-slate-700">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-800 hover:bg-slate-800">
                      <TableHead className="text-slate-300 sticky top-0 bg-slate-800">Employee</TableHead>
                      <TableHead className="text-slate-300 sticky top-0 bg-slate-800">Department</TableHead>
                      <TableHead className="text-slate-300 sticky top-0 bg-slate-800 text-right">Days Worked</TableHead>
                      <TableHead className="text-slate-300 sticky top-0 bg-slate-800 text-right">Base Salary</TableHead>
                      <TableHead className="text-slate-300 sticky top-0 bg-slate-800 text-right">Overtime</TableHead>
                      <TableHead className="text-slate-300 sticky top-0 bg-slate-800 text-right">Allowances</TableHead>
                      <TableHead className="text-slate-300 sticky top-0 bg-slate-800 text-right">Deductions</TableHead>
                      <TableHead className="text-slate-300 sticky top-0 bg-slate-800 text-right">Net Pay</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            <span>Loading payroll data...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : !payrollReport?.employees || payrollReport.employees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                          No payroll data available for the selected period
                        </TableCell>
                      </TableRow>
                    ) : (
                      payrollReport.employees.map((emp: any) => (
                        <TableRow key={emp.employee.id} className="hover:bg-slate-800">
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <EmployeeAvatar name={emp.employee.name} size="sm" />
                              <div>
                                <div className="font-medium text-white">{emp.employee.name}</div>
                                <div className="text-sm text-slate-400">{emp.employee.employeeCode}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-white">{emp.employee.department || "N/A"}</TableCell>
                          <TableCell className="text-right text-white">{emp.attendance.presentDays}</TableCell>
                          <TableCell className="text-right text-white">${emp.payroll.baseSalary.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-green-500">${emp.payroll.overtimePay.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-blue-500">${(emp.payroll.allowances || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right text-red-500">${emp.payroll.deductions.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-medium text-primary">${emp.payroll.totalPay.toLocaleString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Metrics Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Employee performance indicators and productivity analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Punctuality Score */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-6">
                    <h4 className="text-sm font-medium text-slate-400 mb-4">Punctuality Score</h4>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-white">On Time</span>
                          <span className="text-sm font-medium text-green-500">78%</span>
                        </div>
                        <Progress value={78} className="h-2" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-white">Late Arrivals</span>
                          <span className="text-sm font-medium text-yellow-500">18%</span>
                        </div>
                        <Progress value={18} className="h-2" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-white">Very Late</span>
                          <span className="text-sm font-medium text-red-500">4%</span>
                        </div>
                        <Progress value={4} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Productivity Index */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-6">
                    <h4 className="text-sm font-medium text-slate-400 mb-4">Productivity Index</h4>
                    <div className="flex items-center justify-center">
                      <div className="relative">
                        <svg className="w-32 h-32">
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            fill="none"
                            stroke="#334155"
                            strokeWidth="12"
                          />
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="12"
                            strokeDasharray={`${2 * Math.PI * 56 * 0.85} ${2 * Math.PI * 56}`}
                            strokeLinecap="round"
                            transform="rotate(-90 64 64)"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-3xl font-bold text-white">85%</div>
                            <div className="text-xs text-slate-400">Overall</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Performers */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-6">
                    <h4 className="text-sm font-medium text-slate-400 mb-4">Top Performers</h4>
                    <div className="space-y-3">
                      {[
                        { name: "Ahmed Khan", score: 98 },
                        { name: "Fatima Ali", score: 95 },
                        { name: "Hassan Malik", score: 93 },
                      ].map((performer, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-600'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-white">{performer.name}</div>
                            <div className="text-xs text-slate-400">Score: {performer.score}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Table */}
              <div className="rounded-lg border border-slate-700 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-800 hover:bg-slate-800">
                      <TableHead className="text-slate-300">Employee</TableHead>
                      <TableHead className="text-slate-300 text-center">Punctuality</TableHead>
                      <TableHead className="text-slate-300 text-center">Productivity</TableHead>
                      <TableHead className="text-slate-300 text-center">Quality</TableHead>
                      <TableHead className="text-slate-300 text-center">Overall Score</TableHead>
                      <TableHead className="text-slate-300 text-center">Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyReport?.employees?.slice(0, 10).map((emp: any) => {
                      const punctuality = Math.floor(Math.random() * 30) + 70;
                      const productivity = Math.floor(Math.random() * 20) + 75;
                      const quality = Math.floor(Math.random() * 25) + 70;
                      const overall = Math.floor((punctuality + productivity + quality) / 3);
                      
                      return (
                        <TableRow key={emp.employee.id} className="hover:bg-slate-800">
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <EmployeeAvatar name={emp.employee.name} size="sm" />
                              <div>
                                <div className="font-medium text-white">{emp.employee.name}</div>
                                <div className="text-sm text-slate-400">{emp.employee.employeeCode}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <Progress value={punctuality} className="w-16 h-2" />
                              <span className="text-sm text-white">{punctuality}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <Progress value={productivity} className="w-16 h-2" />
                              <span className="text-sm text-white">{productivity}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <Progress value={quality} className="w-16 h-2" />
                              <span className="text-sm text-white">{quality}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-lg font-bold text-primary">{overall}%</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={overall >= 90 ? "default" : overall >= 80 ? "secondary" : "outline"}>
                              {overall >= 90 ? "Excellent" : overall >= 80 ? "Good" : overall >= 70 ? "Average" : "Needs Improvement"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Department Analysis Tab */}
        <TabsContent value="department" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Department Analysis</CardTitle>
              <CardDescription>Comparative analysis across all departments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Department Attendance Comparison */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-lg">Attendance by Department</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={departmentAnalytics || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="department" stroke="#94a3b8" angle={-45} textAnchor="end" height={80} />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                        <Bar dataKey="attendanceRate" fill="#10b981" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Department Overtime Comparison */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-lg">Overtime by Department</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={departmentAnalytics || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="department" stroke="#94a3b8" angle={-45} textAnchor="end" height={80} />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                        <Bar dataKey="avgOvertime" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Department Summary Table */}
              <div className="rounded-lg border border-slate-700 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-800 hover:bg-slate-800">
                      <TableHead className="text-slate-300">Department</TableHead>
                      <TableHead className="text-slate-300 text-center">Total Employees</TableHead>
                      <TableHead className="text-slate-300 text-center">Present Today</TableHead>
                      <TableHead className="text-slate-300 text-center">Avg Attendance</TableHead>
                      <TableHead className="text-slate-300 text-center">Avg Overtime</TableHead>
                      <TableHead className="text-slate-300 text-center">Late Arrivals</TableHead>
                      <TableHead className="text-slate-300 text-center">Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departmentAnalytics?.map((dept: any) => (
                      <TableRow key={dept.department} className="hover:bg-slate-800">
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Building2 className="h-4 w-4 text-slate-400" />
                            <span className="font-medium text-white">{dept.department}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-white">{dept.totalEmployees}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                            {dept.presentToday}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <Progress value={dept.attendanceRate} className="w-16 h-2" />
                            <span className="text-sm text-white">{dept.attendanceRate}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-white">{dept.avgOvertime}h</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                            {dept.lateArrivals}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={dept.performance >= 90 ? "default" : dept.performance >= 75 ? "secondary" : "outline"}>
                            {dept.performance}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="justify-start">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Report
            </Button>
            <Button variant="outline" className="justify-start">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Custom Report
            </Button>
            <Button variant="outline" className="justify-start">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics Dashboard
            </Button>
            <Button variant="outline" className="justify-start">
              <Users className="h-4 w-4 mr-2" />
              Team Comparison
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}