
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, Users, Shield, Settings, Monitor, LogOut, RefreshCw, 
  UserPlus, Edit, Trash2, Crown, Eye, AlertTriangle, Clock, 
  MapPin, Smartphone, Laptop, Globe, CheckCircle, XCircle,
  Filter, Download, MoreVertical, UserCheck, Award, Database
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface UserRecord {
  id: number;
  username: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  employee: {
    id: number;
    firstName: string;
    lastName: string;
    department: string;
    employeeCode: string;
    designation: string;
    poslevel: string;
  } | null;
  roleInfo: {
    id: string;
    name: string;
    description: string;
    level: number;
    accessScope: string;
    canManageRoles: boolean;
    canDeleteData: boolean;
  } | null;
}

interface SessionRecord {
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
}

interface Role {
  id: string;
  name: string;
  description: string;
  level: number;
  permissions: string[];
  canManageRoles: boolean;
  canDeleteData: boolean;
  accessScope: string;
  isActive: boolean;
}

interface RoleStatistics {
  roleId: string;
  roleName: string;
  totalUsers: number;
  activeUsers: number;
  departments: number;
  level: number;
}

export default function UnifiedUserManagement() {
  const [activeTab, setActiveTab] = useState('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [sessionSearchTerm, setSessionSearchTerm] = useState('');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch users with roles
  const { data: usersData = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/admin/role-management/user-roles', searchTerm, selectedRole],
    queryFn: () => apiRequest({
      url: '/api/admin/role-management/user-roles',
      params: { search: searchTerm, role: selectedRole, limit: '100' }
    }),
  });

  // Fetch roles
  const { data: rolesData } = useQuery({
    queryKey: ['/api/admin/role-management/roles'],
    queryFn: () => apiRequest({ url: '/api/admin/role-management/roles' }),
  });

  // Fetch role statistics
  const { data: roleStats } = useQuery({
    queryKey: ['/api/admin/role-management/statistics'],
    queryFn: () => apiRequest({ url: '/api/admin/role-management/statistics' }),
  });

  // Fetch sessions
  const { data: sessionsData = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['/api/admin/sessions', sessionSearchTerm],
    queryFn: () => apiRequest({
      url: '/api/admin/sessions',
      params: { search: sessionSearchTerm }
    }),
    staleTime: 30 * 1000,
  });

  // Fetch permissions
  const { data: permissions } = useQuery({
    queryKey: ['/api/admin/role-management/permissions'],
    queryFn: () => apiRequest({ url: '/api/admin/role-management/permissions' }),
  });

  // Role assignment mutation
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: number; roleId: string }) => {
      return apiRequest({
        url: `/api/admin/role-management/users/${userId}/role`,
        method: 'PUT',
        data: { roleId }
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Role assigned successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/role-management/user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/role-management/statistics'] });
      setShowRoleDialog(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign role",
        variant: "destructive",
      });
    },
  });

  // Session termination mutation
  const terminateSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return apiRequest({
        url: `/api/admin/sessions/${sessionId}/logout`,
        method: 'POST'
      });
    },
    onSuccess: () => {
      toast({
        title: "Session terminated",
        description: "User session has been terminated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sessions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to terminate session",
        variant: "destructive",
      });
    }
  });

  const roles: Role[] = rolesData?.roles || [];
  const assignableRoles: string[] = rolesData?.assignableRoles || [];
  const currentUserRole: string = rolesData?.currentUserRole || 'staff';
  const canManageRoles: boolean = rolesData?.canManageRoles || false;

  const filteredUsers = usersData;
  const filteredSessions = sessionsData.filter((session: SessionRecord) => {
    if (!sessionSearchTerm || sessionSearchTerm.length < 3) return true;
    return (
      session.username.toLowerCase().includes(sessionSearchTerm.toLowerCase()) ||
      session.realName.toLowerCase().includes(sessionSearchTerm.toLowerCase()) ||
      session.ipAddress.includes(sessionSearchTerm) ||
      session.role.toLowerCase().includes(sessionSearchTerm.toLowerCase())
    );
  });

  const handleAssignRole = () => {
    if (!selectedUser || !newRole) {
      toast({
        title: "Error",
        description: "Please select a user and role",
        variant: "destructive",
      });
      return;
    }

    assignRoleMutation.mutate({
      userId: selectedUser.id,
      roleId: newRole
    });
  };

  const getRoleBadgeColor = (roleId: string): string => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    
    switch (role.level) {
      case 10: return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 9: return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 7: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 6: return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 5: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'mobile':
      case 'smartphone':
        return <Smartphone className="w-4 h-4" />;
      case 'laptop':
        return <Laptop className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">User Management System</h1>
            <p className="text-gray-300">Manage users, roles, and sessions from one interface</p>
          </div>
          <Button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/admin/role-management/user-roles'] });
              queryClient.invalidateQueries({ queryKey: ['/api/admin/sessions'] });
              queryClient.invalidateQueries({ queryKey: ['/api/admin/role-management/statistics'] });
            }}
            variant="outline"
            className="border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh All
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-purple-900/30 border-purple-500/30 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-300 text-sm">Total Users</p>
                  <p className="text-2xl font-bold text-white">
                    {roleStats?.totalUsers || 0}
                  </p>
                </div>
                <Users className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-900/30 border-blue-500/30 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-300 text-sm">Active Users</p>
                  <p className="text-2xl font-bold text-white">
                    {roleStats?.activeUsers || 0}
                  </p>
                </div>
                <UserCheck className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-900/30 border-green-500/30 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-300 text-sm">Available Roles</p>
                  <p className="text-2xl font-bold text-white">
                    {roles.length}
                  </p>
                </div>
                <Award className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-orange-900/30 border-orange-500/30 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-300 text-sm">Active Sessions</p>
                  <p className="text-2xl font-bold text-white">
                    {sessionsData.length}
                  </p>
                </div>
                <Monitor className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-gray-900/50 border-gray-700">
            <TabsTrigger 
              value="users" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              <Users className="w-4 h-4 mr-2" />
              User Management
            </TabsTrigger>
            <TabsTrigger 
              value="roles" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              <Shield className="w-4 h-4 mr-2" />
              Role Management
            </TabsTrigger>
            <TabsTrigger 
              value="sessions" 
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
            >
              <Monitor className="w-4 h-4 mr-2" />
              Session Management
            </TabsTrigger>
          </TabsList>

          {/* User Management Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card className="bg-gray-900/50 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  User Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Search and Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search users (username, name, employee code)..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400"
                    />
                  </div>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="w-48 bg-gray-800/50 border-gray-600 text-white">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="">All Roles</SelectItem>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Users Table */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700">
                        <TableHead className="text-gray-300">User</TableHead>
                        <TableHead className="text-gray-300">Role</TableHead>
                        <TableHead className="text-gray-300">Department</TableHead>
                        <TableHead className="text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-300">Created</TableHead>
                        <TableHead className="text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                            Loading users...
                          </TableCell>
                        </TableRow>
                      ) : filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user: UserRecord) => (
                          <TableRow key={user.id} className="border-gray-700">
                            <TableCell>
                              <div>
                                <div className="font-medium text-white">
                                  {user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user.username}
                                </div>
                                <div className="text-sm text-gray-400">
                                  @{user.username} {user.employee && `• ${user.employee.employeeCode}`}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleBadgeColor(user.role)}>
                                {user.roleInfo?.name || user.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {user.employee?.department || 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Badge className={user.isActive ? 
                                'bg-green-500/20 text-green-400 border-green-500/30' : 
                                'bg-red-500/20 text-red-400 border-red-500/30'
                              }>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-gray-400">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-gray-800 border-gray-600">
                                  {canManageRoles && (
                                    <DropdownMenuItem 
                                      onClick={() => {
                                        setSelectedUser(user);
                                        setNewRole(user.role);
                                        setShowRoleDialog(true);
                                      }}
                                      className="text-white hover:bg-gray-700"
                                    >
                                      <Edit className="w-4 h-4 mr-2" />
                                      Change Role
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem className="text-white hover:bg-gray-700">
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Role Management Tab */}
          <TabsContent value="roles" className="space-y-6">
            {/* Role Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {roleStats?.statistics?.map((stat: RoleStatistics) => (
                <Card key={stat.roleId} className="bg-gray-900/50 border-gray-700 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={getRoleBadgeColor(stat.roleId)}>
                        {stat.roleName}
                      </Badge>
                      <div className="text-sm text-gray-400">Level {stat.level}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Total Users:</span>
                        <span className="text-white">{stat.totalUsers}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Active:</span>
                        <span className="text-green-400">{stat.activeUsers}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Departments:</span>
                        <span className="text-blue-400">{stat.departments}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Role Details */}
            <Card className="bg-gray-900/50 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Role Hierarchy & Permissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {roles.map((role) => (
                    <div key={role.id} className="p-4 bg-gray-800/50 rounded-lg border border-gray-600">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={getRoleBadgeColor(role.id)}>
                              {role.name}
                            </Badge>
                            <span className="text-sm text-gray-400">Level {role.level}</span>
                          </div>
                          <p className="text-sm text-gray-300">{role.description}</p>
                        </div>
                        <div className="flex gap-2">
                          {role.canManageRoles && (
                            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                              Role Manager
                            </Badge>
                          )}
                          {role.canDeleteData && (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                              Can Delete
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Access Scope:</span>
                          <span className="text-white ml-2">{role.accessScope}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Permissions:</span>
                          <span className="text-white ml-2">
                            {role.permissions.includes('*') ? 'All Permissions' : `${role.permissions.length} permissions`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Session Management Tab */}
          <TabsContent value="sessions" className="space-y-6">
            <Card className="bg-gray-900/50 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  Active Sessions ({filteredSessions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Session Search */}
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search sessions (username, name, IP, role)..."
                    value={sessionSearchTerm}
                    onChange={(e) => setSessionSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>

                {/* Sessions Table */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700">
                        <TableHead className="text-gray-300">User</TableHead>
                        <TableHead className="text-gray-300">Role</TableHead>
                        <TableHead className="text-gray-300">Device</TableHead>
                        <TableHead className="text-gray-300">Location</TableHead>
                        <TableHead className="text-gray-300">Duration</TableHead>
                        <TableHead className="text-gray-300">Last Activity</TableHead>
                        <TableHead className="text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessionsLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                            Loading sessions...
                          </TableCell>
                        </TableRow>
                      ) : filteredSessions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                            No active sessions found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredSessions.map((session: SessionRecord) => (
                          <TableRow key={session.id} className="border-gray-700">
                            <TableCell>
                              <div>
                                <div className="font-medium text-white">
                                  {session.realName || session.username}
                                </div>
                                <div className="text-sm text-gray-400">
                                  @{session.username}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleBadgeColor(session.role)}>
                                {session.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {getDeviceIcon(session.deviceType)}
                                <div className="text-sm">
                                  <div className="text-white">{session.os}</div>
                                  <div className="text-gray-400">{session.browser}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1 text-sm text-gray-400">
                                <MapPin className="w-3 h-3" />
                                <span className="font-mono">{session.ipAddress}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1 text-sm text-gray-400">
                                <Clock className="w-3 h-3" />
                                <span>{session.duration}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-gray-400">
                              {new Date(session.lastActivity).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => terminateSessionMutation.mutate(session.id)}
                                disabled={terminateSessionMutation.isPending}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                              >
                                <LogOut className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Role Assignment Dialog */}
        <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
          <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
            <DialogHeader>
              <DialogTitle>Change User Role</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedUser && (
                <div className="p-3 bg-gray-800/50 rounded-lg">
                  <div className="font-medium">
                    {selectedUser.employee ? 
                      `${selectedUser.employee.firstName} ${selectedUser.employee.lastName}` : 
                      selectedUser.username
                    }
                  </div>
                  <div className="text-sm text-gray-400">
                    Current role: {selectedUser.roleInfo?.name || selectedUser.role}
                  </div>
                </div>
              )}
              
              <div>
                <Label htmlFor="role">New Role</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger className="bg-gray-800 border-gray-600">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {roles
                      .filter(role => assignableRoles.includes(role.id))
                      .map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          <div className="flex items-center gap-2">
                            <Badge className={getRoleBadgeColor(role.id)}>
                              {role.name}
                            </Badge>
                            <span className="text-sm text-gray-400">Level {role.level}</span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleAssignRole}
                  disabled={assignRoleMutation.isPending || !newRole}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {assignRoleMutation.isPending ? "Assigning..." : "Assign Role"}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowRoleDialog(false);
                    setSelectedUser(null);
                  }}
                  className="flex-1 border-gray-600"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
