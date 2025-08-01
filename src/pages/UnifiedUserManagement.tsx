
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Users, Monitor, Settings, Eye, EyeOff, Shield, Lock, UserX, UserCheck, Clock, MapPin, Smartphone, Globe, Bell, BellOff, LogOut, RefreshCw, User, Edit, Key, Ban, CheckCircle, ChevronRight, ChevronDown, ChevronUp, Filter, ArrowLeft, Home, BarChart3, UserCog, Laptop, TabletIcon, HelpCircle, Plus, Trash2, UserPlus, Save, X, AlertTriangle } from 'lucide-react';
import { SiApple, SiAndroid, SiLinux } from 'react-icons/si';
import { FaWindows } from 'react-icons/fa';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Textarea } from '@/components/ui/textarea';

interface User {
  id: number;
  username: string;
  role: string;
  isActive: boolean;
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
    lastSeen?: string;
  };
  lastLoginAt?: string;
  createdAt: string;
}

interface Role {
  id: number;
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  browserVersion: string;
  os: string;
  osVersion: string;
  locationEnabled: boolean;
  notificationEnabled: boolean;
  screenResolution: string;
  timezone: string;
  duration: string;
}

const UnifiedUserManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sessionSearchTerm, setSessionSearchTerm] = useState('');
  const [sessionPage, setSessionPage] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // New user form state
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: '',
    firstName: '',
    lastName: '',
    department: '',
    employeeCode: '',
    email: '',
    phone: ''
  });

  // New role form state
  const [newRole, setNewRole] = useState({
    name: '',
    displayName: '',
    description: '',
    permissions: [] as string[]
  });

  // Available permissions
  const availablePermissions = [
    'read:users', 'write:users', 'delete:users',
    'read:roles', 'write:roles', 'delete:roles',
    'read:sessions', 'write:sessions', 'delete:sessions',
    'read:attendance', 'write:attendance', 'delete:attendance',
    'read:reports', 'write:reports', 'delete:reports',
    'read:settings', 'write:settings', 'delete:settings',
    'admin:all', 'superadmin:all'
  ];

  // Debounced search
  const debouncedSearchTerm = useMemo(() => {
    if (searchTerm.length === 0 || searchTerm.length >= 3) {
      return searchTerm;
    }
    return '';
  }, [searchTerm]);

  // Fetch users with search and pagination
  const { data: usersResponse, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['/api/admin/users', debouncedSearchTerm, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      params.append('page', currentPage.toString());
      params.append('limit', '10');
      return await apiRequest(`/api/admin/users?${params}`);
    },
    enabled: activeTab === 'users'
  });

  // Fetch roles
  const { data: rolesResponse, isLoading: rolesLoading, refetch: refetchRoles } = useQuery({
    queryKey: ['/api/admin/roles'],
    queryFn: async () => {
      return await apiRequest('/api/admin/roles');
    },
    enabled: activeTab === 'roles'
  });

  // Fetch sessions
  const { data: sessionsResponse, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: ['/api/admin/sessions', sessionSearchTerm, sessionPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sessionSearchTerm) params.append('search', sessionSearchTerm);
      params.append('page', sessionPage.toString());
      params.append('limit', '20');
      return await apiRequest(`/api/admin/sessions?${params}`);
    },
    enabled: activeTab === 'sessions'
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      return await apiRequest('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'User created successfully' });
      setIsCreateUserOpen(false);
      setNewUser({
        username: '', password: '', role: '', firstName: '', lastName: '',
        department: '', employeeCode: '', email: '', phone: ''
      });
      refetchUsers();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to create user', variant: 'destructive' });
    }
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (roleData: any) => {
      return await apiRequest('/api/admin/roles', {
        method: 'POST',
        body: JSON.stringify(roleData)
      });
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Role created successfully' });
      setIsCreateRoleOpen(false);
      setNewRole({ name: '', displayName: '', description: '', permissions: [] });
      refetchRoles();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to create role', variant: 'destructive' });
    }
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: number, updates: any }) => {
      return await apiRequest(`/api/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'User updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setIsUserModalOpen(false);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to update user', variant: 'destructive' });
    }
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ roleId, updates }: { roleId: number, updates: any }) => {
      return await apiRequest(`/api/admin/roles/${roleId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Role updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/roles'] });
      setIsRoleModalOpen(false);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to update role', variant: 'destructive' });
    }
  });

  // Force logout mutation
  const forceLogoutMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return await apiRequest(`/api/admin/sessions/${sessionId}/logout`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      toast({ title: 'Session terminated', description: 'User session has been terminated successfully' });
      refetchSessions();
    },
    onError: (error) => {
      toast({ title: 'Error', description: 'Failed to terminate session', variant: 'destructive' });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'User deleted successfully' });
      refetchUsers();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to delete user', variant: 'destructive' });
    }
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: number) => {
      return await apiRequest(`/api/admin/roles/${roleId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Role deleted successfully' });
      refetchRoles();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to delete role', variant: 'destructive' });
    }
  });

  const users = usersResponse?.users || [];
  const totalPages = usersResponse?.totalPages || 1;
  const totalUsers = usersResponse?.total || 0;

  const roles = rolesResponse?.roles || [];
  const sessions = Array.isArray(sessionsResponse) ? sessionsResponse : (sessionsResponse?.sessions || []);
  const totalSessionPages = sessionsResponse?.totalPages || 1;
  const totalSessions = sessionsResponse?.total || sessions.length;

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'superadmin': return 'bg-red-600 hover:bg-red-700';
      case 'admin': case 'general_admin': return 'bg-orange-600 hover:bg-orange-700';
      case 'manager': return 'bg-blue-600 hover:bg-blue-700';
      case 'staff': return 'bg-green-600 hover:bg-green-700';
      default: return 'bg-gray-600 hover:bg-gray-700';
    }
  };

  const getOSIcon = (os: string, deviceType: string) => {
    const iconClass = "w-4 h-4";
    
    if (os?.toLowerCase().includes('android')) {
      return <SiAndroid className={`${iconClass} text-green-500`} />;
    } else if (os?.toLowerCase().includes('ios') || os?.toLowerCase().includes('iphone') || os?.toLowerCase().includes('ipad')) {
      return <SiApple className={`${iconClass} text-blue-500`} />;
    } else if (os?.toLowerCase().includes('windows')) {
      return <FaWindows className={`${iconClass} text-blue-400`} />;
    } else if (os?.toLowerCase().includes('linux')) {
      return <SiLinux className={`${iconClass} text-yellow-500`} />;
    } else if (os?.toLowerCase().includes('mac')) {
      return <SiApple className={`${iconClass} text-gray-400`} />;
    } else {
      if (deviceType === 'mobile') return <Smartphone className={`${iconClass} text-gray-400`} />;
      if (deviceType === 'tablet') return <TabletIcon className={`${iconClass} text-gray-400`} />;
      if (deviceType === 'desktop') return <Laptop className={`${iconClass} text-gray-400`} />;
      return <Globe className={`${iconClass} text-gray-400`} />;
    }
  };

  const getSessionDuration = (loginTime: string) => {
    const now = new Date();
    const login = new Date(loginTime);
    const diff = Math.floor((now.getTime() - login.getTime()) / 1000 / 60);
    
    if (diff < 60) return `${diff}m`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ${diff % 60}m`;
    return `${Math.floor(diff / 1440)}d ${Math.floor((diff % 1440) / 60)}h`;
  };

  const handleCreateUser = () => {
    if (!newUser.username || !newUser.password || !newUser.role) {
      toast({ title: 'Error', description: 'Username, password, and role are required', variant: 'destructive' });
      return;
    }
    createUserMutation.mutate(newUser);
  };

  const handleCreateRole = () => {
    if (!newRole.name || !newRole.displayName) {
      toast({ title: 'Error', description: 'Role name and display name are required', variant: 'destructive' });
      return;
    }
    createRoleMutation.mutate(newRole);
  };

  const handlePermissionToggle = (permission: string) => {
    setNewRole(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  return (
    <div className="min-h-screen bg-[#1A1B3E] text-white">
      {/* Header */}
      <div className="flex items-center gap-3 p-6 bg-[#2A2B5E] border-b border-gray-600">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation('/admin')}
          className="text-gray-300 hover:text-white hover:bg-gray-700/20 p-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Unified User Management</h1>
          <p className="text-gray-400">Complete user, role, and session management</p>
        </div>
      </div>

      <div className="p-6">
        {/* Main Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-[#2A2B5E] border border-gray-600">
            <TabsTrigger 
              value="users" 
              className="data-[state=active]:bg-[#3A3B6E] data-[state=active]:text-white text-gray-300"
            >
              <Users className="w-4 h-4 mr-2" />
              Users ({totalUsers})
            </TabsTrigger>
            <TabsTrigger 
              value="roles" 
              className="data-[state=active]:bg-[#3A3B6E] data-[state=active]:text-white text-gray-300"
            >
              <Shield className="w-4 h-4 mr-2" />
              Roles ({roles.length})
            </TabsTrigger>
            <TabsTrigger 
              value="sessions" 
              className="data-[state=active]:bg-[#3A3B6E] data-[state=active]:text-white text-gray-300"
            >
              <Monitor className="w-4 h-4 mr-2" />
              Sessions ({totalSessions})
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-between items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search users (min 3 characters)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-[#2A2B5E] border-gray-600 text-white placeholder-gray-400"
                />
              </div>
              <Button 
                onClick={() => setIsCreateUserOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Create User
              </Button>
            </div>

            {/* Users Table */}
            <Card className="bg-[#2A2B5E] border-gray-600">
              <CardHeader className="bg-[#3A3B6E] border-b border-gray-600">
                <CardTitle className="text-white">Users Management</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {usersLoading ? (
                  <div className="p-6 text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-400">Loading users...</p>
                  </div>
                ) : users && users.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#3A3B6E] border-b border-gray-600">
                        <tr>
                          <th className="text-left p-4 font-medium text-gray-300">User</th>
                          <th className="text-left p-4 font-medium text-gray-300">Role</th>
                          <th className="text-left p-4 font-medium text-gray-300">Department</th>
                          <th className="text-left p-4 font-medium text-gray-300">Status</th>
                          <th className="text-left p-4 font-medium text-gray-300">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user: User, index: number) => (
                          <tr 
                            key={user.id}
                            className={`hover:bg-gray-700/20 transition-colors ${
                              index !== users.length - 1 ? 'border-b border-gray-600/20' : ''
                            }`}
                          >
                            <td className="p-4">
                              <div>
                                <div className="font-medium text-white">
                                  {user.employee?.firstName} {user.employee?.lastName}
                                </div>
                                <div className="text-sm text-gray-400">@{user.username}</div>
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge className={`${getRoleBadgeColor(user.role)} text-white text-xs`}>
                                {user.role}
                              </Badge>
                            </td>
                            <td className="p-4 text-gray-300">{user.employee?.department || 'N/A'}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                <span className={`text-xs ${user.isActive ? 'text-green-300' : 'text-red-300'}`}>
                                  {user.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setIsUserModalOpen(true);
                                  }}
                                  className="border-gray-600 text-gray-300 hover:bg-gray-700/20"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => deleteUserMutation.mutate(user.id)}
                                  className="border-red-600 text-red-300 hover:bg-red-700/20"
                                  disabled={deleteUserMutation.isPending}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-300 text-lg font-medium mb-2">No users found</p>
                    <p className="text-gray-400">
                      {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first user'}
                    </p>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="p-4 border-t border-gray-600 bg-[#3A3B6E]">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">
                        Page {currentPage} of {totalPages}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="border-gray-600 text-gray-300 hover:bg-gray-700/20"
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="border-gray-600 text-gray-300 hover:bg-gray-700/20"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Role Management</h2>
              <Button 
                onClick={() => setIsCreateRoleOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Role
              </Button>
            </div>

            {/* Roles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rolesLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="bg-[#2A2B5E] border-gray-600">
                    <CardContent className="p-6">
                      <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-gray-600 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-600 rounded w-full"></div>
                        <div className="h-3 bg-gray-600 rounded w-2/3"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : roles && roles.length > 0 ? (
                roles.map((role: Role) => (
                  <Card key={role.id} className="bg-[#2A2B5E] border-gray-600 hover:border-gray-500 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-white">{role.displayName}</h3>
                          <p className="text-sm text-gray-400">@{role.name}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRole(role);
                              setIsRoleModalOpen(true);
                            }}
                            className="border-gray-600 text-gray-300 hover:bg-gray-700/20"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteRoleMutation.mutate(role.id)}
                            className="border-red-600 text-red-300 hover:bg-red-700/20"
                            disabled={deleteRoleMutation.isPending}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <p className="text-gray-300 text-sm mb-4">{role.description}</p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${role.isActive ? 'bg-green-400' : 'bg-red-400'}`}></div>
                          <span className={`text-xs ${role.isActive ? 'text-green-300' : 'text-red-300'}`}>
                            {role.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
                        </div>
                        <div className="text-xs text-gray-400">
                          Created: {new Date(role.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-300 text-lg font-medium mb-2">No roles found</p>
                  <p className="text-gray-400">Create your first role to get started</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-6">
            <div className="flex justify-between items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search sessions..."
                  value={sessionSearchTerm}
                  onChange={(e) => setSessionSearchTerm(e.target.value)}
                  className="pl-10 bg-[#2A2B5E] border-gray-600 text-white placeholder-gray-400"
                />
              </div>
              <Button 
                onClick={() => refetchSessions()}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700/20"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${sessionsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* Sessions Table */}
            <Card className="bg-[#2A2B5E] border-gray-600">
              <CardHeader className="bg-[#3A3B6E] border-b border-gray-600">
                <CardTitle className="text-white">Active Sessions</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {sessionsLoading ? (
                  <div className="p-6 text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-400">Loading sessions...</p>
                  </div>
                ) : sessions && sessions.length > 0 ? (
                  <div className="space-y-0">
                    {sessions.map((session: UserSession) => (
                      <div 
                        key={session.id}
                        className="p-4 border-b border-gray-600/20 last:border-b-0 hover:bg-gray-700/20 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-400"></div>
                              {getOSIcon(session.os, session.deviceType)}
                            </div>
                            <div>
                              <div className="font-medium text-white">@{session.username}</div>
                              <div className="text-sm text-gray-300">{session.realName}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right text-sm">
                              <div className="text-gray-300">{session.ipAddress}</div>
                              <div className="text-gray-400">{getSessionDuration(session.loginTime)}</div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => forceLogoutMutation.mutate(session.id)}
                              className="border-red-600 text-red-300 hover:bg-red-700/20"
                              disabled={forceLogoutMutation.isPending}
                            >
                              <LogOut className="w-3 h-3 mr-2" />
                              Terminate
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <Monitor className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-300 text-lg font-medium mb-2">No active sessions</p>
                    <p className="text-gray-400">User sessions will appear here when active</p>
                  </div>
                )}

                {/* Session Pagination */}
                {totalSessionPages > 1 && (
                  <div className="p-4 border-t border-gray-600 bg-[#3A3B6E]">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">
                        Page {sessionPage} of {totalSessionPages}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSessionPage(Math.max(1, sessionPage - 1))}
                          disabled={sessionPage === 1}
                          className="border-gray-600 text-gray-300 hover:bg-gray-700/20"
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSessionPage(Math.min(totalSessionPages, sessionPage + 1))}
                          disabled={sessionPage === totalSessionPages}
                          className="border-gray-600 text-gray-300 hover:bg-gray-700/20"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* User Detail/Edit Modal */}
      {selectedUser && (
        <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
          <DialogContent className="max-w-2xl bg-[#2A2B5E] border-gray-600 text-white max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5" />
                Edit User: {selectedUser.employee?.firstName} {selectedUser.employee?.lastName}
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {/* User Info Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-gray-600 pb-2">User Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Username</Label>
                    <Input
                      value={selectedUser.username}
                      disabled
                      className="bg-[#1A1B3E] border-gray-600 text-gray-400"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Role</Label>
                    <Select
                      defaultValue={selectedUser.role}
                      onValueChange={(value) => {
                        updateUserMutation.mutate({ userId: selectedUser.id, updates: { role: value } });
                      }}
                    >
                      <SelectTrigger className="bg-[#1A1B3E] border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#2A2B5E] border-gray-600">
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="superadmin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Account Status Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-gray-600 pb-2">Account Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[#1A1B3E] rounded-md">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-green-400" />
                      <span>Account Active</span>
                    </div>
                    <Switch
                      checked={selectedUser.isActive}
                      onCheckedChange={(checked) => {
                        updateUserMutation.mutate({ userId: selectedUser.id, updates: { isActive: checked } });
                      }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-[#1A1B3E] rounded-md">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-400" />
                      <span>Non-Bio Allowed</span>
                    </div>
                    <Switch
                      checked={selectedUser.employee?.nonBio || false}
                      onCheckedChange={(checked) => {
                        updateUserMutation.mutate({ 
                          userId: selectedUser.id, 
                          updates: { employee: { ...selectedUser.employee, nonBio: checked } }
                        });
                      }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-[#1A1B3E] rounded-md">
                    <div className="flex items-center gap-2">
                      <Ban className="w-4 h-4 text-red-400" />
                      <span>Stop Pay</span>
                    </div>
                    <Switch
                      checked={selectedUser.employee?.stopPay || false}
                      onCheckedChange={(checked) => {
                        updateUserMutation.mutate({ 
                          userId: selectedUser.id, 
                          updates: { employee: { ...selectedUser.employee, stopPay: checked } }
                        });
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Password Reset Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-gray-600 pb-2">Security</h3>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder="New password (min 6 characters)"
                      className="flex-1 bg-[#1A1B3E] border-gray-600 text-white placeholder-gray-400"
                    />
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Key className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 pt-4 border-t border-gray-600">
              <Button
                variant="outline"
                onClick={() => setIsUserModalOpen(false)}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700/20"
              >
                Close
              </Button>
              <Button
                onClick={() => setIsUserModalOpen(false)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create User Modal */}
      <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
        <DialogContent className="max-w-2xl bg-[#2A2B5E] border-gray-600 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Create New User
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Username*</Label>
                <Input
                  value={newUser.username}
                  onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter username"
                  className="bg-[#1A1B3E] border-gray-600 text-white placeholder-gray-400"
                />
              </div>
              <div>
                <Label className="text-gray-300">Password*</Label>
                <Input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter password"
                  className="bg-[#1A1B3E] border-gray-600 text-white placeholder-gray-400"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">First Name</Label>
                <Input
                  value={newUser.firstName}
                  onChange={(e) => setNewUser(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Enter first name"
                  className="bg-[#1A1B3E] border-gray-600 text-white placeholder-gray-400"
                />
              </div>
              <div>
                <Label className="text-gray-300">Last Name</Label>
                <Input
                  value={newUser.lastName}
                  onChange={(e) => setNewUser(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Enter last name"
                  className="bg-[#1A1B3E] border-gray-600 text-white placeholder-gray-400"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Role*</Label>
                <Select value={newUser.role} onValueChange={(value) => setNewUser(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger className="bg-[#1A1B3E] border-gray-600 text-white">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2A2B5E] border-gray-600">
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="superadmin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Department</Label>
                <Input
                  value={newUser.department}
                  onChange={(e) => setNewUser(prev => ({ ...prev, department: e.target.value }))}
                  placeholder="Enter department"
                  className="bg-[#1A1B3E] border-gray-600 text-white placeholder-gray-400"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Employee Code</Label>
                <Input
                  value={newUser.employeeCode}
                  onChange={(e) => setNewUser(prev => ({ ...prev, employeeCode: e.target.value }))}
                  placeholder="Enter employee code"
                  className="bg-[#1A1B3E] border-gray-600 text-white placeholder-gray-400"
                />
              </div>
              <div>
                <Label className="text-gray-300">Email</Label>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email"
                  className="bg-[#1A1B3E] border-gray-600 text-white placeholder-gray-400"
                />
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsCreateUserOpen(false)}
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700/20"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={createUserMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {createUserMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              Create User
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Role Modal */}
      <Dialog open={isCreateRoleOpen} onOpenChange={setIsCreateRoleOpen}>
        <DialogContent className="max-w-2xl bg-[#2A2B5E] border-gray-600 text-white max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Create New Role
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            <div className="space-y-4">
              <div>
                <Label className="text-gray-300">Role Name*</Label>
                <Input
                  value={newRole.name}
                  onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., manager, staff"
                  className="bg-[#1A1B3E] border-gray-600 text-white placeholder-gray-400"
                />
              </div>
              
              <div>
                <Label className="text-gray-300">Display Name*</Label>
                <Input
                  value={newRole.displayName}
                  onChange={(e) => setNewRole(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="e.g., Manager, Staff Member"
                  className="bg-[#1A1B3E] border-gray-600 text-white placeholder-gray-400"
                />
              </div>
              
              <div>
                <Label className="text-gray-300">Description</Label>
                <Textarea
                  value={newRole.description}
                  onChange={(e) => setNewRole(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe this role's responsibilities"
                  className="bg-[#1A1B3E] border-gray-600 text-white placeholder-gray-400"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <Label className="text-gray-300 text-lg font-semibold">Permissions</Label>
              <div className="grid grid-cols-2 gap-3">
                {availablePermissions.map((permission) => (
                  <div
                    key={permission}
                    className="flex items-center space-x-3 p-3 bg-[#1A1B3E] rounded-md border border-gray-600"
                  >
                    <input
                      type="checkbox"
                      id={permission}
                      checked={newRole.permissions.includes(permission)}
                      onChange={() => handlePermissionToggle(permission)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <Label htmlFor={permission} className="text-gray-300 text-sm">
                      {permission.replace(':', ' ').replace('_', ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 pt-4 border-t border-gray-600">
            <Button
              variant="outline"
              onClick={() => setIsCreateRoleOpen(false)}
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700/20"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateRole}
              disabled={createRoleMutation.isPending}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {createRoleMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Create Role
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnifiedUserManagement;
