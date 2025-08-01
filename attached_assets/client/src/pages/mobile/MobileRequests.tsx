import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Plus, 
  Clock, 
  Calendar, 
  DollarSign, 
  Home, 
  LogOut,
  ArrowLeft,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Send,
  Filter,
  Search,
  BarChart3,
  TrendingUp,
  Mail,
  Trophy
} from "lucide-react";
import { Link } from "wouter";
import MobileFooter from '@/components/mobile/MobileFooter';
import { getCurrentPKTTime, formatMobileDate } from '@/utils/timezone';

interface EmployeeRequest {
  id: number;
  employeeCode: string;
  requestType: string;
  title: string;
  description: string;
  requestDate: string;
  startDate?: string;
  endDate?: string;
  hours?: number;
  amount?: number;
  currency?: string;
  reason: string;
  status: string;
  priority: string;
  managerNotes?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function MobileRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch user's requests
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['/api/employee-requests'],
    enabled: !!user
  });

  // Request type configurations
  const requestTypes = [
    {
      type: 'overtime',
      title: 'Overtime',
      icon: Clock,
      description: 'Request overtime hours',
      color: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    },
    {
      type: 'leave',
      title: 'Leave',
      icon: Calendar,
      description: 'Request time off',
      color: 'bg-green-500/20 text-green-300 border-green-500/30'
    },
    {
      type: 'reimbursement',
      title: 'Reimbursement',
      icon: DollarSign,
      description: 'Request expense reimbursement',
      color: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    },
    {
      type: 'work_from_home',
      title: 'Work From Home',
      icon: Home,
      description: 'Request remote work',
      color: 'bg-orange-500/20 text-orange-300 border-orange-500/30'
    },
    {
      type: 'early_punchout',
      title: 'Early Punchout',
      icon: LogOut,
      description: 'Request early departure',
      color: 'bg-red-500/20 text-red-300 border-red-500/30'
    },
    {
      type: 'documents',
      title: 'Request Documents',
      icon: FileText,
      description: 'Request official documents',
      color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
    }
  ];

  // Get status color and icon
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', icon: AlertCircle };
      case 'approved':
        return { color: 'bg-green-500/20 text-green-300 border-green-500/30', icon: CheckCircle2 };
      case 'rejected':
        return { color: 'bg-red-500/20 text-red-300 border-red-500/30', icon: XCircle };
      default:
        return { color: 'bg-gray-500/20 text-gray-300 border-gray-500/30', icon: FileText };
    }
  };

  // Filter requests
  const filteredRequests = requests.filter((request: EmployeeRequest) => {
    const matchesSearch = request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || request.status === filterStatus;
    const matchesType = selectedType === "all" || request.requestType === selectedType;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Get request type info
  const getRequestTypeInfo = (type: string) => {
    return requestTypes.find(rt => rt.type === type) || requestTypes[0];
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    return formatMobileDate(dateStr);
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'normal':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'low':
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1B3E] text-white">
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#1A1B3E] border-b border-purple-500/20">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <Link href="/mobile">
              <ArrowLeft className="w-6 h-6 text-purple-400" />
            </Link>
            <h1 className="text-lg font-semibold text-white">My Requests</h1>
          </div>
          <div className="text-sm text-gray-300">
            {getCurrentPKTTime()}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-16 px-4 pb-20">
        {/* Quick Actions */}
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-300 mb-3">New Request</h2>
          <div className="grid grid-cols-2 gap-3">
            {requestTypes.map((type) => {
              const IconComponent = type.icon;
              return (
                <Link key={type.type} href={`/mobile/requests/new/${type.type}`}>
                  <Card className="bg-[#2A2B5E] border-purple-500/20 hover:border-purple-500/40 transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${type.color}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{type.title}</p>
                          <p className="text-xs text-gray-400 truncate">{type.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex space-x-3 mb-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#2A2B5E] border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterStatus(filterStatus === "all" ? "pending" : "all")}
              className="border-purple-500/20 text-purple-400 hover:bg-purple-500/10"
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>

          {/* Status Filter Pills */}
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {['all', 'pending', 'approved', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  filterStatus === status
                    ? 'bg-purple-500 text-white'
                    : 'bg-[#2A2B5E] text-gray-300 hover:bg-purple-500/20'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Request History */}
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-300 mb-3">Request History</h2>
          
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <Card className="bg-[#2A2B5E] border-purple-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-600 rounded-lg"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <Card className="bg-[#2A2B5E] border-purple-500/20">
              <CardContent className="p-8 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-300 mb-2">No requests found</p>
                <p className="text-gray-500 text-sm">
                  {searchTerm || filterStatus !== "all" 
                    ? "Try adjusting your search or filters"
                    : "Create your first request using the options above"
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((request: EmployeeRequest) => {
                const typeInfo = getRequestTypeInfo(request.requestType);
                const statusInfo = getStatusInfo(request.status);
                const StatusIcon = statusInfo.icon;
                const TypeIcon = typeInfo.icon;

                return (
                  <Link key={request.id} href={`/mobile/requests/${request.id}`}>
                    <Card className="bg-[#2A2B5E] border-purple-500/20 hover:border-purple-500/40 transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                            <TypeIcon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="text-sm font-medium text-white truncate">
                                {request.title}
                              </h3>
                              <Badge className={`text-xs ${statusInfo.color}`}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {request.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                              {request.description}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">
                                {formatDate(request.createdAt)}
                              </span>
                              <div className="flex items-center space-x-2">
                                {request.priority !== 'normal' && (
                                  <Badge className={`text-xs ${getPriorityColor(request.priority)}`}>
                                    {request.priority}
                                  </Badge>
                                )}
                                {request.hours && (
                                  <span className="text-xs text-purple-400">
                                    {request.hours}h
                                  </span>
                                )}
                                {request.amount && (
                                  <span className="text-xs text-green-400">
                                    {request.currency} {request.amount}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <MobileFooter currentPage="communicate" />
    </div>
  );
}