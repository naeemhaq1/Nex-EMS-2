import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Megaphone, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar, 
  Clock, 
  Users, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RotateCcw,
  GripVertical,
  Target,
  Timer,
  User,
  Building,
  Globe,
  Zap,
  Play,
  Pause,
  SkipForward,
  Settings,
  ArrowLeft,
  Send,
  RefreshCw,
  List,
  MessageSquare,
  Eye
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { apiRequest } from '@/lib/queryClient';

interface Announcement {
  id: number;
  title: string;
  message: string;
  type: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  targetType: 'all' | 'department' | 'group' | 'employee';
  targetIds?: string[];
  targetDepartments?: string[];
  isActive: boolean;
  displayDuration: number;
  repeatCount: number;
  createdBy: number;
  createdAt: string;
  expiresAt?: string;
  showFrom: string;
}

interface AnnouncementManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

// Sortable announcement item component
function SortableAnnouncementItem({ announcement, onEdit, onDelete, onToggleActive }: {
  announcement: Announcement;
  onEdit: (announcement: Announcement) => void;
  onDelete: (id: number) => void;
  onToggleActive: (id: number, isActive: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: announcement.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'normal': return 'bg-blue-500 text-white';
      case 'low': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getTargetIcon = (targetType: string) => {
    switch (targetType) {
      case 'all': return <Globe className="w-4 h-4" />;
      case 'department': return <Building className="w-4 h-4" />;
      case 'group': return <Users className="w-4 h-4" />;
      case 'employee': return <User className="w-4 h-4" />;
      default: return <Globe className="w-4 h-4" />;
    }
  };

  const getTargetText = (announcement: Announcement) => {
    switch (announcement.targetType) {
      case 'all':
        return 'All Employees';
      case 'department':
        return `Departments: ${announcement.targetDepartments?.join(', ') || 'None'}`;
      case 'group':
        return `Groups: ${announcement.targetIds?.length || 0} selected`;
      case 'employee':
        return `Employees: ${announcement.targetIds?.length || 0} selected`;
      default:
        return 'Unknown Target';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-[#2A2B5E] border border-gray-600 rounded-lg p-4 mb-3 ${
        isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''
      } ${!announcement.isActive ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex-shrink-0 text-gray-400 hover:text-gray-200 cursor-move mt-1"
        >
          <GripVertical className="w-5 h-5" />
        </div>

        {/* Announcement Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-white font-semibold truncate">{announcement.title}</h3>
            <Badge className={getPriorityColor(announcement.priority)}>
              {announcement.priority.toUpperCase()}
            </Badge>
            {!announcement.isActive && (
              <Badge variant="outline" className="border-gray-500 text-gray-400">
                PAUSED
              </Badge>
            )}
          </div>
          
          <p className="text-gray-300 text-sm mb-3 line-clamp-2">{announcement.message}</p>
          
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              {getTargetIcon(announcement.targetType)}
              <span>{getTargetText(announcement)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Timer className="w-4 h-4" />
              <span>{announcement.displayDuration}s display</span>
            </div>
            <div className="flex items-center gap-1">
              <RotateCcw className="w-4 h-4" />
              <span>{announcement.repeatCount}x repeat</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{new Date(announcement.showFrom).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleActive(announcement.id, !announcement.isActive)}
            className={`p-2 ${announcement.isActive ? 'text-green-400 hover:text-green-300' : 'text-gray-400 hover:text-gray-300'}`}
          >
            {announcement.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(announcement)}
            className="p-2 text-blue-400 hover:text-blue-300"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(announcement.id)}
            className="p-2 text-red-400 hover:text-red-300"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Compact Announcement Row Component for Dense Table Display
function CompactAnnouncementRow({ announcement, onEdit, onDelete, onToggleActive }: {
  announcement: Announcement;
  onEdit: (announcement: Announcement) => void;
  onDelete: (id: number) => void;
  onToggleActive: (id: number, isActive: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: announcement.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-400';
      case 'high': return 'text-orange-400';
      case 'normal': return 'text-blue-400';
      case 'low': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getTargetText = (announcement: Announcement) => {
    switch (announcement.targetType) {
      case 'all':
        return 'All Employees';
      case 'department':
        return `Depts: ${announcement.targetDepartments?.join(', ') || 'None'}`;
      case 'group':
        return `Groups: ${announcement.targetIds?.length || 0}`;
      case 'employee':
        return `Employees: ${announcement.targetIds?.length || 0}`;
      default:
        return 'Unknown';
    }
  };

  const formatSchedule = (announcement: Announcement) => {
    const showDate = new Date(announcement.showFrom);
    const today = new Date();
    const isToday = showDate.toDateString() === today.toDateString();
    
    if (isToday) {
      return showDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else {
      return showDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`grid grid-cols-16 gap-2 px-3 py-3 text-xs border-gray-700 hover:bg-[#2A2B5E] ${
        isDragging ? 'bg-blue-900/30 shadow-lg' : ''
      } ${!announcement.isActive ? 'opacity-50' : ''}`}
    >
      {/* Priority */}
      <div className="col-span-1 flex items-center">
        <div
          {...attributes}
          {...listeners}
          className="cursor-move text-gray-500 hover:text-gray-300 mr-2"
        >
          <GripVertical className="w-3 h-3" />
        </div>
        <span className={`font-medium text-xs ${getPriorityColor(announcement.priority)}`}>
          {announcement.priority[0].toUpperCase()}
        </span>
      </div>

      {/* Title */}
      <div className="col-span-3 flex items-center">
        <span className="text-white font-medium text-xs leading-tight whitespace-normal break-words" title={announcement.title}>
          {announcement.title}
        </span>
      </div>

      {/* Full Message */}
      <div className="col-span-6 flex items-center">
        <span className="text-gray-300 text-xs leading-tight whitespace-normal break-words" title={announcement.message}>
          {announcement.message}
        </span>
      </div>

      {/* Target */}
      <div className="col-span-3 flex items-center">
        <span className="text-gray-400 text-xs leading-tight whitespace-normal break-words" title={getTargetText(announcement)}>
          {getTargetText(announcement)}
        </span>
      </div>

      {/* Status */}
      <div className="col-span-1 flex items-center">
        {announcement.isActive ? (
          <span className="text-green-400 text-xs font-medium">Active</span>
        ) : (
          <span className="text-gray-500 text-xs">Paused</span>
        )}
      </div>

      {/* Schedule */}
      <div className="col-span-1 flex items-center">
        <span className="text-gray-400 text-xs">
          {formatSchedule(announcement)}
        </span>
      </div>

      {/* Actions */}
      <div className="col-span-1 flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleActive(announcement.id, !announcement.isActive)}
          className={`p-1 h-auto ${announcement.isActive ? 'text-orange-400 hover:text-orange-300' : 'text-gray-400 hover:text-gray-300'}`}
        >
          {announcement.isActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(announcement)}
          className="p-1 h-auto text-blue-400 hover:text-blue-300"
        >
          <Edit className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(announcement.id)}
          className="p-1 h-auto text-red-400 hover:text-red-300"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

export default function AnnouncementManagement({ isOpen, onClose }: AnnouncementManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'general',
    priority: 'normal' as const,
    targetType: 'all' as const,
    targetIds: [] as string[],
    targetDepartments: [] as string[],
    displayDuration: 5,
    repeatCount: 1,
    expiresAt: '',
    showFrom: new Date().toISOString().slice(0, 16),
  });

  // Quick Send State - Dashboard functionality integrated
  const [quickMessage, setQuickMessage] = useState('');
  const [quickRepeatCount, setQuickRepeatCount] = useState(1);
  const [quickSending, setQuickSending] = useState(false);
  const [showEmployeeView, setShowEmployeeView] = useState(false);
  const [sentAnnouncementPreview, setSentAnnouncementPreview] = useState('');
  const [lastQuickSent, setLastQuickSent] = useState<string | null>(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch announcements
  const { data: announcementsData, isLoading, refetch } = useQuery({
    queryKey: ['/api/announcements'],
    enabled: isOpen,
    refetchInterval: isOpen ? 30000 : false, // Only refresh when modal is open
    staleTime: 10000, // Consider data fresh for 10 seconds
    retry: (failureCount, error: any) => {
      // Don't retry on AbortError
      if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Fetch departments for targeting
  const { data: departments } = useQuery({
    queryKey: ['/api/employees/departments'],
    enabled: isOpen,
    staleTime: 60000, // Consider departments fresh for 1 minute
    retry: (failureCount, error: any) => {
      if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Create announcement mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      try {
        return await apiRequest({
          url: '/api/announcements',
          method: 'POST',
          data: data,
        });
      } catch (error: any) {
        if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
          throw new Error('Request was cancelled');
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Announcement created successfully',
      });
      setIsCreateModalOpen(false);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      if (error?.message === 'Request was cancelled') {
        return; // Don't show error for cancelled requests
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to create announcement',
        variant: 'destructive',
      });
    },
  });

  // Update announcement mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      try {
        return await apiRequest({
          url: `/api/announcements/${id}`,
          method: 'PUT',
          data: data,
        });
      } catch (error: any) {
        if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
          throw new Error('Request was cancelled');
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Announcement updated successfully',
      });
      setEditingAnnouncement(null);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      if (error?.message === 'Request was cancelled') {
        return; // Don't show error for cancelled requests
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to update announcement',
        variant: 'destructive',
      });
    },
  });

  // Delete announcement mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      try {
        return await apiRequest({
          url: `/api/announcements/${id}`,
          method: 'DELETE',
        });
      } catch (error: any) {
        if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
          throw new Error('Request was cancelled');
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Announcement deleted successfully',
      });
      refetch();
    },
    onError: (error: any) => {
      if (error?.message === 'Request was cancelled') {
        return; // Don't show error for cancelled requests
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete announcement',
        variant: 'destructive',
      });
    },
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      try {
        return await apiRequest({
          url: `/api/announcements/${id}/toggle`,
          method: 'PATCH',
          data: { isActive },
        });
      } catch (error: any) {
        if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
          throw new Error('Request was cancelled');
        }
        throw error;
      }
    },
    onSuccess: () => {
      refetch();
    },
    onError: (error: any) => {
      if (error?.message === 'Request was cancelled') {
        return; // Don't show error for cancelled requests
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to update announcement status',
        variant: 'destructive',
      });
    },
  });

  // Update order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async (orderedIds: number[]) => {
      try {
        return await apiRequest({
          url: '/api/announcements/reorder',
          method: 'POST',
          data: { orderedIds },
        });
      } catch (error: any) {
        if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
          throw new Error('Request was cancelled');
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Announcement order updated',
      });
    },
    onError: (error: any) => {
      if (error?.message === 'Request was cancelled') {
        return; // Don't show error for cancelled requests
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to update order',
        variant: 'destructive',
      });
    },
  });

  useEffect(() => {
    if (announcementsData && Array.isArray(announcementsData)) {
      setAnnouncements(announcementsData);
    }
  }, [announcementsData]);

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      type: 'general',
      priority: 'normal' as const,
      targetType: 'all' as const,
      targetIds: [],
      targetDepartments: [],
      displayDuration: 5,
      repeatCount: 1,
      expiresAt: '',
      showFrom: new Date().toISOString().slice(0, 16),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingAnnouncement) {
      updateMutation.mutate({ id: editingAnnouncement.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type,
      priority: announcement.priority,
      targetType: announcement.targetType,
      targetIds: announcement.targetIds || [],
      targetDepartments: announcement.targetDepartments || [],
      displayDuration: announcement.displayDuration,
      repeatCount: announcement.repeatCount,
      expiresAt: announcement.expiresAt ? new Date(announcement.expiresAt).toISOString().slice(0, 16) : '',
      showFrom: new Date(announcement.showFrom).toISOString().slice(0, 16),
    });
    setIsCreateModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this announcement?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleActive = (id: number, isActive: boolean) => {
    toggleActiveMutation.mutate({ id, isActive });
  };

  const handleDragEnd = (event: any) => {
    try {
      const { active, over } = event;

      if (!active || !over || active.id === over.id) {
        return; // No movement or invalid drag
      }

      setAnnouncements((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        if (oldIndex === -1 || newIndex === -1) {
          console.warn('Invalid drag operation: item not found');
          return items; // Return unchanged if items not found
        }
        
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // Update order on server with error handling
        try {
          updateOrderMutation.mutate(newOrder.map(item => item.id));
        } catch (error) {
          console.error('Failed to update order on server:', error);
          // Still return the new order locally for better UX
        }
        
        return newOrder;
      });
    } catch (error) {
      console.error('Drag end error:', error);
      // Prevent interface crash by gracefully handling errors
    }
  };

  const openCreateModal = () => {
    setEditingAnnouncement(null);
    resetForm();
    setIsCreateModalOpen(true);
  };

  // Quick Send functionality from dashboard
  const sendQuickAnnouncement = async () => {
    if (!quickMessage.trim() || quickSending) return;
    
    setQuickSending(true);
    try {
      const response = await fetch('/api/announcements/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: quickMessage.trim(),
          priority: 'normal',
          targetAudience: 'all',
          repeatCount: quickRepeatCount
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Show employee view confirmation
        setSentAnnouncementPreview(`URGENT ANNOUNCEMENT: ${quickMessage.trim()}`);
        setShowEmployeeView(true);
        
        // Set success message for later display
        setLastQuickSent(`${quickRepeatCount}x to ${data.recipientCount || 'all'} users: "${quickMessage.trim()}"`);
        setQuickMessage('');
        setQuickRepeatCount(1);
        
        // Auto-revert to admin view after 4 seconds
        setTimeout(() => {
          setShowEmployeeView(false);
          // Auto-hide success message after additional 3 seconds
          setTimeout(() => setLastQuickSent(null), 3000);
        }, 4000);

        // Refresh the announcements list
        refetch();
      } else {
        throw new Error('Failed to send announcement');
      }
    } catch (error) {
      console.error('Error sending announcement:', error);
      toast({
        title: 'Error',
        description: 'Failed to send announcement',
        variant: 'destructive',
      });
    }
    setQuickSending(false);
  };

  // Wrap in try-catch for AbortError suppression
  try {
    return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[98vw] h-[calc(100vh-180px)] bg-[#1A1B3E] border-gray-700 flex flex-col p-0 w-[98vw] mt-2 mb-36">
          <DialogHeader className="px-4 py-3 border-b border-gray-700 flex-shrink-0">
            <DialogDescription className="sr-only">
              Manage and organize system announcements
            </DialogDescription>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClose}
                  className="text-gray-400 hover:text-white hover:bg-gray-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to Dashboard
                </Button>
                <div className="h-4 w-px bg-gray-600"></div>
                <Megaphone className="w-4 h-4 text-orange-400" />
                <DialogTitle className="text-white text-base font-medium">
                  Announcement Management
                </DialogTitle>
                <Badge variant="outline" className="border-blue-500 text-blue-400 text-xs px-2 py-0">
                  {announcements.filter(a => a.isActive).length}/{announcements.length} Active
                </Badge>
              </div>
              <Button
                onClick={openCreateModal}
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-1"
              >
                <Plus className="w-3 h-3 mr-1" />
                New
              </Button>
            </div>
          </DialogHeader>

          {/* Quick Send Section - Dashboard functionality integrated */}
          <div className="px-4 py-3 border-b border-gray-700 bg-[#2A2B5E]">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-orange-400" />
              <h3 className="text-white font-medium text-sm">Quick Send</h3>
              <Badge variant="outline" className="border-orange-500 text-orange-400 text-xs px-2 py-0">
                Instant Broadcast
              </Badge>
            </div>
            
            {showEmployeeView ? (
              /* Employee View Confirmation - Exactly how employees see announcements */
              <>
                <div className="flex items-center space-x-2 mb-2">
                  <Eye className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-400">How employees see this:</span>
                </div>
                {/* Employee Scrolling Message Bar - Exact replica */}
                <div className="bg-red-900/30 border border-red-700 rounded p-3 mb-2">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4 text-red-400 flex-shrink-0 animate-pulse" />
                    <div className="flex-1 overflow-hidden">
                      <div className="text-sm text-red-300 font-medium bg-red-900/50 px-2 py-1 rounded">
                        {sentAnnouncementPreview}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-green-400 flex items-center justify-center space-x-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>Sent to 293 employees</span>
                  </div>
                </div>
              </>
            ) : (
              /* Quick Send Input Interface */
              <>
                <div className="flex items-center space-x-2 mb-2">
                  <Input
                    value={quickMessage}
                    onChange={(e) => setQuickMessage(e.target.value)}
                    placeholder="Type urgent announcement message..."
                    className="flex-1 bg-[#1A1B3E] border-gray-600 text-white placeholder-gray-400 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendQuickAnnouncement();
                      }
                    }}
                  />
                  <div className="flex items-center space-x-1">
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={quickRepeatCount}
                      onChange={(e) => setQuickRepeatCount(parseInt(e.target.value) || 1)}
                      className="w-12 bg-[#1A1B3E] border-gray-600 text-white text-xs text-center p-1"
                    />
                    <span className="text-xs text-gray-400">x</span>
                  </div>
                  <Button
                    onClick={sendQuickAnnouncement}
                    disabled={!quickMessage.trim() || quickSending}
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1"
                  >
                    {quickSending ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                  </Button>
                </div>
                
                {lastQuickSent && (
                  <div className="text-xs text-green-400 flex items-center space-x-1 break-words">
                    <CheckCircle className="w-3 h-3 flex-shrink-0" />
                    <span className="break-all">URGENT ANNOUNCEMENT sent: {lastQuickSent}</span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex-1 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-400 text-sm">Loading announcements...</div>
              </div>
            ) : announcements.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Megaphone className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <div className="text-gray-400 text-sm mb-1">No announcements found</div>
                  <div className="text-xs text-gray-500">Create your first announcement to get started</div>
                </div>
              </div>
            ) : (
              <div className="h-full overflow-auto scrollbar-hide">
                {/* Dense Table Header */}
                <div className="sticky top-0 bg-[#1A1B3E] border-b border-gray-700 px-3 py-2">
                  <div className="grid grid-cols-16 gap-2 text-xs font-medium text-gray-300">
                    <div className="col-span-1">Priority</div>
                    <div className="col-span-3">Title</div>
                    <div className="col-span-6">Message</div>
                    <div className="col-span-3">Target</div>
                    <div className="col-span-1">Status</div>
                    <div className="col-span-1">Schedule</div>
                    <div className="col-span-1">Actions</div>
                  </div>
                </div>

                {/* Sortable Table Body */}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={announcements.map(a => a.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="divide-y divide-gray-700">
                      {announcements.map((announcement) => (
                        <CompactAnnouncementRow
                          key={announcement.id}
                          announcement={announcement}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onToggleActive={handleToggleActive}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Announcement Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl bg-[#1A1B3E] border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-orange-500" />
              {editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingAnnouncement 
                ? 'Modify announcement details and target settings' 
                : 'Create a new announcement to broadcast to employees'
              }
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Title
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Announcement title"
                  required
                  className="bg-[#2A2B5E] border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Priority
                </label>
                <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger className="bg-[#2A2B5E] border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Message
              </label>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Announcement message"
                required
                rows={3}
                className="bg-[#2A2B5E] border-gray-600 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Target Audience
                </label>
                <Select value={formData.targetType} onValueChange={(value: any) => setFormData({ ...formData, targetType: value })}>
                  <SelectTrigger className="bg-[#2A2B5E] border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    <SelectItem value="department">Specific Departments</SelectItem>
                    <SelectItem value="group">Groups</SelectItem>
                    <SelectItem value="employee">Individual Employees</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Type
                </label>
                <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger className="bg-[#2A2B5E] border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="work">Work</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(formData.targetType as string) === 'department' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Select Departments
                </label>
                {departments && departments.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-[#2A2B5E] border border-gray-600 rounded-md">
                      {departments.map((dept: string) => (
                        <label key={dept} className="flex items-center space-x-2 text-sm text-gray-300">
                          <input
                            type="checkbox"
                            checked={formData.targetDepartments.includes(dept)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  targetDepartments: [...formData.targetDepartments, dept]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  targetDepartments: formData.targetDepartments.filter(d => d !== dept)
                                });
                              }
                            }}
                            className="rounded border-gray-500"
                          />
                          <span className="truncate">{dept}</span>
                        </label>
                      ))}
                    </div>
                    <div className="text-xs text-gray-400">
                      Selected: {formData.targetDepartments.length} departments
                    </div>
                  </div>
                ) : (
                  <Input
                    value={formData.targetDepartments.join(', ')}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      targetDepartments: e.target.value.split(',').map(d => d.trim()).filter(Boolean)
                    })}
                    placeholder="Enter department names separated by commas"
                    className="bg-[#2A2B5E] border-gray-600 text-white"
                  />
                )}
              </div>
            )}

            {(formData.targetType as string) === 'employee' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Select Employees
                </label>
                <Input
                  value={formData.targetIds.join(', ')}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    targetIds: e.target.value.split(',').map(id => id.trim()).filter(Boolean)
                  })}
                  placeholder="Enter employee IDs separated by commas (e.g., EMP001, EMP002)"
                  className="bg-[#2A2B5E] border-gray-600 text-white"
                />
                <div className="text-xs text-gray-400 mt-1">
                  Selected: {formData.targetIds.length} employees
                </div>
              </div>
            )}

            {(formData.targetType as string) === 'group' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Select Groups
                </label>
                <Input
                  value={formData.targetIds.join(', ')}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    targetIds: e.target.value.split(',').map(id => id.trim()).filter(Boolean)
                  })}
                  placeholder="Enter group names separated by commas"
                  className="bg-[#2A2B5E] border-gray-600 text-white"
                />
                <div className="text-xs text-gray-400 mt-1">
                  Selected: {formData.targetIds.length} groups
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Display Duration (seconds)
                </label>
                <Input
                  type="number"
                  value={formData.displayDuration}
                  onChange={(e) => setFormData({ ...formData, displayDuration: parseInt(e.target.value) || 5 })}
                  min="1"
                  max="60"
                  className="bg-[#2A2B5E] border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Repeat Count
                </label>
                <Input
                  type="number"
                  value={formData.repeatCount}
                  onChange={(e) => setFormData({ ...formData, repeatCount: parseInt(e.target.value) || 1 })}
                  min="1"
                  max="10"
                  className="bg-[#2A2B5E] border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Show From
                </label>
                <Input
                  type="datetime-local"
                  value={formData.showFrom}
                  onChange={(e) => setFormData({ ...formData, showFrom: e.target.value })}
                  className="bg-[#2A2B5E] border-gray-600 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Expires At (optional)
              </label>
              <Input
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                className="bg-[#2A2B5E] border-gray-600 text-white"
              />
            </div>

            {/* Preview Section */}
            {formData.message && (
              <div className="border border-gray-600 rounded-lg p-4 bg-[#2A2B5E]">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Employee View Preview
                </label>
                <div className="bg-red-600 text-white px-4 py-2 rounded border-l-4 border-red-400">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Megaphone className="w-4 h-4" />
                    <span className="text-red-100">URGENT ANNOUNCEMENT:</span>
                  </div>
                  <div className="mt-1 text-white font-medium">
                    {formData.message}
                  </div>
                  <div className="mt-1 text-xs text-red-100">
                    Priority: {formData.priority.toUpperCase()} | Target: {
                      formData.targetType === 'all' ? 'All Employees' :
                      formData.targetType === 'department' ? `${formData.targetDepartments.length} Department(s)` :
                      formData.targetType === 'group' ? `${formData.targetIds.length} Group(s)` :
                      `${formData.targetIds.length} Employee(s)`
                    }
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2"
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : editingAnnouncement ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Update Announcement
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Announcement
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
  } catch (error: any) {
    console.log('AnnouncementManagement render error caught:', error);
    if (error.name === 'AbortError' || (error.message && error.message.includes('aborted'))) {
      console.log('AbortError in AnnouncementManagement suppressed');
      return <div>Loading announcement management...</div>;
    }
    throw error;
  }
}