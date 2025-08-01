
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Settings, 
  Eye, 
  EyeOff, 
  Edit2, 
  Trash2,
  Key,
  Crown,
  Search,
  Filter,
  RefreshCw
} from 'lucide-react';

interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  accessLevel: number;
  color: string;
}

interface Session {
  id: string;
  userId: string;
  username: string;
  ipAddress: string;
  userAgent: string;
  lastActivity: string;
  isActive: boolean;
}

export default function ComprehensiveUserRoleManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    role: '',
    department: ''
  });

  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    accessLevel: 20,
    permissions: [] as string[]
  });

  const availablePermissions = [
    'canCreateUsers',
    'canDeleteUsers',
    'canManageRoles',
    'canViewReports',
    'canManageAttendance',
    'canAccessFinancialData',
    'canManageSystem',
    'canManageTeams',
    'canChangeDesignations',
    'canManageWhatsApp',
    'canAccessAnalytics'
  ];

  const departments = [
    'Administration',
    'Human Resources',
    'Finance',
    'Operations',
    'IT',
    'Security',
    'Management'
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes, sessionsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/roles'),
        fetch('/api/sessions')
      ]);

      if (usersRes.ok) setUsers(await usersRes.json());
      if (rolesRes.ok) setRoles(await rolesRes.json());
      if (sessionsRes.ok) setSessions(await sessionsRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "User created successfully"
        });
        setIsCreateUserOpen(false);
        setNewUser({
          username: '',
          email: '',
          firstName: '',
          lastName: '',
          password: '',
          role: '',
          department: ''
        });
        fetchData();
      } else {
        throw new Error('Failed to create user');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive"
      });
    }
  };

  const handleCreateRole = async () => {
    try {
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRole)
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Role created successfully"
        });
        setIsCreateRoleOpen(false);
        setNewRole({
          name: '',
          description: '',
          accessLevel: 20,
          permissions: []
        });
        fetchData();
      } else {
        throw new Error('Failed to create role');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create role",
        variant: "destructive"
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "User deleted successfully"
        });
        fetchData();
      } else {
        throw new Error('Failed to delete user');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive"
      });
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Session terminated successfully"
        });
        fetchData();
      } else {
        throw new Error('Failed to terminate session');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to terminate session",
        variant: "destructive"
      });
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-cyan-300 text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Users className="w-8 h-8 text-cyan-400" />
              User & Role Management
            </h1>
            <p className="text-purple-200 mt-2">Manage users, roles, and active sessions</p>
          </div>
          <Button 
            onClick={fetchData}
            className="bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-purple-800/50 p-1">
            <TabsTrigger value="users" className="text-white data-[state=active]:bg-cyan-600">
              <Users className="w-4 h-4 mr-2" />
              Users ({users.length})
            </TabsTrigger>
            <TabsTrigger value="roles" className="text-white data-[state=active]:bg-cyan-600">
              <Shield className="w-4 h-4 mr-2" />
              Roles ({roles.length})
            </TabsTrigger>
            <TabsTrigger value="sessions" className="text-white data-[state=active]:bg-cyan-600">
              <Key className="w-4 h-4 mr-2" />
              Sessions ({sessions.filter(s => s.isActive).length})
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card className="bg-purple-800/30 border-purple-600/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-cyan-400" />
                    User Management
                  </CardTitle>
                  <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-cyan-600 hover:bg-cyan-700 text-white">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Create User
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-purple-900 border-purple-600 text-white max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-cyan-400">Create New User</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-purple-200">First Name</Label>
                            <Input
                              value={newUser.firstName}
                              onChange={(e) => setNewUser({...newUser, firstName: e.target.value})}
                              className="bg-purple-800 border-purple-600 text-white"
                            />
                          </div>
                          <div>
                            <Label className="text-purple-200">Last Name</Label>
                            <Input
                              value={newUser.lastName}
                              onChange={(e) => setNewUser({...newUser, lastName: e.target.value})}
                              className="bg-purple-800 border-purple-600 text-white"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-purple-200">Username</Label>
                          <Input
                            value={newUser.username}
                            onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                            className="bg-purple-800 border-purple-600 text-white"
                          />
                        </div>
                        <div>
                          <Label className="text-purple-200">Email</Label>
                          <Input
                            type="email"
                            value={newUser.email}
                            onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                            className="bg-purple-800 border-purple-600 text-white"
                          />
                        </div>
                        <div>
                          <Label className="text-purple-200">Password</Label>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              value={newUser.password}
                              onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                              className="bg-purple-800 border-purple-600 text-white pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-purple-300 hover:text-white"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label className="text-purple-200">Role</Label>
                          <Select value={newUser.role} onValueChange={(value) => setNewUser({...newUser, role: value})}>
                            <SelectTrigger className="bg-purple-800 border-purple-600 text-white">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent className="bg-purple-900 border-purple-600">
                              {roles.map(role => (
                                <SelectItem key={role.id} value={role.name} className="text-white hover:bg-purple-800">
                                  {role.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-purple-200">Department</Label>
                          <Select value={newUser.department} onValueChange={(value) => setNewUser({...newUser, department: value})}>
                            <SelectTrigger className="bg-purple-800 border-purple-600 text-white">
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                            <SelectContent className="bg-purple-900 border-purple-600">
                              {departments.map(dept => (
                                <SelectItem key={dept} value={dept} className="text-white hover:bg-purple-800">
                                  {dept}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={handleCreateUser} className="w-full bg-cyan-600 hover:bg-cyan-700">
                          Create User
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-6">
                  <div className="flex-1">
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-purple-800 border-purple-600 text-white"
                    />
                  </div>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="w-48 bg-purple-800 border-purple-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-purple-900 border-purple-600">
                      <SelectItem value="all" className="text-white">All Roles</SelectItem>
                      {roles.map(role => (
                        <SelectItem key={role.id} value={role.name} className="text-white">
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredUsers.map(user => (
                    <Card key={user.id} className="bg-purple-900/50 border-purple-600/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-white font-semibold">{user.firstName} {user.lastName}</h3>
                            <p className="text-purple-300 text-sm">@{user.username}</p>
                          </div>
                          <Badge className={`${user.isActive ? 'bg-green-600' : 'bg-red-600'} text-white`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="text-purple-200">
                            <span className="text-cyan-400">Role:</span> {user.role}
                          </div>
                          <div className="text-purple-200">
                            <span className="text-cyan-400">Department:</span> {user.department}
                          </div>
                          <div className="text-purple-200">
                            <span className="text-cyan-400">Email:</span> {user.email}
                          </div>
                          {user.lastLogin && (
                            <div className="text-purple-200">
                              <span className="text-cyan-400">Last Login:</span> {new Date(user.lastLogin).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button size="sm" variant="outline" className="text-cyan-400 border-cyan-400 hover:bg-cyan-400 hover:text-white">
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-6">
            <Card className="bg-purple-800/30 border-purple-600/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-cyan-400" />
                    Role Management
                  </CardTitle>
                  <Dialog open={isCreateRoleOpen} onOpenChange={setIsCreateRoleOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-cyan-600 hover:bg-cyan-700 text-white">
                        <Crown className="w-4 h-4 mr-2" />
                        Create Role
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-purple-900 border-purple-600 text-white max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-cyan-400">Create New Role</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-purple-200">Role Name</Label>
                          <Input
                            value={newRole.name}
                            onChange={(e) => setNewRole({...newRole, name: e.target.value})}
                            className="bg-purple-800 border-purple-600 text-white"
                          />
                        </div>
                        <div>
                          <Label className="text-purple-200">Description</Label>
                          <Input
                            value={newRole.description}
                            onChange={(e) => setNewRole({...newRole, description: e.target.value})}
                            className="bg-purple-800 border-purple-600 text-white"
                          />
                        </div>
                        <div>
                          <Label className="text-purple-200">Access Level (1-100)</Label>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            value={newRole.accessLevel}
                            onChange={(e) => setNewRole({...newRole, accessLevel: parseInt(e.target.value)})}
                            className="bg-purple-800 border-purple-600 text-white"
                          />
                        </div>
                        <div>
                          <Label className="text-purple-200">Permissions</Label>
                          <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                            {availablePermissions.map(permission => (
                              <label key={permission} className="flex items-center space-x-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={newRole.permissions.includes(permission)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setNewRole({...newRole, permissions: [...newRole.permissions, permission]});
                                    } else {
                                      setNewRole({...newRole, permissions: newRole.permissions.filter(p => p !== permission)});
                                    }
                                  }}
                                  className="rounded border-purple-600 bg-purple-800"
                                />
                                <span className="text-purple-200">{permission}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <Button onClick={handleCreateRole} className="w-full bg-cyan-600 hover:bg-cyan-700">
                          Create Role
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {roles.map(role => (
                    <Card key={role.id} className="bg-purple-900/50 border-purple-600/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-white font-semibold flex items-center gap-2">
                              <Crown className="w-4 h-4 text-cyan-400" />
                              {role.name}
                            </h3>
                            <p className="text-purple-300 text-sm">{role.description}</p>
                          </div>
                          <Badge className="bg-cyan-600 text-white">
                            Level {role.accessLevel}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="text-purple-200 text-sm">
                            <span className="text-cyan-400">Permissions:</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {role.permissions.slice(0, 3).map(permission => (
                              <Badge key={permission} variant="outline" className="text-xs border-purple-400 text-purple-200">
                                {permission.replace('can', '')}
                              </Badge>
                            ))}
                            {role.permissions.length > 3 && (
                              <Badge variant="outline" className="text-xs border-purple-400 text-purple-200">
                                +{role.permissions.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-6">
            <Card className="bg-purple-800/30 border-purple-600/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-cyan-400" />
                  Active Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sessions.filter(s => s.isActive).map(session => (
                    <Card key={session.id} className="bg-purple-900/50 border-purple-600/50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-white font-semibold">{session.username}</h3>
                            <div className="text-purple-300 text-sm space-y-1">
                              <div>IP: {session.ipAddress}</div>
                              <div>Last Activity: {new Date(session.lastActivity).toLocaleString()}</div>
                              <div className="text-xs truncate max-w-md">
                                User Agent: {session.userAgent}
                              </div>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                            onClick={() => handleTerminateSession(session.id)}
                          >
                            Terminate
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
