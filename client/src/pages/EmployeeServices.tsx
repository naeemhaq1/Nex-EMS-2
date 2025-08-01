import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  FileText, 
  AlertCircle, 
  CheckCircle,
  PlusCircle,
  Home,
  GraduationCap,
  Users,
  Settings,
  MessageCircle
} from 'lucide-react';

// Service categories with icons and descriptions
const serviceCategories = [
  {
    id: 'leave',
    title: 'Leave Management',
    icon: Calendar,
    description: 'Request leave, report late arrivals, track balances',
    color: 'bg-blue-500',
    services: [
      { id: 'late-arrival', name: 'Report Late Arrival', urgent: false },
      { id: 'half-day', name: 'Request Half Day Leave', urgent: false },
      { id: 'full-day', name: 'Request Full Day Leave', urgent: false },
      { id: 'multi-day', name: 'Request Multiple Days Leave', urgent: false }
    ]
  },
  {
    id: 'reimbursement',
    title: 'Reimbursements',
    icon: DollarSign,
    description: 'Submit expense claims, track reimbursement status',
    color: 'bg-green-500',
    services: [
      { id: 'travel', name: 'Travel Expenses', urgent: false },
      { id: 'medical', name: 'Medical Expenses', urgent: true },
      { id: 'food', name: 'Food & Accommodation', urgent: false },
      { id: 'training', name: 'Training Expenses', urgent: false }
    ]
  },
  {
    id: 'overtime',
    title: 'Overtime & Shifts',
    icon: Clock,
    description: 'Request overtime, change shifts, schedule adjustments',
    color: 'bg-purple-500',
    services: [
      { id: 'overtime', name: 'Request Overtime', urgent: false },
      { id: 'shift-change', name: 'Request Shift Change', urgent: false },
      { id: 'shift-swap', name: 'Swap Shifts with Colleague', urgent: false }
    ]
  },
  {
    id: 'wfh',
    title: 'Work From Home',
    icon: Home,
    description: 'Request remote work, manage WFH schedules',
    color: 'bg-indigo-500',
    services: [
      { id: 'wfh-single', name: 'Single Day WFH', urgent: false },
      { id: 'wfh-multi', name: 'Multiple Days WFH', urgent: false }
    ]
  },
  {
    id: 'training',
    title: 'Training & Development',
    icon: GraduationCap,
    description: 'Request training courses, skill development',
    color: 'bg-orange-500',
    services: [
      { id: 'training-external', name: 'External Training Course', urgent: false },
      { id: 'training-internal', name: 'Internal Training Program', urgent: false },
      { id: 'certification', name: 'Certification Program', urgent: false }
    ]
  },
  {
    id: 'documents',
    title: 'Document Services',
    icon: FileText,
    description: 'Request certificates, letters, official documents',
    color: 'bg-cyan-500',
    services: [
      { id: 'salary-cert', name: 'Salary Certificate', urgent: true },
      { id: 'employment-letter', name: 'Employment Letter', urgent: true },
      { id: 'experience-cert', name: 'Experience Certificate', urgent: false },
      { id: 'no-objection', name: 'No Objection Certificate', urgent: false }
    ]
  },
  {
    id: 'grievance',
    title: 'Grievances & Complaints',
    icon: MessageCircle,
    description: 'Report issues, file complaints, seek resolution',
    color: 'bg-red-500',
    services: [
      { id: 'workplace-issue', name: 'Workplace Issue', urgent: true },
      { id: 'harassment', name: 'Harassment Report', urgent: true },
      { id: 'safety-concern', name: 'Safety Concern', urgent: true },
      { id: 'general-complaint', name: 'General Complaint', urgent: false }
    ]
  }
];

// Recent requests mock data
const recentRequests = [
  {
    id: 1,
    type: 'Leave Request',
    title: 'Annual Leave - July 20-22',
    status: 'pending',
    submittedAt: '2025-07-13T10:30:00Z',
    category: 'leave'
  },
  {
    id: 2,
    type: 'Reimbursement',
    title: 'Travel Expenses - Client Visit',
    status: 'approved',
    submittedAt: '2025-07-12T14:15:00Z',
    category: 'reimbursement'
  },
  {
    id: 3,
    type: 'Document Request',
    title: 'Salary Certificate',
    status: 'ready',
    submittedAt: '2025-07-11T09:00:00Z',
    category: 'documents'
  }
];

const EmployeeServices: React.FC = () => {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'approved': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      case 'ready': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const handleServiceRequest = (serviceId: string) => {
    setSelectedService(serviceId);
    setIsDialogOpen(true);
  };

  const handleSubmitRequest = () => {
    toast({
      title: "Request Submitted",
      description: "Your request has been submitted successfully and is pending approval.",
    });
    setIsDialogOpen(false);
    setSelectedService(null);
  };

  return (
    <div className="min-h-screen bg-[#1A1B3E] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Employee Self-Service</h1>
          <p className="text-gray-300">Access all HR services and track your requests in one place</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-[#2A2B5E] border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Pending Requests</p>
                  <p className="text-2xl font-bold text-white">3</p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#2A2B5E] border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Leave Balance</p>
                  <p className="text-2xl font-bold text-white">18 days</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#2A2B5E] border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">This Month</p>
                  <p className="text-2xl font-bold text-white">7 requests</p>
                </div>
                <FileText className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#2A2B5E] border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Approved</p>
                  <p className="text-2xl font-bold text-white">85%</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Service Categories */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-white mb-4">Available Services</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {serviceCategories.map((category) => {
                const IconComponent = category.icon;
                return (
                  <Card key={category.id} className="bg-[#2A2B5E] border-purple-500/30 hover:border-purple-500/50 transition-all">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${category.color}`}>
                          <IconComponent className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-white text-lg">{category.title}</CardTitle>
                          <p className="text-sm text-gray-400">{category.description}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {category.services.map((service) => (
                          <Button
                            key={service.id}
                            variant="ghost"
                            className="w-full justify-start h-auto p-3 hover:bg-purple-500/10 text-gray-300 hover:text-white"
                            onClick={() => handleServiceRequest(service.id)}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-sm">{service.name}</span>
                              {service.urgent && (
                                <Badge className="bg-red-500 text-white text-xs">Urgent</Badge>
                              )}
                            </div>
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Recent Requests */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Recent Requests</h2>
            <div className="space-y-4">
              {recentRequests.map((request) => (
                <Card key={request.id} className="bg-[#2A2B5E] border-purple-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm text-gray-400">{request.type}</p>
                        <p className="text-white font-medium">{request.title}</p>
                      </div>
                      <Badge className={`${getStatusColor(request.status)} text-white`}>
                        {request.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(request.submittedAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
              
              <Button 
                variant="outline" 
                className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
              >
                View All Requests
              </Button>
            </div>
          </div>
        </div>

        {/* Service Request Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-[#2A2B5E] border-purple-500/30 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Submit Service Request</DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-[#1A1B3E]">
                <TabsTrigger value="details">Request Details</TabsTrigger>
                <TabsTrigger value="attachments">Attachments</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="request-type">Request Type</Label>
                    <Select>
                      <SelectTrigger className="bg-[#1A1B3E] border-purple-500/30">
                        <SelectValue placeholder="Select request type" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1B3E] border-purple-500/30">
                        <SelectItem value="leave">Leave Request</SelectItem>
                        <SelectItem value="reimbursement">Reimbursement</SelectItem>
                        <SelectItem value="overtime">Overtime</SelectItem>
                        <SelectItem value="document">Document Request</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select>
                      <SelectTrigger className="bg-[#1A1B3E] border-purple-500/30">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1B3E] border-purple-500/30">
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="title">Request Title</Label>
                  <Input 
                    id="title"
                    placeholder="Enter request title"
                    className="bg-[#1A1B3E] border-purple-500/30"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description"
                    placeholder="Provide detailed description..."
                    className="bg-[#1A1B3E] border-purple-500/30 h-24"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input 
                      id="start-date"
                      type="date"
                      className="bg-[#1A1B3E] border-purple-500/30"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="end-date">End Date</Label>
                    <Input 
                      id="end-date"
                      type="date"
                      className="bg-[#1A1B3E] border-purple-500/30"
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="attachments" className="space-y-4">
                <div className="border-2 border-dashed border-purple-500/30 rounded-lg p-8 text-center">
                  <FileText className="h-12 w-12 text-purple-500 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">Drag and drop files here or click to browse</p>
                  <p className="text-sm text-gray-500">Support for receipts, medical certificates, and other documents</p>
                  <Button className="mt-4 bg-purple-500 hover:bg-purple-600">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Files
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitRequest}
                className="bg-green-600 hover:bg-green-700"
              >
                Submit Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default EmployeeServices;