import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { 
  Bug, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Send, 
  X,
  ArrowLeft,
  Plus,
  Filter,
  Search
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import MobileAdminDualNavigation from '@/components/mobile/MobileAdminDualNavigation';

interface BugReport {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  reportedBy: string;
  assignedTo?: string;
  reportedAt: string;
  resolvedAt?: string;
  category: string;
  steps?: string;
  expectedResult?: string;
  actualResult?: string;
  environment?: string;
}

// Mock data temporarily until API is ready
const mockBugs: BugReport[] = [
  {
    id: '1',
    title: 'Login timeout issue',
    description: 'Users are experiencing session timeouts after 10 minutes of inactivity instead of the expected 30 minutes.',
    severity: 'high',
    status: 'open',
    reportedBy: 'Ahmad Hassan',
    reportedAt: '2025-01-17T09:30:00Z',
    category: 'Authentication',
    steps: '1. Login to system\n2. Leave inactive for 10 minutes\n3. Try to perform action',
    expectedResult: 'Session should remain active for 30 minutes',
    actualResult: 'Session expires after 10 minutes',
    environment: 'Production'
  },
  {
    id: '2',
    title: 'WhatsApp messages not sending',
    description: 'WhatsApp messages are failing to send to certain phone numbers.',
    severity: 'critical',
    status: 'in_progress',
    reportedBy: 'Sara Ahmed',
    assignedTo: 'Tech Team',
    reportedAt: '2025-01-17T08:15:00Z',
    category: 'Communication',
    environment: 'Production'
  },
  {
    id: '3',
    title: 'Mobile punch location accuracy',
    description: 'Mobile punch-in is accepting locations outside the 200m geofence radius.',
    severity: 'medium',
    status: 'resolved',
    reportedBy: 'Muhammad Ali',
    assignedTo: 'Mobile Team',
    reportedAt: '2025-01-16T14:20:00Z',
    resolvedAt: '2025-01-17T10:00:00Z',
    category: 'Mobile App',
    environment: 'Production'
  }
];

export default function MobileAdminBugs() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  // Use real data from API - fetch bugs from backend
  const { data: bugs = [], isLoading: bugsLoading } = useQuery<BugReport[]>({
    queryKey: ['/api/admin/bugs'],
    refetchInterval: 30000,
  });

  // States for bug interface
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [selectedBug, setSelectedBug] = useState<BugReport | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Form state for new bug report
  const [newBug, setNewBug] = useState({
    title: '',
    description: '',
    severity: 'medium' as const,
    category: '',
    steps: '',
    expectedResult: '',
    actualResult: '',
    environment: 'Production'
  });

  // Use real bugs if available, otherwise fallback to mock data
  const activeBugs = bugs.length > 0 ? bugs : mockBugs;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'resolved': return 'bg-green-500';
      case 'closed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return Clock;
      case 'in_progress': return AlertTriangle;
      case 'resolved': return CheckCircle;
      case 'closed': return XCircle;
      default: return Clock;
    }
  };

  const filteredBugs = activeBugs.filter(bug => {
    const matchesSearch = bug.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bug.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bug.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = selectedSeverity === 'all' || bug.severity === selectedSeverity;
    const matchesStatus = selectedStatus === 'all' || bug.status === selectedStatus;
    
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const submitBugMutation = useMutation({
    mutationFn: async (bugData: any) => {
      // For now, just simulate a successful response since API endpoint doesn't exist yet
      return new Promise((resolve) => {
        setTimeout(() => resolve({ success: true }), 1000);
      });
    },
    onSuccess: () => {
      setShowReportDialog(false);
      setNewBug({
        title: '',
        description: '',
        severity: 'medium',
        category: '',
        steps: '',
        expectedResult: '',
        actualResult: '',
        environment: 'Production'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/bugs'] });
    }
  });

  const handleSubmitBug = () => {
    if (newBug.title && newBug.description && newBug.category) {
      submitBugMutation.mutate(newBug);
    }
  };

  const openCount = activeBugs.filter(b => b.status === 'open').length;
  const inProgressCount = activeBugs.filter(b => b.status === 'in_progress').length;
  const resolvedCount = activeBugs.filter(b => b.status === 'resolved').length;
  const criticalCount = activeBugs.filter(b => b.severity === 'critical').length;

  return (
    <div className="h-screen bg-[#1A1B3E] text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-[#2A2B5E] border-b border-purple-500/20 px-4 py-4 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/mobile/admin/dashboard')}
            className="p-2 bg-gray-600/20 rounded-lg hover:bg-gray-600/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div className="p-2 bg-red-600/20 rounded-lg">
            <Bug className="w-6 h-6 text-red-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Bug Tracking</h1>
            <p className="text-sm text-gray-400">Report and track system issues</p>
          </div>
          <button
            onClick={() => setShowReportDialog(true)}
            className="p-2 bg-blue-600/20 rounded-lg hover:bg-blue-600/30 transition-colors"
          >
            <Plus className="w-5 h-5 text-blue-400" />
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="px-4 py-4 bg-[#1A1B3E] border-b border-gray-700/50">
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-[#2A2B5E] rounded-lg p-3 text-center">
            <div className="text-blue-400 text-lg font-bold">{openCount}</div>
            <div className="text-gray-400 text-xs">Open</div>
          </div>
          <div className="bg-[#2A2B5E] rounded-lg p-3 text-center">
            <div className="text-yellow-400 text-lg font-bold">{inProgressCount}</div>
            <div className="text-gray-400 text-xs">In Progress</div>
          </div>
          <div className="bg-[#2A2B5E] rounded-lg p-3 text-center">
            <div className="text-green-400 text-lg font-bold">{resolvedCount}</div>
            <div className="text-gray-400 text-xs">Resolved</div>
          </div>
          <div className="bg-[#2A2B5E] rounded-lg p-3 text-center">
            <div className="text-red-400 text-lg font-bold">{criticalCount}</div>
            <div className="text-gray-400 text-xs">Critical</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="px-4 py-3 bg-[#1A1B3E] border-b border-gray-700/50">
        <div className="flex items-center space-x-3 mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search bugs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#2A2B5E] border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 text-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 bg-[#2A2B5E] rounded-lg hover:bg-[#3A3B6E] transition-colors"
          >
            <Filter className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {showFilters && (
          <div className="flex items-center space-x-3">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-[#2A2B5E] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="all">All Severity</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-[#2A2B5E] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        )}
      </div>

      {/* Bug List */}
      <div className="flex-1 overflow-y-auto px-4 pb-32">
        <div className="space-y-3 py-4">
          {filteredBugs.map((bug) => {
            const StatusIcon = getStatusIcon(bug.status);
            return (
              <div
                key={bug.id}
                className="bg-[#2A2B5E] rounded-lg p-4 border border-gray-700/50 cursor-pointer hover:border-gray-600/50 transition-colors"
                onClick={() => setSelectedBug(bug)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-red-600/20 rounded-lg">
                      <Bug className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{bug.title}</h3>
                      <p className="text-sm text-gray-400">{bug.category}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getSeverityColor(bug.severity)}`}>
                      {bug.severity.toUpperCase()}
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(bug.status)}`}>
                      {bug.status.replace('_', ' ')}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-400 mb-3 line-clamp-2">{bug.description}</p>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-2">
                    <StatusIcon className="w-4 h-4" />
                    <span>Reported by {bug.reportedBy}</span>
                  </div>
                  <span>{new Date(bug.reportedAt).toLocaleDateString()}</span>
                </div>

                {bug.assignedTo && (
                  <div className="mt-2 text-xs text-blue-400">
                    Assigned to: {bug.assignedTo}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bug Report Dialog */}
      {showReportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#2A2B5E] rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Report Bug</h3>
              <button
                onClick={() => setShowReportDialog(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={newBug.title}
                  onChange={(e) => setNewBug({...newBug, title: e.target.value})}
                  placeholder="Brief description of the bug"
                  className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  value={newBug.category}
                  onChange={(e) => setNewBug({...newBug, category: e.target.value})}
                  className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg px-3 py-2 text-white"
                >
                  <option value="">Select category</option>
                  <option value="Authentication">Authentication</option>
                  <option value="Communication">Communication</option>
                  <option value="Mobile App">Mobile App</option>
                  <option value="Dashboard">Dashboard</option>
                  <option value="Reports">Reports</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Severity
                </label>
                <select
                  value={newBug.severity}
                  onChange={(e) => setNewBug({...newBug, severity: e.target.value as any})}
                  className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg px-3 py-2 text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  value={newBug.description}
                  onChange={(e) => setNewBug({...newBug, description: e.target.value})}
                  placeholder="Detailed description of the bug"
                  className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 h-20 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Steps to Reproduce
                </label>
                <textarea
                  value={newBug.steps}
                  onChange={(e) => setNewBug({...newBug, steps: e.target.value})}
                  placeholder="1. Go to...\n2. Click on...\n3. Observe..."
                  className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 h-16 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Expected Result
                </label>
                <textarea
                  value={newBug.expectedResult}
                  onChange={(e) => setNewBug({...newBug, expectedResult: e.target.value})}
                  placeholder="What should happen?"
                  className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 h-16 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Actual Result
                </label>
                <textarea
                  value={newBug.actualResult}
                  onChange={(e) => setNewBug({...newBug, actualResult: e.target.value})}
                  placeholder="What actually happened?"
                  className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 h-16 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3 mt-6">
              <button
                onClick={handleSubmitBug}
                disabled={!newBug.title || !newBug.description || !newBug.category || submitBugMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>{submitBugMutation.isPending ? 'Submitting...' : 'Submit Bug'}</span>
              </button>
              <button
                onClick={() => setShowReportDialog(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bug Details Dialog */}
      {selectedBug && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#2A2B5E] rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Bug Details</h3>
              <button
                onClick={() => setSelectedBug(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-white mb-2">{selectedBug.title}</h4>
                <div className="flex items-center space-x-2 mb-3">
                  <div className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getSeverityColor(selectedBug.severity)}`}>
                    {selectedBug.severity.toUpperCase()}
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(selectedBug.status)}`}>
                    {selectedBug.status.replace('_', ' ')}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <p className="text-sm text-gray-400">{selectedBug.description}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                <p className="text-sm text-gray-400">{selectedBug.category}</p>
              </div>

              {selectedBug.steps && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Steps to Reproduce</label>
                  <p className="text-sm text-gray-400 whitespace-pre-line">{selectedBug.steps}</p>
                </div>
              )}

              {selectedBug.expectedResult && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Expected Result</label>
                  <p className="text-sm text-gray-400">{selectedBug.expectedResult}</p>
                </div>
              )}

              {selectedBug.actualResult && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Actual Result</label>
                  <p className="text-sm text-gray-400">{selectedBug.actualResult}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Reported By</label>
                  <p className="text-sm text-gray-400">{selectedBug.reportedBy}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Reported At</label>
                  <p className="text-sm text-gray-400">{new Date(selectedBug.reportedAt).toLocaleString()}</p>
                </div>
              </div>

              {selectedBug.assignedTo && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Assigned To</label>
                  <p className="text-sm text-gray-400">{selectedBug.assignedTo}</p>
                </div>
              )}

              {selectedBug.resolvedAt && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Resolved At</label>
                  <p className="text-sm text-gray-400">{new Date(selectedBug.resolvedAt).toLocaleString()}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedBug(null)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileAdminDualNavigation currentPage="bugs" />
    </div>
  );
}