import React, { useState, useMemo } from 'react';
import { 
  Search, Monitor, LogOut, RefreshCw, Laptop, Smartphone, Tablet, 
  Globe, Clock, MapPin, User, AlertTriangle, Eye, Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

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
  location?: string;
  sessionDuration: string;
}

export default function SessionManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debounced search
  const debouncedSearchTerm = useMemo(() => {
    const timer = setTimeout(() => searchTerm, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch sessions
  const { data: sessions = [], isLoading, error } = useQuery({
    queryKey: ['/api/admin/sessions'],
    staleTime: 30 * 1000, // 30 seconds
  });

  // Terminate session mutation
  const terminateSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return apiRequest({
        url: `/api/admin/sessions/${sessionId}/terminate`,
        method: 'DELETE'
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

  // Terminate all sessions for user mutation
  const terminateAllUserSessionsMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest({
        url: `/api/admin/users/${userId}/sessions/terminate-all`,
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      toast({
        title: "All sessions terminated",
        description: "All user sessions have been terminated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sessions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to terminate all sessions",
        variant: "destructive",
      });
    }
  });

  // Filter sessions
  const filteredSessions = useMemo(() => {
    if (!Array.isArray(sessions)) return [];
    
    return sessions.filter((session: SessionRecord) => {
      const matchesSearch = searchTerm.length === 0 || searchTerm.length >= 3 && (
        session.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.realName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.ipAddress.includes(searchTerm) ||
        session.role.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      const matchesRole = !selectedRole || session.role === selectedRole;
      
      return matchesSearch && matchesRole;
    });
  }, [sessions, searchTerm, selectedRole]);

  // Get device icon
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
        return <Globe className="w-4 h-4" />;
    }
  };

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'general_admin':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'manager':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'supervisor':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
        <Card className="bg-red-900/20 border-red-500/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-6 h-6" />
              <div>
                <h3 className="font-semibold">Failed to load sessions</h3>
                <p className="text-sm">Please check your permissions and try again</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Session Management</h1>
            <p className="text-gray-300">Monitor and manage active user sessions</p>
          </div>
          <Button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/sessions'] })}
            variant="outline"
            className="border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-purple-900/30 border-purple-500/30 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-300 text-sm">Total Sessions</p>
                  <p className="text-2xl font-bold text-white">
                    {Array.isArray(sessions) ? sessions.length : 0}
                  </p>
                </div>
                <Monitor className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-900/30 border-blue-500/30 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-300 text-sm">Active Sessions</p>
                  <p className="text-2xl font-bold text-white">
                    {Array.isArray(sessions) ? sessions.filter((s: SessionRecord) => s.isActive).length : 0}
                  </p>
                </div>
                <User className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-900/30 border-green-500/30 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-300 text-sm">Admin Sessions</p>
                  <p className="text-2xl font-bold text-white">
                    {Array.isArray(sessions) ? sessions.filter((s: SessionRecord) => 
                      s.role === 'superadmin' || s.role === 'general_admin'
                    ).length : 0}
                  </p>
                </div>
                <Shield className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-orange-900/30 border-orange-500/30 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-300 text-sm">Mobile Sessions</p>
                  <p className="text-2xl font-bold text-white">
                    {Array.isArray(sessions) ? sessions.filter((s: SessionRecord) => 
                      s.deviceType === 'mobile' || s.deviceType === 'smartphone'
                    ).length : 0}
                  </p>
                </div>
                <Smartphone className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="bg-gray-900/50 border-gray-700 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search sessions (username, name, IP, role)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400"
                />
              </div>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-md text-white"
              >
                <option value="">All Roles</option>
                <option value="superadmin">Super Admin</option>
                <option value="general_admin">General Admin</option>
                <option value="manager">Manager</option>
                <option value="supervisor">Supervisor</option>
                <option value="employee">Employee</option>
                <option value="staff">Staff</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Sessions Table */}
        <Card className="bg-gray-900/50 border-gray-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              Active Sessions ({filteredSessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-8 text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-3"></div>
                <p>Loading sessions...</p>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Monitor className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No sessions found</p>
              </div>
            ) : (
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
                    {filteredSessions.map((session: SessionRecord) => (
                      <TableRow key={session.id} className="border-gray-700">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div>
                              <div className="font-medium text-white">
                                {session.realName || session.username}
                              </div>
                              <div className="text-sm text-gray-400">
                                @{session.username}
                              </div>
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
                            <span>{session.sessionDuration}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-400">
                          {new Date(session.lastActivity).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => terminateSessionMutation.mutate(session.id)}
                              disabled={terminateSessionMutation.isPending}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                            >
                              <LogOut className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => terminateAllUserSessionsMutation.mutate(session.userId)}
                              disabled={terminateAllUserSessionsMutation.isPending}
                              className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/20"
                              title="Terminate all sessions for this user"
                            >
                              <Shield className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}