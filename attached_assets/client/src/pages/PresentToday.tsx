import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatPKTDateTime } from "@/utils/timezone";
import { 
  Users, 
  Clock, 
  Search,
  LogOut,
  AlertCircle,
  Building2,
  UserCircle,
  Timer,
  CheckCircle
} from "lucide-react";
import { format, differenceInMinutes, differenceInHours, addHours, addMinutes } from "date-fns";

interface PresentEmployee {
  employeeCode: string;
  employeeName: string;
  department: string;
  checkInTime: string;
  duration: string;
  hoursWorked: number;
  forcedOutTime?: string;
}

interface TerminateDialogData {
  employee: PresentEmployee;
  isOpen: boolean;
}

export default function PresentToday() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [terminateDialog, setTerminateDialog] = useState<TerminateDialogData>({
    employee: null,
    isOpen: false
  });

  // Query for present employees
  const { data: rawPresentEmployees = [], isLoading, error, refetch } = useQuery<any[]>({
    queryKey: ["/api/present-today/current"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Process the data to add duration and forced out time
  const presentEmployees: PresentEmployee[] = rawPresentEmployees.map((emp: any) => {
    const checkIn = new Date(emp.checkInTime);
    const now = new Date();
    const minutesWorked = differenceInMinutes(now, checkIn);
    const hoursWorked = Math.floor(minutesWorked / 60);
    const remainingMinutes = minutesWorked % 60;
    
    // Calculate forced out time (check-in + 7.5 hours)
    const forcedOutTime = addMinutes(addHours(checkIn, 7), 30);
    
    return {
      ...emp,
      duration: `${hoursWorked}h ${remainingMinutes}m`,
      hoursWorked: hoursWorked + (remainingMinutes / 60),
      forcedOutTime: formatPKTDateTime(forcedOutTime, "HH:mm:ss")
    };
  });

  // Query for departments
  const { data: departments = [] } = useQuery<string[]>({
    queryKey: ["/api/employees/departments"],
  });

  // Mutation for terminating attendance
  const terminateMutation = useMutation({
    mutationFn: async (employeeCode: string) => {
      return await apiRequest("/api/present-today/terminate", {
        method: "POST",
        body: JSON.stringify({
          employeeCode,
          terminatedBy: "admin" // This should come from auth context
        })
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Employee attendance terminated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/present-today/current"] });
      setTerminateDialog({ employee: null, isOpen: false });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to terminate attendance",
        variant: "destructive",
      });
    },
  });

  // Filter employees based on search and department
  const filteredEmployees = presentEmployees.filter((emp) => {
    const matchesSearch = searchTerm === "" || 
      emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = departmentFilter === "all" || 
      emp.department === departmentFilter;
    
    return matchesSearch && matchesDepartment;
  });

  const handleTerminate = (employee: PresentEmployee) => {
    setTerminateDialog({ employee, isOpen: true });
  };

  const confirmTerminate = () => {
    if (terminateDialog.employee) {
      terminateMutation.mutate(terminateDialog.employee.employeeCode);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Present Today</h1>
        <p className="text-muted-foreground mt-2">
          Manage currently present employees and their attendance
        </p>
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Currently Present
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {presentEmployees.length} Employees
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Active in the workplace
          </p>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Employee Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Present Employees
            </span>
            <Badge variant="outline" className="font-normal">
              {filteredEmployees.length} records
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[100px]">Code</TableHead>
                  <TableHead className="w-[200px]">Name</TableHead>
                  <TableHead className="w-[150px]">Department</TableHead>
                  <TableHead className="w-[120px]">Check In</TableHead>
                  <TableHead className="w-[120px]">Duration</TableHead>
                  <TableHead className="w-[120px]">Forced Out</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <Clock className="h-5 w-5 animate-spin" />
                        Loading...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2 text-destructive">
                        <AlertCircle className="h-8 w-8" />
                        <p className="font-medium">Authentication Required</p>
                        <p className="text-sm text-muted-foreground">Please log in to view present employees</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => window.location.href = '/login'}
                          className="mt-2"
                        >
                          Go to Login
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No employees currently present
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((employee) => (
                    <TableRow key={employee.employeeCode} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {employee.employeeCode}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserCircle className="h-4 w-4 text-muted-foreground" />
                          {employee.employeeName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          <Building2 className="h-3 w-3 mr-1" />
                          {employee.department}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatPKTDateTime(new Date(employee.checkInTime), "HH:mm:ss")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Timer className="h-4 w-4 text-green-600" />
                          <span className={employee.hoursWorked > 7 ? "text-orange-600" : "text-green-600"}>
                            {employee.duration}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {employee.forcedOutTime}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleTerminate(employee)}
                          disabled={terminateMutation.isPending}
                        >
                          <LogOut className="h-4 w-4 mr-1" />
                          Terminate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Terminate Confirmation Dialog */}
      <Dialog open={terminateDialog.isOpen} onOpenChange={(open) => 
        setTerminateDialog({ ...terminateDialog, isOpen: open })
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Confirm Attendance Termination
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to terminate attendance for this employee?
            </DialogDescription>
          </DialogHeader>
          
          {terminateDialog.employee && (
            <div className="space-y-3 py-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Employee:</span>
                <span className="font-medium">
                  {terminateDialog.employee.employeeName} ({terminateDialog.employee.employeeCode})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Department:</span>
                <span>{terminateDialog.employee.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Check In Time:</span>
                <span className="font-mono">
                  {formatPKTDateTime(new Date(terminateDialog.employee.checkInTime), "HH:mm:ss")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration:</span>
                <span className="text-green-600">{terminateDialog.employee.duration}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Will be marked out at:</span>
                <span className="font-mono text-orange-600">
                  {terminateDialog.employee.forcedOutTime}
                </span>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTerminateDialog({ employee: null, isOpen: false })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmTerminate}
              disabled={terminateMutation.isPending}
            >
              {terminateMutation.isPending ? "Terminating..." : "Confirm Termination"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}