import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { 
  MessageSquare, 
  User, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Reply,
  Send,
  Filter,
  Search,
  ArrowLeft,
  Calendar,
  UserCheck
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import MobileAdminDualNavigation from '@/components/mobile/MobileAdminDualNavigation';

interface EmployeeRequest {
  id: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  requestType: 'overtime' | 'leave' | 'reimbursement' | 'work_from_home' | 'early_departure' | 'schedule_change';
  subject: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected' | 'in_review';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  submittedAt: string;
  respondedAt?: string;
  adminResponse?: string;
  attachments?: string[];
}

// Mock data for demonstration
const mockRequests: EmployeeRequest[] = [
  {
    id: '1',
    employeeName: 'Ahmad Hassan',
    employeeCode: 'EMP001',
    department: 'Engineering',
    requestType: 'overtime',
    subject: 'Overtime Request for Project Deadline',
    message: 'I need to work overtime this weekend to complete the critical project milestone. The deadline is Monday and we need extra hours to deliver quality work.',
    status: 'pending',
    priority: 'high',
    submittedAt: '2025-01-17T09:30:00Z'
  },
  {
    id: '2',
    employeeName: 'Sara Ahmed',
    employeeCode: 'EMP045',
    department: 'HR',
    requestType: 'leave',
    subject: 'Medical Leave Request',
    message: 'I need to take 3 days medical leave for surgery. I have attached the medical certificate from my doctor.',
    status: 'pending',
    priority: 'medium',
    submittedAt: '2025-01-17T08:15:00Z',
    attachments: ['medical_certificate.pdf']
  },
  {
    id: '3',
    employeeName: 'Muhammad Ali',
    employeeCode: 'EMP028',
    department: 'Finance',
    requestType: 'reimbursement',
    subject: 'Travel Expense Reimbursement',
    message: 'Please reimburse my travel expenses for client meeting in Karachi. All receipts are attached.',
    status: 'approved',
    priority: 'low',
    submittedAt: '2025-01-16T14:20:00Z',
    respondedAt: '2025-01-17T10:00:00Z',
    adminResponse: 'Approved. Reimbursement will be processed with next payroll.',
    attachments: ['flight_receipt.pdf', 'hotel_receipt.pdf']
  },
  {
    id: '4',
    employeeName: 'Fatima Khan',
    employeeCode: 'EMP067',
    department: 'Marketing',
    requestType: 'work_from_home',
    subject: 'Work From Home Request',
    message: 'I need to work from home for 2 days due to family emergency. I can be reached via phone and email.',
    status: 'in_review',
    priority: 'medium',
    submittedAt: '2025-01-17T07:45:00Z'
  },
  {
    id: '5',
    employeeName: 'Hassan Sheikh',
    employeeCode: 'EMP089',
    department: 'Operations',
    requestType: 'early_departure',
    subject: 'Early Departure Request',
    message: 'I need to leave early today for a family event. I have completed all my tasks for the day.',
    status: 'rejected',
    priority: 'low',
    submittedAt: '2025-01-17T11:30:00Z',
    respondedAt: '2025-01-17T12:00:00Z',
    adminResponse: 'Request denied. Please ensure all team meetings are attended.'
  }
];

export default function MobileAdminCommunicate() {
  const [, navigate] = useLocation();
  const [selectedRequest, setSelectedRequest] = useState<EmployeeRequest | null>(null);
  const [showReplyDialog, setShowReplyDialog] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'approved': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      case 'in_review': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-400';
      case 'high': return 'text-orange-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case 'overtime': return Clock;
      case 'leave': return Calendar;
      case 'reimbursement': return CheckCircle;
      case 'work_from_home': return User;
      case 'early_departure': return ArrowLeft;
      case 'schedule_change': return Calendar;
      default: return MessageSquare;
    }
  };

  const filteredRequests = mockRequests.filter(request => {
    const matchesSearch = request.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.employeeCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || request.status === selectedStatus;
    const matchesPriority = selectedPriority === 'all' || request.priority === selectedPriority;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const pendingCount = mockRequests.filter(r => r.status === 'pending').length;
  const approvedCount = mockRequests.filter(r => r.status === 'approved').length;
  const rejectedCount = mockRequests.filter(r => r.status === 'rejected').length;

  const handleReply = (request: EmployeeRequest) => {
    setSelectedRequest(request);
    setShowReplyDialog(true);
  };

  const handleSendReply = () => {
    // Here you would typically send the reply via API
    console.log('Sending reply:', replyMessage, 'to request:', selectedRequest?.id);
    setShowReplyDialog(false);
    setReplyMessage('');
    setSelectedRequest(null);
  };

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
          <div className="p-2 bg-green-600/20 rounded-lg">
            <MessageSquare className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Employee Requests</h1>
            <p className="text-sm text-gray-400">Review and respond to employee requests</p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="px-4 py-4 bg-[#1A1B3E] border-b border-gray-700/50">
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-[#2A2B5E] rounded-lg p-3 text-center">
            <div className="text-yellow-400 text-lg font-bold">{pendingCount}</div>
            <div className="text-gray-400 text-xs">Pending</div>
          </div>
          <div className="bg-[#2A2B5E] rounded-lg p-3 text-center">
            <div className="text-green-400 text-lg font-bold">{approvedCount}</div>
            <div className="text-gray-400 text-xs">Approved</div>
          </div>
          <div className="bg-[#2A2B5E] rounded-lg p-3 text-center">
            <div className="text-red-400 text-lg font-bold">{rejectedCount}</div>
            <div className="text-gray-400 text-xs">Rejected</div>
          </div>
          <div className="bg-[#2A2B5E] rounded-lg p-3 text-center">
            <div className="text-white text-lg font-bold">{mockRequests.length}</div>
            <div className="text-gray-400 text-xs">Total</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 bg-[#1A1B3E] border-b border-gray-700/50">
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#2A2B5E] border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 text-sm"
            />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#2A2B5E] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="in_review">In Review</option>
          </select>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="bg-[#2A2B5E] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Requests List */}
      <div className="flex-1 overflow-y-scroll overflow-x-hidden mobile-content-scroll px-4 pb-20" style={{
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
        touchAction: 'pan-y'
      }}>
        <div className="space-y-3 py-4">
          {filteredRequests.map((request) => {
            const RequestIcon = getRequestTypeIcon(request.requestType);
            return (
              <div
                key={request.id}
                className="bg-[#2A2B5E] rounded-lg p-4 border border-gray-700/50"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-600/20 rounded-lg">
                      <RequestIcon className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{request.employeeName}</h3>
                      <p className="text-sm text-gray-400">{request.employeeCode} • {request.department}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(request.status)}`}>
                      {request.status.replace('_', ' ')}
                    </div>
                    <div className={`text-xs font-medium ${getPriorityColor(request.priority)}`}>
                      {request.priority.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <h4 className="font-medium text-white mb-1">{request.subject}</h4>
                  <p className="text-sm text-gray-400 line-clamp-2">{request.message}</p>
                </div>

                {request.attachments && request.attachments.length > 0 && (
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-2">
                      {request.attachments.map((attachment, index) => (
                        <div key={index} className="bg-[#1A1B3E] px-2 py-1 rounded text-xs text-gray-400">
                          📎 {attachment}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(request.submittedAt).toLocaleString()}</span>
                  </div>
                  
                  {request.status === 'pending' && (
                    <button
                      onClick={() => handleReply(request)}
                      className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 px-3 py-1 rounded-lg text-sm transition-colors"
                    >
                      <Reply className="w-4 h-4" />
                      <span>Reply</span>
                    </button>
                  )}
                </div>

                {request.adminResponse && (
                  <div className="mt-3 p-3 bg-[#1A1B3E] rounded-lg border-l-4 border-blue-500">
                    <div className="flex items-center space-x-2 mb-1">
                      <UserCheck className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium text-blue-400">Admin Response</span>
                    </div>
                    <p className="text-sm text-gray-300">{request.adminResponse}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {request.respondedAt && new Date(request.respondedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Reply Dialog */}
      {showReplyDialog && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#2A2B5E] rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Reply to {selectedRequest.employeeName}</h3>
              <button
                onClick={() => setShowReplyDialog(false)}
                className="text-gray-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-2">Request: {selectedRequest.subject}</p>
              <p className="text-sm text-gray-300 bg-[#1A1B3E] p-3 rounded-lg">
                {selectedRequest.message}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your Response
              </label>
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Type your response here..."
                className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 h-24 resize-none"
              />
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleSendReply}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>Send Reply</span>
              </button>
              <button
                onClick={() => setShowReplyDialog(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileAdminDualNavigation currentPage="communicate" />
    </div>
  );
}