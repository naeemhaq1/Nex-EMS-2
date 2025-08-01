import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Download, 
  RefreshCw, 
  Database,
  Clock,
  FileDown,
  Activity,
  Filter,
  Calendar,
  Users,
  LogIn,
  LogOut
} from "lucide-react";
import { format } from "date-fns";
import { formatPKTDateTime } from "@/utils/timezone";

interface AttendanceRecord {
  id: number;
  employeeCode: string;
  employeeName: string;
  department: string;
  checkTime: string;
  checkType: "in" | "out";
  location: string;
  deviceName: string;
  createdAt: string;
}

interface DataStats {
  totalRecords: number;
  totalEmployees: number;
  lastUpdate: string;
  todayBackupStatus: "pending" | "completed" | "failed";
}

export default function DataInterface() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [checkTypeFilter, setCheckTypeFilter] = useState("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Query for live attendance data
  const { data: records = [], refetch, isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/data/live-attendance", searchTerm, departmentFilter, checkTypeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm && searchTerm.trim()) params.append("search", searchTerm.trim());
      if (departmentFilter && departmentFilter !== "all") params.append("department", departmentFilter);
      if (checkTypeFilter && checkTypeFilter !== "all") params.append("checkType", checkTypeFilter);
      
      const response = await fetch(`/api/data/live-attendance?${params}`);
      if (!response.ok) throw new Error("Failed to fetch attendance data");
      return response.json();
    },
    refetchInterval: autoRefresh ? 5000 : false, // Auto-refresh every 5 seconds
  });

  // Query for departments
  const { data: departments = [] } = useQuery<string[]>({
    queryKey: ["/api/employees/departments"],
  });

  // Query for data stats
  const { data: stats } = useQuery<DataStats>({
    queryKey: ["/api/data/stats"],
    refetchInterval: 30000, // Refresh stats every 30 seconds
  });

  // Auto-scroll to bottom for new records
  useEffect(() => {
    if (isAtBottom && scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [records, isAtBottom]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const threshold = 50;
    const position = element.scrollTop + element.clientHeight;
    const height = element.scrollHeight;
    setIsAtBottom(height - position < threshold);
  };

  const downloadTodayData = async () => {
    try {
      const response = await fetch("/api/data/download-today", {
        method: "GET",
      });
      
      if (!response.ok) throw new Error("Failed to download data");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance_${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download successful",
        description: "Today's attendance data has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download attendance data.",
        variant: "destructive",
      });
    }
  };

  const getCheckTypeIcon = (type: string) => {
    return type === "in" ? (
      <LogIn className="h-4 w-4 text-green-500" />
    ) : (
      <LogOut className="h-4 w-4 text-red-500" />
    );
  };

  const getCheckTypeBadge = (type: string) => {
    return type === "in" ? (
      <Badge variant="default" className="bg-green-600 hover:bg-green-700">IN</Badge>
    ) : (
      <Badge variant="default" className="bg-red-600 hover:bg-red-700">OUT</Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Database className="h-8 w-8 text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Live Data</h1>
            <p className="text-sm text-slate-400">
              Real-time attendance tracking with automatic daily backup
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={autoRefresh ? "default" : "secondary"}>
            {autoRefresh ? (
              <>
                <Activity className="h-3 w-3 mr-1 animate-pulse" />
                Live
              </>
            ) : (
              "Paused"
            )}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? "animate-spin" : ""}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadTodayData}
          >
            <Download className="h-4 w-4 mr-1" />
            Download CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-slate-600/50 bg-gradient-to-br from-slate-800/80 to-slate-900/90 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-200">Total Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{stats?.totalRecords || 0}</div>
              <p className="text-xs text-slate-400">Today's entries</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="border-slate-600/50 bg-gradient-to-br from-slate-800/80 to-slate-900/90 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-200">Active Employees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">{stats?.totalEmployees || 0}</div>
              <p className="text-xs text-slate-400">Checked in today</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="border-slate-600/50 bg-gradient-to-br from-slate-800/80 to-slate-900/90 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-200">Last Update</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold text-blue-300">
                {(() => {
                  try {
                    if (stats?.lastUpdate) {
                      const date = new Date(stats.lastUpdate);
                      if (!isNaN(date.getTime())) {
                        return formatPKTDateTime(date, "HH:mm:ss");
                      }
                    }
                    return "--:--:--";
                  } catch (error) {
                    console.error("Error parsing lastUpdate:", stats?.lastUpdate, error);
                    return "--:--:--";
                  }
                })()}
              </div>
              <p className="text-xs text-slate-400">Pakistan Time</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="border-slate-600/50 bg-gradient-to-br from-slate-800/80 to-slate-900/90 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-200">Backup Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileDown className="h-5 w-5 text-purple-400" />
                <Badge 
                  variant={
                    stats?.todayBackupStatus === "completed" ? "default" : 
                    stats?.todayBackupStatus === "failed" ? "destructive" : 
                    "secondary"
                  }
                >
                  {stats?.todayBackupStatus || "Pending"}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-1">Daily at 00:00 PKT</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters Section */}
      <Card className="border-slate-600/50 bg-gradient-to-br from-slate-800/80 to-slate-900/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-slate-200">
            <Filter className="h-5 w-5 text-blue-400" />
            Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by code, name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
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
            <Select value={checkTypeFilter} onValueChange={setCheckTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="in">Check In</SelectItem>
                <SelectItem value="out">Check Out</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="border-slate-600/50 bg-gradient-to-br from-slate-800/80 to-slate-900/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between text-slate-200">
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-400" />
              Live Attendance Records
            </span>
            <span className="text-sm font-normal text-slate-400">
              {records.length} records
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea 
            ref={scrollAreaRef}
            className="h-[600px] rounded-md border"
            onScroll={handleScroll}
          >
            <Table>
              <TableHeader className="sticky top-0 bg-slate-800/90 backdrop-blur-sm z-10">
                <TableRow className="border-slate-600/50">
                  <TableHead className="w-[120px] text-slate-200 font-medium">Time (PKT)</TableHead>
                  <TableHead className="w-[100px] text-slate-200 font-medium">Code</TableHead>
                  <TableHead className="w-[180px] text-slate-200 font-medium">Name</TableHead>
                  <TableHead className="w-[150px] text-slate-200 font-medium">Department</TableHead>
                  <TableHead className="w-[80px] text-slate-200 font-medium">Type</TableHead>
                  <TableHead className="w-[120px] text-slate-200 font-medium">Location</TableHead>
                  <TableHead className="text-slate-200 font-medium">Device</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No attendance records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    records.map((record, index) => (
                      <motion.tr
                        key={record.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2, delay: index * 0.01 }}
                        className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors"
                      >
                        <TableCell className="font-mono text-sm text-slate-300">
                          {(() => {
                            try {
                              const date = new Date(record.checkTime);
                              if (!isNaN(date.getTime())) {
                                // Add date to show full datetime in PKT
                                return formatPKTDateTime(date, "dd/MM HH:mm:ss");
                              }
                              return "--:--:--";
                            } catch (error) {
                              console.error("Error parsing checkTime:", record.checkTime, error);
                              return "--:--:--";
                            }
                          })()}
                        </TableCell>
                        <TableCell className="font-medium text-blue-300">
                          {record.employeeCode}
                        </TableCell>
                        <TableCell className="text-slate-200">{record.employeeName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {record.department}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getCheckTypeBadge(record.checkType)}
                        </TableCell>
                        <TableCell>{record.location || "Main Office"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {record.deviceName}
                        </TableCell>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}