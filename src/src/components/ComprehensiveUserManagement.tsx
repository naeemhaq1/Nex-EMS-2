import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Users, Monitor, Settings, Eye, EyeOff, Shield, Lock, UserX, UserCheck, 
  Clock, MapPin, Smartphone, Globe, Bell, BellOff, LogOut, RefreshCw, User, Edit, 
  Key, Ban, CheckCircle, Filter, Laptop, Tablet, Server, Activity, Calendar,
  TrendingUp, UserPlus, AlertTriangle, ChevronDown, Wifi, ShieldX, Unlink,
  MoreVertical, Battery, Cpu, HardDrive
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// User Interface with exact fields requested
interface UserRecord {
  id: number;
  empcode: string;
  name: string;
  designation: string;
  role: string;
  lastLoginTime: string | null;
  lastLoginIP: string | null;
  deviceInfo: string;
  operatingSystem: string;
  browser: string;
  isActive: boolean;
  department: string;
  username: string;
  devices?: DeviceRecord[];
}

// Device Management Interface (merged from DeviceManagementPanel)
interface DeviceRecord {
  device: {
    id: number;
    deviceFingerprint: string;
    deviceName?: string;
    deviceType: string;
    manufacturer?: string;
    model?: string;
    operatingSystem: string;
    osVersion?: string;
    browser: string;
    browserVersion: string;
    screenResolution: string;
    platform: string;
    language: string;
    timezone: string;
    macAddress?: string;
    isActive: boolean;
    isTrusted: boolean;
    firstSeen: string;
    lastSeen: string;
    lastLoginIp?: string;
    loginCount: number;
    notes?: string;
    unboundAt?: string;
    unboundReason?: string;
  };
  user?: {
    id: number;
    username: string;
    role: string;
    employeeId?: string;
  };
}

interface DeviceStats {
  totalDevices: number;
  activeDevices: number;
  trustedDevices: number;
  unboundDevices: number;
  deviceTypes: { deviceType: string; count: number }[];
}

// User KPIs Interface
interface UserKPIs {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  onlineUsers: number;
  adminUsers: number;
  recentLogins: number;
  systemAccounts: number;
}

// Department and Designation filters
interface FilterOption {
  id: string;
  name: string;
  count: number;
}

const getDeviceIcon = (deviceInfo: string) => {
  const device = deviceInfo.toLowerCase();
  if (device.includes('mobile') || device.includes('phone')) return <Smartphone className="w-4 h-4" />;
  if (device.includes('tablet')) return <Tablet className="w-4 h-4" />;
  if (device.includes('desktop') || device.includes('laptop')) return <Laptop className="w-4 h-4" />;
  return <Monitor className="w-4 h-4" />;
};

const getOSBadgeColor = (os: string) => {
  const osLower = os.toLowerCase();
  if (osLower.includes('windows')) return 'bg-blue-500';
  if (osLower.includes('mac') || osLower.includes('ios')) return 'bg-gray-500';
  if (osLower.includes('android')) return 'bg-green-500';
  if (osLower.includes('linux')) return 'bg-orange-500';
  return 'bg-gray-400';
};

const getRoleBadgeColor = (role: string) => {
  switch (role.toLowerCase()) {
    case 'superadmin':
      return 'bg-red-500';
    case 'admin':
    case 'general_admin':
      return 'bg-purple-500';
    case 'manager':
      return 'bg-blue-500';
    case 'supervisor':
      return 'bg-indigo-500';
    case 'employee':
    case 'staff':
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
};

const AVAILABLE_ROLES = [
  { value: 'superadmin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'general_admin', label: 'General Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'employee', label: 'Employee' },
  { value: 'staff', label: 'Staff' }
];

export default function ComprehensiveUserManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedDesignation, setSelectedDesignation] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Device Management States (merged from DeviceManagementPanel)
  const [selectedDevice, setSelectedDevice] = useState<DeviceRecord | null>(null);
  const [showUnbindDialog, setShowUnbindDialog] = useState(false);
  const [showTrustDialog, setShowTrustDialog] = useState(false);
  const [showDeviceDialog, setShowDeviceDialog] = useState(false);
  const [unbindReason, setUnbindReason] = useState('');
  const [trustNotes, setTrustNotes] = useState('');
  const [deviceFilterType, setDeviceFilterType] = useState<'all' | 'active' | 'trusted' | 'unbound'>('all');
  const [deviceSearchTerm, setDeviceSearchTerm] = useState('');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debounced search with 3 character minimum
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length >= 3 || searchTerm.length === 0) {
        setDebouncedSearchTerm(searchTerm);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch User KPIs
  const { data: userKPIs, isLoading: kpisLoading } = useQuery<UserKPIs>({
    queryKey: ['/api/admin/user-kpis'],
    refetchInterval: 30000,
    staleTime: 15000
  });

  // Fetch Users with comprehensive data using new comprehensive endpoint
  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['/api/admin/comprehensive-users', debouncedSearchTerm, selectedDepartment, selectedDesignation],
    enabled: debouncedSearchTerm.length >= 3 || debouncedSearchTerm.length === 0,
    refetchInterval: 60000,
    staleTime: 30000
  });

  // Fetch Departments for filtering - using authenticated endpoint
  const { data: departmentsRaw = [] } = useQuery<string[]>({
    queryKey: ['/api/departments'],
    staleTime: 300000,
  });

  // Fetch Designations for filtering - extract from user data  
  const { data: designationsRaw = [] } = useQuery<string[]>({
    queryKey: ['/api/employees/designations'],
    staleTime: 300000,
  });

  // Device Management Queries (merged from DeviceManagementPanel)
  const { data: devices = [], isLoading: devicesLoading } = useQuery({
    queryKey: ['/api/device-management/all'],
    refetchInterval: 30000,
  });

  const { data: deviceStats } = useQuery<DeviceStats>({
    queryKey: ['/api/device-management/stats'],
    refetchInterval: 30000,
  });

  // User management mutations
  const toggleUserMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: number; action: 'enable' | 'disable' }) => {
      return apiRequest({ 
        url: `/api/admin/users/${userId}/${action}`, 
        method: 'POST' 
      });
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/comprehensive-users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/user-kpis'] });
      toast({ 
        title: `User ${action}d successfully`,
        description: `User account has been ${action}d.`
      });
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: number; newPassword: string }) => {
      return apiRequest({ 
        url: `/api/admin/users/${userId}/reset-password`,
        method: 'POST',
        data: { newPassword }
      });
    },
    onSuccess: () => {
      setNewPassword('');
      toast({ 
        title: "Password reset successfully",
        description: "User password has been updated."
      });
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: number; newRole: string }) => {
      return apiRequest({ 
        url: `/api/admin/users/${userId}/update-role`,
        method: 'POST',
        data: { role: newRole }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/comprehensive-users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/user-kpis'] });
      toast({ 
        title: "Role updated successfully",
        description: "User role has been changed."
      });
    }
  });

  // Device Management Mutations (merged from DeviceManagementPanel)
  const unbindDeviceMutation = useMutation({
    mutationFn: async ({ deviceId, reason }: { deviceId: number; reason: string }) => {
      return apiRequest({
        url: `/api/device-management/unbind/${deviceId}`,
        method: 'POST',
        data: { reason }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/device-management/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/device-management/stats'] });
      setShowUnbindDialog(false);
      setUnbindReason('');
      toast({
        title: "Device unbound successfully",
        description: "Device has been unbound from user account."
      });
    }
  });

  const trustDeviceMutation = useMutation({
    mutationFn: async ({ deviceId, trusted, notes }: { deviceId: number; trusted: boolean; notes?: string }) => {
      return apiRequest({
        url: `/api/device-management/trust/${deviceId}`,
        method: 'POST',
        data: { trusted, notes }
      });
    },
    onSuccess: (_, { trusted }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/device-management/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/device-management/stats'] });
      setShowTrustDialog(false);
      setTrustNotes('');
      toast({
        title: `Device ${trusted ? 'trusted' : 'untrusted'} successfully`,
        description: `Device has been marked as ${trusted ? 'trusted' : 'untrusted'}.`
      });
    }
  });

  // Transform departments data for filtering
  const departments = useMemo(() => {
    if (!departmentsRaw || !Array.isArray(departmentsRaw)) return [];
    return departmentsRaw.map(dept => ({
      id: dept,
      name: dept,
      count: 0
    }));
  }, [departmentsRaw]);

  // Transform designations data for filtering  
  const designations = useMemo(() => {
    if (!designationsRaw || !Array.isArray(designationsRaw)) return [];
    return designationsRaw.map(designation => ({
      id: designation,
      name: designation,
      count: 0
    }));
  }, [designationsRaw]);

  const users = useMemo(() => {
    if (!usersData || !Array.isArray(usersData)) return [];
    return usersData as UserRecord[];
  }, [usersData]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesDepartment = selectedDepartment === 'all' || user.department === selectedDepartment;
      const matchesDesignation = selectedDesignation === 'all' || user.designation === selectedDesignation;
      
      return matchesDepartment && matchesDesignation;
    });
  }, [users, selectedDepartment, selectedDesignation]);

  const handleUserEdit = (user: UserRecord) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setShowEditDialog(true);
  };

  const handleDeviceEdit = (device: DeviceRecord) => {
    setSelectedDevice(device);
    setShowDeviceDialog(true);
  };

  const handleDeviceUnbind = (device: DeviceRecord) => {
    setSelectedDevice(device);
    setShowUnbindDialog(true);
  };

  const handleDeviceTrust = (device: DeviceRecord) => {
    setSelectedDevice(device);
    setTrustNotes(device.device.notes || '');
    setShowTrustDialog(true);
  };

  const handlePasswordReset = () => {
    if (!selectedUser || newPassword.length < 6) {
      toast({ 
        title: "Invalid password",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }
    
    resetPasswordMutation.mutate({ 
      userId: selectedUser.id, 
      newPassword 
    });
  };

  const handleRoleUpdate = () => {
    if (!selectedUser || !newRole) {
      toast({ 
        title: "Invalid role",
        description: "Please select a valid role.",
        variant: "destructive"
      });
      return;
    }
    
    updateRoleMutation.mutate({ 
      userId: selectedUser.id, 
      newRole 
    });
  };

  const formatLastLogin = (lastLoginTime: string | null, lastLoginIP: string | null) => {
    if (!lastLoginTime) return { time: 'Never', ip: 'N/A' };
    
    const date = new Date(lastLoginTime);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    let timeStr = '';
    if (diffInHours < 1) timeStr = 'Just now';
    else if (diffInHours < 24) timeStr = `${diffInHours}h ago`;
    else if (diffInHours < 168) timeStr = `${Math.floor(diffInHours / 24)}d ago`;
    else timeStr = date.toLocaleDateString();
    
    return { 
      time: timeStr, 
      ip: lastLoginIP || 'Unknown' 
    };
  };

  const getDeviceStatusBadge = (device: DeviceRecord['device']) => {
    if (!device.isActive) return <Badge className="bg-gray-500 text-xs">Inactive</Badge>;
    if (device.isTrusted) return <Badge className="bg-green-500 text-xs">Trusted</Badge>;
    if (device.unboundAt) return <Badge className="bg-red-500 text-xs">Unbound</Badge>;
    return <Badge className="bg-blue-500 text-xs">Active</Badge>;
  };

  const filteredDevices = useMemo(() => {
    return (devices as DeviceRecord[]).filter((device: DeviceRecord) => {
      const matchesFilter = 
        deviceFilterType === 'all' ||
        (deviceFilterType === 'active' && device.device.isActive) ||
        (deviceFilterType === 'trusted' && device.device.isTrusted) ||
        (deviceFilterType === 'unbound' && device.device.unboundAt);
      
      const matchesSearch = 
        !deviceSearchTerm ||
        device.device.deviceName?.toLowerCase().includes(deviceSearchTerm.toLowerCase()) ||
        device.device.deviceType.toLowerCase().includes(deviceSearchTerm.toLowerCase()) ||
        device.user?.username.toLowerCase().includes(deviceSearchTerm.toLowerCase());
      
      return matchesFilter && matchesSearch;
    });
  }, [devices, deviceFilterType, deviceSearchTerm]);

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'mobile':
      case 'smartphone':
        return <Smartphone className="w-4 h-4 text-green-400" />;
      case 'tablet':
        return <Tablet className="w-4 h-4 text-blue-400" />;
      case 'desktop':
      case 'computer':
        return <Monitor className="w-4 h-4 text-purple-400" />;
      case 'laptop':
        return <Laptop className="w-4 h-4 text-indigo-400" />;
      default:
        return <Server className="w-4 h-4 text-gray-400" />;
    }
  };

  const getOSBadgeColor = (os: string) => {
    const osLower = os.toLowerCase();
    if (osLower.includes('windows')) return 'bg-blue-500';
    if (osLower.includes('mac') || osLower.includes('ios')) return 'bg-gray-500';
    if (osLower.includes('android')) return 'bg-green-500';
    if (osLower.includes('linux')) return 'bg-orange-500';
    return 'bg-purple-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Users className="w-8 h-8 text-purple-400" />
              User Management System
            </h1>
            <p className="text-purple-300 mt-2">
              Comprehensive user management with role-based authentication controls
            </p>
          </div>
          <Button
            onClick={() => {
              refetchUsers();
              queryClient.invalidateQueries({ queryKey: ['/api/admin/user-kpis'] });
            }}
            className="bg-purple-600 hover:bg-purple-700"
            disabled={usersLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${usersLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-purple-900/30 border-purple-500/30">
            <TabsTrigger value="users" className="data-[state=active]:bg-purple-600">
              <Users className="w-4 h-4 mr-2" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="devices" className="data-[state=active]:bg-purple-600">
              <Monitor className="w-4 h-4 mr-2" />
              Device Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            {/* User KPIs Section */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card className="bg-gradient-to-br from-purple-800/20 to-blue-800/20 border-purple-500/30 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-300 text-sm">Total Users</p>
                  <p className="text-2xl font-bold text-white">
                    {kpisLoading ? '...' : userKPIs?.totalUsers || 0}
                  </p>
                </div>
                <Users className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-800/20 to-indigo-800/20 border-blue-500/30 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-300 text-sm">Active</p>
                  <p className="text-2xl font-bold text-white">
                    {kpisLoading ? '...' : userKPIs?.activeUsers || 0}
                  </p>
                </div>
                <UserCheck className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-800/20 to-purple-800/20 border-indigo-500/30 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-300 text-sm">Inactive</p>
                  <p className="text-2xl font-bold text-white">
                    {kpisLoading ? '...' : userKPIs?.inactiveUsers || 0}
                  </p>
                </div>
                <UserX className="w-8 h-8 text-indigo-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-800/20 to-blue-800/20 border-purple-500/30 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-300 text-sm">Online</p>
                  <p className="text-2xl font-bold text-white">
                    {kpisLoading ? '...' : userKPIs?.onlineUsers || 0}
                  </p>
                </div>
                <Wifi className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-800/20 to-indigo-800/20 border-blue-500/30 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-300 text-sm">Admins</p>
                  <p className="text-2xl font-bold text-white">
                    {kpisLoading ? '...' : userKPIs?.adminUsers || 0}
                  </p>
                </div>
                <Shield className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-800/20 to-purple-800/20 border-indigo-500/30 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-300 text-sm">Recent</p>
                  <p className="text-2xl font-bold text-white">
                    {kpisLoading ? '...' : userKPIs?.recentLogins || 0}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-indigo-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-800/20 to-blue-800/20 border-purple-500/30 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-300 text-sm">System</p>
                  <p className="text-2xl font-bold text-white">
                    {kpisLoading ? '...' : userKPIs?.systemAccounts || 0}
                  </p>
                </div>
                <Server className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-500/30 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-purple-400" />
                <Input
                  placeholder="Search users (min 3 chars)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-purple-900/20 border-purple-500/30 text-white placeholder-purple-300"
                />
                {searchTerm.length > 0 && searchTerm.length < 3 && (
                  <p className="text-xs text-blue-400 mt-1">Minimum 3 characters required</p>
                )}
              </div>

              {/* Department Filter */}
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="bg-purple-900/20 border-purple-500/30 text-white">
                  <SelectValue placeholder="Filter by Department" />
                </SelectTrigger>
                <SelectContent className="bg-purple-900 border-purple-500">
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.name}>
                      {dept.name} ({dept.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Designation Filter */}
              <Select value={selectedDesignation} onValueChange={setSelectedDesignation}>
                <SelectTrigger className="bg-purple-900/20 border-purple-500/30 text-white">
                  <SelectValue placeholder="Filter by Designation" />
                </SelectTrigger>
                <SelectContent className="bg-purple-900 border-purple-500">
                  <SelectItem value="all">All Designations</SelectItem>
                  {designations.map((designation) => (
                    <SelectItem key={designation.id} value={designation.name}>
                      {designation.name} ({designation.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Dense Table */}
        <Card className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-500/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              User Records ({filteredUsers.length})
              {usersLoading && <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-purple-900/50 border-b border-purple-500/30">
                  <tr>
                    <th className="px-3 py-2 text-left text-sm font-medium text-purple-300">Emp Code</th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-purple-300">Name</th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-purple-300">Designation</th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-purple-300">Role</th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-purple-300">Last Login</th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-purple-300">IP Address</th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-purple-300">Device Info</th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-purple-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-500/20">
                  {usersLoading ? (
                    // Loading skeleton
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index} className="animate-pulse">
                        <td className="px-3 py-2"><div className="h-4 bg-purple-600/30 rounded w-16"></div></td>
                        <td className="px-3 py-2"><div className="h-4 bg-purple-600/30 rounded w-24"></div></td>
                        <td className="px-3 py-2"><div className="h-4 bg-purple-600/30 rounded w-20"></div></td>
                        <td className="px-3 py-2"><div className="h-4 bg-purple-600/30 rounded w-16"></div></td>
                        <td className="px-3 py-2"><div className="h-4 bg-purple-600/30 rounded w-20"></div></td>
                        <td className="px-3 py-2"><div className="h-4 bg-purple-600/30 rounded w-24"></div></td>
                        <td className="px-3 py-2"><div className="h-4 bg-purple-600/30 rounded w-20"></div></td>
                        <td className="px-3 py-2"><div className="h-8 bg-purple-600/30 rounded w-32"></div></td>
                      </tr>
                    ))
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-purple-300">
                        {searchTerm.length > 0 && searchTerm.length < 3 ? (
                          <div className="flex items-center justify-center gap-2">
                            <Search className="w-5 h-5" />
                            Enter at least 3 characters to search
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <Users className="w-5 h-5" />
                            No users found matching your criteria
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const loginInfo = formatLastLogin(user.lastLoginTime, user.lastLoginIP);
                      return (
                        <tr key={user.id} className="hover:bg-purple-800/20 transition-colors">
                          <td className="px-3 py-2">
                            <span className="font-mono text-sm text-blue-300">{user.empcode}</span>
                          </td>
                          <td className="px-3 py-2">
                            <div>
                              <p className="font-medium text-white text-sm">{user.name}</p>
                              <p className="text-xs text-purple-300">{user.username}</p>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-sm text-purple-200">{user.designation}</span>
                          </td>
                          <td className="px-3 py-2">
                            <Badge className={`${getRoleBadgeColor(user.role)} text-xs`}>
                              {user.role}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1 text-xs text-purple-200">
                              <Clock className="w-3 h-3" />
                              {loginInfo.time}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <span className="font-mono text-xs text-blue-300">{loginInfo.ip}</span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1 text-xs text-purple-200">
                              {getDeviceIcon(user.deviceInfo)}
                              <div>
                                <p>{user.deviceInfo}</p>
                                <Badge className={`${getOSBadgeColor(user.operatingSystem)} text-xs mt-1`}>
                                  {user.operatingSystem}
                                </Badge>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleUserEdit(user)}
                                className="text-blue-400 hover:text-blue-300 h-7 w-7 p-0"
                                title="Edit User"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleUserMutation.mutate({ 
                                  userId: user.id, 
                                  action: user.isActive ? 'disable' : 'enable' 
                                })}
                                className={`h-7 w-7 p-0 ${user.isActive ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}`}
                                disabled={toggleUserMutation.isPending}
                                title={user.isActive ? 'Disable User' : 'Enable User'}
                              >
                                {user.isActive ? <Ban className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleUserEdit(user)}
                                className="text-yellow-400 hover:text-yellow-300 h-7 w-7 p-0"
                                title="Reset Password"
                              >
                                <Key className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

          </TabsContent>

          <TabsContent value="devices" className="space-y-6">
            {/* Device KPIs Section */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="bg-gradient-to-br from-purple-800/20 to-blue-800/20 border-purple-500/30 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-300 text-sm">Total Devices</p>
                      <p className="text-2xl font-bold text-white">
                        {deviceStats?.totalDevices || 0}
                      </p>
                    </div>
                    <Monitor className="w-8 h-8 text-purple-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-800/20 to-indigo-800/20 border-blue-500/30 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-300 text-sm">Active</p>
                      <p className="text-2xl font-bold text-white">
                        {deviceStats?.activeDevices || 0}
                      </p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-indigo-800/20 to-purple-800/20 border-indigo-500/30 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-indigo-300 text-sm">Trusted</p>
                      <p className="text-2xl font-bold text-white">
                        {deviceStats?.trustedDevices || 0}
                      </p>
                    </div>
                    <Shield className="w-8 h-8 text-indigo-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-800/20 to-blue-800/20 border-purple-500/30 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-300 text-sm">Unbound</p>
                      <p className="text-2xl font-bold text-white">
                        {deviceStats?.unboundDevices || 0}
                      </p>
                    </div>
                    <Unlink className="w-8 h-8 text-purple-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-800/20 to-indigo-800/20 border-blue-500/30 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-300 text-sm">Types</p>
                      <p className="text-2xl font-bold text-white">
                        {deviceStats?.deviceTypes.length || 0}
                      </p>
                    </div>
                    <Activity className="w-8 h-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Device Search and Filters */}
            <Card className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-500/30 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-purple-400" />
                    <Input
                      placeholder="Search devices..."
                      value={deviceSearchTerm}
                      onChange={(e) => setDeviceSearchTerm(e.target.value)}
                      className="pl-10 bg-purple-900/20 border-purple-500/30 text-white placeholder-purple-300"
                    />
                  </div>

                  <Select value={deviceFilterType} onValueChange={(value: "all" | "active" | "trusted" | "unbound") => setDeviceFilterType(value)}>
                    <SelectTrigger className="bg-purple-900/20 border-purple-500/30 text-white">
                      <SelectValue placeholder="Filter devices" />
                    </SelectTrigger>
                    <SelectContent className="bg-purple-900 border-purple-500">
                      <SelectItem value="all">All Devices</SelectItem>
                      <SelectItem value="active">Active Only</SelectItem>
                      <SelectItem value="trusted">Trusted Only</SelectItem>
                      <SelectItem value="unbound">Unbound Only</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    onClick={() => {
                      queryClient.invalidateQueries({ queryKey: ['/api/device-management/all'] });
                      queryClient.invalidateQueries({ queryKey: ['/api/device-management/stats'] });
                    }}
                    className="bg-purple-600 hover:bg-purple-700"
                    disabled={devicesLoading}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${devicesLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Devices Table */}
            <Card className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-500/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-purple-400" />
                  Device Records ({filteredDevices.length})
                  {devicesLoading && <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-purple-900/50 border-b border-purple-500/30">
                      <tr>
                        <th className="px-3 py-2 text-left text-sm font-medium text-purple-300">Device</th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-purple-300">User</th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-purple-300">Type</th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-purple-300">OS</th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-purple-300">Status</th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-purple-300">Last Seen</th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-purple-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-500/20">
                      {devicesLoading ? (
                        Array.from({ length: 5 }).map((_, index) => (
                          <tr key={index} className="animate-pulse">
                            <td className="px-3 py-2"><div className="h-4 bg-purple-600/30 rounded w-24"></div></td>
                            <td className="px-3 py-2"><div className="h-4 bg-purple-600/30 rounded w-20"></div></td>
                            <td className="px-3 py-2"><div className="h-4 bg-purple-600/30 rounded w-16"></div></td>
                            <td className="px-3 py-2"><div className="h-4 bg-purple-600/30 rounded w-18"></div></td>
                            <td className="px-3 py-2"><div className="h-4 bg-purple-600/30 rounded w-16"></div></td>
                            <td className="px-3 py-2"><div className="h-4 bg-purple-600/30 rounded w-20"></div></td>
                            <td className="px-3 py-2"><div className="h-8 bg-purple-600/30 rounded w-32"></div></td>
                          </tr>
                        ))
                      ) : filteredDevices.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-purple-300">
                            <div className="flex items-center justify-center gap-2">
                              <Monitor className="w-5 h-5" />
                              No devices found matching your criteria
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredDevices.map((deviceRecord: DeviceRecord) => (
                          <tr key={deviceRecord.device.id} className="hover:bg-purple-800/20 transition-colors">
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                {getDeviceIcon(deviceRecord.device.deviceType)}
                                <div>
                                  <p className="font-medium text-white text-sm">
                                    {deviceRecord.device.deviceName || 'Unknown Device'}
                                  </p>
                                  <p className="text-xs text-purple-300">{deviceRecord.device.deviceFingerprint.slice(0, 12)}...</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div>
                                <p className="font-medium text-white text-sm">{deviceRecord.user?.username || 'N/A'}</p>
                                <p className="text-xs text-purple-300">{deviceRecord.user?.employeeId || 'N/A'}</p>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <span className="text-sm text-purple-200">{deviceRecord.device.deviceType}</span>
                            </td>
                            <td className="px-3 py-2">
                              <Badge className={`${getOSBadgeColor(deviceRecord.device.operatingSystem)} text-xs`}>
                                {deviceRecord.device.operatingSystem}
                              </Badge>
                            </td>
                            <td className="px-3 py-2">
                              {getDeviceStatusBadge(deviceRecord.device)}
                            </td>
                            <td className="px-3 py-2">
                              <span className="text-xs text-purple-200">
                                {new Date(deviceRecord.device.lastSeen).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-purple-400 hover:text-purple-300">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-purple-900 border-purple-500">
                                  <DropdownMenuItem onClick={() => handleDeviceEdit(deviceRecord)}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDeviceTrust(deviceRecord)}>
                                    {deviceRecord.device.isTrusted ? (
                                      <><ShieldX className="w-4 h-4 mr-2" /> Untrust Device</>
                                    ) : (
                                      <><Shield className="w-4 h-4 mr-2" /> Trust Device</>
                                    )}
                                  </DropdownMenuItem>
                                  {deviceRecord.device.isActive && (
                                    <DropdownMenuItem onClick={() => handleDeviceUnbind(deviceRecord)}>
                                      <Unlink className="w-4 h-4 mr-2" />
                                      Unbind Device
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

          </TabsContent>
        </Tabs>

        {/* Edit User Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="bg-gradient-to-br from-purple-900 to-blue-900 border-purple-500 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-purple-400" />
                Edit User: {selectedUser?.name}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-purple-300">Employee Code</Label>
                  <p className="font-mono text-blue-300">{selectedUser?.empcode}</p>
                </div>
                <div>
                  <Label className="text-purple-300">Username</Label>
                  <p className="font-mono text-purple-200">{selectedUser?.username}</p>
                </div>
                <div>
                  <Label className="text-purple-300">Department</Label>
                  <p className="text-purple-200">{selectedUser?.department}</p>
                </div>
                <div>
                  <Label className="text-purple-300">Designation</Label>
                  <p className="text-purple-200">{selectedUser?.designation}</p>
                </div>
              </div>

              {/* Role Update Section */}
              <div className="space-y-3">
                <Label className="text-purple-300">Update Role (Critical for Auth System)</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger className="bg-purple-900/20 border-purple-500/30 text-white">
                    <SelectValue placeholder="Select new role" />
                  </SelectTrigger>
                  <SelectContent className="bg-purple-900 border-purple-500">
                    {AVAILABLE_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {newRole !== selectedUser?.role && (
                  <Button
                    onClick={handleRoleUpdate}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 w-full"
                    disabled={updateRoleMutation.isPending}
                  >
                    {updateRoleMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Shield className="w-4 h-4 mr-2" />
                    )}
                    Update Role
                  </Button>
                )}
              </div>

              {/* Password Reset Section */}
              <div className="space-y-3">
                <Label className="text-purple-300">Reset Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password (min 6 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-purple-900/20 border-purple-500/30 text-white pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-purple-400 hover:text-purple-300 h-6 w-6 p-0"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                {newPassword.length > 0 && newPassword.length < 6 && (
                  <p className="text-xs text-blue-400">Password must be at least 6 characters</p>
                )}
                {newPassword.length >= 6 && (
                  <Button
                    onClick={handlePasswordReset}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 w-full"
                    disabled={resetPasswordMutation.isPending}
                  >
                    {resetPasswordMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Key className="w-4 h-4 mr-2" />
                    )}
                    Reset Password
                  </Button>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowEditDialog(false);
                    setNewPassword('');
                    setNewRole('');
                    setShowPassword(false);
                  }}
                  className="text-purple-300 hover:text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Device Details Dialog */}
        <Dialog open={showDeviceDialog} onOpenChange={setShowDeviceDialog}>
          <DialogContent className="bg-gradient-to-br from-purple-900 to-blue-900 border-purple-500 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Monitor className="w-5 h-5 text-purple-400" />
                Device Details
              </DialogTitle>
            </DialogHeader>
            
            {selectedDevice && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-purple-300">Device Name</Label>
                    <p className="text-purple-200">{selectedDevice.device.deviceName || 'Unknown'}</p>
                  </div>
                  <div>
                    <Label className="text-purple-300">Device Type</Label>
                    <p className="text-purple-200">{selectedDevice.device.deviceType}</p>
                  </div>
                  <div>
                    <Label className="text-purple-300">Operating System</Label>
                    <p className="text-purple-200">{selectedDevice.device.operatingSystem} {selectedDevice.device.osVersion}</p>
                  </div>
                  <div>
                    <Label className="text-purple-300">Browser</Label>
                    <p className="text-purple-200">{selectedDevice.device.browser} {selectedDevice.device.browserVersion}</p>
                  </div>
                  <div>
                    <Label className="text-purple-300">Screen Resolution</Label>
                    <p className="text-purple-200">{selectedDevice.device.screenResolution}</p>
                  </div>
                  <div>
                    <Label className="text-purple-300">Platform</Label>
                    <p className="text-purple-200">{selectedDevice.device.platform}</p>
                  </div>
                  <div>
                    <Label className="text-purple-300">First Seen</Label>
                    <p className="text-purple-200">{new Date(selectedDevice.device.firstSeen).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-purple-300">Last Seen</Label>
                    <p className="text-purple-200">{new Date(selectedDevice.device.lastSeen).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-purple-300">Login Count</Label>
                    <p className="text-purple-200">{selectedDevice.device.loginCount}</p>
                  </div>
                  <div>
                    <Label className="text-purple-300">Status</Label>
                    <div className="flex gap-2">
                      {getDeviceStatusBadge(selectedDevice.device)}
                    </div>
                  </div>
                </div>
                
                {selectedDevice.device.notes && (
                  <div>
                    <Label className="text-purple-300">Notes</Label>
                    <p className="text-purple-200 bg-purple-900/20 p-2 rounded border border-purple-500/30">
                      {selectedDevice.device.notes}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setShowDeviceDialog(false)}
                className="text-purple-300 hover:text-white"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Unbind Device Dialog */}
        <Dialog open={showUnbindDialog} onOpenChange={setShowUnbindDialog}>
          <DialogContent className="bg-gradient-to-br from-purple-900 to-blue-900 border-purple-500 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Unlink className="w-5 h-5 text-red-400" />
                Unbind Device
              </DialogTitle>
              <DialogDescription className="text-purple-300">
                This action will unbind the device from the user account. The user will need to re-authenticate on this device.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label className="text-purple-300">Reason for unbinding (required)</Label>
                <Textarea
                  placeholder="Enter reason for unbinding this device..."
                  value={unbindReason}
                  onChange={(e) => setUnbindReason(e.target.value)}
                  className="bg-purple-900/20 border-purple-500/30 text-white placeholder-purple-300"
                  rows={3}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowUnbindDialog(false);
                  setUnbindReason('');
                }}
                className="text-purple-300 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedDevice && unbindReason.trim()) {
                    unbindDeviceMutation.mutate({
                      deviceId: selectedDevice.device.id,
                      reason: unbindReason.trim()
                    });
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
                disabled={!unbindReason.trim() || unbindDeviceMutation.isPending}
              >
                {unbindDeviceMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Unlink className="w-4 h-4 mr-2" />
                )}
                Unbind Device
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Trust Device Dialog */}
        <Dialog open={showTrustDialog} onOpenChange={setShowTrustDialog}>
          <DialogContent className="bg-gradient-to-br from-purple-900 to-blue-900 border-purple-500 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-400" />
                {selectedDevice?.device.isTrusted ? 'Untrust Device' : 'Trust Device'}
              </DialogTitle>
              <DialogDescription className="text-purple-300">
                {selectedDevice?.device.isTrusted
                  ? 'Remove trust status from this device.'
                  : 'Mark this device as trusted for enhanced security privileges.'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label className="text-purple-300">Notes (optional)</Label>
                <Textarea
                  placeholder="Add notes about this trust decision..."
                  value={trustNotes}
                  onChange={(e) => setTrustNotes(e.target.value)}
                  className="bg-purple-900/20 border-purple-500/30 text-white placeholder-purple-300"
                  rows={3}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowTrustDialog(false);
                  setTrustNotes('');
                }}
                className="text-purple-300 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedDevice) {
                    trustDeviceMutation.mutate({
                      deviceId: selectedDevice.device.id,
                      trusted: !selectedDevice.device.isTrusted,
                      notes: trustNotes.trim() || undefined
                    });
                  }
                }}
                className={selectedDevice?.device.isTrusted ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
                disabled={trustDeviceMutation.isPending}
              >
                {trustDeviceMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : selectedDevice?.device.isTrusted ? (
                  <ShieldX className="w-4 h-4 mr-2" />
                ) : (
                  <Shield className="w-4 h-4 mr-2" />
                )}
                {selectedDevice?.device.isTrusted ? 'Untrust Device' : 'Trust Device'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}