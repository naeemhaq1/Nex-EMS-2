import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Edit2, Trash2, Play, Pause, Clock, MessageCircle, Bell, Settings, Eye, Calendar, Send, ToggleLeft, ToggleRight, Search, Filter, Download, Upload } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface Announcement {
  id: number;
  title: string;
  content: string;
  type: 'general' | 'urgent' | 'maintenance' | 'event' | 'policy';
  status: 'active' | 'inactive' | 'scheduled' | 'draft';
  priority: 'low' | 'medium' | 'high' | 'critical';
  scheduledAt?: string;
  expiresAt?: string;
  whatsappEnabled: boolean;
  appEnabled: boolean;
  createdAt: string;
  createdBy: string;
  viewCount: number;
  targetType: 'all' | 'individuals' | 'groups' | 'departments';
  targetIds: string[];
  targetNames: string[];
}

export default function DesktopAdminAnnouncements() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'current' | 'scheduled' | 'auto' | 'queue' | 'settings'>('current');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const queryClient = useQueryClient();

  // Quick announcement state
  const [quickMessage, setQuickMessage] = useState('');
  const [quickDuration, setQuickDuration] = useState(60);
  const [quickDurationType, setQuickDurationType] = useState<'minutes' | 'hours' | 'days'>('minutes');
  const [quickPriority, setQuickPriority] = useState<'medium' | 'high' | 'critical'>('medium');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [targetType, setTargetType] = useState<'all' | 'departments'>('all');
  const [showTemplates, setShowTemplates] = useState(false);

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['/api/announcements'],
    enabled: !!user
  });

  const { data: autoSettings } = useQuery({
    queryKey: ['/api/announcements/settings'],
    enabled: !!user
  });

  const { data: departments } = useQuery({
    queryKey: ['/api/announcements/departments'],
    enabled: !!user
  });

  const { data: templates } = useQuery({
    queryKey: ['/api/announcements/templates'],
    enabled: !!user
  });

  const { data: missingDepartments } = useQuery({
    queryKey: ['/api/announcements/employees/missing-departments'],
    enabled: !!user && user.role === 'superadmin'
  });

  const { data: queueData } = useQuery({
    queryKey: ['/api/announcements/queue'],
    enabled: !!user
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/announcements', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
      setShowCreateModal(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest(`/api/announcements/${id}`, { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
      setShowEditModal(false);
      setSelectedAnnouncement(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/announcements/${id}`, { 
      method: 'DELETE' 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => apiRequest(`/api/announcements/${id}/status`, { 
      method: 'PATCH', 
      body: JSON.stringify({ status }) 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
    }
  });

  // Quick announcement mutation
  const quickAnnounceMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/announcements', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
      setQuickMessage('');
      setQuickDuration(60);
      setQuickDurationType('minutes');
      setQuickPriority('medium');
      setSelectedDepartments([]);
      setTargetType('all');
    }
  });

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/announcements/templates', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/announcements/templates'] });
    }
  });

  // Use template mutation
  const useTemplateMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/announcements/templates/${id}/use`, { 
      method: 'POST' 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/announcements/templates'] });
    }
  });

  const handleUseTemplate = (template: any) => {
    setQuickMessage(template.message);
    setQuickPriority(template.priority === 'emergency' ? 'critical' : template.priority === 'high' ? 'high' : 'medium');
    setTargetType(template.targetType || 'all');
    setSelectedDepartments(template.targetDepartments || []);
    setShowTemplates(false);
    useTemplateMutation.mutate(template.id);
  };

  const handleDepartmentToggle = (dept: string) => {
    setSelectedDepartments(prev => 
      prev.includes(dept) 
        ? prev.filter(d => d !== dept)
        : [...prev, dept]
    );
  };

  const handleQuickAnnounce = () => {
    if (!quickMessage.trim()) return;
    
    const now = new Date();
    const expiresAt = new Date(now);
    
    switch (quickDurationType) {
      case 'minutes':
        expiresAt.setMinutes(now.getMinutes() + quickDuration);
        break;
      case 'hours':
        expiresAt.setHours(now.getHours() + quickDuration);
        break;
      case 'days':
        expiresAt.setDate(now.getDate() + quickDuration);
        break;
    }

    // Save as template first if it's a new message
    if (quickMessage.trim() && templates && !templates.some((t: any) => t.message === quickMessage)) {
      saveTemplateMutation.mutate({
        title: `Quick Announcement - ${quickPriority.charAt(0).toUpperCase() + quickPriority.slice(1)} Priority`,
        message: quickMessage,
        type: 'general',
        priority: quickPriority === 'critical' ? 'emergency' : quickPriority === 'high' ? 'high' : 'normal',
        targetType,
        targetDepartments: targetType === 'departments' ? selectedDepartments : []
      });
    }

    quickAnnounceMutation.mutate({
      title: `Quick Announcement - ${quickPriority.charAt(0).toUpperCase() + quickPriority.slice(1)} Priority`,
      message: quickMessage,
      type: 'general',
      priority: quickPriority === 'critical' ? 'emergency' : quickPriority === 'high' ? 'high' : 'normal',
      expiresAt: expiresAt.toISOString(),
      targetType,
      targetDepartments: targetType === 'departments' ? selectedDepartments : [],
      targetIds: [],
      isActive: true,
      isAutoGenerated: false
    });
  };

  const filteredAnnouncements = announcements?.filter((a: Announcement) => {
    const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         a.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || a.type === filterType;
    const matchesStatus = filterStatus === 'all' || a.status === filterStatus;
    
    if (activeTab === 'current') return a.status === 'active' && matchesSearch && matchesType && matchesStatus;
    if (activeTab === 'scheduled') return a.status === 'scheduled' && matchesSearch && matchesType && matchesStatus;
    return matchesSearch && matchesType && matchesStatus;
  }) || [];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'urgent': return 'bg-red-500';
      case 'maintenance': return 'bg-orange-500';
      case 'event': return 'bg-green-500';
      case 'policy': return 'bg-purple-500';
      default: return 'bg-blue-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-400 bg-red-900/20';
      case 'high': return 'text-orange-400 bg-orange-900/20';
      case 'medium': return 'text-yellow-400 bg-yellow-900/20';
      default: return 'text-green-400 bg-green-900/20';
    }
  };

  const CreateAnnouncementModal = () => {
    const [formData, setFormData] = useState({
      title: '',
      content: '',
      type: 'general',
      priority: 'medium',
      scheduledAt: '',
      expiresAt: '',
      whatsappEnabled: true,
      appEnabled: true,
      targetType: 'all',
      targetIds: [],
      selectedEmployees: [],
      selectedDepartments: [],
      selectedGroups: []
    });

    const { data: employees } = useQuery({
      queryKey: ['/api/employees'],
      enabled: formData.targetType === 'individuals'
    });

    const { data: departments } = useQuery({
      queryKey: ['/api/departments'],
      enabled: formData.targetType === 'departments'
    });

    const { data: groups } = useQuery({
      queryKey: ['/api/groups'],
      enabled: formData.targetType === 'groups'
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      let targetIds = [];
      let targetNames = [];
      
      if (formData.targetType === 'individuals') {
        targetIds = formData.selectedEmployees;
        targetNames = employees?.filter((emp: any) => formData.selectedEmployees.includes(emp.id))
          .map((emp: any) => `${emp.firstName} ${emp.lastName}`) || [];
      } else if (formData.targetType === 'departments') {
        targetIds = formData.selectedDepartments;
        targetNames = departments?.filter((dept: any) => formData.selectedDepartments.includes(dept.id))
          .map((dept: any) => dept.name) || [];
      } else if (formData.targetType === 'groups') {
        targetIds = formData.selectedGroups;
        targetNames = groups?.filter((group: any) => formData.selectedGroups.includes(group.id))
          .map((group: any) => group.name) || [];
      }
      
      const data = {
        ...formData,
        status: formData.scheduledAt ? 'scheduled' : 'active',
        scheduledAt: formData.scheduledAt || null,
        expiresAt: formData.expiresAt || null,
        targetType: formData.targetType,
        targetIds,
        targetNames
      };
      createMutation.mutate(data);
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-[#2A2B5E] rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Create New Announcement</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-[#1A1B3E] border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-3 bg-[#1A1B3E] border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="general">General</option>
                  <option value="urgent">Urgent</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="event">Event</option>
                  <option value="policy">Policy</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-4 py-3 bg-[#1A1B3E] border border-gray-600 rounded-lg text-white h-32 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            
            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-4 py-3 bg-[#1A1B3E] border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Schedule (Optional)</label>
                <input
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                  className="w-full px-4 py-3 bg-[#1A1B3E] border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Expires At (Optional)</label>
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="w-full px-4 py-3 bg-[#1A1B3E] border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Send To</label>
              <select
                value={formData.targetType}
                onChange={(e) => setFormData({ ...formData, targetType: e.target.value, targetIds: [], selectedEmployees: [], selectedDepartments: [], selectedGroups: [] })}
                className="w-full px-4 py-3 bg-[#1A1B3E] border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All Employees</option>
                <option value="individuals">Specific Individuals</option>
                <option value="departments">Departments</option>
                <option value="groups">Groups</option>
              </select>
            </div>
            
            {formData.targetType === 'individuals' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Select Employees</label>
                <div className="max-h-48 overflow-y-auto border border-gray-600 rounded-lg bg-[#1A1B3E] p-4">
                  <div className="space-y-2">
                    {employees?.map((emp: any) => (
                      <label key={emp.id} className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={formData.selectedEmployees.includes(emp.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                selectedEmployees: [...formData.selectedEmployees, emp.id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                selectedEmployees: formData.selectedEmployees.filter(id => id !== emp.id)
                              });
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-white">{emp.firstName} {emp.lastName}</span>
                        <span className="text-gray-400 text-sm">({emp.department || 'No Department'})</span>
                      </label>
                    ))}
                  </div>
                </div>
                {formData.selectedEmployees.length > 0 && (
                  <p className="text-sm text-blue-400 mt-2">{formData.selectedEmployees.length} employees selected</p>
                )}
              </div>
            )}
            
            {formData.targetType === 'departments' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Select Departments</label>
                <div className="max-h-48 overflow-y-auto border border-gray-600 rounded-lg bg-[#1A1B3E] p-4">
                  <div className="space-y-2">
                    {departments?.map((dept: any) => (
                      <label key={dept.id} className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={formData.selectedDepartments.includes(dept.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                selectedDepartments: [...formData.selectedDepartments, dept.id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                selectedDepartments: formData.selectedDepartments.filter(id => id !== dept.id)
                              });
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-white">{dept.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {formData.selectedDepartments.length > 0 && (
                  <p className="text-sm text-blue-400 mt-2">{formData.selectedDepartments.length} departments selected</p>
                )}
              </div>
            )}
            
            {formData.targetType === 'groups' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Select Groups</label>
                <div className="max-h-48 overflow-y-auto border border-gray-600 rounded-lg bg-[#1A1B3E] p-4">
                  <div className="space-y-2">
                    {groups?.map((group: any) => (
                      <label key={group.id} className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={formData.selectedGroups.includes(group.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                selectedGroups: [...formData.selectedGroups, group.id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                selectedGroups: formData.selectedGroups.filter(id => id !== group.id)
                              });
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-white">{group.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {formData.selectedGroups.length > 0 && (
                  <p className="text-sm text-blue-400 mt-2">{formData.selectedGroups.length} groups selected</p>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#1A1B3E] rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-white">App Notifications</h4>
                    <p className="text-xs text-gray-400">Send to mobile and desktop app</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, appEnabled: !formData.appEnabled })}
                    className={`p-1 ${formData.appEnabled ? 'text-blue-400' : 'text-gray-500'}`}
                  >
                    {formData.appEnabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#1A1B3E] rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-white">WhatsApp Notifications</h4>
                    <p className="text-xs text-gray-400">Send via WhatsApp service</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, whatsappEnabled: !formData.whatsappEnabled })}
                    className={`p-1 ${formData.whatsappEnabled ? 'text-green-400' : 'text-gray-500'}`}
                  >
                    {formData.whatsappEnabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-4 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {createMutation.isPending ? 'Creating...' : formData.scheduledAt ? 'Schedule' : 'Publish'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#1A1B3E] text-white">
      {/* Header */}
      <div className="bg-[#2A2B5E] border-b border-gray-800">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Announcement Management</h1>
                <p className="text-gray-400">Create, schedule, and manage company-wide announcements</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
              <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center space-x-2">
                <Upload className="w-4 h-4" />
                <span>Import</span>
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>New Announcement</span>
              </button>
            </div>
          </div>
          
          {/* Search and Filters */}
          <div className="mt-6 flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search announcements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#1A1B3E] border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 bg-[#1A1B3E] border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="general">General</option>
              <option value="urgent">Urgent</option>
              <option value="maintenance">Maintenance</option>
              <option value="event">Event</option>
              <option value="policy">Policy</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-[#1A1B3E] border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="inactive">Inactive</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quick Announcement Section */}
      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-b border-gray-800">
        <div className="px-8 py-6">
          <div className="bg-[#2A2B5E] rounded-lg p-6 border border-purple-500/30">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <Send className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Quick Announcement</h3>
                <p className="text-gray-400 text-sm">Send instant announcement to all employees</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Message Input */}
              <div className="lg:col-span-2">
                <div className="relative">
                  <textarea
                    value={quickMessage}
                    onChange={(e) => setQuickMessage(e.target.value)}
                    placeholder="Type your announcement message here..."
                    className="w-full h-20 px-4 py-3 bg-[#1A1B3E] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none resize-none"
                    maxLength={500}
                  />
                  {templates && templates.length > 0 && (
                    <button
                      onClick={() => setShowTemplates(!showTemplates)}
                      className="absolute top-2 right-2 px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                    >
                      Templates
                    </button>
                  )}
                </div>
                
                {/* Template dropdown */}
                {showTemplates && templates && templates.length > 0 && (
                  <div className="mt-2 bg-[#1A1B3E] border border-gray-600 rounded-lg max-h-40 overflow-y-auto">
                    <div className="p-2 border-b border-gray-600">
                      <span className="text-xs text-gray-400">Recent Templates</span>
                    </div>
                    {templates.slice(0, 10).map((template: any) => (
                      <button
                        key={template.id}
                        onClick={() => handleUseTemplate(template)}
                        className="w-full text-left p-2 hover:bg-gray-700 border-b border-gray-700 last:border-b-0"
                      >
                        <div className="text-sm text-white truncate">{template.message}</div>
                        <div className="text-xs text-gray-400">
                          Used {template.usageCount} times • {template.priority} priority
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Target Selection */}
                <div className="mt-3 space-y-2">
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="targetType"
                        value="all"
                        checked={targetType === 'all'}
                        onChange={(e) => setTargetType(e.target.value as 'all' | 'departments')}
                        className="text-purple-500"
                      />
                      <span className="text-sm text-gray-300">All Employees</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="targetType"
                        value="departments"
                        checked={targetType === 'departments'}
                        onChange={(e) => setTargetType(e.target.value as 'all' | 'departments')}
                        className="text-purple-500"
                      />
                      <span className="text-sm text-gray-300">Specific Departments</span>
                    </label>
                  </div>
                  
                  {targetType === 'departments' && departments && (
                    <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto bg-[#1A1B3E] border border-gray-600 rounded p-2">
                      {departments.map((dept: any) => (
                        <label key={dept.name} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedDepartments.includes(dept.name)}
                            onChange={() => handleDepartmentToggle(dept.name)}
                            className="text-purple-500"
                          />
                          <span className="text-xs text-gray-300">{dept.name} ({dept.employeecount})</span>
                        </label>
                      ))}
                    </div>
                  )}
                  
                  {missingDepartments && missingDepartments.count > 0 && (
                    <div className="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded p-2">
                      ⚠️ {missingDepartments.count} employees have no department assigned
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-400">{quickMessage.length}/500 characters</span>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <MessageCircle className="w-4 h-4 text-green-400" />
                      <span className="text-xs text-green-400">WhatsApp</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Bell className="w-4 h-4 text-blue-400" />
                      <span className="text-xs text-blue-400">App</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Duration and Priority Controls */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Duration</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={quickDuration}
                      onChange={(e) => setQuickDuration(parseInt(e.target.value) || 1)}
                      min="1"
                      max="365"
                      className="flex-1 px-3 py-2 bg-[#1A1B3E] border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    />
                    <select
                      value={quickDurationType}
                      onChange={(e) => setQuickDurationType(e.target.value as 'minutes' | 'hours' | 'days')}
                      className="px-3 py-2 bg-[#1A1B3E] border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                  <select
                    value={quickPriority}
                    onChange={(e) => setQuickPriority(e.target.value as 'medium' | 'high' | 'critical')}
                    className="w-full px-3 py-2 bg-[#1A1B3E] border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🟠 High</option>
                    <option value="critical">🔴 Critical</option>
                  </select>
                </div>
                
                <button
                  onClick={handleQuickAnnounce}
                  disabled={!quickMessage.trim() || quickAnnounceMutation.isPending || (targetType === 'departments' && selectedDepartments.length === 0)}
                  className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2 font-medium"
                >
                  {quickAnnounceMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Announcing...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>
                        {targetType === 'all' ? 'Announce to All' : 
                         targetType === 'departments' ? `Announce to ${selectedDepartments.length} Dept${selectedDepartments.length !== 1 ? 's' : ''}` : 
                         'Announce Now'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-[#2A2B5E] border-b border-gray-800">
        <div className="px-8">
          <div className="flex space-x-8">
            {[
              { key: 'current', label: 'Current Announcements', icon: Bell },
              { key: 'scheduled', label: 'Scheduled', icon: Clock },
              { key: 'auto', label: 'Auto Announcements', icon: Settings },
              { key: 'queue', label: 'Queue & History', icon: Calendar },
              { key: 'settings', label: 'Settings', icon: Settings }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center space-x-2 px-4 py-4 border-b-2 transition-colors ${
                  activeTab === key 
                    ? 'text-blue-400 border-blue-400' 
                    : 'text-gray-400 border-transparent hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8">
        {activeTab === 'current' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                Active Announcements ({filteredAnnouncements.length})
              </h2>
            </div>
            
            <div className="grid gap-4">
              {filteredAnnouncements.map((announcement: Announcement) => (
                <div key={announcement.id} className="bg-[#2A2B5E] rounded-lg p-6 border border-gray-700">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className={`w-3 h-3 rounded-full ${getTypeColor(announcement.type)}`}></div>
                        <h3 className="text-lg font-semibold text-white">{announcement.title}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(announcement.priority)}`}>
                          {announcement.priority.toUpperCase()}
                        </span>
                      </div>
                      
                      <p className="text-gray-300 mb-4 leading-relaxed">{announcement.content}</p>
                      
                      <div className="flex items-center space-x-6 text-sm text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Eye className="w-4 h-4" />
                          <span>{announcement.viewCount || 0} views</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(announcement.createdAt).toLocaleDateString()}</span>
                        </div>
                        {announcement.targetType && announcement.targetType !== 'all' && (
                          <div className="flex items-center space-x-1">
                            <span className="bg-blue-600 px-3 py-1 rounded-full text-xs text-white font-medium">
                              {announcement.targetType === 'individuals' ? `${announcement.targetNames?.length || 0} people` :
                               announcement.targetType === 'departments' ? `${announcement.targetNames?.length || 0} departments` :
                               `${announcement.targetNames?.length || 0} groups`}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center space-x-2">
                          {announcement.appEnabled && (
                            <div className="flex items-center space-x-1 text-blue-400">
                              <Bell className="w-4 h-4" />
                              <span>App</span>
                            </div>
                          )}
                          {announcement.whatsappEnabled && (
                            <div className="flex items-center space-x-1 text-green-400">
                              <MessageCircle className="w-4 h-4" />
                              <span>WhatsApp</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-6">
                      <button
                        onClick={() => {
                          setSelectedAnnouncement(announcement);
                          setShowEditModal(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleStatusMutation.mutate({ 
                          id: announcement.id, 
                          status: announcement.status === 'active' ? 'inactive' : 'active' 
                        })}
                        className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-400/10 rounded"
                      >
                        {announcement.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(announcement.id)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredAnnouncements.length === 0 && (
                <div className="text-center py-12 bg-[#2A2B5E] rounded-lg">
                  <Bell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No announcements found</h3>
                  <p className="text-gray-400 mb-6">Create your first announcement to get started</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create Announcement
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'scheduled' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Scheduled Announcements</h2>
            <div className="bg-[#2A2B5E] rounded-lg p-8 text-center">
              <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No scheduled announcements</h3>
              <p className="text-gray-400">Schedule announcements to be published automatically</p>
            </div>
          </div>
        )}

        {activeTab === 'auto' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Auto Announcement Settings</h2>
            <div className="grid grid-cols-2 gap-6">
              {[
                { 
                  type: 'birthday', 
                  title: 'Birthday Wishes', 
                  description: 'Automatic birthday announcements for employees',
                  enabled: autoSettings?.birthday || false
                },
                { 
                  type: 'work_anniversary', 
                  title: 'Work Anniversary', 
                  description: 'Celebrate employee work anniversaries',
                  enabled: autoSettings?.workAnniversary || false
                },
                { 
                  type: 'welcome', 
                  title: 'Welcome Messages', 
                  description: 'Welcome new employees automatically',
                  enabled: autoSettings?.welcome || false
                },
                { 
                  type: 'attendance_reminder', 
                  title: 'Attendance Reminders', 
                  description: 'Daily attendance and punctuality reminders',
                  enabled: autoSettings?.attendanceReminder || false
                }
              ].map((item) => (
                <div key={item.type} className="bg-[#2A2B5E] rounded-lg p-6 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                      <p className="text-gray-400">{item.description}</p>
                    </div>
                    <button className={`p-2 ${item.enabled ? 'text-green-400' : 'text-gray-500'}`}>
                      {item.enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'queue' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Queue & Message History</h2>
            <div className="bg-[#2A2B5E] rounded-lg p-8 text-center">
              <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No queued messages</h3>
              <p className="text-gray-400">View and manage announcement delivery queue</p>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Global Settings</h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-[#2A2B5E] rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">WhatsApp Integration</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Send to WhatsApp by default</span>
                    <ToggleRight className="text-green-400" size={24} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Include announcement link</span>
                    <ToggleRight className="text-green-400" size={24} />
                  </div>
                </div>
              </div>
              
              <div className="bg-[#2A2B5E] rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">App Notifications</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Push notifications</span>
                    <ToggleRight className="text-blue-400" size={24} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">In-app alerts</span>
                    <ToggleRight className="text-blue-400" size={24} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && <CreateAnnouncementModal />}
    </div>
  );
}