import React, { useState, useEffect, useMemo } from 'react';
import { Search, Users, Monitor, Settings, Eye, EyeOff, Shield, Lock, UserX, UserCheck, Clock, MapPin, Smartphone, Globe, Bell, BellOff, LogOut, RefreshCw, User, Edit, Key, Ban, CheckCircle, ChevronRight, ChevronDown, ChevronUp, Filter, ArrowLeft, Home, BarChart3, UserCog, Laptop, TabletIcon, HelpCircle } from 'lucide-react';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import MobileAdminDualNavigation from '@/components/mobile/MobileAdminDualNavigation';

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

interface MobileUserCardProps {
  user: User;
  onSelect: (user: User) => void;
}

const MobileUserCard: React.FC<MobileUserCardProps> = ({ user, onSelect }) => {
  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'superadmin': return 'bg-red-600 hover:bg-red-700';
      case 'admin': case 'general_admin': return 'bg-orange-600 hover:bg-orange-700';
      case 'manager': return 'bg-blue-600 hover:bg-blue-700';
      case 'staff': return 'bg-green-600 hover:bg-green-700';
      default: return 'bg-gray-600 hover:bg-gray-700';
    }
  };

  return (
    <Card 
      className="bg-[#2A2B5E] border-gray-600 mb-3 cursor-pointer hover:border-gray-500 transition-all"
      onClick={() => onSelect(user)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-white font-medium truncate">
                  {user.employee?.firstName} {user.employee?.lastName} 
                </span>
              </div>
              <Badge className={`${getRoleBadgeColor(user.role)} text-white text-xs px-2 py-0.5 flex-shrink-0`}>
                {user.role}
              </Badge>
            </div>
            
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2 text-gray-300">
                <span className="text-gray-400 min-w-0 flex-shrink-0">@{user.username}</span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-300 truncate">{user.employee?.department || 'N/A'}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${user.isActive ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className={`text-xs ${user.isActive ? 'text-green-300' : 'text-red-300'}`}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
                {user.employee?.employeeCode && (
                  <>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-300 text-xs">{user.employee.employeeCode}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
        </div>
      </CardContent>
    </Card>
  );
};

interface MobileSessionCardProps {
  session: UserSession;
  onForceLogout: (sessionId: string) => void;
}

const MobileSessionCard: React.FC<MobileSessionCardProps> = ({ session, onForceLogout }) => {
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Calculate session duration
  const getSessionDuration = (loginTime: string) => {
    const now = new Date();
    const login = new Date(loginTime);
    const diff = Math.floor((now.getTime() - login.getTime()) / 1000 / 60);
    
    if (diff < 60) return `${diff}m`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ${diff % 60}m`;
    return `${Math.floor(diff / 1440)}d ${Math.floor((diff % 1440) / 60)}h`;
  };

  // Get OS-specific icon
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
      // Default device type icons
      if (deviceType === 'mobile') return <Smartphone className={`${iconClass} text-gray-400`} />;
      if (deviceType === 'tablet') return <TabletIcon className={`${iconClass} text-gray-400`} />;
      if (deviceType === 'desktop') return <Laptop className={`${iconClass} text-gray-400`} />;
      return <Globe className={`${iconClass} text-gray-400`} />; // Unknown device
    }
  };

  // Long press handlers
  const handleTouchStart = () => {
    setIsLongPressing(true);
    setTimeout(() => {
      setIsLongPressing(false);
      setShowConfirmation(true);
    }, 800); // 800ms long press
  };

  const handleTouchEnd = () => {
    setIsLongPressing(false);
  };

  const handleTerminateSession = () => {
    setShowConfirmation(false);
    onForceLogout(session.id);
  };

  return (
    <>
      <div 
        key={session.id} 
        className={`bg-[#2A2B5E] border-b border-gray-600/20 last:border-b-0 cursor-pointer touch-manipulation select-none transition-colors ${
          isLongPressing ? 'bg-red-900/20 border-red-500/30' : ''
        }`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
      >
        <div className="p-3 space-y-2">
          {/* Row 1: Login ID + OS Icon + Duration */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
              <span className="text-white font-medium text-sm truncate">@{session.username}</span>
              <div className="flex-shrink-0">
                {getOSIcon(session.os, session.deviceType)}
              </div>
            </div>
            <div className="text-xs text-gray-300 flex-shrink-0 ml-2">
              {getSessionDuration(session.loginTime)}
            </div>
          </div>

          {/* Row 2: Name + IP Address */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-300 truncate flex-1 mr-2">
              {session.realName || session.username}
            </span>
            <span className="text-gray-400 font-mono flex-shrink-0">
              {session.ipAddress}
            </span>
          </div>
        </div>
      </div>

      {/* Termination Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="bg-[#1A1B3E] border-gray-600 text-white max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="text-center text-red-400">Terminate Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-gray-300">Are you sure you want to terminate this session?</p>
              <div className="bg-[#2A2B5E] rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-white font-medium">@{session.username}</span>
                  {getOSIcon(session.os, session.deviceType)}
                </div>
                <p className="text-xs text-gray-300">{session.realName}</p>
                <p className="text-xs text-gray-400 font-mono">{session.ipAddress}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowConfirmation(false)}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700/20"
              >
                Cancel
              </Button>
              <Button
                onClick={handleTerminateSession}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Terminate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

interface MobileUserDetailModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdate: () => void;
}

const MobileUserDetailModal: React.FC<MobileUserDetailModalProps> = ({ user, isOpen, onClose, onUserUpdate }) => {
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateUserMutation = useMutation({
    mutationFn: async (updates: any) => {
      return apiRequest(`/api/admin/users/${user?.id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'User updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      onUserUpdate();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to update user', variant: 'destructive' });
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      return apiRequest(`/api/admin/users/${user?.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword: password }),
      });
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Password reset successfully' });
      setNewPassword('');
      setShowPassword(false);
      onUserUpdate();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to reset password', variant: 'destructive' });
    }
  });

  if (!user) return null;

  const handleToggleActive = () => {
    updateUserMutation.mutate({ isActive: !user.isActive });
  };

  const handleToggleNonBio = () => {
    updateUserMutation.mutate({ 
      employee: { ...user.employee, nonBio: !user.employee?.nonBio }
    });
  };

  const handleToggleStopPay = () => {
    updateUserMutation.mutate({ 
      employee: { ...user.employee, stopPay: !user.employee?.stopPay }
    });
  };

  const handleResetPassword = () => {
    if (newPassword.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    resetPasswordMutation.mutate(newPassword);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'superadmin': return 'bg-red-600 hover:bg-red-700';
      case 'admin': case 'general_admin': return 'bg-orange-600 hover:bg-orange-700';
      case 'manager': return 'bg-blue-600 hover:bg-blue-700';
      case 'staff': return 'bg-green-600 hover:bg-green-700';
      default: return 'bg-gray-600 hover:bg-gray-700';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-4 bg-[#2A2B5E] border-gray-600 text-white max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg font-bold text-gray-300 flex items-center gap-2">
            <User className="w-5 h-5" />
            {user.employee?.firstName} {user.employee?.lastName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* User Info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm">Username</span>
              <span className="text-white font-medium">@{user.username}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm">Employee Code</span>
              <span className="text-white">{user.employee?.employeeCode || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm">Department</span>
              <span className="text-white">{user.employee?.department || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm">Role</span>
              <Badge className={`${getRoleBadgeColor(user.role)} text-white text-xs`}>
                {user.role}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm">Last Seen</span>
              <span className="text-white text-xs">
                {user.employee?.lastSeen ? new Date(user.employee.lastSeen).toLocaleDateString() : 'Never'}
              </span>
            </div>
          </div>

          {/* Account Controls */}
          <div className="space-y-3 pt-4 border-t border-gray-600/20">
            <h3 className="text-gray-300 font-semibold">Account Controls</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[#1A1B3E] rounded-md border border-gray-600/20">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-green-400" />
                  <span className="text-sm">Account Active</span>
                </div>
                <Switch
                  checked={user.isActive}
                  onCheckedChange={handleToggleActive}
                  disabled={updateUserMutation.isPending}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-[#1A1B3E] rounded-md border border-gray-600/20">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span className="text-sm">Non-Bio</span>
                </div>
                <Switch
                  checked={user.employee?.nonBio || false}
                  onCheckedChange={handleToggleNonBio}
                  disabled={updateUserMutation.isPending}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-[#1A1B3E] rounded-md border border-gray-600/20">
                <div className="flex items-center gap-2">
                  <Ban className="w-4 h-4 text-red-400" />
                  <span className="text-sm">Stop Pay</span>
                </div>
                <Switch
                  checked={user.employee?.stopPay || false}
                  onCheckedChange={handleToggleStopPay}
                  disabled={updateUserMutation.isPending}
                />
              </div>
            </div>
          </div>

          {/* Password Reset */}
          <div className="space-y-3 pt-4 border-t border-gray-600/20 pb-4">
            <h3 className="text-gray-300 font-semibold flex items-center gap-2">
              <Key className="w-4 h-4" />
              Reset Password
            </h3>
            
            <div className="space-y-3">
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New password (min 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-[#1A1B3E] border-gray-600/20 text-white placeholder-gray-400 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              <Button
                onClick={handleResetPassword}
                disabled={resetPasswordMutation.isPending || newPassword.length < 6}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Helper function to get specific OS icons with duration display
const getOSIcon = (os: string | undefined) => {
  if (!os) return <HelpCircle className="w-4 h-4 text-gray-400" />;
  
  const osLower = os.toLowerCase();
  
  // Android devices
  if (osLower.includes('android')) {
    return <SiAndroid className="w-4 h-4 text-green-400" />;
  }
  
  // iOS devices (iPhone, iPad)
  if (osLower.includes('ios') || osLower.includes('iphone') || osLower.includes('ipad')) {
    return <SiApple className="w-4 h-4 text-blue-400" />;
  }
  
  // Windows devices
  if (osLower.includes('windows')) {
    return <FaWindows className="w-4 h-4 text-blue-300" />;
  }
  
  // macOS devices
  if (osLower.includes('mac') || osLower.includes('darwin')) {
    return <SiApple className="w-4 h-4 text-gray-300" />;
  }
  
  // Linux devices
  if (osLower.includes('linux') || osLower.includes('ubuntu') || osLower.includes('debian')) {
    return <SiLinux className="w-4 h-4 text-yellow-400" />;
  }
  
  // Mobile/tablet fallback
  if (osLower.includes('mobile') || osLower.includes('tablet')) {
    return <Smartphone className="w-4 h-4 text-purple-400" />;
  }
  
  // Generic fallback
  return <Monitor className="w-4 h-4 text-gray-400" />;
};

const MobileUserManagementInterface: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [currentPage, setCurrentPage] = useState(1);
  const [sessionSearchTerm, setSessionSearchTerm] = useState('');
  const [sessionPage, setSessionPage] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Debounced search with 3-character minimum
  const debouncedSearchTerm = useMemo(() => {
    if (searchTerm.length === 0 || searchTerm.length >= 3) {
      return searchTerm;
    }
    return '';
  }, [searchTerm]);

  // Enhanced debounced session search with 500ms delay for performance
  const [debouncedSessionSearch, setDebouncedSessionSearch] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sessionSearchTerm.length === 0 || sessionSearchTerm.length >= 3) {
        setDebouncedSessionSearch(sessionSearchTerm);
        setSessionPage(1); // Reset to first page on search
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [sessionSearchTerm]);

  // Fetch users with search and pagination
  const { data: usersResponse, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['/api/admin/users', debouncedSearchTerm, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      params.append('page', currentPage.toString());
      params.append('limit', '10');
      const response = await fetch(`/api/admin/users?${params}`);
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    enabled: true
  });

  const users = usersResponse?.users || [];
  const totalPages = usersResponse?.totalPages || 1;
  const totalUsers = usersResponse?.total || 0;

  // Enhanced sessions query with pagination and caching for 200+ sessions
  const { data: sessionsResponse, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: ['/api/admin/sessions', debouncedSessionSearch, sessionPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSessionSearch) params.append('search', debouncedSessionSearch);
      params.append('page', sessionPage.toString());
      params.append('limit', '20'); // Show 20 sessions per page for performance
      
      // Use apiRequest to ensure proper authentication with existing session
      const url = `/api/admin/sessions?${params}`;
      return await apiRequest(url);
    },
    enabled: activeTab === 'sessions',
    staleTime: 30000, // Cache for 30 seconds to reduce API calls
    gcTime: 300000, // Keep in memory for 5 minutes (TanStack v5 uses gcTime instead of cacheTime)
    placeholderData: (previousData) => previousData // Smooth transitions between pages
  });

  const sessions = Array.isArray(sessionsResponse) ? sessionsResponse : (sessionsResponse?.sessions || []);
  const totalSessionPages = sessionsResponse?.totalPages || 1;
  const totalSessions = sessionsResponse?.total || sessions.length;

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setIsUserModalOpen(true);
  };

  const handleUserUpdate = () => {
    refetchUsers();
    setIsUserModalOpen(false);
    setSelectedUser(null);
  };

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
      console.error('Error terminating session:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to terminate session', 
        variant: 'destructive' 
      });
    }
  });

  const handleForceLogout = (sessionId: string) => {
    forceLogoutMutation.mutate(sessionId);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleSessionPageChange = (page: number) => {
    setSessionPage(page);
  };

  // Session search handler for performance
  const handleSessionSearchChange = (value: string) => {
    setSessionSearchTerm(value);
  };

  // Force refresh sessions (manual refresh button)
  const handleManualRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/admin/sessions'] });
    refetchSessions();
    toast({ title: 'Sessions refreshed', description: 'Latest session data loaded' });
  };

  return (
    <div className="min-h-screen bg-[#1A1B3E]">
      {/* Header with Back Arrow */}
      <div className="flex items-center gap-3 p-4 bg-[#2A2B5E] border-b border-gray-600">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation('/mobile/admin/dashboard')}
          className="text-gray-300 hover:text-white hover:bg-gray-700/20 p-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">User Management</h1>
          <p className="text-gray-400 text-sm">Manage users and monitor sessions</p>
        </div>
      </div>

      <div className="p-4 pb-40 pt-4 overflow-y-auto h-screen">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2 bg-[#2A2B5E] border border-gray-600 mb-0">
            <TabsTrigger 
              value="users" 
              className="data-[state=active]:bg-[#3A3B6E] data-[state=active]:text-white text-gray-300"
            >
              <Users className="w-4 h-4 mr-2" />
              Users ({totalUsers})
            </TabsTrigger>
            <TabsTrigger 
              value="sessions" 
              className="data-[state=active]:bg-[#3A3B6E] data-[state=active]:text-white text-gray-300"
            >
              <Monitor className="w-4 h-4 mr-2" />
              Sessions ({sessions?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="flex-1 flex flex-col space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search users (min 3 characters)..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 bg-[#2A2B5E] border-gray-600 text-white placeholder-gray-400"
              />
              {searchTerm.length > 0 && searchTerm.length < 3 && (
                <p className="text-xs text-gray-400 mt-1">Enter at least 3 characters to search</p>
              )}
            </div>

            {/* User List - Expand to available space above bottom nav */}
            <div className="flex-1 min-h-0">
              {usersLoading ? (
                <div className="bg-[#2A2B5E] border border-gray-600 rounded-lg flex-1">
                  <div className="bg-[#3A3B6E] p-3 border-b border-gray-600">
                    <div className="grid grid-cols-4 gap-3 text-xs font-medium text-gray-300">
                      <div>User</div>
                      <div>Role</div>
                      <div>Department</div>
                      <div>Status</div>
                    </div>
                  </div>
                  <div className="p-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                      <div key={i} className="grid grid-cols-4 gap-3 py-3 border-b border-gray-600/20 last:border-b-0">
                        <div className="animate-pulse">
                          <div className="h-3 bg-gray-600/20 rounded mb-1 w-20"></div>
                          <div className="h-2 bg-gray-600/20 rounded w-16"></div>
                        </div>
                        <div className="animate-pulse">
                          <div className="h-3 bg-gray-600/20 rounded w-12"></div>
                        </div>
                        <div className="animate-pulse">
                          <div className="h-3 bg-gray-600/20 rounded w-16"></div>
                        </div>
                        <div className="animate-pulse">
                          <div className="h-2 w-2 bg-gray-600/20 rounded-full"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : users && users.length > 0 ? (
                <div className="bg-[#2A2B5E] border border-gray-600 rounded-lg flex-1 flex flex-col">
                  <div className="bg-[#3A3B6E] p-3 border-b border-gray-600">
                    <div className="grid grid-cols-4 gap-3 text-xs font-medium text-gray-300">
                      <div>User</div>
                      <div>Role</div>
                      <div>Department</div>
                      <div>Status</div>
                    </div>
                  </div>
                  <div className="flex-1">
                    {users.map((user: User, index: number) => (
                      <div 
                        key={user.id}
                        onClick={() => handleUserSelect(user)}
                        className={`grid grid-cols-4 gap-3 p-3 text-xs cursor-pointer hover:bg-gray-700/20 transition-colors ${
                          index !== users.length - 1 ? 'border-b border-gray-600/20' : ''
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-white truncate">{user.employee?.firstName} {user.employee?.lastName}</div>
                          <div className="text-gray-400 text-xs truncate">@{user.username}</div>
                        </div>
                        <div className="text-gray-300 truncate">{user.role}</div>
                        <div className="text-gray-300 truncate">{user.employee?.department || 'N/A'}</div>
                        <div className="flex items-center justify-center">
                          <div className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-green-400' : 'bg-red-400'}`}></div>
                        </div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="bg-[#3A3B6E] p-2 border-t border-gray-600">
                    <div className="flex items-center justify-between text-xs text-gray-300">
                      <span>Page {currentPage} of {totalPages}</span>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="h-6 px-2 text-xs border-gray-600 text-gray-300 hover:bg-gray-700/20"
                        >
                          Prev
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="h-6 px-2 text-xs border-gray-600 text-gray-300 hover:bg-gray-700/20"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 bg-[#2A2B5E] border border-gray-600 rounded-lg flex-1 flex items-center justify-center">
                <div>
                  <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-300 text-sm">
                    {searchTerm ? 'No users found matching your search' : 'No users available'}
                  </p>
                </div>
              </div>
            )}
            </div>
          </TabsContent>

          <TabsContent value="sessions" className="flex-1 flex flex-col space-y-3">
            {/* Search Bar - only show if we have sessions or are searching */}
            {(totalSessions > 0 || sessionSearchTerm) && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder={`Search ${totalSessions} sessions...`}
                      value={sessionSearchTerm}
                      onChange={(e) => handleSessionSearchChange(e.target.value)}
                      className="pl-10 h-10 bg-[#2A2B5E] border-gray-600 text-white placeholder-gray-400"
                    />
                  </div>
                  <Button
                    onClick={handleManualRefresh}
                    variant="outline"
                    size="sm"
                    className="h-10 px-3 border-gray-600 text-gray-300 hover:bg-gray-700/20"
                    disabled={sessionsLoading}
                  >
                    <RefreshCw className={`w-4 h-4 ${sessionsLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                
                {/* Search feedback */}
                {sessionSearchTerm.length > 0 && sessionSearchTerm.length < 3 && (
                  <p className="text-xs text-orange-400 px-1">Enter at least 3 characters to search</p>
                )}
                {debouncedSessionSearch !== sessionSearchTerm && sessionSearchTerm.length >= 3 && (
                  <p className="text-xs text-blue-400 px-1">Searching sessions...</p>
                )}
              </div>
            )}

            {/* Session count and pagination info - only show if we have sessions */}
            {totalSessions > 0 && (
              <div className="flex justify-between items-center text-xs text-gray-400 px-1">
                <span>{totalSessions} total sessions</span>
                <span>Page {sessionPage} of {totalSessionPages}</span>
              </div>
            )}

            {/* 2-Row Readable Sessions Layout */}
            <div className="bg-[#2A2B5E] border border-gray-600 rounded-lg overflow-hidden flex-1 flex flex-col">
              {/* Header */}
              <div className="bg-[#3A3B6E] px-4 py-2 border-b border-gray-600 flex-shrink-0">
                <div className="text-sm font-medium text-gray-300 text-center">
                  Active Sessions
                </div>
              </div>
              
              {/* 2-Row Sessions List */}
              <div className="flex-1 overflow-y-auto">
                {sessionsLoading ? (
                  <div className="p-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="mb-3 p-3 bg-[#1A1B3E]/50 rounded border border-gray-600/30">
                        <div className="animate-pulse space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="h-4 bg-gray-600/20 rounded w-24"></div>
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 bg-gray-600/20 rounded"></div>
                              <div className="h-3 bg-gray-600/20 rounded w-12"></div>
                            </div>
                          </div>
                          <div className="h-3 bg-gray-600/20 rounded w-32"></div>
                          <div className="h-3 bg-gray-600/20 rounded w-28"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : sessions && sessions.length > 0 ? (
                  <div>
                    {sessions.map((session: UserSession) => (
                      <MobileSessionCard
                        key={session.id}
                        session={session}
                        onForceLogout={handleForceLogout}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center min-h-[200px]">
                    <div className="text-center px-4">
                      <Monitor className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-300 text-base font-medium mb-2">
                        {sessionSearchTerm ? 'No sessions found' : 'No active sessions'}
                      </p>
                      <p className="text-gray-500 text-sm">
                        {sessionSearchTerm ? 'Try adjusting your search terms' : 'User sessions will appear here when active'}
                      </p>
                      {!sessionSearchTerm && (
                        <p className="text-gray-600 text-xs mt-3">Long press any session to terminate</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Compact Pagination Controls */}
              {totalSessionPages > 1 && (
                <div className="mt-2 px-4 pb-2">
                  <div className="flex justify-between items-center">
                    <Button
                      onClick={() => handleSessionPageChange(sessionPage - 1)}
                      disabled={sessionPage === 1 || sessionsLoading}
                      variant="outline"
                      size="sm"
                      className="border-gray-600 text-gray-300 hover:bg-gray-700/20 h-8 px-3 text-xs"
                    >
                      ← Prev
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {[...Array(Math.min(5, totalSessionPages))].map((_, index) => {
                        const page = Math.max(1, Math.min(sessionPage - 2 + index, totalSessionPages - 4 + index));
                        const isCurrentPage = page === sessionPage;
                        return (
                          <Button
                            key={`session-page-${page}-${index}`}
                            onClick={() => handleSessionPageChange(page)}
                            variant={isCurrentPage ? "default" : "outline"}
                            size="sm"
                            className={`w-7 h-7 p-0 text-xs ${
                              isCurrentPage 
                                ? 'bg-blue-600 text-white' 
                                : 'border-gray-600 text-gray-300 hover:bg-gray-700/20'
                            }`}
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      onClick={() => handleSessionPageChange(sessionPage + 1)}
                      disabled={sessionPage === totalSessionPages || sessionsLoading}
                      variant="outline"
                      size="sm"
                      className="border-gray-600 text-gray-300 hover:bg-gray-700/20 h-8 px-3 text-xs"
                    >
                      Next →
                    </Button>
                  </div>
                  
                  <div className="text-center mt-1 text-xs text-gray-500">
                    {sessionPage}/{totalSessionPages} • {totalSessions} total (20/page)
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* User Detail Modal */}
        <MobileUserDetailModal
          user={selectedUser}
          isOpen={isUserModalOpen}
          onClose={() => {
            setIsUserModalOpen(false);
            setSelectedUser(null);
          }}
          onUserUpdate={handleUserUpdate}
        />
      </div>

      {/* Standardized Mobile Admin Dual Navigation */}
      <MobileAdminDualNavigation currentPage="users" />
    </div>
  );
};

export default MobileUserManagementInterface;