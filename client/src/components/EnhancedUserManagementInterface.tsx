
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';
import { useToast } from '../hooks/use-toast';
import { 
  Users, 
  Shield, 
  Settings, 
  Monitor, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  UserPlus, 
  Key,
  History,
  BarChart3,
  Globe,
  Building,
  MapPin,
  Layers,
  Crown,
  UserCheck,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

interface EnhancedUser {
  id: number;
  username: string;
  role: string;
  employeeId?: string;
  isActive: boolean;
  accountType: string;
  managedDepartments: string[];
  accessScope: string;
  lastPasswordChange?: string;
  createdAt: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  designation?: string;
  email?: string;
  mobile?: string;
}

interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  accessLevel: number;
  permissions: {
    canCreateUsers: boolean;
    canDeleteUsers: boolean;
    canDeleteData: boolean;
    canAccessFinancialData: boolean;
    canManageSystem: boolean;
    canManageTeams: boolean;
    canChangeDesignations: boolean;
    canAccessAllEmployees: boolean;
    canModifyAttendance: boolean;
    canViewReports: boolean;
    canManageRoles: boolean;
    canManageDevices: boolean;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface UserSession {
  id: string;
  userId: number;
  username: string;
  realName: string;
  role: string;
  isActive: boolean;
  loginTime: string;
  lastActivity: string;
  ipAddress: string;
  userAgent: string;
  deviceType: string;
  browser: string;
  os: string;
  duration: string;
  locationEnabled: boolean;
  notificationEnabled: boolean;
}

const ACCESS_SCOPES = [
  { value: "global", label: "Global Access", description: "Full system access", icon: Globe },
  { value: "department", label: "Department Access", description: "Limited to specific department", icon: Building },
  { value: "location", label: "Location Access", description: "Limited to specific location/branch", icon: MapPin },
  { value: "specialized", label: "Specialized Access", description: "Limited to specialized area", icon: Layers }
];

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

const getRoleIcon = (role: string) => {
  switch (role.toLowerCase()) {
    case 'superadmin':
      return Crown;
    case 'admin':
    case 'general_admin':
      return Shield;
    case 'manager':
      return UserCheck;
    case 'supervisor':
      return Users;
    default:
      return UserCheck;
  }
};

export default function EnhancedUserManagementInterface() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedDesignation, setSelectedDesignation] = useState('');
  const [selectedUser, setSelectedUser] = useState<EnhancedUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showRoleStatsDialog, setShowRoleStatsDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  
  // Role assignment states
  const [selectedRoleForAssignment, setSelectedRoleForAssignment] = useState('');
  const [accessScope, setAccessScope] = useState('global');
  const [departmentRestrictions, setDepartmentRestrictions] = useState<string[]>([]);
  const [locationRestrictions, setLocationRestrictions] = useState<string[]>([]);
  const [assignmentNotes, setAssignmentNotes] = useState('');

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Debounced search with 3 character minimum
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length >= 3 || searchTerm.length === 0) {
        setDebouncedSearchTerm(searchTerm);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/admin/comprehensive-users', debouncedSearchTerm, selectedDepartment, selectedDesignation],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      if (selectedDepartment) params.append('department', selectedDepartment);
      if (selectedDesignation) params.append('designation', selectedDesignation);
      
      const response = await fetch(`/api/admin/comprehensive-users?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    staleTime: 30 * 1000,
  });

  // Fetch roles
  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ['/api/role-management/roles'],
    queryFn: async () => {
      const response = await fetch('/api/role-management/roles', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch roles');
      return response.json();
    },
    staleTime: 60 * 1000,
  });

  // Fetch role statistics
  const { data: roleStatsData, isLoading: roleStatsLoading } = useQuery({
    queryKey: ['/api/role-management/roles/statistics/overview'],
    queryFn: async () => {
      const response = await fetch('/api/role-management/roles/statistics/overview', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch role statistics');
      return response.json();
    },
    staleTime: 30 * 1000,
  });

  // Fetch sessions
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ['/api/admin/sessions'],
    queryFn: async () => {
      const response = await fetch('/api/admin/sessions', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch sessions');
      return response.json();
    },
    staleTime: 10 * 1000,
  });

  // Role assignment mutation
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId, accessScope, restrictions }: any) => {
      const response = await fetch(`/api/role-management/users/${userId}/assign-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roleId, accessScope, restrictions }),
      });
      if (!response.ok) throw new Error('Failed to assign role');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/comprehensive-users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/role-management/roles/statistics/overview'] });
      toast({ title: "Success", description: "Role assigned successfully" });
      setShowRoleDialog(false);
      resetRoleForm();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to assign role",
        variant: "destructive" 
      });
    },
  });

  // Role removal mutation
  const removeRoleMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/role-management/users/${userId}/remove-role`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to remove role');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/comprehensive-users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/role-management/roles/statistics/overview'] });
      toast({ title: "Success", description: "Role removed successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to remove role",
        variant: "destructive" 
      });
    },
  });

  // Session logout mutation
  const logoutSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/admin/sessions/${sessionId}/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to logout session');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sessions'] });
      toast({ title: "Success", description: "User logged out successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to logout user",
        variant: "destructive" 
      });
    },
  });

  const resetRoleForm = () => {
    setSelectedRoleForAssignment('');
    setAccessScope('global');
    setDepartmentRestrictions([]);
    setLocationRestrictions([]);
    setAssignmentNotes('');
  };

  const handleRoleAssignment = () => {
    if (!selectedUser || !selectedRoleForAssignment) {
      toast({ 
        title: "Invalid selection",
        description: "Please select a user and role.",
        variant: "destructive"
      });
      return;
    }

    const restrictions = {
      departments: departmentRestrictions,
      locations: locationRestrictions,
      notes: assignmentNotes
    };

    assignRoleMutation.mutate({
      userId: selectedUser.id,
      roleId: selectedRoleForAssignment,
      accessScope,
      restrictions
    });
  };

  const users = usersData?.users || [];
  const roles = rolesData?.roles || [];
  const roleStats = roleStatsData?.statistics || {};
  const sessions = sessionsData || [];

  // Get unique departments and designations for filters
  const uniqueDepartments = useMemo(() => {
    return [...new Set(users.map((user: EnhancedUser) => user.department).filter(Boolean))];
  }, [users]);

  const uniqueDesignations = useMemo(() => {
    return [...new Set(users.map((user: EnhancedUser) => user.designation).filter(Boolean))];
  }, [users]);

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter((user: EnhancedUser) => {
      const matchesDepartment = !selectedDepartment || user.department === selectedDepartment;
      const matchesDesignation = !selectedDesignation || user.designation === selectedDesignation;
      return matchesDepartment && matchesDesignation;
    });
  }, [users, selectedDepartment, selectedDesignation]);

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage users, roles, and active sessions</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowRoleStatsDialog(true)}
            className="flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Role Statistics
          </Button>
          <Button
            onClick={() => queryClient.invalidateQueries()}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users ({filteredUsers.length})
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Roles ({roles.length})
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Sessions ({sessions.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search users (min 3 characters)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Departments</SelectItem>
                {uniqueDepartments.map((dept) => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedDesignation} onValueChange={setSelectedDesignation}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by designation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Designations</SelectItem>
                {uniqueDesignations.map((designation) => (
                  <SelectItem key={designation} value={designation}>{designation}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4">
            {usersLoading ? (
              <div className="text-center py-8">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm.length > 0 && searchTerm.length < 3 
                  ? "Enter at least 3 characters to search" 
                  : "No users found"}
              </div>
            ) : (
              filteredUsers.map((user: EnhancedUser) => {
                const RoleIcon = getRoleIcon(user.role);
                return (
                  <Card key={user.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <RoleIcon className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {user.firstName} {user.lastName} ({user.username})
                              </span>
                              <Badge className={`${getRoleBadgeColor(user.role)} text-white text-xs`}>
                                {user.role}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {user.department} • {user.designation} • {user.employeeId}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Dialog open={showRoleDialog && selectedUser?.id === user.id} 
                                  onOpenChange={(open) => { setShowRoleDialog(open); if (!open) setSelectedUser(null); }}>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedUser(user)}
                              >
                                <Shield className="w-4 h-4 mr-1" />
                                Manage Role
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Manage User Role</DialogTitle>
                                <DialogDescription>
                                  Assign or modify role for {user.firstName} {user.lastName}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Current Role</Label>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge className={`${getRoleBadgeColor(user.role)} text-white`}>
                                      {user.role}
                                    </Badge>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => removeRoleMutation.mutate(user.id)}
                                      disabled={removeRoleMutation.isPending}
                                    >
                                      <Trash2 className="w-3 h-3 mr-1" />
                                      Remove
                                    </Button>
                                  </div>
                                </div>

                                <div>
                                  <Label>Assign New Role</Label>
                                  <Select value={selectedRoleForAssignment} onValueChange={setSelectedRoleForAssignment}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {roles.map((role: Role) => (
                                        <SelectItem key={role.id} value={role.id}>
                                          {role.displayName} (Level {role.accessLevel})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label>Access Scope</Label>
                                  <Select value={accessScope} onValueChange={setAccessScope}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {ACCESS_SCOPES.map((scope) => {
                                        const Icon = scope.icon;
                                        return (
                                          <SelectItem key={scope.value} value={scope.value}>
                                            <div className="flex items-center gap-2">
                                              <Icon className="w-4 h-4" />
                                              <div>
                                                <div>{scope.label}</div>
                                                <div className="text-xs text-muted-foreground">{scope.description}</div>
                                              </div>
                                            </div>
                                          </SelectItem>
                                        );
                                      })}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {accessScope === 'department' && (
                                  <div>
                                    <Label>Department Restrictions</Label>
                                    <Input
                                      placeholder="Enter departments (comma-separated)"
                                      value={departmentRestrictions.join(', ')}
                                      onChange={(e) => setDepartmentRestrictions(
                                        e.target.value.split(',').map(d => d.trim()).filter(Boolean)
                                      )}
                                    />
                                  </div>
                                )}

                                <div>
                                  <Label>Assignment Notes (Optional)</Label>
                                  <Textarea
                                    placeholder="Add notes about this role assignment..."
                                    value={assignmentNotes}
                                    onChange={(e) => setAssignmentNotes(e.target.value)}
                                  />
                                </div>

                                <div className="flex gap-2">
                                  <Button 
                                    onClick={handleRoleAssignment}
                                    disabled={!selectedRoleForAssignment || assignRoleMutation.isPending}
                                    className="flex-1"
                                  >
                                    {assignRoleMutation.isPending ? 'Assigning...' : 'Assign Role'}
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    onClick={() => { setShowRoleDialog(false); resetRoleForm(); }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rolesLoading ? (
              <div className="col-span-full text-center py-8">Loading roles...</div>
            ) : (
              roles.map((role: Role) => {
                const RoleIcon = getRoleIcon(role.name);
                return (
                  <Card key={role.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <RoleIcon className="w-5 h-5" />
                          <CardTitle className="text-lg">{role.displayName}</CardTitle>
                        </div>
                        <Badge variant="outline">Level {role.accessLevel}</Badge>
                      </div>
                      <CardDescription>{role.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm font-medium mb-2">Key Permissions:</div>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(role.permissions)
                              .filter(([_, value]) => value)
                              .slice(0, 4)
                              .map(([key, _]) => (
                                <Badge key={key} variant="secondary" className="text-xs">
                                  {key.replace('can', '').replace(/([A-Z])/g, ' $1').trim()}
                                </Badge>
                              ))}
                            {Object.values(role.permissions).filter(Boolean).length > 4 && (
                              <Badge variant="secondary" className="text-xs">
                                +{Object.values(role.permissions).filter(Boolean).length - 4} more
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => setSelectedRole(role)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <div className="grid gap-4">
            {sessionsLoading ? (
              <div className="text-center py-8">Loading sessions...</div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No active sessions found</div>
            ) : (
              sessions.map((session: UserSession) => (
                <Card key={session.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                          <Monitor className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{session.realName} ({session.username})</span>
                            <Badge className={`${getRoleBadgeColor(session.role)} text-white text-xs`}>
                              {session.role}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {session.deviceType} • {session.browser} • {session.os} • {session.duration}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            IP: {session.ipAddress} • Last activity: {new Date(session.lastActivity).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => logoutSessionMutation.mutate(session.id)}
                        disabled={logoutSessionMutation.isPending}
                        className="text-red-600 hover:text-red-700"
                      >
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        Force Logout
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{roleStats.totalActiveUsers || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Across all roles
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sessions.length}</div>
                <p className="text-xs text-muted-foreground">
                  Currently online
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Available Roles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{roles.length}</div>
                <p className="text-xs text-muted-foreground">
                  System roles
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {filteredUsers.filter((u: EnhancedUser) => 
                    ['admin', 'superadmin', 'general_admin'].includes(u.role)).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Privileged accounts
                </p>
              </CardContent>
            </Card>
          </div>

          {roleStats.roleDistribution && (
            <Card>
              <CardHeader>
                <CardTitle>Role Distribution</CardTitle>
                <CardDescription>User count by role</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {roleStats.roleDistribution.map((roleData: any) => (
                    <div key={roleData.role} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={`${getRoleBadgeColor(roleData.role)} text-white`}>
                          {roleData.role}
                        </Badge>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">{roleData.user_count}</span> users
                        <span className="text-muted-foreground ml-2">
                          ({roleData.active_users} active)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Role Statistics Dialog */}
      <Dialog open={showRoleStatsDialog} onOpenChange={setShowRoleStatsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Role Statistics Overview</DialogTitle>
            <DialogDescription>
              Comprehensive breakdown of user roles and permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {roleStatsLoading ? (
              <div className="text-center py-8">Loading statistics...</div>
            ) : (
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">{roleStats.totalActiveUsers}</div>
                      <div className="text-sm text-muted-foreground">Total Active Users</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">{roles.length}</div>
                      <div className="text-sm text-muted-foreground">Available Roles</div>
                    </CardContent>
                  </Card>
                </div>
                
                {roleStats.roleDistribution && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Role Distribution</h4>
                    {roleStats.roleDistribution.map((roleData: any) => (
                      <div key={roleData.role} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <Badge className={`${getRoleBadgeColor(roleData.role)} text-white`}>
                            {roleData.role}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{roleData.user_count} total</div>
                          <div className="text-sm text-muted-foreground">
                            {roleData.active_users} active • {roleData.recent_logins} recent logins
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
