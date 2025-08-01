import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Mail, 
  Phone, 
  MessageSquare, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Filter,
  Search,
  Send,
  Users,
  Bell,
  Clock,
  BarChart3
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Checkbox } from '@/components/ui/checkbox';

interface NotificationRecipient {
  id: number;
  recipientType: 'email' | 'mobile' | 'whatsapp';
  recipientValue: string;
  recipientName?: string;
  department?: string;
  role?: string;
  isActive: boolean;
  isVerified: boolean;
  verifiedAt?: Date;
  alertTypes?: string[];
  severityLevels?: string[];
  notificationMethods?: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface NotificationStats {
  totalSent: number;
  totalFailed: number;
  totalDelivered: number;
  byMethod: Record<string, number>;
  byStatus: Record<string, number>;
}

const NotificationManagement: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState('recipients');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<NotificationRecipient | null>(null);
  const [testMessage, setTestMessage] = useState('');
  const [testRecipient, setTestRecipient] = useState('');
  const [testType, setTestType] = useState<'email' | 'mobile' | 'whatsapp'>('email');

  const queryClient = useQueryClient();

  // Query for recipients
  const { data: recipients = [], isLoading: recipientsLoading } = useQuery({
    queryKey: ['notification-recipients'],
    queryFn: async () => {
      const response = await apiRequest('/api/notification-management/recipients');
      return response.json();
    }
  });

  // Query for service status
  const { data: serviceStatus } = useQuery({
    queryKey: ['notification-service-status'],
    queryFn: async () => {
      const response = await apiRequest('/api/notification-management/service/status');
      return response.json();
    }
  });

  // Query for delivery stats
  const { data: deliveryStats } = useQuery({
    queryKey: ['notification-delivery-stats'],
    queryFn: async () => {
      const response = await apiRequest('/api/notification-management/stats');
      return response.json();
    }
  });

  // Add recipient mutation
  const addRecipientMutation = useMutation({
    mutationFn: async (recipientData: Omit<NotificationRecipient, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await apiRequest('/api/notification-management/recipients', {
        method: 'POST',
        body: JSON.stringify(recipientData)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-recipients'] });
      setIsAddDialogOpen(false);
    }
  });

  // Update recipient mutation
  const updateRecipientMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<NotificationRecipient>) => {
      const response = await apiRequest(`/api/notification-management/recipients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-recipients'] });
      setIsEditDialogOpen(false);
    }
  });

  // Delete recipient mutation
  const deleteRecipientMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/notification-management/recipients/${id}`, {
        method: 'DELETE'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-recipients'] });
    }
  });

  // Verify recipient mutation
  const verifyRecipientMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/notification-management/recipients/${id}/verify`, {
        method: 'POST'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-recipients'] });
    }
  });

  // Test notification mutation
  const testNotificationMutation = useMutation({
    mutationFn: async (testData: { recipientType: string; recipientValue: string; message: string }) => {
      const response = await apiRequest('/api/notification-management/test', {
        method: 'POST',
        body: JSON.stringify(testData)
      });
      return response.json();
    }
  });

  // Filter recipients
  const filteredRecipients = recipients.filter((recipient: NotificationRecipient) => {
    const matchesSearch = !searchTerm || 
      recipient.recipientValue.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipient.recipientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipient.department?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || recipient.recipientType === filterType;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && recipient.isActive) ||
      (filterStatus === 'inactive' && !recipient.isActive) ||
      (filterStatus === 'verified' && recipient.isVerified) ||
      (filterStatus === 'unverified' && !recipient.isVerified);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getRecipientIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'mobile': return <Phone className="w-4 h-4" />;
      case 'whatsapp': return <MessageSquare className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getStatusColor = (recipient: NotificationRecipient) => {
    if (!recipient.isActive) return 'bg-gray-500';
    if (recipient.isVerified) return 'bg-green-500';
    return 'bg-yellow-500';
  };

  const getStatusText = (recipient: NotificationRecipient) => {
    if (!recipient.isActive) return 'Inactive';
    if (recipient.isVerified) return 'Verified';
    return 'Unverified';
  };

  const RecipientForm = ({ recipient, onSubmit }: { recipient?: NotificationRecipient; onSubmit: (data: any) => void }) => {
    const [formData, setFormData] = useState({
      recipientType: recipient?.recipientType || 'email',
      recipientValue: recipient?.recipientValue || '',
      recipientName: recipient?.recipientName || '',
      department: recipient?.department || '',
      role: recipient?.role || '',
      isActive: recipient?.isActive ?? true,
      alertTypes: recipient?.alertTypes || [],
      severityLevels: recipient?.severityLevels || [],
      notificationMethods: recipient?.notificationMethods || ['email']
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="recipientType">Recipient Type</Label>
            <Select value={formData.recipientType} onValueChange={(value: any) => setFormData(prev => ({ ...prev, recipientType: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="recipientValue">
              {formData.recipientType === 'email' ? 'Email Address' : 'Phone Number'}
            </Label>
            <Input
              id="recipientValue"
              type={formData.recipientType === 'email' ? 'email' : 'tel'}
              value={formData.recipientValue}
              onChange={(e) => setFormData(prev => ({ ...prev, recipientValue: e.target.value }))}
              placeholder={formData.recipientType === 'email' ? 'user@example.com' : '+923008463660'}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="recipientName">Display Name</Label>
            <Input
              id="recipientName"
              value={formData.recipientName}
              onChange={(e) => setFormData(prev => ({ ...prev, recipientName: e.target.value }))}
              placeholder="John Doe"
            />
          </div>

          <div>
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              value={formData.department}
              onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
              placeholder="IT Department"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="role">Role</Label>
          <Input
            id="role"
            value={formData.role}
            onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
            placeholder="System Administrator"
          />
        </div>

        <div>
          <Label>Alert Types</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {['service_failure', 'performance_issue', 'security_alert', 'system_maintenance'].map(type => (
              <label key={type} className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.alertTypes.includes(type)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setFormData(prev => ({ ...prev, alertTypes: [...prev.alertTypes, type] }));
                    } else {
                      setFormData(prev => ({ ...prev, alertTypes: prev.alertTypes.filter(t => t !== type) }));
                    }
                  }}
                />
                <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label>Severity Levels</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {['critical', 'high', 'medium', 'low', 'info'].map(level => (
              <label key={level} className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.severityLevels.includes(level)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setFormData(prev => ({ ...prev, severityLevels: [...prev.severityLevels, level] }));
                    } else {
                      setFormData(prev => ({ ...prev, severityLevels: prev.severityLevels.filter(l => l !== level) }));
                    }
                  }}
                />
                <span className="text-sm capitalize">{level}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label>Notification Methods</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {['email', 'sms', 'whatsapp'].map(method => (
              <label key={method} className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.notificationMethods.includes(method)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setFormData(prev => ({ ...prev, notificationMethods: [...prev.notificationMethods, method] }));
                    } else {
                      setFormData(prev => ({ ...prev, notificationMethods: prev.notificationMethods.filter(m => m !== method) }));
                    }
                  }}
                />
                <span className="text-sm capitalize">{method}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
          />
          <Label>Active</Label>
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={() => recipient ? setIsEditDialogOpen(false) : setIsAddDialogOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={addRecipientMutation.isPending || updateRecipientMutation.isPending}>
            {recipient ? 'Update' : 'Add'} Recipient
          </Button>
        </div>
      </form>
    );
  };

  return (
    <div className="p-6 bg-[#1A1B3E] min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Notification Management</h1>
            <p className="text-gray-400 mt-1">Manage email addresses and mobile numbers for system alerts</p>
          </div>
          <div className="flex space-x-2">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Recipient
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#2A2B5E] text-white max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Recipient</DialogTitle>
                </DialogHeader>
                <RecipientForm onSubmit={(data) => addRecipientMutation.mutate(data)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Service Status */}
        {serviceStatus && (
          <Card className="bg-[#2A2B5E] border-gray-700 mb-6">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bell className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-semibold text-white">Notification Service Status</h3>
                </div>
                <Badge className={serviceStatus.isRunning ? 'bg-green-600' : 'bg-red-600'}>
                  {serviceStatus.isRunning ? 'Running' : 'Stopped'}
                </Badge>
              </div>
              <p className="text-gray-400 mt-2">
                Last activity: {serviceStatus.lastActivity}
              </p>
            </div>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-[#2A2B5E]">
            <TabsTrigger value="recipients" className="data-[state=active]:bg-blue-600">
              <Users className="w-4 h-4 mr-2" />
              Recipients
            </TabsTrigger>
            <TabsTrigger value="test" className="data-[state=active]:bg-blue-600">
              <Send className="w-4 h-4 mr-2" />
              Test Notifications
            </TabsTrigger>
            <TabsTrigger value="stats" className="data-[state=active]:bg-blue-600">
              <BarChart3 className="w-4 h-4 mr-2" />
              Statistics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recipients" className="space-y-4">
            {/* Filters */}
            <Card className="bg-[#2A2B5E] border-gray-700">
              <div className="p-4">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex-1 min-w-64">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search recipients..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-[#1A1B3E] border-gray-600"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-32 bg-[#1A1B3E] border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="mobile">Mobile</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-32 bg-[#1A1B3E] border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="verified">Verified</SelectItem>
                        <SelectItem value="unverified">Unverified</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </Card>

            {/* Recipients List */}
            <div className="grid gap-4">
              {filteredRecipients.map((recipient: NotificationRecipient) => (
                <Card key={recipient.id} className="bg-[#2A2B5E] border-gray-700">
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-600 rounded-lg">
                          {getRecipientIcon(recipient.recipientType)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">
                            {recipient.recipientName || recipient.recipientValue}
                          </h3>
                          <p className="text-gray-400 text-sm">{recipient.recipientValue}</p>
                          {recipient.department && (
                            <p className="text-blue-400 text-sm">{recipient.department}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(recipient)}>
                          {getStatusText(recipient)}
                        </Badge>
                        <div className="flex space-x-1">
                          {!recipient.isVerified && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => verifyRecipientMutation.mutate(recipient.id)}
                              disabled={verifyRecipientMutation.isPending}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRecipient(recipient);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteRecipientMutation.mutate(recipient.id)}
                            disabled={deleteRecipientMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {recipient.alertTypes?.map(type => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {type.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {filteredRecipients.length === 0 && (
              <Card className="bg-[#2A2B5E] border-gray-700">
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">No recipients found matching your criteria</p>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="test" className="space-y-4">
            <Card className="bg-[#2A2B5E] border-gray-700">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Test Notification</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="testType">Notification Type</Label>
                      <Select value={testType} onValueChange={(value: any) => setTestType(value)}>
                        <SelectTrigger className="bg-[#1A1B3E] border-gray-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="mobile">SMS</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="testRecipient">
                        {testType === 'email' ? 'Email Address' : 'Phone Number'}
                      </Label>
                      <Input
                        id="testRecipient"
                        value={testRecipient}
                        onChange={(e) => setTestRecipient(e.target.value)}
                        placeholder={testType === 'email' ? 'user@example.com' : '+923008463660'}
                        className="bg-[#1A1B3E] border-gray-600"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="testMessage">Test Message</Label>
                    <Textarea
                      id="testMessage"
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      placeholder="Enter your test message here..."
                      className="bg-[#1A1B3E] border-gray-600"
                      rows={4}
                    />
                  </div>
                  <Button
                    onClick={() => testNotificationMutation.mutate({
                      recipientType: testType,
                      recipientValue: testRecipient,
                      message: testMessage
                    })}
                    disabled={testNotificationMutation.isPending || !testRecipient || !testMessage}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Test Notification
                  </Button>
                </div>
                {testNotificationMutation.isSuccess && (
                  <Alert className="mt-4">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Test notification sent successfully!
                    </AlertDescription>
                  </Alert>
                )}
                {testNotificationMutation.isError && (
                  <Alert className="mt-4" variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      Failed to send test notification. Please try again.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            {deliveryStats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-[#2A2B5E] border-gray-700">
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Total Sent</p>
                        <p className="text-2xl font-bold text-white">{deliveryStats.totalSent}</p>
                      </div>
                      <Send className="w-8 h-8 text-blue-400" />
                    </div>
                  </div>
                </Card>
                <Card className="bg-[#2A2B5E] border-gray-700">
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Total Delivered</p>
                        <p className="text-2xl font-bold text-green-400">{deliveryStats.totalDelivered}</p>
                      </div>
                      <CheckCircle className="w-8 h-8 text-green-400" />
                    </div>
                  </div>
                </Card>
                <Card className="bg-[#2A2B5E] border-gray-700">
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Total Failed</p>
                        <p className="text-2xl font-bold text-red-400">{deliveryStats.totalFailed}</p>
                      </div>
                      <XCircle className="w-8 h-8 text-red-400" />
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-[#2A2B5E] text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Recipient</DialogTitle>
            </DialogHeader>
            {selectedRecipient && (
              <RecipientForm
                recipient={selectedRecipient}
                onSubmit={(data) => updateRecipientMutation.mutate({ id: selectedRecipient.id, ...data })}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default NotificationManagement;