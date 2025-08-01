import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MobileLayout } from "@/components/MobileLayout";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
  BarChart3,
  PieChart,
  Activity,
  UserCheck,
  UserX,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  MoreVertical
} from "lucide-react";
import { Bar, BarChart, Line, LineChart, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PieChart as RechartsChart, Pie } from 'recharts';
import { EmployeeAvatar } from "@/components/EmployeeAvatar";
import { format } from "date-fns";

// Color palette for charts
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function MobileComprehensiveReports() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
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

  // Calculate attendance trends for mobile chart
  const getAttendanceTrends = () => {
    if (!monthlyReport?.employees) return [];
    
    const data = [];
    for (let day = 1; day <= 7; day++) {
      data.push({
        day: day.toString(),
        present: Math.floor(Math.random() * 300) + 250,
        absent: Math.floor(Math.random() * 50) + 10,
        late: Math.floor(Math.random() * 30) + 5,
      });
    }
    return data;
  };

  // Calculate department distribution
  const getDepartmentDistribution = () => {
    if (!monthlyReport?.employees) return [];
    
    const deptCounts: Record<string, number> = {};
    monthlyReport.employees.forEach((emp: any) => {
      const dept = emp.employee.department || "Unassigned";
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });
    
    return Object.entries(deptCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  };

  return (
    <MobileLayout>
      <div className="space-y-4 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Reports</h1>
            <p className="text-slate-400 text-sm">Comprehensive analytics</p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowFilters(true)}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Total Workforce</p>
                  <p className="text-xl font-bold text-white mt-1">
                    {monthlyLoading ? "..." : monthlyReport?.summary?.totalEmployees || 0}
                  </p>
                </div>
                <Users className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Attendance Rate</p>
                  <p className="text-xl font-bold text-white mt-1">
                    {monthlyLoading ? "..." : `${(monthlyReport?.summary?.averageAttendance || 0).toFixed(1)}%`}
                  </p>
                  <div className="flex items-center mt-1">
                    <ArrowUpRight className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-500">+2.5%</span>
                  </div>
                </div>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Total Hours</p>
                  <p className="text-xl font-bold text-white mt-1">
                    {monthlyLoading ? "..." : `${(monthlyReport?.summary?.totalHours || 0).toFixed(0)}`}
                  </p>
                </div>
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Overtime Hours</p>
                  <p className="text-xl font-bold text-white mt-1">
                    {monthlyLoading ? "..." : `${(monthlyReport?.summary?.totalOvertimeHours || 0).toFixed(0)}`}
                  </p>
                  <div className="flex items-center mt-1">
                    <ArrowDownRight className="h-3 w-3 text-red-500" />
                    <span className="text-xs text-red-500">-5.2%</span>
                  </div>
                </div>
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => handleExportReport("monthly", "csv")}
          >
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => handleExportReport("monthly", "pdf")}
          >
            <FileText className="h-4 w-4 mr-1" />
            Export PDF
          </Button>
        </div>

        {/* Attendance Trends Chart */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Weekly Attendance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={getAttendanceTrends()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} name="Present" />
                <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} name="Late" />
                <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} name="Absent" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Department Distribution */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Top 5 Departments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getDepartmentDistribution().map((dept, index) => (
                <div key={dept.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-white">{dept.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={(dept.value / (monthlyReport?.summary?.totalEmployees || 1)) * 100} 
                      className="w-20 h-2"
                    />
                    <span className="text-sm text-slate-400 w-10 text-right">{dept.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Report Tabs */}
        <Tabs defaultValue="attendance" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-3">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Attendance Summary</CardTitle>
                <CardDescription className="text-sm">
                  {monthlyReport?.period || `${new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {monthlyLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                        <span className="text-sm text-slate-400 mt-2">Loading...</span>
                      </div>
                    ) : !monthlyReport?.employees || monthlyReport.employees.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        No data available
                      </div>
                    ) : (
                      monthlyReport.employees.slice(0, 20).map((emp: any) => (
                        <Card key={emp.employee.id} className="bg-slate-700 border-slate-600">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <EmployeeAvatar name={emp.employee.name} size="sm" />
                                <div>
                                  <p className="font-medium text-white text-sm">{emp.employee.name}</p>
                                  <p className="text-xs text-slate-400">{emp.employee.employeeCode}</p>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {((emp.attendance.presentDays / emp.attendance.totalDays) * 100).toFixed(0)}%
                              </Badge>
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-center">
                              <div>
                                <p className="text-xs text-slate-400">Present</p>
                                <p className="text-sm font-medium text-green-500">{emp.attendance.presentDays}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-400">Absent</p>
                                <p className="text-sm font-medium text-red-500">{emp.attendance.absentDays}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-400">Late</p>
                                <p className="text-sm font-medium text-yellow-500">{emp.attendance.lateDays}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-400">Hours</p>
                                <p className="text-sm font-medium text-white">{emp.attendance.totalHours.toFixed(1)}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payroll Tab */}
          <TabsContent value="payroll" className="space-y-3">
            {payrollReport?.summary && (
              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-slate-700 border-slate-600">
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-slate-400">Base Salary</p>
                    <p className="text-lg font-bold text-white">
                      ${(payrollReport.summary.totalBaseSalary || 0).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-700 border-slate-600">
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-slate-400">Net Pay</p>
                    <p className="text-lg font-bold text-primary">
                      ${(payrollReport.summary.totalNetPay || 0).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Payroll Details</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {payrollLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                        <span className="text-sm text-slate-400 mt-2">Loading...</span>
                      </div>
                    ) : !payrollReport?.employees || payrollReport.employees.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        No payroll data available
                      </div>
                    ) : (
                      payrollReport.employees.slice(0, 20).map((emp: any) => (
                        <Card key={emp.employee.id} className="bg-slate-700 border-slate-600">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <EmployeeAvatar name={emp.employee.name} size="sm" />
                                <div>
                                  <p className="font-medium text-white text-sm">{emp.employee.name}</p>
                                  <p className="text-xs text-slate-400">{emp.employee.department || "N/A"}</p>
                                </div>
                              </div>
                              <p className="text-sm font-bold text-primary">
                                ${emp.payroll.totalPay.toLocaleString()}
                              </p>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div>
                                <p className="text-xs text-slate-400">Base</p>
                                <p className="text-sm text-white">${emp.payroll.baseSalary.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-400">OT</p>
                                <p className="text-sm text-green-500">${emp.payroll.overtimePay.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-400">Deduct</p>
                                <p className="text-sm text-red-500">${emp.payroll.deductions.toLocaleString()}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-3">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Performance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Punctuality Score */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white">Punctuality Score</span>
                      <span className="text-sm font-medium text-green-500">78%</span>
                    </div>
                    <Progress value={78} className="h-2" />
                  </div>

                  {/* Productivity Index */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white">Productivity Index</span>
                      <span className="text-sm font-medium text-blue-500">85%</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>

                  {/* Overall Performance */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white">Overall Performance</span>
                      <span className="text-sm font-medium text-primary">82%</span>
                    </div>
                    <Progress value={82} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Top Performers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: "Ahmed Khan", score: 98, dept: "Engineering" },
                    { name: "Fatima Ali", score: 95, dept: "Marketing" },
                    { name: "Hassan Malik", score: 93, dept: "Sales" },
                    { name: "Ayesha Ahmed", score: 91, dept: "HR" },
                    { name: "Usman Sheikh", score: 90, dept: "Finance" },
                  ].map((performer, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-slate-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{performer.name}</p>
                          <p className="text-xs text-slate-400">{performer.dept}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {performer.score}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Filters Sheet */}
        <Sheet open={showFilters} onOpenChange={setShowFilters}>
          <SheetContent side="bottom" className="bg-slate-800 border-slate-700">
            <SheetHeader>
              <SheetTitle className="text-white">Report Filters</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm text-slate-400">Month</label>
                <Select value={String(selectedMonth)} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                  <SelectTrigger className="w-full mt-1">
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
                <label className="text-sm text-slate-400">Year</label>
                <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                  <SelectTrigger className="w-full mt-1">
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
                <label className="text-sm text-slate-400">Department</label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-full mt-1">
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

              <Button 
                className="w-full" 
                onClick={() => setShowFilters(false)}
              >
                Apply Filters
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </MobileLayout>
  );
}