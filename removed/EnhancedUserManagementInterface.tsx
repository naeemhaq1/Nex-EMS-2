import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Users, Monitor, Settings, Eye, EyeOff, Shield, Lock, UserX, UserCheck, 
  Clock, MapPin, Smartphone, Globe, Bell, BellOff, LogOut, RefreshCw, User, Edit, 
  Key, Ban, CheckCircle, Filter, Laptop, Tablet, Server, Activity, Calendar,
  TrendingUp, UserPlus, AlertTriangle, ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Enhanced User Interface with comprehensive data
interface EnhancedUser {
  id: number;
  username: string;
  empcode: string;
  realName: string;
  role: string;
  isActive: boolean;
  department: string;
  designation: string;
  lastLogin: string | null;
  lastLoginIP: string | null;
  deviceType: string;
  operatingSystem: string;
  browser: string;
  deviceInfo: string;
  totalSessions: number;
  createdAt: string;
  employee?: {
    firstName: string;
    lastName: string;
    department: string;
    employeeCode: string;
    email?: string;
    phone?: string;
    nonBio: boolean;
    stopPay: boolean;
    systemAccount: boolean;
  };
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
  departmentDistribution: { department: string; count: number }[];
}

// Department and Group filters
interface FilterOption {
  id: string;
  name: string;
  count: number;
}

const getDeviceIcon = (deviceType: string) => {
  switch (deviceType.toLowerCase()) {
    case 'mobile':
    case 'smartphone':
      return <Smartphone className="w-4 h-4" />;
    case 'tablet':
      return <Tablet className="w-4 h-4" />;
    case 'desktop':
    case 'laptop':
      return <Laptop className="w-4 h-4" />;
    default:
      return <Monitor className="w-4 h-4" />;
  }
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

export default function EnhancedUserManagementInterface() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedDesignation, setSelectedDesignation] = useState('');
  const [selectedUser, setSelectedUser] = useState<EnhancedUser | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debounced search with 3 character minimum
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length >= 3 || searchTerm.length === 0) {
        setDebouncedSearchTerm(searchTerm);
      }
    }, 300); // Faster debounce for better UX
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch User KPIs
  const { data: userKPIs, isLoading: kpisLoading } = useQuery<UserKPIs>({
    queryKey: ['/api/admin/user-kpis'],
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000
  });

  // Fetch Enhanced Users with comprehensive data
  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['/api/admin/enhanced-users', debouncedSearchTerm, selectedDepartment, selectedGroup, selectedDesignation],
    enabled: debouncedSearchTerm.length >= 3 || debouncedSearchTerm.length === 0,
    refetchInterval: 60000,
    staleTime: 30000
  });

  // Fetch Departments for filtering
  const { data: departments = [] } = useQuery<FilterOption[]>({
    queryKey: ['/api/employees/departments'],
    staleTime: 300000, // 5 minutes cache
  });

  // Fetch Groups for filtering  
  const { data: groups = [] } = useQuery<FilterOption[]>({
    queryKey: ['/api/employees/groups'],
    staleTime: 300000, // 5 minutes cache
  });

  // Fetch Designations for filtering
  const { data: designations = [] } = useQuery<FilterOption[]>({
    queryKey: ['/api/employees/designations'],
    staleTime: 300000, // 5 minutes cache
  });

  // User management mutations
  const toggleUserMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: number; action: 'enable' | 'disable' }) => {
      return apiRequest(`/api/admin/users/${userId}/${action}`, { method: 'POST' });
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/enhanced-users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/user-kpis'] });
      toast({ 
        title: `User ${action}d successfully`,
        description: `User account has been ${action}d.`
      });
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: number; newPassword: string }) => {
      return apiRequest(`/api/admin/users/${userId}/reset-password`, { 
        method: 'POST',
        body: { newPassword }
      });
    },
    onSuccess: () => {
      setNewPassword('');
      setShowEditDialog(false);
      toast({ 
        title: "Password reset successfully",
        description: "User password has been updated."
      });
    }
  });

  const users = useMemo(() => {
    if (!usersData?.users) return [];
    return usersData.users as EnhancedUser[];
  }, [usersData]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesDepartment = !selectedDepartment || user.department === selectedDepartment;
      const matchesGroup = !selectedGroup || user.role === selectedGroup; // Using role as group filter
      const matchesDesignation = !selectedDesignation || user.designation === selectedDesignation;
      
      return matchesDepartment && matchesGroup && matchesDesignation;
    });
  }, [users, selectedDepartment, selectedGroup, selectedDesignation]);

  const handleUserEdit = (user: EnhancedUser) => {
    setSelectedUser(user);
    setShowEditDialog(true);
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

  const formatLastLogin = (lastLogin: string | null) => {
    if (!lastLogin) return 'Never';
    
    const date = new Date(lastLogin);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1B3E] via-[#2D1B69] to-[#1A1B3E] text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Users className="w-8 h-8 text-purple-400" />
              Enhanced User Management
            </h1>
            <p className="text-purple-300 mt-2">
              Comprehensive user management with KPIs, search, and advanced controls
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

        {/* KPIs Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 border-blue-600/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-300 text-sm">Total Users</p>
                  <p className="text-2xl font-bold text-white">
                    {kpisLoading ? '...' : userKPIs?.totalUsers || 0}
                  </p>
                </div>
                <Users className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-900/50 to-green-800/50 border-green-600/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-300 text-sm">Active Users</p>
                  <p className="text-2xl font-bold text-white">
                    {kpisLoading ? '...' : userKPIs?.activeUsers || 0}
                  </p>
                </div>
                <UserCheck className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-900/50 to-red-800/50 border-red-600/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-300 text-sm">Inactive</p>
                  <p className="text-2xl font-bold text-white">
                    {kpisLoading ? '...' : userKPIs?.inactiveUsers || 0}
                  </p>
                </div>
                <UserX className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 border-purple-600/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-300 text-sm">Online Now</p>
                  <p className="text-2xl font-bold text-white">
                    {kpisLoading ? '...' : userKPIs?.onlineUsers || 0}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-900/50 to-indigo-800/50 border-indigo-600/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-300 text-sm">Admins</p>
                  <p className="text-2xl font-bold text-white">
                    {kpisLoading ? '...' : userKPIs?.adminUsers || 0}
                  </p>
                </div>
                <Shield className="w-8 h-8 text-indigo-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-900/50 to-orange-800/50 border-orange-600/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-300 text-sm">Recent Logins</p>
                  <p className="text-2xl font-bold text-white">
                    {kpisLoading ? '...' : userKPIs?.recentLogins || 0}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-teal-900/50 to-teal-800/50 border-teal-600/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-teal-300 text-sm">System Accounts</p>
                  <p className="text-2xl font-bold text-white">
                    {kpisLoading ? '...' : userKPIs?.systemAccounts || 0}
                  </p>
                </div>
                <Server className="w-8 h-8 text-teal-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-600/30">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search users (min 3 chars)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400"
                />
                {searchTerm.length > 0 && searchTerm.length < 3 && (
                  <p className="text-xs text-yellow-400 mt-1">Minimum 3 characters required</p>
                )}
              </div>

              {/* Department Filter */}
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="bg-gray-800/50 border-gray-600 text-white">
                  <SelectValue placeholder="Filter by Department" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.name}>
                      {dept.name} ({dept.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Group/Role Filter */}
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger className="bg-gray-800/50 border-gray-600 text-white">
                  <SelectValue placeholder="Filter by Role" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="">All Roles</SelectItem>
                  <SelectItem value="superadmin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                </SelectContent>
              </Select>

              {/* Designation Filter */}
              <Select value={selectedDesignation} onValueChange={setSelectedDesignation}>
                <SelectTrigger className="bg-gray-800/50 border-gray-600 text-white">
                  <SelectValue placeholder="Filter by Designation" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="">All Designations</SelectItem>
                  {designations.map((designation) => (
                    <SelectItem key={designation.id} value={designation.name}>
                      {designation.name} ({designation.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Active Filters Display */}
            {(selectedDepartment || selectedGroup || selectedDesignation || debouncedSearchTerm) && (
              <div className="flex flex-wrap gap-2 mt-4">
                <p className="text-sm text-gray-300">Active Filters:</p>
                {debouncedSearchTerm && (
                  <Badge variant="secondary" className="bg-blue-600">
                    Search: {debouncedSearchTerm}
                  </Badge>
                )}
                {selectedDepartment && (
                  <Badge variant="secondary" className="bg-green-600">
                    Dept: {selectedDepartment}
                  </Badge>
                )}
                {selectedGroup && (
                  <Badge variant="secondary" className="bg-purple-600">
                    Role: {selectedGroup}
                  </Badge>
                )}
                {selectedDesignation && (
                  <Badge variant="secondary" className="bg-orange-600">
                    Designation: {selectedDesignation}
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedDepartment('');
                    setSelectedGroup('');
                    setSelectedDesignation('');
                    setSearchTerm('');
                  }}
                  className="text-red-400 hover:text-red-300 h-6 px-2"
                >
                  Clear All
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-600/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              Users ({filteredUsers.length})
              {usersLoading && <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50 border-b border-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Emp Code</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Login ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Device</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">OS</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Last Login</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {usersLoading ? (
                    // Loading skeleton
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index} className="animate-pulse">
                        <td className="px-4 py-3"><div className="h-4 bg-gray-600 rounded w-16"></div></td>
                        <td className="px-4 py-3"><div className="h-4 bg-gray-600 rounded w-24"></div></td>
                        <td className="px-4 py-3"><div className="h-4 bg-gray-600 rounded w-20"></div></td>
                        <td className="px-4 py-3"><div className="h-4 bg-gray-600 rounded w-16"></div></td>
                        <td className="px-4 py-3"><div className="h-4 bg-gray-600 rounded w-16"></div></td>
                        <td className="px-4 py-3"><div className="h-4 bg-gray-600 rounded w-20"></div></td>
                        <td className="px-4 py-3"><div className="h-4 bg-gray-600 rounded w-16"></div></td>
                        <td className="px-4 py-3"><div className="h-8 bg-gray-600 rounded w-32"></div></td>
                      </tr>
                    ))
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
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
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm text-blue-300">{user.empcode}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="font-medium text-white">{user.realName}</p>
                              <p className="text-xs text-gray-400">{user.department}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm text-gray-300">{user.username}</span>
                          <Badge className={`ml-2 ${getRoleBadgeColor(user.role)} text-xs`}>
                            {user.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-gray-300">
                            {getDeviceIcon(user.deviceType)}
                            <span className="text-xs">{user.deviceType}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`${getOSBadgeColor(user.operatingSystem)} text-xs`}>
                            {user.operatingSystem}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-sm text-gray-300">
                            <Clock className="w-3 h-3" />
                            {formatLastLogin(user.lastLogin)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={user.isActive ? "default" : "destructive"} className="text-xs">
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUserEdit(user)}
                              className="text-blue-400 hover:text-blue-300 h-8 w-8 p-0"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleUserMutation.mutate({ 
                                userId: user.id, 
                                action: user.isActive ? 'disable' : 'enable' 
                              })}
                              className={`h-8 w-8 p-0 ${user.isActive ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}`}
                              disabled={toggleUserMutation.isPending}
                            >
                              {user.isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUserEdit(user)}
                              className="text-yellow-400 hover:text-yellow-300 h-8 w-8 p-0"
                            >
                              <Key className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-purple-400" />
                Edit User: {selectedUser?.realName}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-gray-300">Employee Code</Label>
                  <p className="font-mono text-blue-300">{selectedUser?.empcode}</p>
                </div>
                <div>
                  <Label className="text-gray-300">Login ID</Label>
                  <p className="font-mono text-gray-300">{selectedUser?.username}</p>
                </div>
                <div>
                  <Label className="text-gray-300">Department</Label>
                  <p className="text-gray-300">{selectedUser?.department}</p>
                </div>
                <div>
                  <Label className="text-gray-300">Role</Label>
                  <Badge className={getRoleBadgeColor(selectedUser?.role || '')}>
                    {selectedUser?.role}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-gray-300">Reset Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password (min 6 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-gray-800/50 border-gray-600 text-white pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 h-6 w-6 p-0"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                {newPassword.length > 0 && newPassword.length < 6 && (
                  <p className="text-xs text-red-400">Password must be at least 6 characters</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowEditDialog(false);
                    setNewPassword('');
                    setShowPassword(false);
                  }}
                  className="text-gray-300 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePasswordReset}
                  disabled={newPassword.length < 6 || resetPasswordMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {resetPasswordMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Key className="w-4 h-4 mr-2" />
                  )}
                  Reset Password
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}