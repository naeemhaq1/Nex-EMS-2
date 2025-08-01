import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { 
  ArrowLeft, 
  Smartphone, 
  Monitor, 
  Wifi, 
  WifiOff, 
  Power, 
  PowerOff, 
  Users, 
  Clock, 
  MapPin, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RotateCcw,
  Trash2,
  Settings,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DeviceSession {
  id: string;
  username: string;
  deviceName: string;
  deviceType: string;
  browser: string;
  os: string;
  ipAddress: string;
  location: string;
  loginTime: string;
  lastActivity: string;
  status: 'active' | 'inactive' | 'expired';
}

export default function MobileSessionControl() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);

  // Fetch active device sessions
  const { data: sessions = [], isLoading } = useQuery<DeviceSession[]>({
    queryKey: ['/api/admin/device-sessions'],
    refetchInterval: 30000,
  });

  // Logout session mutation
  const logoutMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/admin/device-sessions/${sessionId}/logout`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to logout session');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/device-sessions'] });
    },
  });

  // Bulk logout mutation
  const bulkLogoutMutation = useMutation({
    mutationFn: async (sessionIds: string[]) => {
      const response = await fetch('/api/admin/device-sessions/bulk-logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionIds }),
      });
      if (!response.ok) throw new Error('Failed to logout sessions');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/device-sessions'] });
      setSelectedSessions([]);
    },
  });

  const handleSessionSelect = (sessionId: string) => {
    setSelectedSessions(prev => 
      prev.includes(sessionId) 
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  const handleSelectAll = () => {
    if (selectedSessions.length === sessions.length) {
      setSelectedSessions([]);
    } else {
      setSelectedSessions(sessions.map(s => s.id));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 text-white text-xs">Active</Badge>;
      case 'inactive':
        return <Badge className="bg-yellow-500 text-white text-xs">Inactive</Badge>;
      case 'expired':
        return <Badge className="bg-red-500 text-white text-xs">Expired</Badge>;
      default:
        return <Badge className="bg-gray-500 text-white text-xs">Unknown</Badge>;
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />;
      case 'desktop':
        return <Monitor className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <div>Loading device sessions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1B3E] text-white">
      {/* Header */}
      <div className="bg-[#2A2B5E] px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/mobile/admin/dashboard')}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Device Management</h1>
            <p className="text-sm text-gray-400">{sessions.length} active sessions</p>
          </div>
        </div>
        
        {selectedSessions.length > 0 && (
          <Button
            onClick={() => bulkLogoutMutation.mutate(selectedSessions)}
            disabled={bulkLogoutMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
            size="sm"
          >
            <PowerOff className="w-4 h-4 mr-1" />
            Logout ({selectedSessions.length})
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 pb-20">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="bg-[#2A2B5E] border-gray-700">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Total Sessions</p>
                  <p className="text-lg font-semibold">{sessions.length}</p>
                </div>
                <Users className="w-6 h-6 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#2A2B5E] border-gray-700">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Active</p>
                  <p className="text-lg font-semibold text-green-400">
                    {sessions.filter(s => s.status === 'active').length}
                  </p>
                </div>
                <Wifi className="w-6 h-6 text-green-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#2A2B5E] border-gray-700">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Inactive</p>
                  <p className="text-lg font-semibold text-yellow-400">
                    {sessions.filter(s => s.status !== 'active').length}
                  </p>
                </div>
                <WifiOff className="w-6 h-6 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Actions */}
        <div className="flex items-center justify-between mb-4">
          <Button
            onClick={handleSelectAll}
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-300"
          >
            {selectedSessions.length === sessions.length ? 'Deselect All' : 'Select All'}
          </Button>
          
          <Button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/device-sessions'] })}
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-300"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>

        {/* Device Sessions List */}
        <div className="space-y-3">
          {sessions.map((session) => (
            <Card 
              key={session.id} 
              className={`bg-[#2A2B5E] border-gray-700 cursor-pointer transition-colors ${
                selectedSessions.includes(session.id) ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => handleSessionSelect(session.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-600/20 rounded-lg">
                      {getDeviceIcon(session.deviceType)}
                    </div>
                    <div>
                      <h3 className="font-medium">{session.username}</h3>
                      <p className="text-sm text-gray-400">{session.deviceName}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(session.status)}
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        logoutMutation.mutate(session.id);
                      }}
                      disabled={logoutMutation.isPending}
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <PowerOff className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-gray-400">Browser</p>
                    <p className="text-white">{session.browser}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">OS</p>
                    <p className="text-white">{session.os}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">IP Address</p>
                    <p className="text-white">{session.ipAddress}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Location</p>
                    <p className="text-white">{session.location}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Login Time</p>
                    <p className="text-white">{new Date(session.loginTime).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Last Activity</p>
                    <p className="text-white">{new Date(session.lastActivity).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {sessions.length === 0 && (
          <div className="text-center py-12">
            <Smartphone className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">No Active Sessions</h3>
            <p className="text-gray-500">No device sessions found to manage.</p>
          </div>
        )}
      </div>
    </div>
  );
}