import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  ArrowLeft,
  Filter,
  MoreVertical
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

export default function MobileSessionControl() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'idle'>('all');
  const [filterType, setFilterType] = useState<'all' | 'mobile' | 'desktop' | 'tablet'>('all');
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: devices, isLoading, error } = useQuery({
    queryKey: ['/api/devices/sessions'],
    queryFn: () => apiRequest({ url: '/api/devices/sessions' }),
    refetchInterval: 30000,
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

  const getTimeSince = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Now';
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-[#1A1B3E] flex items-center justify-center">
        <div className="text-white">Loading devices...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-[#1A1B3E] flex items-center justify-center">
        <div className="text-red-400">Error loading devices: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#1A1B3E] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-purple-500/30">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="text-white hover:bg-purple-500/20"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-bold text-white">Devices</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="text-white hover:bg-purple-500/20"
          >
            <Filter className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/devices/sessions'] })}
            className="text-white hover:bg-purple-500/20"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3 p-4">
        <Card className="bg-[#2A2B5E] border-purple-500/30">
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-green-400">
              {devices?.filter((d: DeviceSession) => d.status === 'active').length || 0}
            </div>
            <div className="text-xs text-slate-400">Active</div>
          </CardContent>
        </Card>
        <Card className="bg-[#2A2B5E] border-purple-500/30">
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-blue-400">
              {devices?.filter((d: DeviceSession) => d.deviceType === 'mobile').length || 0}
            </div>
            <div className="text-xs text-slate-400">Mobile</div>
          </CardContent>
        </Card>
        <Card className="bg-[#2A2B5E] border-purple-500/30">
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-purple-400">
              {devices?.filter((d: DeviceSession) => d.deviceType === 'desktop').length || 0}
            </div>
            <div className="text-xs text-slate-400">Desktop</div>
          </CardContent>
        </Card>
        <Card className="bg-[#2A2B5E] border-purple-500/30">
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-cyan-400">
              {new Set(devices?.map((d: DeviceSession) => d.username)).size || 0}
            </div>
            <div className="text-xs text-slate-400">Users</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="p-4 bg-[#2A2B5E] border-b border-purple-500/30">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search devices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#1A1B3E] border-slate-600 text-white text-sm"
              />
            </div>
            <div className="flex space-x-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="flex-1 px-3 py-2 text-sm bg-[#1A1B3E] border border-slate-600 rounded-md text-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="idle">Idle</option>
                <option value="inactive">Inactive</option>
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="flex-1 px-3 py-2 text-sm bg-[#1A1B3E] border border-slate-600 rounded-md text-white"
              >
                <option value="all">All Types</option>
                <option value="mobile">Mobile</option>
                <option value="desktop">Desktop</option>
                <option value="tablet">Tablet</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Device List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {filteredDevices?.map((device: DeviceSession) => (
            <Card key={device.id} className="bg-[#2A2B5E] border-purple-500/30">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    {getDeviceIcon(device.deviceType)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <div className="text-white font-medium text-sm truncate">
                          {device.deviceName}
                        </div>
                        <Badge 
                          className={`${getStatusColor(device.status)} text-white border-none text-xs`}
                        >
                          {device.status}
                        </Badge>
                      </div>
                      <div className="text-slate-400 text-xs">
                        {device.realName} (@{device.username})
                      </div>
                      <div className="text-slate-400 text-xs">
                        {device.ipAddress} • {getTimeSince(device.lastActivity)}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedDevice(expandedDevice === device.id ? null : device.id)}
                    className="text-slate-400 hover:bg-slate-800/50"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>

                {expandedDevice === device.id && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                      <div>
                        <div className="text-slate-400">Device Number</div>
                        <div className="text-white">{device.deviceNumber}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">OS</div>
                        <div className="text-white">{device.operatingSystem} {device.osVersion}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Browser</div>
                        <div className="text-white">{device.browserName} {device.browserVersion}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Login Since</div>
                        <div className="text-white">{getTimeSince(device.loginSince)}</div>
                      </div>
                    </div>

                    {device.location && (
                      <div className="mb-4">
                        <div className="flex items-center space-x-1 text-slate-400 text-xs">
                          <MapPin className="w-3 h-3" />
                          <span>{device.location}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => forceLogoutMutation.mutate(device.id)}
                        disabled={forceLogoutMutation.isPending}
                        size="sm"
                        variant="outline"
                        className="border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs"
                      >
                        <LogOut className="w-3 h-3 mr-1" />
                        Logout
                      </Button>
                      <Button
                        onClick={() => inactivateMutation.mutate(device.id)}
                        disabled={inactivateMutation.isPending}
                        size="sm"
                        variant="outline"
                        className="border-orange-500/30 text-orange-400 hover:bg-orange-500/20 text-xs"
                      >
                        <UserMinus className="w-3 h-3 mr-1" />
                        Inactive
                      </Button>
                      <Button
                        onClick={() => sendWhatsAppInviteMutation.mutate(device.id)}
                        disabled={sendWhatsAppInviteMutation.isPending}
                        size="sm"
                        variant="outline"
                        className="border-green-500/30 text-green-400 hover:bg-green-500/20 text-xs"
                      >
                        <MessageCircle className="w-3 h-3 mr-1" />
                        WhatsApp
                      </Button>
                      <Button
                        onClick={() => passwordResetMutation.mutate(device.id)}
                        disabled={passwordResetMutation.isPending}
                        size="sm"
                        variant="outline"
                        className="border-blue-500/30 text-blue-400 hover:bg-blue-500/20 text-xs"
                      >
                        <Key className="w-3 h-3 mr-1" />
                        Reset
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {filteredDevices?.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              No devices found matching the current filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}