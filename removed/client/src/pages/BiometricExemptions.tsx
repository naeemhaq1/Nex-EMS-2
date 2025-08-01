import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Trash2, Users, Building, UserCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface Employee {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  department: string;
  designation: string;
  isActive: boolean;
  nonBio: boolean;
}

interface BiometricExemption {
  id: number;
  employeeCode?: string;
  department?: string;
  exemptionType: 'individual' | 'department';
  reason: string;
  createdAt: string;
  createdBy: string;
  employeeCount: number;
  employeeName?: string;
}

export default function BiometricExemptions() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedDesignation, setSelectedDesignation] = useState('all');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [exemptionReason, setExemptionReason] = useState('');

  const queryClient = useQueryClient();

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch current exemptions first (needed for filtering)
  const { data: exemptions = [], isLoading: exemptionsLoading, refetch: refetchExemptions } = useQuery<BiometricExemption[]>({
    queryKey: ['/api/admin/biometric-exemptions'],
    refetchInterval: 30000
  });

  // Fetch employees for selection
  const { data: employeesResponse, isLoading: employeesLoading } = useQuery<{employees: Employee[]}>({
    queryKey: ['/api/employees', debouncedSearchTerm, selectedDepartment, selectedDesignation],
    enabled: debouncedSearchTerm.length >= 3 || debouncedSearchTerm.length === 0,
    staleTime: 60000
  });

  // Filter out already exempted employees to prevent duplication
  const exemptedEmployeeCodes = useMemo(() => {
    return new Set(exemptions.map(exemption => exemption.employeeCode).filter(Boolean));
  }, [exemptions]);

  const availableEmployees = useMemo(() => {
    const allEmployees = employeesResponse?.employees || [];
    return allEmployees.filter(employee => !exemptedEmployeeCodes.has(employee.employeeCode));
  }, [employeesResponse?.employees, exemptedEmployeeCodes]);

  // Fetch departments for filtering
  const { data: departments = [] } = useQuery<string[]>({
    queryKey: ['/api/employees/departments'],
    staleTime: 300000
  });

  // Fetch designations for filtering  
  const { data: designations = [] } = useQuery<string[]>({
    queryKey: ['/api/employees/designations'],
    staleTime: 300000
  });

  // Fetch dashboard metrics to get total employees count
  const { data: dashboardMetrics } = useQuery<{totalEmployees: number}>({
    queryKey: ['/api/dashboard/metrics'],
    staleTime: 60000
  });

  const totalActiveEmployees = dashboardMetrics?.totalEmployees || 0;

  // Add exemption mutation
  const addExemptionMutation = useMutation({
    mutationFn: async (exemptionData: any) => {
      const response = await fetch('/api/admin/biometric-exemptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exemptionData)
      });
      if (!response.ok) throw new Error('Failed to add exemption');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/biometric-exemptions'] });
      setSelectedEmployees([]);
      setSelectedDepartments([]);
      setExemptionReason('');
      toast({ title: 'Success', description: 'Biometric exemption added successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to add biometric exemption', variant: 'destructive' });
    }
  });

  // Remove exemption mutation
  const removeExemptionMutation = useMutation({
    mutationFn: async (exemptionId: number) => {
      const response = await fetch(`/api/admin/biometric-exemptions/${exemptionId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to remove exemption');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/biometric-exemptions'] });
      toast({ title: 'Success', description: 'Biometric exemption removed successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to remove biometric exemption', variant: 'destructive' });
    }
  });

  // Apply additional filtering to available employees based on search and filters
  const filteredAvailableEmployees = useMemo(() => {
    if (!availableEmployees) return [];
    
    return availableEmployees.filter(employee => {
      const matchesSearch = debouncedSearchTerm.length === 0 || 
        debouncedSearchTerm.length >= 3 && (
          employee.firstName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          employee.lastName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          employee.employeeCode.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          employee.department.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          employee.designation.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        );

      const matchesDepartment = selectedDepartment === 'all' || employee.department === selectedDepartment;
      const matchesDesignation = selectedDesignation === 'all' || employee.designation === selectedDesignation;

      return matchesSearch && matchesDepartment && matchesDesignation && employee.isActive;
    });
  }, [availableEmployees, debouncedSearchTerm, selectedDepartment, selectedDesignation]);

  // Calculate total exempted employees count
  const totalExemptedCount = useMemo(() => {
    return exemptions.reduce((total, exemption) => total + exemption.employeeCount, 0);
  }, [exemptions]);

  // Handle employee selection
  const handleEmployeeSelect = (employeeCode: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeCode) 
        ? prev.filter(code => code !== employeeCode)
        : [...prev, employeeCode]
    );
  };

  // Handle department selection for exemption
  const handleDepartmentSelect = (department: string) => {
    setSelectedDepartments(prev => 
      prev.includes(department) 
        ? prev.filter(dept => dept !== department)
        : [...prev, department]
    );
  };

  // Add exemption
  const handleAddExemption = () => {
    if (selectedEmployees.length === 0 && selectedDepartments.length === 0) {
      toast({ title: 'Error', description: 'Please select employees or departments to exempt', variant: 'destructive' });
      return;
    }

    if (!exemptionReason.trim()) {
      toast({ title: 'Error', description: 'Please provide a reason for the exemption', variant: 'destructive' });
      return;
    }

    // Add individual employee exemptions
    selectedEmployees.forEach(employeeCode => {
      addExemptionMutation.mutate({
        employeeCode,
        exemptionType: 'individual',
        reason: exemptionReason
      });
    });

    // Add department exemptions
    selectedDepartments.forEach(department => {
      addExemptionMutation.mutate({
        department,
        exemptionType: 'department',
        reason: exemptionReason
      });
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Biometric Exemptions</h1>
              <p className="text-gray-300">Manage biometric attendance exemptions for departments and individual employees</p>
            </div>
            
            {/* Non-Bio Statistics */}
            <div className="flex flex-wrap gap-4">
              <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-blue-400" />
                  <div>
                    <div className="text-2xl font-bold text-white">{exemptions.length}</div>
                    <div className="text-xs text-blue-300">Non-Bio Employees</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-indigo-600/20 to-blue-600/20 border border-indigo-500/30 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-400" />
                  <div>
                    <div className="text-2xl font-bold text-white">{totalActiveEmployees - exemptions.length}</div>
                    <div className="text-xs text-indigo-300">Biometric Capacity</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-slate-600/20 to-slate-700/20 border border-slate-500/30 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-slate-400" />
                  <div>
                    <div className="text-2xl font-bold text-white">{totalActiveEmployees}</div>
                    <div className="text-xs text-slate-300">Total Employees</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
          {/* Left Side - Employee Selection */}
          <Card className="bg-slate-800/50 border-slate-700 flex flex-col">
            <CardHeader className="pb-4">
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5" />
                Select Employees or Departments
              </CardTitle>
              
              {/* Search and Filters */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search employees (min 3 characters)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-700 border-slate-600 text-white placeholder-gray-400"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={selectedDesignation} onValueChange={setSelectedDesignation}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Designation" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="all">All Designations</SelectItem>
                      {designations.map(des => (
                        <SelectItem key={des} value={des}>{des}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Department Selection for Bulk Exemption */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-300">Select Entire Departments:</h4>
                  <div className="flex flex-wrap gap-2">
                    {departments.filter(dept => dept !== 'all').map(department => (
                      <Button
                        key={department}
                        variant={selectedDepartments.includes(department) ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleDepartmentSelect(department)}
                        className={`${
                          selectedDepartments.includes(department)
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-slate-700 hover:bg-slate-600 text-gray-300 border-slate-600'
                        }`}
                      >
                        {department}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden">
              {/* Employee List */}
              <div className="h-full overflow-y-auto space-y-2">
                {employeesLoading ? (
                  <div className="text-center text-gray-400 py-8">Loading employees...</div>
                ) : filteredAvailableEmployees.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    {searchTerm.length > 0 && searchTerm.length < 3 
                      ? 'Type at least 3 characters to search'
                      : 'No employees found'
                    }
                  </div>
                ) : (
                  filteredAvailableEmployees.map(employee => (
                    <div
                      key={employee.employeeCode}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedEmployees.includes(employee.employeeCode)
                          ? 'bg-blue-600/20 border-blue-500 ring-1 ring-blue-500'
                          : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700 hover:border-slate-500'
                      }`}
                      onClick={() => handleEmployeeSelect(employee.employeeCode)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-white font-medium">
                            {employee.firstName} {employee.lastName}
                          </div>
                          <div className="text-sm text-gray-400">
                            {employee.employeeCode} • {employee.designation}
                          </div>
                          <div className="text-sm text-gray-500">
                            {employee.department}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Exemption Controls */}
              <div className="border-t border-slate-700 pt-4 mt-4">
                <Input
                  placeholder="Reason for exemption..."
                  value={exemptionReason}
                  onChange={(e) => setExemptionReason(e.target.value)}
                  className="mb-3 bg-slate-700 border-slate-600 text-white placeholder-gray-400"
                />
                <Button
                  onClick={handleAddExemption}
                  disabled={addExemptionMutation.isPending || (selectedEmployees.length === 0 && selectedDepartments.length === 0)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Exemption {selectedEmployees.length + selectedDepartments.length > 0 && `(${selectedEmployees.length + selectedDepartments.length})`}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Right Side - Current Exemptions */}
          <Card className="bg-slate-800/50 border-slate-700 flex flex-col">
            <CardHeader className="pb-4">
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Current Exemptions
                </div>
                <Badge variant="secondary" className="bg-blue-600/20 text-blue-400">
                  Total: {totalExemptedCount} employees
                </Badge>
              </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto">
                {exemptionsLoading ? (
                  <div className="text-center text-gray-400 py-8">Loading exemptions...</div>
                ) : exemptions.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">No exemptions found</div>
                ) : (
                  <div className="space-y-3">
                    {exemptions.map(exemption => (
                      <div
                        key={exemption.id}
                        className="bg-slate-700/50 border border-slate-600 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {exemption.exemptionType === 'department' ? (
                                <Building className="h-4 w-4 text-blue-400" />
                              ) : (
                                <Users className="h-4 w-4 text-green-400" />
                              )}
                              <span className="text-white font-medium">
                                {exemption.exemptionType === 'department' 
                                  ? exemption.department
                                  : exemption.employeeName || exemption.employeeCode
                                }
                              </span>
                              <Badge 
                                variant="outline" 
                                className={`${
                                  exemption.exemptionType === 'department'
                                    ? 'border-blue-500 text-blue-400'
                                    : 'border-green-500 text-green-400'
                                }`}
                              >
                                {exemption.exemptionType === 'department' ? 'Department' : 'Individual'}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-400 mb-1">
                              Reason: {exemption.reason}
                            </div>
                            <div className="text-sm text-gray-500">
                              Added by {exemption.createdBy} • {exemption.employeeCount} employee{exemption.employeeCount !== 1 ? 's' : ''}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeExemptionMutation.mutate(exemption.id)}
                            disabled={removeExemptionMutation.isPending}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}