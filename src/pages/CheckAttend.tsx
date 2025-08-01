import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, getDaysInMonth, setDate } from "date-fns";
import { Calendar, Users, CheckCircle, AlertCircle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface CheckAttendEmployee {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  department: string;
  checkAttend: "yes" | "half" | "no";
  firstPunch: string | null;
  lastPunch: string | null;
  totalHours: number | null;
  status: string;
  nonBio?: boolean;
}

interface CheckAttendData {
  date: string;
  summary: {
    total: number;
    yes: number;
    half: number;
    no: number;
  };
  employees: CheckAttendEmployee[];
}

interface DepartmentData {
  department: string;
  totalEmployees: number;
  yes: number;
  half: number;
  no: number;
  yesPercentage: string;
  halfPercentage: string;
  noPercentage: string;
}

function getStatusBadge(status: "yes" | "half" | "no") {
  switch (status) {
    case "yes":
      return <Badge className="bg-green-500 text-white">Complete</Badge>;
    case "half":
      return <Badge className="bg-yellow-500 text-white">Incomplete</Badge>;
    case "no":
      return <Badge className="bg-red-500 text-white">Absent</Badge>;
  }
}

function getStatusIcon(status: "yes" | "half" | "no") {
  switch (status) {
    case "yes":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "half":
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    case "no":
      return <XCircle className="h-4 w-4 text-red-500" />;
  }
}

export default function CheckAttend() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

  const { data: checkAttendData, isLoading, refetch } = useQuery<CheckAttendData>({
    queryKey: ["/api/checkattend/status", format(selectedDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const response = await fetch(`/api/checkattend/status?date=${format(selectedDate, "yyyy-MM-dd")}`);
      if (!response.ok) throw new Error("Failed to fetch checkAttend data");
      return response.json();
    }
  });

  const { data: departmentData } = useQuery<{ departments: DepartmentData[] }>({
    queryKey: ["/api/checkattend/department", format(selectedDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const response = await fetch(`/api/checkattend/department?date=${format(selectedDate, "yyyy-MM-dd")}`);
      if (!response.ok) throw new Error("Failed to fetch department data");
      return response.json();
    }
  });

  const handleProcessAttendance = async () => {
    try {
      await apiRequest("/api/checkattend/process", {
        method: "POST",
        body: JSON.stringify({ date: format(selectedDate, "yyyy-MM-dd") })
      });
      toast({
        title: "Processing Complete",
        description: "CheckAttend data has been processed successfully.",
      });
      refetch();
    } catch (error) {
      toast({
        title: "Processing Failed",
        description: "Failed to process CheckAttend data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredEmployees = checkAttendData?.employees.filter(emp => {
    const matchesSearch = emp.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = departmentFilter === "all" || emp.department === departmentFilter;
    const matchesStatus = statusFilter === "all" || emp.checkAttend === statusFilter;
    return matchesSearch && matchesDepartment && matchesStatus;
  }) || [];

  const departments = [...new Set(checkAttendData?.employees.map(emp => emp.department) || [])];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">CheckAttend Analysis</h1>
          <p className="text-muted-foreground">
            Daily attendance completion analysis for all employees
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <DatePicker
            date={selectedDate}
            onDateChange={(date) => date && setSelectedDate(date)}
          />
          <Button onClick={handleProcessAttendance} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Process
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{checkAttendData?.summary.total || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-600">Complete Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{checkAttendData?.summary.yes || 0}</div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <Progress 
              value={(checkAttendData?.summary.yes || 0) / (checkAttendData?.summary.total || 1) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-yellow-600">Incomplete Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{checkAttendData?.summary.half || 0}</div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
            <Progress 
              value={(checkAttendData?.summary.half || 0) / (checkAttendData?.summary.total || 1) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-600">No Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{checkAttendData?.summary.no || 0}</div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <Progress 
              value={(checkAttendData?.summary.no || 0) / (checkAttendData?.summary.total || 1) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList>
          <TabsTrigger value="employees">Employee Details</TabsTrigger>
          <TabsTrigger value="departments">Department Summary</TabsTrigger>
          <TabsTrigger value="heatmap">Attendance Heat Map</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <Input
              placeholder="Search by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="yes">Complete</SelectItem>
                <SelectItem value="half">Incomplete</SelectItem>
                <SelectItem value="no">Absent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Employee List */}
          <Card>
            <CardHeader>
              <CardTitle>Employee CheckAttend Status</CardTitle>
              <CardDescription>
                Showing {filteredEmployees.length} of {checkAttendData?.employees.length || 0} employees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : filteredEmployees.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No employees found</div>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <div key={employee.employeeId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                        <div className="flex items-center space-x-4">
                          {getStatusIcon(employee.checkAttend)}
                          <div>
                            <div className="font-medium">
                              {employee.employeeName}
                              {employee.nonBio && (
                                <span className="ml-2 text-xs text-blue-600 font-normal">(NonBio)</span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {employee.employeeCode} • {employee.department}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            {employee.firstPunch && (
                              <div className="text-sm">
                                In: {format(new Date(employee.firstPunch), "HH:mm")}
                              </div>
                            )}
                            {employee.lastPunch && employee.lastPunch !== employee.firstPunch && (
                              <div className="text-sm">
                                Out: {format(new Date(employee.lastPunch), "HH:mm")}
                              </div>
                            )}
                            {employee.totalHours && (
                              <div className="text-sm text-muted-foreground">
                                {employee.totalHours.toFixed(1)} hours
                              </div>
                            )}
                          </div>
                          {getStatusBadge(employee.checkAttend)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Department CheckAttend Summary</CardTitle>
              <CardDescription>
                Attendance completion analysis by department
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Bar Chart Visualization */}
              <div className="mb-8 h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={departmentData?.departments}
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="department" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis label={{ value: 'Number of Employees', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="yes" stackId="a" fill="#10B981" name="Complete" />
                    <Bar dataKey="half" stackId="a" fill="#F59E0B" name="Incomplete" />
                    <Bar dataKey="no" stackId="a" fill="#EF4444" name="Absent" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Department Details */}
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {departmentData?.departments.map((dept) => (
                    <div key={dept.department} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{dept.department}</h3>
                        <Badge variant="outline">
                          <Users className="h-3 w-3 mr-1" />
                          {dept.totalEmployees} employees
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm font-medium">Complete</span>
                          </div>
                          <div className="text-2xl font-bold text-green-600">{dept.yes}</div>
                          <Progress value={parseFloat(dept.yesPercentage)} className="mt-1 h-2" />
                          <div className="text-xs text-muted-foreground mt-1">{dept.yesPercentage}%</div>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm font-medium">Incomplete</span>
                          </div>
                          <div className="text-2xl font-bold text-yellow-600">{dept.half}</div>
                          <Progress value={parseFloat(dept.halfPercentage)} className="mt-1 h-2" />
                          <div className="text-xs text-muted-foreground mt-1">{dept.halfPercentage}%</div>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <XCircle className="h-4 w-4 text-red-500" />
                            <span className="text-sm font-medium">Absent</span>
                          </div>
                          <div className="text-2xl font-bold text-red-600">{dept.no}</div>
                          <Progress value={parseFloat(dept.noPercentage)} className="mt-1 h-2" />
                          <div className="text-xs text-muted-foreground mt-1">{dept.noPercentage}%</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="heatmap" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Attendance Heat Map</CardTitle>
              <CardDescription>
                Visual representation of employee attendance patterns for {format(selectedDate, "MMMM yyyy")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HeatMapView data={checkAttendData} selectedDate={selectedDate} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface HeatMapViewProps {
  data: CheckAttendData | undefined;
  selectedDate: Date;
}

function HeatMapView({ data, selectedDate }: HeatMapViewProps) {
  const daysInMonth = getDaysInMonth(selectedDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  if (!data?.employees || data.employees.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No attendance data available for the selected date
      </div>
    );
  }

  // Group employees by department
  const employeesByDept = data.employees.reduce((acc, emp) => {
    const dept = emp.department || "No Department";
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(emp);
    return acc;
  }, {} as Record<string, CheckAttendEmployee[]>);

  const getAttendanceColor = (status: string) => {
    switch (status) {
      case "yes":
        return "bg-green-500";
      case "half":
        return "bg-yellow-500";
      case "no":
        return "bg-red-500";
      default:
        return "bg-gray-200";
    }
  };

  return (
    <ScrollArea className="w-full">
      <div className="min-w-[1200px]">
        {/* Header row with days */}
        <div className="flex sticky top-0 bg-background z-10 border-b">
          <div className="w-48 p-2 font-medium border-r">Employee</div>
          <div className="flex">
            {days.map((day) => (
              <div
                key={day}
                className="w-8 h-8 flex items-center justify-center text-xs font-medium border-r"
              >
                {day}
              </div>
            ))}
          </div>
        </div>

        {/* Employee rows grouped by department */}
        {Object.entries(employeesByDept).map(([dept, employees]) => (
          <div key={dept}>
            <div className="bg-muted px-2 py-1 font-medium text-sm sticky left-0">
              {dept} ({employees.length})
            </div>
            {employees.map((employee) => (
              <div key={employee.employeeId} className="flex hover:bg-muted/50">
                <div className="w-48 p-2 text-sm truncate border-r sticky left-0 bg-background">
                  <div className="font-medium truncate">{employee.employeeName}</div>
                  <div className="text-xs text-muted-foreground">{employee.employeeCode}</div>
                </div>
                <div className="flex">
                  {days.map((day) => {
                    // For now, we'll use the same status for all days
                    // In a real implementation, you'd fetch daily data
                    const status = day === new Date(selectedDate).getDate() 
                      ? employee.checkAttend 
                      : "no";
                    
                    return (
                      <div
                        key={day}
                        className={cn(
                          "w-8 h-8 border-r border-b cursor-pointer transition-opacity hover:opacity-80",
                          getAttendanceColor(status)
                        )}
                        title={`${employee.employeeName} - Day ${day}: ${status === "yes" ? "Present" : status === "half" ? "Half Day" : "Absent"}`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}