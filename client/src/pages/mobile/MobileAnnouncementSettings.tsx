import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Plus, Settings, Users, Building, MessageSquare, Bell, Clock, Trash2, Edit3, Save, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface AnnouncementQueue {
  id: string;
  message: string;
  type: 'personal' | 'work' | 'general' | 'emergency';
  priority: 'low' | 'normal' | 'high' | 'emergency';
  targetType: 'all' | 'department' | 'group';
  targetIds: string[];
  displayDuration: number;
  color: string;
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
}

interface AutoMessageSetting {
  id: string;
  category: 'personal' | 'work' | 'general';
  subcategory: string;
  isEnabled: boolean;
  displayDuration: number;
  color: string;
  template: string;
  priority: 'low' | 'normal' | 'high' | 'emergency';
}

export default function MobileAnnouncementSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('queue');
  const [isAddingMessage, setIsAddingMessage] = useState(false);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState({
    title: '',
    message: '',
    type: 'general' as const,
    priority: 'normal' as const,
    targetType: 'all' as const,
    targetIds: [] as string[],
    displayDuration: 5,
    color: 'text-blue-400',
    expiresAt: ''
  });

  // Auto-message categories with predefined templates
  const autoMessageCategories = {
    personal: {
      attendance_streak: {
        name: 'Attendance Streak',
        template: '🔥 Congratulations {{employeeName}}! You\'ve maintained a {{streakDays}}-day attendance streak!',
        description: 'Celebrates employee attendance streaks'
      },
      achievement_unlock: {
        name: 'Achievement Unlocked',
        template: '🏆 {{employeeName}} unlocked "{{achievementName}}" achievement! Keep up the excellent work!',
        description: 'Celebrates employee achievements'
      },
      birthday_wishes: {
        name: 'Birthday Wishes',
        template: '🎉 Happy Birthday {{employeeName}}! Wishing you a wonderful day and year ahead!',
        description: 'Birthday celebrations for employees'
      },
      leaderboard_position: {
        name: 'Leaderboard Position',
        template: '⭐ {{employeeName}} is now ranked #{{position}} on the attendance leaderboard!',
        description: 'Highlights leaderboard achievements'
      }
    },
    work: {
      late_shift_alert: {
        name: 'Late Shift Alert',
        template: '⚠️ Attention {{departmentName}}: Late shift assignments for {{date}}. Please check your schedule.',
        description: 'Alerts for late shift changes'
      },
      overtime_authorization: {
        name: 'Overtime Authorization',
        template: '📋 Overtime authorization required for {{departmentName}}. Contact your manager for approval.',
        description: 'Overtime approval notifications'
      },
      grace_period_reminder: {
        name: 'Grace Period Reminder',
        template: '⏰ Grace period ends in 15 minutes. Please ensure timely check-in to avoid penalties.',
        description: 'Grace period warnings'
      },
      geofence_violation: {
        name: 'Geofence Violation',
        template: '📍 Location validation failed for {{employeeName}}. Please punch from designated areas only.',
        description: 'Location compliance alerts'
      }
    },
    general: {
      holiday_announcement: {
        name: 'Holiday Announcement',
        template: '🎊 {{holidayName}} holiday on {{date}}. Office will be closed. Enjoy your day off!',
        description: 'Holiday and event announcements'
      },
      reimbursement_reminder: {
        name: 'Reimbursement Reminder',
        template: '💰 Reimbursement deadline: {{deadline}}. Submit your claims before the deadline.',
        description: 'Expense reimbursement reminders'
      },
      policy_update: {
        name: 'Policy Update',
        template: '📋 Policy Update: {{policyName}} has been updated. Please review the changes.',
        description: 'Company policy notifications'
      },
      system_maintenance: {
        name: 'System Maintenance',
        template: '🔧 Scheduled maintenance: {{date}} {{time}}. System may be unavailable temporarily.',
        description: 'System maintenance alerts'
      }
    }
  };

  // Mock data for demonstration
  const mockAnnouncementQueue: AnnouncementQueue[] = [
    {
      id: '1',
      message: '🎉 Welcome to our new mobile announcement system! Stay tuned for updates.',
      type: 'general',
      priority: 'normal',
      targetType: 'all',
      targetIds: [],
      displayDuration: 5,
      color: 'text-blue-400',
      isActive: true,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '2',
      message: '⚠️ System maintenance scheduled for tonight 11 PM - 1 AM. Please plan accordingly.',
      type: 'work',
      priority: 'high',
      targetType: 'all',
      targetIds: [],
      displayDuration: 8,
      color: 'text-yellow-400',
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '3',
      message: '🏆 Monthly leaderboard updated! Check your ranking in the analytics section.',
      type: 'personal',
      priority: 'normal',
      targetType: 'all',
      targetIds: [],
      displayDuration: 6,
      color: 'text-green-400',
      isActive: true,
      createdAt: new Date().toISOString()
    }
  ];

  const mockDepartments = ['Engineering', 'HR', 'Finance', 'Marketing', 'Operations'];

  const handleAddMessage = () => {
    if (!newMessage.title || !newMessage.message) {
      toast({
        title: "Missing Information",
        description: "Please provide both title and message",
        variant: "destructive"
      });
      return;
    }

    // Here you would typically make an API call
    toast({
      title: "Message Added",
      description: "Announcement has been added to the queue",
      variant: "default"
    });
    
    setIsAddingMessage(false);
    setNewMessage({
      title: '',
      message: '',
      type: 'general',
      priority: 'normal',
      targetType: 'all',
      targetIds: [],
      displayDuration: 5,
      color: 'text-blue-400',
      expiresAt: ''
    });
  };

  const handleDeleteMessage = (id: string) => {
    toast({
      title: "Message Deleted",
      description: "Announcement has been removed from the queue",
      variant: "default"
    });
  };

  const handleToggleAutoMessage = (category: string, subcategory: string, enabled: boolean) => {
    toast({
      title: enabled ? "Auto-message Enabled" : "Auto-message Disabled",
      description: `${autoMessageCategories[category as keyof typeof autoMessageCategories][subcategory].name} has been ${enabled ? 'enabled' : 'disabled'}`,
      variant: "default"
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-gray-500';
      case 'normal': return 'bg-blue-500';
      case 'high': return 'bg-orange-500';
      case 'emergency': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'personal': return <Users className="w-4 h-4" />;
      case 'work': return <Building className="w-4 h-4" />;
      case 'general': return <MessageSquare className="w-4 h-4" />;
      case 'emergency': return <Bell className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1B3E] text-white">
      {/* Header */}
      <div className="bg-[#2A2B5E] p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/mobile/settings')}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Announcement Settings</h1>
            <p className="text-sm text-gray-300">Manage announcements and auto-messages</p>
          </div>
        </div>
        <Settings className="w-6 h-6 text-blue-400" />
      </div>

      {/* Tabs */}
      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-[#2A2B5E]">
            <TabsTrigger value="queue" className="data-[state=active]:bg-blue-600">
              Queue
            </TabsTrigger>
            <TabsTrigger value="auto" className="data-[state=active]:bg-blue-600">
              Auto Messages
            </TabsTrigger>
            <TabsTrigger value="emergency" className="data-[state=active]:bg-blue-600">
              Emergency
            </TabsTrigger>
          </TabsList>

          {/* Message Queue Tab */}
          <TabsContent value="queue" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Message Queue</h2>
                <p className="text-sm text-gray-400">Manage announcement messages</p>
              </div>
              <Button
                onClick={() => setIsAddingMessage(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Message
              </Button>
            </div>

            {/* Add Message Form */}
            {isAddingMessage && (
              <Card className="bg-[#2A2B5E] border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    Add New Announcement
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsAddingMessage(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Title</label>
                    <Input
                      value={newMessage.title}
                      onChange={(e) => setNewMessage({...newMessage, title: e.target.value})}
                      placeholder="Enter announcement title"
                      className="bg-[#1A1B3E] border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Message</label>
                    <Textarea
                      value={newMessage.message}
                      onChange={(e) => setNewMessage({...newMessage, message: e.target.value})}
                      placeholder="Enter announcement message"
                      rows={3}
                      className="bg-[#1A1B3E] border-gray-600 text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-300">Type</label>
                      <Select value={newMessage.type} onValueChange={(value) => setNewMessage({...newMessage, type: value as any})}>
                        <SelectTrigger className="bg-[#1A1B3E] border-gray-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="work">Work</SelectItem>
                          <SelectItem value="personal">Personal</SelectItem>
                          <SelectItem value="emergency">Emergency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-300">Priority</label>
                      <Select value={newMessage.priority} onValueChange={(value) => setNewMessage({...newMessage, priority: value as any})}>
                        <SelectTrigger className="bg-[#1A1B3E] border-gray-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="emergency">Emergency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-300">Target</label>
                      <Select value={newMessage.targetType} onValueChange={(value) => setNewMessage({...newMessage, targetType: value as any})}>
                        <SelectTrigger className="bg-[#1A1B3E] border-gray-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Employees</SelectItem>
                          <SelectItem value="department">Department</SelectItem>
                          <SelectItem value="group">Group</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-300">Duration (sec)</label>
                      <Input
                        type="number"
                        value={newMessage.displayDuration}
                        onChange={(e) => setNewMessage({...newMessage, displayDuration: parseInt(e.target.value) || 5})}
                        min="1"
                        max="30"
                        className="bg-[#1A1B3E] border-gray-600 text-white"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleAddMessage}
                      className="bg-green-600 hover:bg-green-700 flex-1"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Message
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsAddingMessage(false)}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Message Queue List */}
            <div className="space-y-3">
              {mockAnnouncementQueue.map((announcement) => (
                <Card key={announcement.id} className="bg-[#2A2B5E] border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {getTypeIcon(announcement.type)}
                          <Badge className={getPriorityColor(announcement.priority)}>
                            {announcement.priority}
                          </Badge>
                          <Badge variant="outline" className="text-gray-300">
                            {announcement.targetType}
                          </Badge>
                        </div>
                        <p className="text-white mb-2">{announcement.message}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-400">
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {announcement.displayDuration}s
                          </span>
                          <span>Active</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingMessage(announcement.id)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteMessage(announcement.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Auto Messages Tab */}
          <TabsContent value="auto" className="mt-4 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Auto-Generated Messages</h2>
              <p className="text-sm text-gray-400">Configure automatic announcement triggers</p>
            </div>

            {Object.entries(autoMessageCategories).map(([category, subcategories]) => (
              <Card key={category} className="bg-[#2A2B5E] border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white capitalize flex items-center">
                    {category === 'personal' && <Users className="w-5 h-5 mr-2" />}
                    {category === 'work' && <Building className="w-5 h-5 mr-2" />}
                    {category === 'general' && <MessageSquare className="w-5 h-5 mr-2" />}
                    {category} Messages
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(subcategories).map(([subcategory, config]) => (
                    <div key={subcategory} className="flex items-center justify-between p-3 bg-[#1A1B3E] rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-white">{config.name}</h4>
                        <p className="text-sm text-gray-400">{config.description}</p>
                        <p className="text-xs text-blue-400 mt-1 font-mono">{config.template}</p>
                      </div>
                      <Switch
                        defaultChecked={true}
                        onCheckedChange={(checked) => handleToggleAutoMessage(category, subcategory, checked)}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Emergency Tab */}
          <TabsContent value="emergency" className="mt-4 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Emergency Announcements</h2>
              <p className="text-sm text-gray-400">High priority and emergency message controls</p>
            </div>

            <Card className="bg-[#2A2B5E] border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Bell className="w-5 h-5 mr-2 text-red-400" />
                  Emergency Broadcast
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Emergency Message</label>
                  <Textarea
                    placeholder="Enter emergency announcement message..."
                    rows={4}
                    className="bg-[#1A1B3E] border-gray-600 text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Duration (seconds)</label>
                    <Input
                      type="number"
                      defaultValue="10"
                      min="5"
                      max="60"
                      className="bg-[#1A1B3E] border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Target</label>
                    <Select defaultValue="all">
                      <SelectTrigger className="bg-[#1A1B3E] border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Employees</SelectItem>
                        <SelectItem value="department">Specific Department</SelectItem>
                        <SelectItem value="group">Specific Group</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full bg-red-600 hover:bg-red-700">
                  <Bell className="w-4 h-4 mr-2" />
                  Send Emergency Broadcast
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-[#2A2B5E] border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">WhatsApp Integration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-white">Emergency WhatsApp Alerts</h4>
                    <p className="text-sm text-gray-400">Send emergency announcements via WhatsApp /ANNOUNCE command</p>
                  </div>
                  <Switch defaultChecked={true} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-white">Admin Console Integration</h4>
                    <p className="text-sm text-gray-400">Allow admin interface announcements</p>
                  </div>
                  <Switch defaultChecked={true} />
                </div>
                <div className="bg-[#1A1B3E] p-3 rounded-lg">
                  <p className="text-sm text-gray-400">
                    Emergency announcements will be sent to all active mobile devices and can be triggered via WhatsApp /ANNOUNCE command for immediate delivery.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}