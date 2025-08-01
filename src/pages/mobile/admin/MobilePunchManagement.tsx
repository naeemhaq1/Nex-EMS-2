import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { 
  ArrowLeft, 
  Clock, 
  LogOut, 
  AlertTriangle, 
  CheckCircle, 
  User, 
  Calendar, 
  MapPin, 
  Timer,
  Power,
  RotateCcw,
  Search,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface LongPunchSession {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  designation: string;
  punchInTime: string;
  hoursWorked: number;
  location: string;
  punchInType: 'biometric' | 'mobile' | 'admin';
  status: 'active' | 'warning' | 'critical';
}

export default function MobilePunchManagement() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Fetch long punch sessions (>8 hours)
  const { data: sessions = [], isLoading } = useQuery<LongPunchSession[]>({
    queryKey: ['/api/admin/long-punch-sessions'],
    refetchInterval: 60000, // Refresh every minute
  });

  // Force punch out mutation
  const forcePunchOutMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/admin/force-punch-out/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Admin force punch-out - overtime limit' }),
      });
      if (!response.ok) throw new Error('Failed to force punch out');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/long-punch-sessions'] });
    },
  });

  // Bulk force punch out mutation
  const bulkForcePunchOutMutation = useMutation({
    mutationFn: async (sessionIds: string[]) => {
      const response = await fetch('/api/admin/bulk-force-punch-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionIds, 
          reason: 'Admin bulk force punch-out - overtime limit exceeded' 
        }),
      });
      if (!response.ok) throw new Error('Failed to bulk force punch out');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/long-punch-sessions'] });
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
    const filteredSessions = getFilteredSessions();
    if (selectedSessions.length === filteredSessions.length) {
      setSelectedSessions([]);
    } else {
      setSelectedSessions(filteredSessions.map(s => s.id));
    }
  };

  const getFilteredSessions = () => {
    return sessions.filter(session => {
      const matchesSearch = session.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           session.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           session.department.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterStatus === 'all' || session.status === filterStatus;
      
      return matchesSearch && matchesFilter;
    });
  };

  const getStatusBadge = (status: string, hours: number) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-blue-500 text-white text-xs">Active ({hours.toFixed(1)}h)</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500 text-white text-xs">Warning ({hours.toFixed(1)}h)</Badge>;
      case 'critical':
        return <Badge className="bg-red-500 text-white text-xs">Critical ({hours.toFixed(1)}h)</Badge>;
      default:
        return <Badge className="bg-gray-500 text-white text-xs">Unknown</Badge>;
    }
  };

  const getStatusColor = (hours: number) => {
    if (hours >= 12) return 'critical';
    if (hours >= 10) return 'warning';
    return 'active';
  };

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const filteredSessions = getFilteredSessions();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <div>Loading punch sessions...</div>
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
            <h1 className="text-lg font-semibold">Punch Management</h1>
            <p className="text-sm text-gray-400">{filteredSessions.length} long sessions</p>
          </div>
        </div>
        
        {selectedSessions.length > 0 && (
          <Button
            onClick={() => bulkForcePunchOutMutation.mutate(selectedSessions)}
            disabled={bulkForcePunchOutMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
            size="sm"
          >
            <Power className="w-4 h-4 mr-1" />
            Force Out ({selectedSessions.length})
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
                  <p className="text-xs text-gray-400">Long Sessions</p>
                  <p className="text-lg font-semibold">{sessions.length}</p>
                </div>
                <Clock className="w-6 h-6 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#2A2B5E] border-gray-700">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Critical</p>
                  <p className="text-lg font-semibold text-red-400">
                    {sessions.filter(s => s.hoursWorked >= 12).length}
                  </p>
                </div>
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#2A2B5E] border-gray-700">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Warning</p>
                  <p className="text-lg font-semibold text-yellow-400">
                    {sessions.filter(s => s.hoursWorked >= 10 && s.hoursWorked < 12).length}
                  </p>
                </div>
                <Timer className="w-6 h-6 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#2A2B5E] border border-gray-600 rounded-lg px-10 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#2A2B5E] border border-gray-600 rounded-lg px-10 py-2 text-white focus:outline-none focus:border-blue-500 appearance-none"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="flex items-center justify-between mb-4">
          <Button
            onClick={handleSelectAll}
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-300"
          >
            {selectedSessions.length === filteredSessions.length && filteredSessions.length > 0 
              ? 'Deselect All' : 'Select All'}
          </Button>
          
          <Button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/long-punch-sessions'] })}
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-300"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>

        {/* Punch Sessions List */}
        <div className="space-y-3">
          {filteredSessions.map((session) => {
            const status = getStatusColor(session.hoursWorked);
            return (
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
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-medium">{session.employeeName}</h3>
                        <p className="text-sm text-gray-400">{session.employeeId} • {session.designation}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(status, session.hoursWorked)}
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          forcePunchOutMutation.mutate(session.id);
                        }}
                        disabled={forcePunchOutMutation.isPending}
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <LogOut className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-gray-400">Department</p>
                      <p className="text-white">{session.department}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Punch Type</p>
                      <p className="text-white capitalize">{session.punchInType}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Punch In Time</p>
                      <p className="text-white">{new Date(session.punchInTime).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Duration</p>
                      <p className={`font-medium ${
                        session.hoursWorked >= 12 ? 'text-red-400' : 
                        session.hoursWorked >= 10 ? 'text-yellow-400' : 'text-white'
                      }`}>
                        {formatDuration(session.hoursWorked)}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-400">Location</p>
                      <p className="text-white">{session.location}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredSessions.length === 0 && sessions.length > 0 && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">No Results Found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
          </div>
        )}

        {sessions.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">All Good!</h3>
            <p className="text-gray-500">No long punch sessions found. All employees are within normal hours.</p>
          </div>
        )}
      </div>
    </div>
  );
}