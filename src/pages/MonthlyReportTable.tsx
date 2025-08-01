import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  FileText, 
  Download, 
  Mail, 
  Users, 
  Search, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building2,
  Loader2,
  FileCheck
} from 'lucide-react';

interface EmployeeData {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  department: string;
  designation: string;
  totalWorkedHours: number;
  attendanceDays: number;
  averageHoursPerDay: number;
  punctualityGrade: string;
  punctualityScore: number;
  missedPunches: number;
  deductedHours: number;
  adjustedHours: number;
  overtimeHours: number;
  isMinHourBreach: boolean;
  comments: string;
}

interface MonthlyReportData {
  totalEmployees: number;
  monthYear: string;
  reportDate: string;
  employees: EmployeeData[];
  minHourBreaches: EmployeeData[];
  topPerformers: EmployeeData[];
  regularEmployees: EmployeeData[];
  departmentStats: Record<string, { count: number; totalHours: number }>;
  summary: {
    totalBiometricEmployees: number;
    employeesWithData: number;
    zeroHoursEmployees: number;
    minHourBreachCount: number;
    topPerformerCount: number;
  };
}

export default function MonthlyReportTable() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [sortBy, setSortBy] = useState<'hours' | 'department' | 'name'>('department');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const { toast } = useToast();

  // Fetch ALL 252 biometric employees for July 2025
  const { data: reportData, isLoading, error } = useQuery<MonthlyReportData>({
    queryKey: ['/api/admin/monthly-report/july-2025-full'],
    queryFn: async () => {
      const response = await fetch('/api/admin/monthly-report/july-2025-full');
      if (!response.ok) throw new Error('Failed to fetch monthly report data');
      return response.json();
    }
  });

  // Email generation mutation
  const emailMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/generate-hours-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: 7, year: 2025 })
      });
      if (!response.ok) throw new Error('Failed to generate email report');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email Sent Successfully",
        description: "Monthly report has been emailed to admin@nexlinx.net.pk",
      });
    },
    onError: (error) => {
      toast({
        title: "Email Failed",
        description: `Failed to send email: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Accurate report generation mutation with corrected business rules
  const accurateReportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/generate-accurate-hours-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: 7, year: 2025 })
      });
      if (!response.ok) throw new Error('Failed to generate accurate report');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "ACCURATE Report Generated",
        description: "Corrected monthly report with proper business rules will be emailed when ready",
      });
    },
    onError: (error) => {
      toast({
        title: "Accurate Report Failed",
        description: `Failed to generate accurate report: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-purple-400 mx-auto mb-4" />
            <p className="text-lg text-purple-200">Loading ALL 309 biometric employees...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-lg text-red-200">Failed to load monthly report data</p>
            <p className="text-sm text-gray-400 mt-2">{error?.message}</p>
          </div>
        </div>
      </div>
    );
  }

  // Filter and sort employees - IMPROVED search functionality
  const filteredEmployees = reportData.employees.filter(emp => {
    const searchLower = searchTerm.toLowerCase().trim();
    if (!searchLower) {
      // No search term, only filter by department
      return selectedDepartment === 'all' || emp.department === selectedDepartment;
    }
    
    // Enhanced search across multiple fields
    const matchesSearch = 
      emp.employeeName?.toLowerCase().includes(searchLower) ||
      emp.employeeCode?.toLowerCase().includes(searchLower) ||
      emp.firstName?.toLowerCase().includes(searchLower) ||
      emp.lastName?.toLowerCase().includes(searchLower) ||
      emp.department?.toLowerCase().includes(searchLower) ||
      emp.designation?.toLowerCase().includes(searchLower) ||
      emp.employeeId?.toLowerCase().includes(searchLower);
      
    const matchesDepartment = selectedDepartment === 'all' || emp.department === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'hours':
        comparison = a.totalWorkedHours - b.totalWorkedHours;
        break;
      case 'department':
        comparison = a.department.localeCompare(b.department);
        break;
      case 'name':
        comparison = a.employeeName.localeCompare(b.employeeName);
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Get unique departments for filter
  const departments = Array.from(new Set(reportData.employees.map(emp => emp.department))).sort();

  const getPerformanceBadge = (employee: EmployeeData) => {
    if (employee.totalWorkedHours === 0) {
      return <Badge variant="destructive" className="bg-red-600 hover:bg-red-700">NO DATA</Badge>;
    } else if (employee.totalWorkedHours < 50) {
      return <Badge variant="destructive" className="bg-red-600 hover:bg-red-700">CRITICAL</Badge>;
    } else if (employee.totalWorkedHours < 100) {
      return <Badge variant="destructive" className="bg-orange-600 hover:bg-orange-700">POOR</Badge>;
    } else if (employee.totalWorkedHours < 160) {
      return <Badge variant="secondary" className="bg-yellow-600 hover:bg-yellow-700 text-white">BELOW MIN</Badge>;
    } else {
      return <Badge variant="default" className="bg-green-600 hover:bg-green-700">ADEQUATE</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Monthly Report Table</h1>
              <p className="text-purple-200">July 2025 - All Biometric Employees</p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card className="bg-slate-800/90 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-purple-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">{reportData.totalEmployees}</p>
                    <p className="text-sm text-purple-200">Total Biometric</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/90 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">{reportData.summary.employeesWithData}</p>
                    <p className="text-sm text-green-200">With Data</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/90 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">{reportData.summary.zeroHoursEmployees}</p>
                    <p className="text-sm text-red-200">Zero Hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/90 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-yellow-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">{reportData.summary.minHourBreachCount}</p>
                    <p className="text-sm text-yellow-200">Below 160h</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/90 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Building2 className="w-8 h-8 text-blue-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">{departments.length}</p>
                    <p className="text-sm text-blue-200">Departments</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-600 text-white"
              />
            </div>

            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="all">All Departments ({reportData.totalEmployees})</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>
                    {dept} ({reportData.departmentStats[dept]?.count || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value: 'hours' | 'department' | 'name') => setSortBy(value)}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="department">Sort by Department</SelectItem>
                <SelectItem value="hours">Sort by Hours</SelectItem>
                <SelectItem value="name">Sort by Name</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={() => emailMutation.mutate()}
              disabled={emailMutation.isPending}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              {emailMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              Email Report
            </Button>

            <Button
              onClick={() => accurateReportMutation.mutate()}
              disabled={accurateReportMutation.isPending}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {accurateReportMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileCheck className="w-4 h-4 mr-2" />
              )}
              Generate ACCURATE Report
            </Button>
          </div>
        </div>

        {/* Main Table */}
        <Card className="bg-slate-800/90 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Complete Monthly Report - {reportData.monthYear}
              <Badge variant="outline" className="ml-auto">
                Showing {sortedEmployees.length} of {reportData.totalEmployees} employees
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-600">
                    <th className="text-left py-3 px-4 font-semibold text-purple-200">Employee</th>
                    <th className="text-left py-3 px-4 font-semibold text-purple-200">Department</th>
                    <th className="text-left py-3 px-4 font-semibold text-purple-200">Designation</th>
                    <th className="text-center py-3 px-4 font-semibold text-purple-200">Total Hours</th>
                    <th className="text-center py-3 px-4 font-semibold text-purple-200">Days Present</th>
                    <th className="text-center py-3 px-4 font-semibold text-purple-200">Avg/Day</th>
                    <th className="text-center py-3 px-4 font-semibold text-purple-200">Missed Punches</th>
                    <th className="text-center py-3 px-4 font-semibold text-purple-200">Admin Penalty</th>
                    <th className="text-center py-3 px-4 font-semibold text-purple-200">Performance</th>
                    <th className="text-left py-3 px-4 font-semibold text-purple-200">Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEmployees.map((employee, index) => (
                    <tr 
                      key={employee.employeeCode}
                      className={`border-b border-slate-700 hover:bg-slate-700/50 ${
                        index % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/50'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-white">{employee.employeeName}</p>
                          <p className="text-xs text-gray-400">{employee.employeeCode}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-300">{employee.department}</td>
                      <td className="py-3 px-4 text-gray-300 text-xs">{employee.designation}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-bold ${
                          employee.totalWorkedHours >= 160 ? 'text-green-400' :
                          employee.totalWorkedHours >= 100 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {employee.totalWorkedHours.toFixed(1)}h
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-gray-300">{employee.attendanceDays}</td>
                      <td className="py-3 px-4 text-center text-gray-300">{employee.averageHoursPerDay.toFixed(1)}h</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-bold ${
                          employee.missedPunches === 0 ? 'text-green-400' :
                          employee.missedPunches <= 5 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {employee.missedPunches}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-xs font-medium ${
                          employee.deductedHours === 0 ? 'text-green-400' : 'text-orange-400'
                        }`}>
                          {employee.deductedHours > 0 ? `${employee.deductedHours}h` : '0h'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getPerformanceBadge(employee)}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-400 max-w-xs truncate">
                        {employee.comments}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}