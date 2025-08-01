import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  LogOut, 
  UserMinus, 
  MessageCircle, 
  Key, 
  Search,
  RefreshCw,
  Users,
  Activity,
  MapPin,
  Settings,
  TestTube,
  Zap
} from "lucide-react";

interface DeviceSession {
  id: string;
  deviceName: string;
  deviceNumber: string;
  ipAddress: string;
  operatingSystem: string;
  osVersion: string;
  browserName: string;
  browserVersion: string;
  username: string;
  realName: string;
  loginSince: string;
  lastActivity: string;
  status: 'active' | 'inactive' | 'idle';
  deviceType: 'mobile' | 'desktop' | 'tablet';
  location?: string;
  userAgent: string;
}

export default function SessionControl() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'idle'>('all');
  const [filterType, setFilterType] = useState<'all' | 'mobile' | 'desktop' | 'tablet'>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: devices, isLoading, error } = useQuery({
    queryKey: ['/api/devices/sessions'],
    queryFn: () => apiRequest({ url: '/api/devices/sessions' }),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const forceLogoutMutation = useMutation({
    mutationFn: (deviceId: string) => apiRequest({
      url: `/api/devices/${deviceId}/logout`,
      method: 'POST',
    }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Device logged out successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/devices/sessions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to logout device",
        variant: "destructive",
      });
    },
  });

  const inactivateMutation = useMutation({
    mutationFn: (deviceId: string) => apiRequest({
      url: `/api/devices/${deviceId}/inactivate`,
      method: 'POST',
    }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Device inactivated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/devices/sessions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to inactivate device",
        variant: "destructive",
      });
    },
  });

  const sendWhatsAppInviteMutation = useMutation({
    mutationFn: (deviceId: string) => apiRequest({
      url: `/api/devices/${deviceId}/whatsapp-invite`,
      method: 'POST',
    }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "WhatsApp invite sent successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send WhatsApp invite",
        variant: "destructive",
      });
    },
  });

  const passwordResetMutation = useMutation({
    mutationFn: (deviceId: string) => apiRequest({
      url: `/api/devices/${deviceId}/password-reset`,
      method: 'POST',
    }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password reset link sent via WhatsApp",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send password reset",
        variant: "destructive",
      });
    },
  });

  const filteredDevices = devices?.filter((device: DeviceSession) => {
    const matchesSearch = 
      device.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.realName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.ipAddress.includes(searchTerm);
    
    const matchesStatus = filterStatus === 'all' || device.status === filterStatus;
    const matchesType = filterType === 'all' || device.deviceType === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />;
      case 'tablet':
        return <Tablet className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-600';
      case 'idle':
        return 'bg-yellow-600';
      case 'inactive':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getTimeSince = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] p-6">
        <div className="flex items-center justify-center">
          <div className="text-white">Loading devices...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] p-6">
        <div className="flex items-center justify-center">
          <div className="text-red-400">Error loading devices: {error.message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1B3E] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Session Control</h1>
          <p className="text-slate-400">Manage active user sessions and login devices</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-[#2A2B5E] border-purple-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Active Sessions</p>
                  <p className="text-2xl font-bold text-green-400">
                    {devices?.filter((d: DeviceSession) => d.status === 'active').length || 0}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#2A2B5E] border-purple-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Mobile Devices</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {devices?.filter((d: DeviceSession) => d.deviceType === 'mobile').length || 0}
                  </p>
                </div>
                <Smartphone className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#2A2B5E] border-purple-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Desktop Devices</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {devices?.filter((d: DeviceSession) => d.deviceType === 'desktop').length || 0}
                  </p>
                </div>
                <Monitor className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#2A2B5E] border-purple-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total Users</p>
                  <p className="text-2xl font-bold text-cyan-400">
                    {new Set(devices?.map((d: DeviceSession) => d.username)).size || 0}
                  </p>
                </div>
                <Users className="w-8 h-8 text-cyan-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-[#2A2B5E] border-purple-500/30 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Filter Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search devices, users, or IP addresses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-[#1A1B3E] border-slate-600 text-white"
                  />
                </div>
              </div>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 bg-[#1A1B3E] border border-slate-600 rounded-md text-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="idle">Idle</option>
                <option value="inactive">Inactive</option>
              </select>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-3 py-2 bg-[#1A1B3E] border border-slate-600 rounded-md text-white"
              >
                <option value="all">All Types</option>
                <option value="mobile">Mobile</option>
                <option value="desktop">Desktop</option>
                <option value="tablet">Tablet</option>
              </select>

              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/devices/sessions'] })}
                variant="outline"
                className="border-purple-500/30 text-purple-400 hover:bg-purple-500/20"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Device Sessions Table */}
        <Card className="bg-[#2A2B5E] border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-white">Active Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-600">
                    <th className="text-left p-3 text-slate-300">Device</th>
                    <th className="text-left p-3 text-slate-300">User</th>
                    <th className="text-left p-3 text-slate-300">IP Address</th>
                    <th className="text-left p-3 text-slate-300">System</th>
                    <th className="text-left p-3 text-slate-300">Status</th>
                    <th className="text-left p-3 text-slate-300">Last Activity</th>
                    <th className="text-left p-3 text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDevices?.map((device: DeviceSession) => (
                    <tr key={device.id} className="border-b border-slate-700 hover:bg-slate-800/50">
                      <td className="p-3">
                        <div className="flex items-center space-x-3">
                          {getDeviceIcon(device.deviceType)}
                          <div>
                            <div className="text-white font-medium">{device.deviceName}</div>
                            <div className="text-slate-400 text-sm">{device.deviceNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div>
                          <div className="text-white font-medium">{device.realName}</div>
                          <div className="text-slate-400 text-sm">@{device.username}</div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-white">{device.ipAddress}</div>
                        {device.location && (
                          <div className="text-slate-400 text-sm flex items-center mt-1">
                            <MapPin className="w-3 h-3 mr-1" />
                            {device.location}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="text-white">{device.operatingSystem}</div>
                        <div className="text-slate-400 text-sm">
                          {device.browserName} {device.browserVersion}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge 
                          className={`${getStatusColor(device.status)} text-white border-none`}
                        >
                          {device.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="text-white text-sm">{getTimeSince(device.lastActivity)}</div>
                        <div className="text-slate-400 text-xs">
                          Login: {getTimeSince(device.loginSince)}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => forceLogoutMutation.mutate(device.id)}
                            disabled={forceLogoutMutation.isPending}
                            size="sm"
                            variant="outline"
                            className="border-red-500/30 text-red-400 hover:bg-red-500/20"
                          >
                            <LogOut className="w-3 h-3" />
                          </Button>
                          <Button
                            onClick={() => inactivateMutation.mutate(device.id)}
                            disabled={inactivateMutation.isPending}
                            size="sm"
                            variant="outline"
                            className="border-orange-500/30 text-orange-400 hover:bg-orange-500/20"
                          >
                            <UserMinus className="w-3 h-3" />
                          </Button>
                          <Button
                            onClick={() => sendWhatsAppInviteMutation.mutate(device.id)}
                            disabled={sendWhatsAppInviteMutation.isPending}
                            size="sm"
                            variant="outline"
                            className="border-green-500/30 text-green-400 hover:bg-green-500/20"
                          >
                            <MessageCircle className="w-3 h-3" />
                          </Button>
                          <Button
                            onClick={() => passwordResetMutation.mutate(device.id)}
                            disabled={passwordResetMutation.isPending}
                            size="sm"
                            variant="outline"
                            className="border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
                          >
                            <Key className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredDevices?.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  No devices found matching the current filters.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}