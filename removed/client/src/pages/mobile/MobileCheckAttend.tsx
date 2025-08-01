import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, getDaysInMonth } from "date-fns";
import { Calendar, Users, CheckCircle, AlertCircle, XCircle, RefreshCw, Menu } from "lucide-react";
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
import { MobileLayout } from "@/components/MobileLayout";
import { cn } from "@/lib/utils";

interface CheckAttendSummary {
  totalEmployees: number;
  yes: number;
  half: number;
  no: number;
  yesPercentage: string;
  halfPercentage: string;
  noPercentage: string;
  date: string;
}

interface DepartmentSummary {
  department: string;
  totalEmployees: number;
  yes: number;
  half: number;
  no: number;
  yesPercentage: string;
  halfPercentage: string;
  noPercentage: string;
}

interface EmployeeDetail {
  employeeCode: string;
  employeeName: string;
  department: string;
  checkIn: string | null;
  checkOut: string | null;
  checkattend: string;
}

export default function MobileCheckAttend() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Get timezone from settings
  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
  });

  const timezone = settings?.find((s: any) => s.key === 'system.timezone')?.value || 'Asia/Karachi';

  // Format date for display in Pakistan time
  const formatDatePKT = (date: Date) => {
    return date.toLocaleString('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // Fetch check attend status
  const { data: statusData, isLoading: statusLoading, refetch: refetchStatus } = useQuery<CheckAttendSummary>({
    queryKey: ['/api/checkattend/status', formatDatePKT(selectedDate)],
    queryFn: async () => {
      const response = await fetch(`/api/checkattend/status?date=${formatDatePKT(selectedDate)}`);
      if (!response.ok) throw new Error('Failed to fetch status');
      return response.json();
    },
  });

  // Fetch department summary
  const { data: departmentData, isLoading: departmentLoading, refetch: refetchDepartments } = useQuery<{ departments: DepartmentSummary[] }>({
    queryKey: ['/api/checkattend/departments', formatDatePKT(selectedDate)],
    queryFn: async () => {
      const response = await fetch(`/api/checkattend/departments?date=${formatDatePKT(selectedDate)}`);
      if (!response.ok) throw new Error('Failed to fetch departments');
      return response.json();
    },
  });

  // Fetch employee details
  const { data: employeeData, isLoading: employeeLoading, refetch: refetchEmployees } = useQuery<{ employees: EmployeeDetail[] }>({
    queryKey: ['/api/checkattend/departments', formatDatePKT(selectedDate), departmentFilter, searchQuery],
    queryFn: async () => {
      let url = `/api/checkattend/departments?date=${formatDatePKT(selectedDate)}`;
      if (departmentFilter !== "all") {
        url += `&department=${encodeURIComponent(departmentFilter)}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch employee details');
      return response.json();
    },
    enabled: departmentFilter !== "all",
  });

  // Get unique departments for filter
  const departments = departmentData?.departments.map(d => d.department) || [];

  // Filter employees based on search
  const filteredEmployees = employeeData?.employees.filter(emp => 
    emp.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Trigger check attend process
  const handleProcessCheckAttend = async () => {
    setIsProcessing(true);
    try {
      const response = await apiRequest('/api/checkattend/process', {
        method: 'POST',
        body: JSON.stringify({ date: formatDatePKT(selectedDate) }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Check attend process completed successfully",
        });
        refetchStatus();
        refetchDepartments();
        refetchEmployees();
      } else {
        throw new Error('Failed to process check attend');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process check attend",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'yes':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'half':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'no':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'yes':
        return <Badge className="bg-green-500 text-white">Complete</Badge>;
      case 'half':
        return <Badge className="bg-yellow-500 text-white">Incomplete</Badge>;
      case 'no':
        return <Badge className="bg-red-500 text-white">Absent</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <MobileLayout>
      <div className="space-y-4 pb-20">
          {/* Date Selection and Process Button */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Check Attendance Status</CardTitle>
              <CardDescription>Select date to view or process attendance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <DatePicker
                  date={selectedDate}
                  onDateChange={setSelectedDate}
                  className="flex-1"
                />
                <Button
                  onClick={handleProcessCheckAttend}
                  disabled={isProcessing}
                  size="sm"
                  className="whitespace-nowrap"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                      Processing
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Process
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          {statusData && (
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span className="text-2xl font-bold">{statusData.totalEmployees}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Total Active Employees</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-2xl font-bold text-green-600">{statusData.yes}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Complete ({statusData.yesPercentage}%)</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                    <span className="text-2xl font-bold text-yellow-600">{statusData.half}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Incomplete ({statusData.halfPercentage}%)</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="text-2xl font-bold text-red-600">{statusData.no}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Absent ({statusData.noPercentage}%)</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Department Chart */}
          {departmentData && departmentData.departments.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Department Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={departmentData.departments}
                      margin={{ top: 10, right: 10, left: 10, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="department" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        fontSize={10}
                      />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="yes" stackId="a" fill="#10B981" name="Complete" />
                      <Bar dataKey="half" stackId="a" fill="#F59E0B" name="Incomplete" />
                      <Bar dataKey="no" stackId="a" fill="#EF4444" name="Absent" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Department Details */}
          {departmentData && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Department Details</CardTitle>
                <CardDescription>Detailed breakdown by department</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {departmentData.departments.map((dept) => (
                      <div key={dept.department} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-sm">{dept.department}</h3>
                          <Badge variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {dept.totalEmployees}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              <span className="text-xs">Complete</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">{dept.yes}</span>
                              <span className="text-xs text-muted-foreground">({dept.yesPercentage}%)</span>
                            </div>
                          </div>
                          <Progress value={parseFloat(dept.yesPercentage)} className="h-1.5" />

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <AlertCircle className="h-3 w-3 text-yellow-500" />
                              <span className="text-xs">Incomplete</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">{dept.half}</span>
                              <span className="text-xs text-muted-foreground">({dept.halfPercentage}%)</span>
                            </div>
                          </div>
                          <Progress value={parseFloat(dept.halfPercentage)} className="h-1.5" />

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <XCircle className="h-3 w-3 text-red-500" />
                              <span className="text-xs">Absent</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">{dept.no}</span>
                              <span className="text-xs text-muted-foreground">({dept.noPercentage}%)</span>
                            </div>
                          </div>
                          <Progress value={parseFloat(dept.noPercentage)} className="h-1.5" />
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Heat Map View */}
          {employeeData && employeeData.employees.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Attendance Heat Map</CardTitle>
                <CardDescription>
                  Visual attendance patterns for {format(selectedDate, "MMMM yyyy")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MobileHeatMapView 
                  employees={employeeData.employees} 
                  selectedDate={selectedDate} 
                />
              </CardContent>
            </Card>
          )}
      </div>
    </MobileLayout>
  );
}

interface MobileHeatMapViewProps {
  employees: EmployeeDetail[];
  selectedDate: Date;
}

function MobileHeatMapView({ employees, selectedDate }: MobileHeatMapViewProps) {
  const daysInMonth = getDaysInMonth(selectedDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Group employees by department
  const employeesByDept = employees.reduce((acc, emp) => {
    const dept = emp.department || "No Department";
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(emp);
    return acc;
  }, {} as Record<string, EmployeeDetail[]>);

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
      <div className="min-w-[800px]">
        {/* Header row with days */}
        <div className="flex sticky top-0 bg-background z-10 border-b">
          <div className="w-32 p-1 font-medium text-xs border-r">Employee</div>
          <div className="flex">
            {days.map((day) => (
              <div
                key={day}
                className="w-6 h-6 flex items-center justify-center text-[10px] font-medium border-r"
              >
                {day}
              </div>
            ))}
          </div>
        </div>

        {/* Employee rows grouped by department */}
        {Object.entries(employeesByDept).map(([dept, emps]) => (
          <div key={dept}>
            <div className="bg-muted px-1 py-0.5 font-medium text-xs sticky left-0">
              {dept} ({emps.length})
            </div>
            {emps.map((employee) => (
              <div key={employee.employeeCode} className="flex hover:bg-muted/50">
                <div className="w-32 p-1 text-xs truncate border-r sticky left-0 bg-background">
                  <div className="font-medium truncate">{employee.employeeName}</div>
                  <div className="text-[10px] text-muted-foreground">{employee.employeeCode}</div>
                </div>
                <div className="flex">
                  {days.map((day) => {
                    // For now, use the same status for all days
                    const status = day === new Date(selectedDate).getDate() 
                      ? employee.checkattend 
                      : "no";
                    
                    return (
                      <div
                        key={day}
                        className={cn(
                          "w-6 h-6 border-r border-b",
                          getAttendanceColor(status)
                        )}
                        title={`Day ${day}: ${status === "yes" ? "Present" : status === "half" ? "Half Day" : "Absent"}`}
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