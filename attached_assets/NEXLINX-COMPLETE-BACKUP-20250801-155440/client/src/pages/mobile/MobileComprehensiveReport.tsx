import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MobileLayout } from "@/components/MobileLayout";
import { 
  FileText,
  Download,
  Calendar,
  Clock,
  TrendingUp,
  AlertCircle,
  Building2,
  Users
} from "lucide-react";
import { format } from "date-fns";

interface WeeklyHours {
  weekStart: Date;
  weekEnd: Date;
  hoursWorked: number;
  daysWorked: number;
  expectedHours: number;
  attendancePercentage: number;
}

interface EmployeeReport {
  employeeCode: string;
  employeeName: string;
  department: string;
  weeklyReports: WeeklyHours[];
  monthlyReport: {
    month: string;
    totalHoursWorked: number;
    totalDaysWorked: number;
    expectedHours: number;
    attendancePercentage: number;
  };
}

export default function MobileComprehensiveReport() {
  const [selectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [selectedDepartment, setSelectedDepartment] = useState("all");

  const { data: report, isLoading, error } = useQuery<{
    reports: EmployeeReport[];
    departmentSummary: any;
  }>({
    queryKey: ["/api/reports/comprehensive", selectedMonth],
  });

  const handleExport = (format: "csv" | "pdf") => {
    const url = `/api/reports/comprehensive/export?month=${selectedMonth}&format=${format}`;
    window.open(url, "_blank");
  };

  if (isLoading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mx-auto mb-4" />
            <p className="text-slate-400">Generating comprehensive report...</p>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (error) {
    return (
      <MobileLayout>
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-red-500">Failed to load report</p>
            </div>
          </CardContent>
        </Card>
      </MobileLayout>
    );
  }

  const departments = ["all", ...Array.from(new Set(report?.reports.map(r => r.department) || []))];
  const filteredReports = selectedDepartment === "all" 
    ? report?.reports 
    : report?.reports.filter(r => r.department === selectedDepartment);

  return (
    <MobileLayout>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Comprehensive Report</h1>
          <p className="text-slate-400">
            {format(new Date(selectedMonth), "MMMM yyyy")} • Weekly breakdown
          </p>
        </div>

        {/* Export Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            onClick={() => handleExport("csv")}
            variant="outline"
            className="bg-slate-800/50 border-slate-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button 
            onClick={() => handleExport("pdf")}
            variant="outline"
            className="bg-slate-800/50 border-slate-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>

        {/* Department Filter */}
        <div className="overflow-x-auto -mx-4 px-4">
          <div className="flex gap-2 pb-2">
            {departments.map(dept => (
              <Button
                key={dept}
                variant={selectedDepartment === dept ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDepartment(dept)}
                className={selectedDepartment === dept 
                  ? "bg-primary text-white" 
                  : "bg-slate-800/50 border-slate-700"
                }
              >
                {dept === "all" ? "All Departments" : dept}
              </Button>
            ))}
          </div>
        </div>

        {/* Department Summary */}
        {report?.departmentSummary && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Department Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(report.departmentSummary).map(([dept, summary]: [string, any]) => (
                <div key={dept} className="flex justify-between items-center py-2 border-b border-slate-700 last:border-0">
                  <div>
                    <p className="font-medium">{dept}</p>
                    <p className="text-sm text-slate-400">{summary.employeeCount} employees</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{summary.averageAttendance.toFixed(0)}%</p>
                    <p className="text-sm text-slate-400">{summary.averageHours.toFixed(1)} hrs/emp</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Employee Reports */}
        <Tabs defaultValue="weekly" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800">
            <TabsTrigger value="weekly">Weekly View</TabsTrigger>
            <TabsTrigger value="monthly">Monthly Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="weekly" className="space-y-3">
            {filteredReports?.map((employee) => (
              <Card key={employee.employeeCode} className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{employee.employeeName}</CardTitle>
                      <p className="text-sm text-slate-400">{employee.employeeCode}</p>
                    </div>
                    <Badge variant="outline" className="bg-slate-700/50">
                      {employee.department}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {employee.weeklyReports.map((week, idx) => (
                      <div key={idx} className="pb-3 border-b border-slate-700 last:border-0">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-sm font-medium">
                            Week {idx + 1}: {format(new Date(week.weekStart), "MMM d")} - {format(new Date(week.weekEnd), "MMM d")}
                          </p>
                          <Badge 
                            variant={week.attendancePercentage >= 80 ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {week.attendancePercentage.toFixed(0)}%
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-slate-400">Hours</p>
                            <p className="font-medium">{week.hoursWorked.toFixed(1)} / {week.expectedHours}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Days</p>
                            <p className="font-medium">{week.daysWorked} / 6</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="monthly" className="space-y-3">
            {filteredReports?.map((employee) => (
              <Card key={employee.employeeCode} className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{employee.employeeName}</CardTitle>
                      <p className="text-sm text-slate-400">{employee.employeeCode} • {employee.department}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                      <Clock className="h-5 w-5 mx-auto mb-1 text-primary" />
                      <p className="text-2xl font-bold">{employee.monthlyReport.totalHoursWorked.toFixed(0)}</p>
                      <p className="text-xs text-slate-400">Total Hours</p>
                    </div>
                    <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                      <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-500" />
                      <p className="text-2xl font-bold">{employee.monthlyReport.attendancePercentage.toFixed(0)}%</p>
                      <p className="text-xs text-slate-400">Attendance</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-700 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Days Worked</span>
                      <span className="font-medium">{employee.monthlyReport.totalDaysWorked} days</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-slate-400">Expected Hours</span>
                      <span className="font-medium">{employee.monthlyReport.expectedHours} hours</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Stats Summary */}
        <Card className="bg-gradient-to-br from-primary/20 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-slate-400">Total Active Employees</p>
                  <p className="text-2xl font-bold">{filteredReports?.length}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400">Avg Attendance</p>
                <p className="text-2xl font-bold">
                  {filteredReports && filteredReports.length > 0 ? (filteredReports.reduce((acc, emp) => acc + emp.monthlyReport.attendancePercentage, 0) / filteredReports.length).toFixed(0) : '0'}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}