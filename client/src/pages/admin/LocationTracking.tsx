import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Users, Clock, DollarSign, Settings } from 'lucide-react';

interface Employee {
  emp_code: string;
  first_name: string;
  last_name: string;
  designation: string;
  department: string;
  location_tracking_enabled: boolean;
  location_tracking_tier: number;
  polling_interval_minutes: number;
  tracking_reason: string;
}

interface TrackingOverview {
  totalEmployees: number;
  trackingEnabled: number;
  trackingDisabled: number;
  totalMonthlyUpdates: number;
  estimatedMonthlyCost: number;
  tierBreakdown: Array<{
    tier: number;
    intervalMinutes: number;
    employeeCount: number;
    monthlyUpdates: number;
    trackingReason: string;
    estimatedCost: number;
  }>;
}

export default function LocationTracking() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isEditingEmployee, setIsEditingEmployee] = useState(false);

  // Get tracking overview
  const { data: overview, isLoading: overviewLoading } = useQuery<{ success: boolean; overview: TrackingOverview }>({
    queryKey: ['/api/admin/tracking/overview'],
  });

  // Get employees with tracking status
  const { data: employeesData, isLoading: employeesLoading } = useQuery<{
    success: boolean;
    employees: Employee[];
    pagination: any;
  }>({
    queryKey: ['/api/admin/tracking/employees'],
  });

  // Apply designation rules mutation
  const applyRulesMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/tracking/apply-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to apply rules');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Rules Applied Successfully",
        description: `Updated tracking settings for ${data.updatedCount} employees`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tracking/overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tracking/employees'] });
    },
    onError: (error) => {
      toast({
        title: "Error Applying Rules",
        description: error instanceof Error ? error.message : "Failed to apply tracking rules",
        variant: "destructive",
      });
    }
  });

  // Update individual employee mutation
  const updateEmployeeMutation = useMutation({
    mutationFn: async (params: {
      empCode: string;
      trackingEnabled: boolean;
      pollingIntervalMinutes: number;
      trackingReason: string;
    }) => {
      const response = await fetch(`/api/admin/tracking/employee/${params.empCode}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingEnabled: params.trackingEnabled,
          pollingIntervalMinutes: params.pollingIntervalMinutes,
          trackingReason: params.trackingReason,
        }),
      });
      if (!response.ok) throw new Error('Failed to update employee');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Employee Updated",
        description: "Location tracking settings updated successfully",
      });
      setIsEditingEmployee(false);
      setSelectedEmployee(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tracking/overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tracking/employees'] });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update employee",
        variant: "destructive",
      });
    }
  });

  const getTierBadge = (tier: number, intervalMinutes: number) => {
    if (tier === 1 && intervalMinutes <= 3) {
      return <Badge variant="destructive">High Priority (3m)</Badge>;
    } else if (tier === 2 && intervalMinutes <= 10) {
      return <Badge variant="default">Standard (10m)</Badge>;
    } else if (tier === 3) {
      return <Badge variant="secondary">Low Priority ({intervalMinutes}m)</Badge>;
    } else if (tier === 0) {
      return <Badge variant="outline">Disabled</Badge>;
    } else {
      return <Badge variant="secondary">Custom ({intervalMinutes}m)</Badge>;
    }
  };

  const handleEmployeeUpdate = (employee: Employee, updates: Partial<Employee>) => {
    updateEmployeeMutation.mutate({
      empCode: employee.emp_code,
      trackingEnabled: updates.location_tracking_enabled ?? employee.location_tracking_enabled,
      pollingIntervalMinutes: updates.polling_interval_minutes ?? employee.polling_interval_minutes,
      trackingReason: updates.tracking_reason ?? employee.tracking_reason,
    });
  };

  if (overviewLoading || employeesLoading) {
    return <div className="p-6">Loading location tracking data...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Location Tracking Management</h1>
          <p className="text-muted-foreground">
            Configure GPS tracking intervals by designation - OFC/PSCA at 3 minutes, others at 10 minutes
          </p>
        </div>
        <Button
          onClick={() => applyRulesMutation.mutate()}
          disabled={applyRulesMutation.isPending}
        >
          {applyRulesMutation.isPending ? 'Applying...' : 'Apply Default Rules'}
        </Button>
      </div>

      {/* Overview Cards */}
      {overview?.overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.overview.totalEmployees}</div>
              <p className="text-xs text-muted-foreground">
                {overview.overview.trackingEnabled} tracked, {overview.overview.trackingDisabled} disabled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Updates</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overview.overview.totalMonthlyUpdates.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">GPS location updates</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${overview.overview.estimatedMonthlyCost}</div>
              <p className="text-xs text-muted-foreground">Per month (Google Maps API)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tracking Enabled</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.overview.trackingEnabled}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((overview.overview.trackingEnabled / overview.overview.totalEmployees) * 100)}% coverage
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tier Breakdown */}
      {overview?.overview?.tierBreakdown && (
        <Card>
          <CardHeader>
            <CardTitle>Tracking Tier Breakdown</CardTitle>
            <CardDescription>Cost analysis by tracking frequency</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {overview.overview.tierBreakdown.map((tier, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    {getTierBadge(tier.tier, tier.intervalMinutes)}
                    <div>
                      <p className="font-medium">{tier.trackingReason}</p>
                      <p className="text-sm text-muted-foreground">
                        {tier.employees} employees • {tier.intervalMinutes} min intervals
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${tier.estimatedCost}/month</p>
                    <p className="text-sm text-muted-foreground">
                      {tier.monthlyUpdates.toLocaleString()} updates
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employee List */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Tracking Configuration</CardTitle>
          <CardDescription>
            Manage individual employee location tracking settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employeesData?.employees && (
            <div className="space-y-2">
              {employeesData.employees.slice(0, 20).map((employee) => (
                <div key={employee.emp_code} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="font-medium">
                        {employee.first_name} {employee.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {employee.emp_code} • {employee.designation} • {employee.department}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getTierBadge(employee.location_tracking_tier, employee.polling_interval_minutes)}
                    <Switch
                      checked={employee.location_tracking_enabled}
                      onCheckedChange={(checked) =>
                        handleEmployeeUpdate(employee, { location_tracking_enabled: checked })
                      }
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedEmployee(employee);
                        setIsEditingEmployee(true);
                      }}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}