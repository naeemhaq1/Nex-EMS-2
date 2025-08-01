/**
 * Department Field Management Interface
 * Manage department-based field designation and employee type classification
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  Users, 
  MapPin, 
  Clock, 
  TrendingUp, 
  Filter,
  Settings,
  Search,
  Save,
  RefreshCw,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface DepartmentFieldConfig {
  id: string;
  departmentName: string;
  isFieldDepartment: boolean;
  defaultEmpType: 'Drivers' | 'Field Staff' | 'Desk Job' | 'Hybrid';
  locationInterval: number;
  description: string;
  employeeCount: number;
  lastUpdated: Date;
}

interface EmployeeTypeStats {
  byType: Record<string, number>;
  byInterval: Record<number, number>;
  fieldVsOffice: { field: number; office: number };
  totalEmployees: number;
}

const empTypeColors = {
  'Drivers': 'bg-red-100 text-red-800 border-red-200',
  'Field Staff': 'bg-orange-100 text-orange-800 border-orange-200',
  'Hybrid': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Desk Job': 'bg-green-100 text-green-800 border-green-200'
};

const empTypeDescriptions = {
  'Drivers': 'Vehicle operators requiring real-time location tracking (3 min intervals)',
  'Field Staff': 'Field technicians, OFC staff, and on-site workers (3 min intervals)',
  'Hybrid': 'Employees who spend more time out of office than average (4 min intervals)',
  'Desk Job': 'Office-based employees with minimal field work (5 min intervals)'
};

export default function DepartmentFieldManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmpType, setSelectedEmpType] = useState<string>('all');
  const [showFieldOnly, setShowFieldOnly] = useState(false);
  const queryClient = useQueryClient();

  // Fetch department configurations
  const { data: departments = [], isLoading: departmentsLoading } = useQuery({
    queryKey: ['/api/admin/department-field-configs'],
    refetchInterval: 30000
  });

  // Fetch employee type statistics
  const { data: stats, isLoading: statsLoading } = useQuery<EmployeeTypeStats>({
    queryKey: ['/api/admin/employee-type-stats'],
    refetchInterval: 30000
  });

  // Update department field designation
  const updateDepartmentMutation = useMutation({
    mutationFn: async (params: { departmentName: string; isFieldDepartment: boolean; defaultEmpType?: string }) => {
      const response = await fetch('/api/admin/update-department-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (!response.ok) throw new Error('Failed to update department');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/department-field-configs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/employee-type-stats'] });
    }
  });

  // Auto-classify departments
  const autoClassifyMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/auto-classify-departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to auto-classify');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/department-field-configs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/employee-type-stats'] });
    }
  });

  // Bulk update by pattern
  const bulkUpdateMutation = useMutation({
    mutationFn: async (params: { pattern: string; empType: string; isFieldDepartment: boolean }) => {
      const response = await fetch('/api/admin/bulk-update-by-pattern', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (!response.ok) throw new Error('Failed to bulk update');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/department-field-configs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/employee-type-stats'] });
    }
  });

  // Filter departments
  const filteredDepartments = departments.filter((dept: DepartmentFieldConfig) => {
    const matchesSearch = dept.departmentName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEmpType = selectedEmpType === 'all' || dept.defaultEmpType === selectedEmpType;
    const matchesFieldFilter = !showFieldOnly || dept.isFieldDepartment;
    return matchesSearch && matchesEmpType && matchesFieldFilter;
  });

  const handleDepartmentUpdate = (dept: DepartmentFieldConfig, isFieldDepartment: boolean, empType?: string) => {
    updateDepartmentMutation.mutate({
      departmentName: dept.departmentName,
      isFieldDepartment,
      defaultEmpType: empType || dept.defaultEmpType
    });
  };

  const formatInterval = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  };

  const getIntervalBadge = (interval: number) => {
    if (interval <= 180) {
      return <Badge variant="destructive">High Priority ({formatInterval(interval)})</Badge>;
    } else if (interval <= 240) {
      return <Badge variant="default">Medium Priority ({formatInterval(interval)})</Badge>;
    } else {
      return <Badge variant="secondary">Standard ({formatInterval(interval)})</Badge>;
    }
  };

  if (departmentsLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading department field configurations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Department Field Management</h1>
          <p className="text-gray-600 mt-2">
            Configure department-based field designation and employee type classification for optimized location tracking
          </p>
        </div>
        <Button 
          onClick={() => autoClassifyMutation.mutate()}
          disabled={autoClassifyMutation.isPending}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Auto-Classify All
        </Button>
      </div>

      <Tabs defaultValue="departments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="departments">Department Configuration</TabsTrigger>
          <TabsTrigger value="statistics">Employee Type Statistics</TabsTrigger>
          <TabsTrigger value="bulk-operations">Bulk Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="departments" className="space-y-4">
          {/* Statistics Overview */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Total Employees</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.totalEmployees}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium">Field Staff</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-600">{stats.fieldVsOffice.field}</p>
                  <p className="text-xs text-gray-500">3-minute intervals</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Office Staff</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{stats.fieldVsOffice.office}</p>
                  <p className="text-xs text-gray-500">5-minute intervals</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium">Field Ratio</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">
                    {Math.round((stats.fieldVsOffice.field / stats.totalEmployees) * 100)}%
                  </p>
                  <p className="text-xs text-gray-500">High-frequency tracking</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search departments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
                <Select value={selectedEmpType} onValueChange={setSelectedEmpType}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by employee type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employee Types</SelectItem>
                    <SelectItem value="Drivers">Drivers</SelectItem>
                    <SelectItem value="Field Staff">Field Staff</SelectItem>
                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                    <SelectItem value="Desk Job">Desk Job</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={showFieldOnly}
                    onCheckedChange={setShowFieldOnly}
                  />
                  <Label>Show field departments only</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Department List */}
          <div className="grid grid-cols-1 gap-4">
            {filteredDepartments.map((dept: DepartmentFieldConfig) => (
              <Card key={dept.id} className={dept.isFieldDepartment ? 'border-orange-200 bg-orange-50' : 'border-gray-200'}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${dept.isFieldDepartment ? 'bg-orange-100' : 'bg-gray-100'}`}>
                        {dept.isFieldDepartment ? (
                          <MapPin className="h-5 w-5 text-orange-600" />
                        ) : (
                          <Building2 className="h-5 w-5 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{dept.departmentName}</h3>
                        <p className="text-sm text-gray-600">{dept.employeeCount} employees</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getIntervalBadge(dept.locationInterval)}
                      <Badge className={empTypeColors[dept.defaultEmpType] || 'bg-gray-100 text-gray-800'}>
                        {dept.defaultEmpType}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">{dept.description}</p>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`field-${dept.id}`}>Field Department:</Label>
                      <Switch
                        id={`field-${dept.id}`}
                        checked={dept.isFieldDepartment}
                        onCheckedChange={(checked) => handleDepartmentUpdate(dept, checked)}
                        disabled={updateDepartmentMutation.isPending}
                      />
                    </div>

                    <Select
                      value={dept.defaultEmpType}
                      onValueChange={(empType) => handleDepartmentUpdate(dept, dept.isFieldDepartment, empType)}
                      disabled={updateDepartmentMutation.isPending}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Drivers">Drivers (3m intervals)</SelectItem>
                        <SelectItem value="Field Staff">Field Staff (3m intervals)</SelectItem>
                        <SelectItem value="Hybrid">Hybrid (4m intervals)</SelectItem>
                        <SelectItem value="Desk Job">Desk Job (5m intervals)</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="text-xs text-gray-500">
                      Last updated: {new Date(dept.lastUpdated).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredDepartments.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No departments found</h3>
                <p className="text-gray-600">Try adjusting your search criteria or filters.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Employee Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Employee Type Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats && Object.entries(stats.byType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <Badge className={empTypeColors[type as keyof typeof empTypeColors] || 'bg-gray-100 text-gray-800'}>
                        {type}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">{count}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        ({Math.round((count / stats.totalEmployees) * 100)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Location Interval Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Location Interval Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats && Object.entries(stats.byInterval).map(([interval, count]) => (
                  <div key={interval} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      {getIntervalBadge(parseInt(interval))}
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">{count}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        ({Math.round((count / stats.totalEmployees) * 100)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Employee Type Descriptions */}
          <Card>
            <CardHeader>
              <CardTitle>Employee Type Descriptions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(empTypeDescriptions).map(([type, description]) => (
                <div key={type} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <Badge className={empTypeColors[type as keyof typeof empTypeColors]}>
                    {type}
                  </Badge>
                  <p className="text-sm text-gray-700">{description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk-operations" className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Bulk operations will update multiple employees at once. Use with caution and ensure you understand the impact.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Bulk Update by Department Pattern</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="pattern">Department Pattern</Label>
                  <Input id="pattern" placeholder="e.g., 'OFC', 'Safe', 'Driver'" />
                </div>
                <div>
                  <Label htmlFor="bulk-emptype">Employee Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Drivers">Drivers</SelectItem>
                      <SelectItem value="Field Staff">Field Staff</SelectItem>
                      <SelectItem value="Hybrid">Hybrid</SelectItem>
                      <SelectItem value="Desk Job">Desk Job</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button className="w-full" disabled={bulkUpdateMutation.isPending}>
                    {bulkUpdateMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Apply Bulk Update
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => autoClassifyMutation.mutate()}
                disabled={autoClassifyMutation.isPending}
                className="w-full justify-start"
                variant="outline"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Auto-classify all departments based on patterns
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}