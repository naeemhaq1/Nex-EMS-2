import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MessageSquare, Search, MoreVertical, Plus, Send, Paperclip, 
  Mic, Smile, Users, Settings, Archive, Star, Volume2, 
  VolumeX, Phone, Video, CheckCircle2, Check, 
  Shield, AlertCircle, Wifi, WifiOff, Zap, Activity,
  Image, FileText, Download, Play, Pause, Camera, 
  File, Music, MapPin, Upload, X, StopCircle, Clock,
  BarChart3, TrendingUp, Filter, Eye, RefreshCcw, FileUp, 
  Mail, MessageCircle, Globe, Target, Heart, ArrowLeft, Loader2, XCircle, 
  PlayCircle, SkipForward, RotateCcw, AlertTriangle, Timer, 
  CheckCircle, Ban, Trash, PauseCircle, FastForward
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Link } from 'wouter';

// Enhanced types for mobile WhatsApp-identical interface
interface WhatsAppContact {
  id: string;
  phoneNumber: string;
  name: string;
  profileImage?: string;
  lastSeen?: string;
  isOnline: boolean;
  contactType: 'employees' | 'contacts_public' | 'contacts_private';
  status?: string;
  isTyping?: boolean;
  lastMessage?: string;
  unreadCount?: number;
  isPinned?: boolean;
  department?: string;
  designation?: string;
  employeeCode?: string;
}

interface WhatsAppMessage {
  id: string;
  messageId?: string;
  conversationId: string;
  fromNumber: string;
  toNumber?: string;
  messageType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'voice' | 'location';
  content: string;
  mediaUrl?: string; 
  mediaCaption?: string;
  mediaMimeType?: string;
  mediaSize?: number;
  mediaDuration?: number;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  direction: 'incoming' | 'outgoing';
  timestamp: string;
  isQuoted?: boolean;
  quotedMessageId?: string;
  isStarred?: boolean;
}

interface WhatsAppGroup {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  groupType: 'departments' | 'department_groups' | 'whatsapp_groups';
  department?: string;
  memberCount: number;
  isPrivate: boolean;
}

// Queue Management Types for Mobile Console
interface QueueItem {
  id: string;
  messageId?: string;
  phoneNumber: string;
  recipientName: string;
  messageType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'template';
  content: string;
  templateName?: string;
  templateParams?: Record<string, string>;
  mediaUrl?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
  attempts: number;
  maxAttempts: number;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
  groupId?: string;
  isBulkMessage: boolean;
  tags?: string[];
}

interface QueueStats {
  pending: number;
  processing: number;
  failed: number;
  sent: number;
  cancelled: number;
  priorityBreakdown: {
    urgent: number;
    high: number;
    normal: number;
    low: number;
  };
  todayStats?: {
    totalProcessed: number;
    successRate: number;
    avgProcessingTime: string;
    peakHour: string;
  };
  queueHealth: {
    oldestPendingAge: string;
    avgRetryCount: number;
    stuckMessages: number;
  };
  messageTypes: {
    text: number;
    template: number;
    document: number;
    image: number;
    video: number;
    audio: number;
  };
  totalItems: number;
  lastUpdated: string;
}

export default function MobileWhatsAppStunningConsole() {
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts' | 'groups' | 'gateway' | 'queue'>('chats');
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  
  // FILTERS AND SEARCH - As requested by user
  const [contactFilter, setContactFilter] = useState<'all' | 'employees' | 'contacts_public' | 'contacts_private'>('all');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [designationFilter, setDesignationFilter] = useState('');
  const [departmentGroupFilter, setDepartmentGroupFilter] = useState('');
  const [virtualizedRange, setVirtualizedRange] = useState({ start: 0, end: 30 }); // Smaller batch for mobile
  const [preloadedContacts, setPreloadedContacts] = useState<Map<string, WhatsAppContact>>(new Map());
  const [isPreloading, setIsPreloading] = useState(false);
  
  // Mobile WebView optimization detection
  const isWebView = useRef(typeof window !== 'undefined' && (
    /Android.*wv|iPhone.*Mobile.*Safari|webview/i.test(navigator.userAgent) ||
    (window as any).webkit?.messageHandlers ||
    (window as any).Android ||
    window.location.href.includes('file://')
  )).current;
  
  const contactsScrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  
  // Mobile-optimized file handling
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  // Queue management states
  const [queueFilters, setQueueFilters] = useState({
    status: '',
    priority: '',
    messageType: '',
    search: ''
  });
  const [currentQueuePage, setCurrentQueuePage] = useState(1);
  const [queueSortBy, setQueueSortBy] = useState('createdAt');
  const [queueSortOrder, setQueueSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedQueueItems, setSelectedQueueItems] = useState<string[]>([]);
  
  const queryClient = useQueryClient();



  // API Queries with mobile-optimized settings
  const { data: apiStatus } = useQuery({
    queryKey: ['/api/whatsapp/status'],
    refetchInterval: isWebView ? 60000 : 30000, // Less frequent in WebView
    staleTime: isWebView ? 30000 : 15000
  });

  // Debounce search query (500ms delay as requested)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: allContacts = [], isLoading: contactsLoading } = useQuery<WhatsAppContact[]>({
    queryKey: ['/api/whatsapp/contacts', debouncedSearchQuery, departmentFilter, designationFilter, contactFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearchQuery) params.append('search', debouncedSearchQuery);
      if (departmentFilter) params.append('department', departmentFilter);
      if (designationFilter) params.append('designation', designationFilter);
      if (contactFilter !== 'all') params.append('contactType', contactFilter);
      params.append('limit', '1000'); // UNLIMITED (up to 1000)
      
      const response = await fetch(`/api/whatsapp/contacts?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch contacts');
      return response.json();
    },
    refetchInterval: isWebView ? 300000 : 180000, // Reduced frequency for faster performance
    staleTime: 60000, // 1 minute cache for contacts
    gcTime: 300000, // 5 minutes memory retention (v5 uses gcTime instead of cacheTime)
    refetchOnMount: false, // Don't auto-refetch for faster startup
    refetchOnWindowFocus: false
  });

  // Fetch department groups from REAL DATA endpoint - NO MOCK DATA
  const { data: departmentGroupsData, isLoading: groupsLoading, error: groupsError } = useQuery({
    queryKey: ['whatsapp-department-groups', Date.now()], // Force fresh call with timestamp
    queryFn: async () => {
      console.log('[MOBILE CONSOLE] 🔍 Fetching department groups from API...');
      const response = await fetch('/api/whatsapp/department-groups', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      console.log('[MOBILE CONSOLE] 📡 Department groups response status:', response.status);
      if (!response.ok) {
        console.error('[MOBILE CONSOLE] ❌ Department groups API error:', response.status, response.statusText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const text = await response.text();
      console.log('[MOBILE CONSOLE] 📄 Raw department groups response:', text);
      try {
        const data = JSON.parse(text);
        console.log('[MOBILE CONSOLE] ✅ Department groups data parsed:', data);
        return data;
      } catch (e) {
        console.error('[MOBILE CONSOLE] ❌ Failed to parse department groups JSON:', e);
        throw new Error('Invalid JSON response');
      }
    },
    staleTime: 0, // No cache - always fetch fresh
    gcTime: 0, // No memory retention
    refetchOnMount: true, // Always refetch
    refetchOnWindowFocus: true,
    retry: 1
  });

  // Convert REAL department groups data to WhatsApp groups format - NO MOCK DATA
  const groups: WhatsAppGroup[] = useMemo(() => {
    if (!departmentGroupsData || !Array.isArray(departmentGroupsData)) return [];
    
    // Map real department groups from the new endpoint
    return departmentGroupsData.map((group: any) => ({
      id: group.id?.toString() || `group-${Math.random()}`,
      name: group.name || 'Unnamed Group',
      description: group.description || '',
      groupType: 'department_groups' as const,
      memberCount: group.departmentCount || 0,
      isPrivate: false,
      department: Array.isArray(group.departments) && group.departments.length > 0 ? group.departments[0] : '',
      avatarUrl: '', // Will be generated based on group name
      departments: group.departments || []
    }));
  }, [departmentGroupsData]);

  // REAL DEPARTMENTS, DESIGNATIONS, AND DEPARTMENT GROUPS - NO MOCK DATA
  const { data: departmentsData = [], error: departmentsError, isLoading: departmentsLoading } = useQuery({
    queryKey: ['whatsapp-departments', Date.now()], // Force fresh call with timestamp
    queryFn: async () => {
      console.log('[MOBILE CONSOLE] 🔍 Fetching departments from API...');
      const response = await fetch('/api/whatsapp/departments', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      console.log('[MOBILE CONSOLE] 📡 Departments response status:', response.status);
      if (!response.ok) {
        console.error('[MOBILE CONSOLE] ❌ Departments API error:', response.status, response.statusText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const text = await response.text();
      console.log('[MOBILE CONSOLE] 📄 Raw departments response:', text);
      try {
        const data = JSON.parse(text);
        console.log('[MOBILE CONSOLE] ✅ Departments data parsed:', data);
        return data;
      } catch (e) {
        console.error('[MOBILE CONSOLE] ❌ Failed to parse departments JSON:', e);
        throw new Error('Invalid JSON response');
      }
    },
    staleTime: 0, // No cache - always fetch fresh
    gcTime: 0, // No memory retention
    refetchOnMount: true, // Always refetch
    refetchOnWindowFocus: true,
    retry: 1
  });

  const { data: designationsData = [], error: designationsError, isLoading: designationsLoading } = useQuery({
    queryKey: ['whatsapp-designations', Date.now()], // Force fresh call with timestamp
    queryFn: async () => {
      console.log('[MOBILE CONSOLE] 🔍 Fetching designations from API...');
      const response = await fetch('/api/whatsapp/designations', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      console.log('[MOBILE CONSOLE] 📡 Designations response status:', response.status);
      if (!response.ok) {
        console.error('[MOBILE CONSOLE] ❌ Designations API error:', response.status, response.statusText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const text = await response.text();
      console.log('[MOBILE CONSOLE] 📄 Raw designations response:', text);
      try {
        const data = JSON.parse(text);
        console.log('[MOBILE CONSOLE] ✅ Designations data parsed:', data);
        return data;
      } catch (e) {
        console.error('[MOBILE CONSOLE] ❌ Failed to parse designations JSON:', e);
        throw new Error('Invalid JSON response');
      }
    },
    staleTime: 0, // No cache - always fetch fresh
    gcTime: 0, // No memory retention
    refetchOnMount: true, // Always refetch
    refetchOnWindowFocus: true,
    retry: 1
  });

  // Department groups data is already declared above with WhatsApp groups query

  // Safely extract department and designation strings
  const departments = useMemo(() => {
    if (!departmentsData) return [];
    if (Array.isArray(departmentsData)) {
      return departmentsData.map(dept => 
        typeof dept === 'string' ? dept : 
        typeof dept === 'object' && dept?.name ? dept.name : 
        String(dept)
      );
    }
    return [];
  }, [departmentsData]);

  const designations = useMemo(() => {
    if (!designationsData) return [];
    if (Array.isArray(designationsData)) {
      return designationsData.map(desig => 
        typeof desig === 'string' ? desig : 
        typeof desig === 'object' && desig?.name ? desig.name : 
        String(desig)
      );
    }
    return [];
  }, [designationsData]);

  const { data: messages = [], isLoading: messagesLoading } = useQuery<WhatsAppMessage[]>({
    queryKey: ['/api/whatsapp/messages', selectedChat],
    enabled: !!selectedChat,
    refetchInterval: isWebView ? 10000 : 5000
  });

  // Queue management queries for mobile
  const { data: queueStats, isLoading: queueStatsLoading, refetch: refetchQueueStats } = useQuery<QueueStats>({
    queryKey: ['/api/whatsapp-queue/stats'],
    staleTime: 10000,
    refetchInterval: isWebView ? 30000 : 15000, // Optimized for mobile
  });

  const { data: queueItemsResponse, isLoading: queueItemsLoading, refetch: refetchQueueItems } = useQuery({
    queryKey: ['/api/whatsapp-queue/items', queueFilters, currentQueuePage, queueSortBy, queueSortOrder],
    staleTime: isWebView ? 10000 : 5000,
    refetchInterval: isWebView ? 20000 : 10000,
  });

  // Safely extract queue items from API response
  const queueItems = useMemo(() => {
    if (!queueItemsResponse) return [];
    if (Array.isArray(queueItemsResponse)) return queueItemsResponse;
    const response = queueItemsResponse as { items?: any[] };
    if (response.items && Array.isArray(response.items)) return response.items;
    return [];
  }, [queueItemsResponse]);

  const { data: queueActions = [], isLoading: queueActionsLoading, refetch: refetchQueueActions } = useQuery({
    queryKey: ['/api/whatsapp-queue/action-items'],
    staleTime: isWebView ? 10000 : 5000,
    refetchInterval: isWebView ? 10000 : 5000,
  });

  // Debug logging for mobile console data
  useEffect(() => {
    console.log('[MOBILE CONSOLE DEBUG] Raw allContacts data:', allContacts);
    console.log('[MOBILE CONSOLE DEBUG] allContacts length:', allContacts?.length);
    console.log('[MOBILE CONSOLE DEBUG] First 3 contacts:', allContacts?.slice(0, 3));
    
    // Debug API data fetching
    console.log('[MOBILE CONSOLE DEBUG] API Data Status:');
    console.log('- Departments:', departmentsData, departmentsError);
    console.log('- Designations:', designationsData, designationsError);
    console.log('- Groups:', departmentGroupsData, groupsError);
  }, [allContacts, departmentsData, designationsData, departmentGroupsData, departmentsError, designationsError, groupsError]);

  // Server-side filtering now handles all filters, so we use allContacts directly
  const filteredContacts = useMemo(() => {
    console.log('[MOBILE CONSOLE DEBUG] Using server-filtered contacts:', allContacts?.length);
    return allContacts || [];
  }, [allContacts]);

  // Mobile-optimized virtualized contacts (show only current range)
  const virtualizedContacts = useMemo(() => {
    return filteredContacts.slice(virtualizedRange.start, virtualizedRange.end);
  }, [filteredContacts, virtualizedRange]);

  // Queue action mutations for mobile
  const processQueueItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await apiRequest(`/api/whatsapp-queue/items/${itemId}/process`, { method: 'POST' });
    },
    onSuccess: () => {
      refetchQueueItems();
      refetchQueueStats();
      toast({ title: "Message processed successfully" });
    },
  });

  const cancelQueueItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await apiRequest(`/api/whatsapp-queue/items/${itemId}/cancel`, { method: 'POST' });
    },
    onSuccess: () => {
      refetchQueueItems();
      refetchQueueStats();
      toast({ title: "Message cancelled" });
    },
  });

  const retryQueueItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await apiRequest(`/api/whatsapp-queue/items/${itemId}/retry`, { method: 'POST' });
    },
    onSuccess: () => {
      refetchQueueItems();
      refetchQueueStats();
      toast({ title: "Message queued for retry" });
    },
  });

  const bulkQueueActionMutation = useMutation({
    mutationFn: async ({ action, itemIds }: { action: string; itemIds: string[] }) => {
      return await apiRequest(`/api/whatsapp-queue/bulk-action`, { method: 'POST', body: { action, itemIds } });
    },
    onSuccess: () => {
      refetchQueueItems();
      refetchQueueStats();
      setSelectedQueueItems([]);
      toast({ title: "Bulk action completed" });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { to: string; content: string; messageType?: string }) => {
      return await apiRequest('/api/whatsapp-direct/send-message', 'POST', messageData);
    },
    onSuccess: () => {
      setMessageInput('');
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/messages', selectedChat] });
      toast({
        title: "Message Sent",
        description: "Your message has been delivered",
      });
    },
    onError: () => {
      toast({
        title: "Send Failed",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Handle sending messages
  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedChat || sendMessageMutation.isPending) return;
    
    sendMessageMutation.mutate({
      to: selectedChat,
      content: messageInput.trim(),
      messageType: 'text'
    });
  };

  // Auto-scroll to bottom for new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Mobile-optimized contact load more
  const loadMoreContacts = useCallback(() => {
    if (virtualizedRange.end < filteredContacts.length) {
      setVirtualizedRange(prev => ({
        start: prev.start,
        end: Math.min(prev.end + 30, filteredContacts.length)
      }));
    }
  }, [filteredContacts.length, virtualizedRange.end]);

  // Format message timestamp for mobile
  const formatMobileTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString();
  };

  // Get message status icon
  const getMessageStatusIcon = (message: WhatsAppMessage) => {
    if (message.direction === 'incoming') return null;
    
    switch (message.status) {
      case 'sending':
        return <Clock className="h-3 w-3 text-gray-400" />;
      case 'sent':
        return <Check className="h-3 w-3 text-gray-400" />;
      case 'delivered':
        return <CheckCircle2 className="h-3 w-3 text-blue-500" />;
      case 'read':
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Clock className="h-3 w-3 text-gray-400" />;
    }
  };

  // If chat is selected, show chat interface
  if (selectedChat) {
    const selectedContact = (allContacts || []).find((c: WhatsAppContact) => c.phoneNumber === selectedChat);
    
    return (
      <div className="h-screen bg-gradient-to-br from-[#1A1B3E] via-[#2A2B5E] to-[#1A1B3E] flex flex-col">
        {/* Mobile Chat Header */}
        <div className="bg-gradient-to-r from-[#2A2B5E] to-[#3A3B6E] p-4 shadow-xl border-b border-purple-500/20">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedChat(null)}
              className="text-white hover:bg-white/10 p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <Avatar className="h-10 w-10 ring-2 ring-white/20">
              <AvatarImage src={selectedContact?.profileImage} />
              <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white text-sm">
                {selectedContact?.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold text-sm truncate">
                {selectedContact?.name}
              </div>
              <div className="text-gray-300 text-xs">
                {selectedContact?.isOnline ? 'online' : selectedContact?.lastSeen ? `last seen ${formatMobileTime(selectedContact.lastSeen)}` : 'offline'}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 p-2">
                <Phone className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 p-2">
                <Video className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 p-2">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden bg-gradient-to-br from-[#1A1B3E]/50 to-[#2A2B5E]/50">
          <ScrollArea className="h-full p-4">
            {messagesLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No messages yet</p>
                  <p className="text-sm">Send a message to start the conversation</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {(messages || []).map((message: WhatsAppMessage) => (
                  <div
                    key={message.id}
                    className={`flex ${message.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-2xl ${
                        message.direction === 'outgoing'
                          ? 'bg-gradient-to-r from-green-600 to-green-700 text-white'
                          : 'bg-white/10 backdrop-blur-sm text-white border border-white/20'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <div className={`flex items-center justify-end gap-1 mt-1 ${
                        message.direction === 'outgoing' ? 'text-green-100' : 'text-gray-400'
                      }`}>
                        <span className="text-xs">{formatMobileTime(message.timestamp)}</span>
                        {getMessageStatusIcon(message)}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Mobile Message Input */}
        <div className="p-4 bg-gradient-to-r from-[#2A2B5E] to-[#3A3B6E] border-t border-purple-500/20">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 p-2"
              onClick={() => setIsAttachmentMenuOpen(true)}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            
            <div className="flex-1 relative">
              <Input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type a message..."
                className="bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder-gray-300 rounded-full pl-4 pr-12"
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-300 hover:bg-white/10 p-1.5"
              >
                <Smile className="h-4 w-4" />
              </Button>
            </div>
            
            {messageInput.trim() ? (
              <Button
                onClick={handleSendMessage}
                disabled={sendMessageMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-full"
              >
                <Send className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10 p-3"
                onMouseDown={() => setIsRecording(true)}
                onMouseUp={() => setIsRecording(false)}
                onTouchStart={() => setIsRecording(true)}
                onTouchEnd={() => setIsRecording(false)}
              >
                <Mic className={`h-5 w-5 ${isRecording ? 'text-red-400' : ''}`} />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main interface with tabs
  return (
    <div className="h-screen bg-gradient-to-br from-[#1A1B3E] via-[#2A2B5E] to-[#1A1B3E] flex flex-col">
      {/* Mobile Header */}
      <div className="bg-gradient-to-r from-[#2A2B5E] to-[#3A3B6E] p-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <Link href="/mobile/admin/dashboard">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 p-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full blur opacity-75 animate-pulse"></div>
              <div className="relative bg-green-500 h-3 w-3 rounded-full"></div>
            </div>
            <h1 className="text-white text-lg font-bold">WhatsApp Console</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 p-2">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 p-2">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* API Status */}
        {apiStatus && (
          <div className="flex items-center gap-2 text-sm">
            <div className={`h-2 w-2 rounded-full ${
              (apiStatus as any)?.healthy ? 'bg-green-400' : 'bg-red-400'
            }`} />
            <span className="text-gray-300">
              {(apiStatus as any)?.healthy ? 'Connected' : 'Disconnected'} • {Array.isArray(filteredContacts) ? String(filteredContacts.length) : '0'} contacts
            </span>
          </div>
        )}
      </div>

      {/* Mobile Tabs */}
      <div className="bg-[#2A2B5E]/80 backdrop-blur-sm border-b border-purple-500/20">
        <div className="flex">
          {[
            { id: 'chats', label: 'Chats', icon: MessageSquare },
            { id: 'contacts', label: 'Contacts', icon: Users },
            { id: 'groups', label: 'Groups', icon: Users },
            { id: 'queue', label: 'Queue', icon: Activity },
            { id: 'gateway', label: 'Gateway', icon: Shield }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'text-white border-b-2 border-green-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      {(activeTab === 'contacts' || activeTab === 'groups') && (
        <div className="p-4 bg-[#1A1B3E]/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab} (name, phone, department, designation)...`}
              className="pl-10 bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder-gray-400"
            />
            {debouncedSearchQuery !== searchQuery && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              </div>
            )}
          </div>
          
          {activeTab === 'contacts' && (
            <div className="space-y-3 mt-3">
              {/* Contact Type Filter Buttons */}
              <div className="flex gap-2">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'employees', label: 'Staff' },
                  { id: 'contacts_public', label: 'Public' },
                  { id: 'contacts_private', label: 'Private' }
                ].map(({ id, label }) => (
                  <Button
                    key={id}
                    size="sm"
                    variant={contactFilter === id ? "default" : "outline"}
                    onClick={() => setContactFilter(id as any)}
                    className={contactFilter === id ? 
                      "bg-green-600 hover:bg-green-700 text-white" : 
                      "bg-white/10 text-gray-300 border-white/20 hover:bg-white/20"
                    }
                  >
                    {label}
                  </Button>
                ))}
              </div>

              {/* Department, Designation, and Department Groups Filters - As requested by user */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Department</label>
                    <select
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm rounded px-3 py-2"
                    >
                      <option value="" className="bg-gray-800">All Departments</option>
                      {departments.map((dept: string, index: number) => (
                        <option key={`dept-${index}-${dept}`} value={dept} className="bg-gray-800">
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Designation</label>
                    <select
                      value={designationFilter}
                      onChange={(e) => setDesignationFilter(e.target.value)}
                      className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm rounded px-3 py-2"
                    >
                      <option value="" className="bg-gray-800">All Designations</option>
                      {designations.map((designation: string, index: number) => (
                        <option key={`desig-${index}-${designation}`} value={designation} className="bg-gray-800">
                          {designation}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Department Groups Filter - REAL DATA */}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Department Groups</label>
                  <select
                    value={departmentGroupFilter}
                    onChange={(e) => setDepartmentGroupFilter(e.target.value)}
                    className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm rounded px-3 py-2"
                  >
                    <option value="" className="bg-gray-800">All Groups</option>
                    {groups.map((group: WhatsAppGroup, index: number) => (
                      <option key={`group-${index}-${group.id}`} value={group.name} className="bg-gray-800">
                        {group.name} ({group.memberCount} members)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Filter Status and Clear Button */}
              {(searchQuery || departmentFilter || designationFilter || departmentGroupFilter || contactFilter !== 'all') && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">
                    {debouncedSearchQuery && `"${debouncedSearchQuery}"`}
                    {departmentFilter && ` • ${departmentFilter}`}
                    {designationFilter && ` • ${designationFilter}`}
                    {departmentGroupFilter && ` • ${departmentGroupFilter}`}
                    {contactFilter !== 'all' && ` • ${contactFilter}`}
                  </span>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setDebouncedSearchQuery('');
                      setDepartmentFilter('');
                      setDesignationFilter('');
                      setDepartmentGroupFilter('');
                      setContactFilter('all');
                    }}
                    className="text-purple-400 hover:text-purple-300 underline"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {activeTab === 'chats' && (
            <div className="p-4">
              <div className="text-center py-8">
                <MessageSquare className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-white text-lg font-medium mb-2">No recent chats</h3>
                <p className="text-gray-400 text-sm mb-4">Start a conversation from your contacts</p>
                <Button 
                  onClick={() => setActiveTab('contacts')}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Browse Contacts
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'contacts' && (
            <div className="space-y-1">
              {contactsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              ) : virtualizedContacts.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-white text-lg font-medium mb-2">No contacts found</h3>
                  <p className="text-gray-400 text-sm">Try adjusting your search or filters</p>
                </div>
              ) : (
                <>
                  {virtualizedContacts.map((contact: WhatsAppContact) => (
                    <div
                      key={contact.id}
                      onClick={() => setSelectedChat(contact.phoneNumber)}
                      className="flex items-center gap-3 p-4 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5"
                    >
                      <Avatar className="h-12 w-12 ring-2 ring-white/10">
                        <AvatarImage src={contact.profileImage} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white">
                          {contact.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-white font-medium text-sm truncate">{contact.name}</h3>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              contact.contactType === 'employees' ? 'border-blue-400 text-blue-400' :
                              contact.contactType === 'contacts_public' ? 'border-green-400 text-green-400' :
                              'border-purple-400 text-purple-400'
                            }`}
                          >
                            {contact.contactType === 'employees' ? 'Staff' :
                             contact.contactType === 'contacts_public' ? 'Public' : 'Private'}
                          </Badge>
                        </div>
                        
                        <p className="text-gray-400 text-xs truncate">{contact.phoneNumber}</p>
                        
                        {contact.department && (
                          <p className="text-gray-500 text-xs truncate">{contact.department}</p>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-end gap-1">
                        <div className={`h-2 w-2 rounded-full ${contact.isOnline ? 'bg-green-400' : 'bg-gray-500'}`} />
                        {contact.unreadCount && contact.unreadCount > 0 && (
                          <Badge className="bg-green-600 text-white text-xs min-w-[20px] h-5 flex items-center justify-center">
                            {contact.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {virtualizedRange.end < filteredContacts.length && (
                    <div className="p-4 text-center">
                      <Button
                        onClick={loadMoreContacts}
                        variant="outline"
                        className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                      >
                        Load More ({filteredContacts.length - virtualizedRange.end} remaining)
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'groups' && (
            <div className="p-4">
              <div className="text-center py-8">
                <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-white text-lg font-medium mb-2">Groups</h3>
                <p className="text-gray-400 text-sm">Department groups and WhatsApp groups will appear here</p>
              </div>
            </div>
          )}

          {activeTab === 'queue' && (
            <div className="bg-gradient-to-b from-[#1a1b2e] via-[#2a2b3e] to-[#3a3b4e] min-h-full">
              {/* Mobile Queue Header */}
              <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-blue-900 p-4 border-b border-gray-700/50">
                <div className="flex items-center justify-between mb-3">
                  <h1 className="text-lg font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">
                    Queue Management
                  </h1>
                  <Button 
                    onClick={() => refetchQueueStats()}
                    disabled={queueStatsLoading}
                    size="sm"
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-full p-2"
                  >
                    {queueStatsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                  </Button>
                </div>
                
                {/* Compact KPI Grid - 4x2 for mobile */}
                <div className="grid grid-cols-4 gap-1 mb-3">
                  <Card className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-500/30 backdrop-blur-xl">
                    <CardContent className="p-2 text-center">
                      <Clock className="w-3 h-3 text-purple-300 mx-auto mb-1" />
                      <div className="text-sm font-bold text-white">{queueStats?.pending || 0}</div>
                      <div className="text-xs text-purple-200">Pending</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-500/30 backdrop-blur-xl">
                    <CardContent className="p-2 text-center">
                      <PlayCircle className="w-3 h-3 text-blue-300 mx-auto mb-1 animate-pulse" />
                      <div className="text-sm font-bold text-white">{queueStats?.processing || 0}</div>
                      <div className="text-xs text-blue-200">Processing</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-500/30 backdrop-blur-xl">
                    <CardContent className="p-2 text-center">
                      <CheckCircle className="w-3 h-3 text-green-300 mx-auto mb-1" />
                      <div className="text-sm font-bold text-white">{queueStats?.sent || 0}</div>
                      <div className="text-xs text-green-200">Sent</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-red-600/20 to-red-800/20 border-red-500/30 backdrop-blur-xl">
                    <CardContent className="p-2 text-center">
                      <XCircle className="w-3 h-3 text-red-300 mx-auto mb-1" />
                      <div className="text-sm font-bold text-white">{queueStats?.failed || 0}</div>
                      <div className="text-xs text-red-200">Failed</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-indigo-600/20 to-purple-800/20 border-indigo-500/30 backdrop-blur-xl">
                    <CardContent className="p-2 text-center">
                      <BarChart3 className="w-3 h-3 text-indigo-300 mx-auto mb-1" />
                      <div className="text-sm font-bold text-white">
                        {(queueStats?.pending || 0) + (queueStats?.processing || 0) + (queueStats?.sent || 0) + (queueStats?.failed || 0)}
                      </div>
                      <div className="text-xs text-indigo-200">Total</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-cyan-600/20 to-cyan-800/20 border-cyan-500/30 backdrop-blur-xl">
                    <CardContent className="p-2 text-center">
                      <TrendingUp className="w-3 h-3 text-cyan-300 mx-auto mb-1" />
                      <div className="text-sm font-bold text-white">
                        {queueStats?.sent && (queueStats.sent + queueStats.failed) > 0 
                          ? Math.round((queueStats.sent / (queueStats.sent + queueStats.failed)) * 100) 
                          : 0}%
                      </div>
                      <div className="text-xs text-cyan-200">Success</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-indigo-600/20 to-indigo-800/20 border-indigo-500/30 backdrop-blur-xl">
                    <CardContent className="p-2 text-center">
                      <Timer className="w-3 h-3 text-indigo-300 mx-auto mb-1" />
                      <div className="text-sm font-bold text-white">{queueStats?.todayStats?.avgProcessingTime || '0s'}</div>
                      <div className="text-xs text-indigo-200">Avg Time</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-500/30 backdrop-blur-xl">
                    <CardContent className="p-2 text-center">
                      <Activity className="w-3 h-3 text-purple-300 mx-auto mb-1" />
                      <div className="text-sm font-bold text-white">
                        {queueStats?.failed && queueStats.failed > 5 ? 'Poor' : 
                         queueStats?.processing && queueStats.processing > 10 ? 'Busy' : 'Good'}
                      </div>
                      <div className="text-xs text-purple-200">Health</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Queue Action Buttons */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <Button 
                    onClick={async () => {
                      try {
                        toast({ title: "Processing Queue", description: "Processing all pending items..." });
                        await apiRequest('/api/whatsapp-queue/process-all', { method: 'POST' });
                        refetchQueueStats();
                        refetchQueueItems();
                        toast({ title: "Success", description: "Queue processing started" });
                      } catch (error) {
                        toast({ title: "Error", description: "Failed to process queue", variant: "destructive" });
                      }
                    }}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-xs py-2"
                  >
                    <PlayCircle className="w-3 h-3 mr-1" />
                    Process Queue
                  </Button>
                  <Button 
                    onClick={async () => {
                      try {
                        toast({ title: "Flushing Queue", description: "Clearing all queue items..." });
                        await apiRequest('/api/whatsapp-queue/flush-all', { method: 'POST' });
                        refetchQueueStats();
                        refetchQueueItems();
                        toast({ title: "Success", description: "Queue flushed successfully" });
                      } catch (error) {
                        toast({ title: "Error", description: "Failed to flush queue", variant: "destructive" });
                      }
                    }}
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-xs py-2"
                  >
                    <Trash className="w-3 h-3 mr-1" />
                    Flush Queue
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <Button 
                    onClick={async () => {
                      try {
                        toast({ title: "Flush & Requeue", description: "Clearing failed items and requeuing..." });
                        await apiRequest('/api/whatsapp-queue/flush-and-requeue', { method: 'POST' });
                        refetchQueueStats();
                        refetchQueueItems();
                        toast({ title: "Success", description: "Failed items cleared and requeued" });
                      } catch (error) {
                        toast({ title: "Error", description: "Failed to flush and requeue", variant: "destructive" });
                      }
                    }}
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-xs py-2"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Flush & Requeue
                  </Button>
                  <Button 
                    onClick={async () => {
                      try {
                        toast({ title: "Requeue Failed", description: "Requeuing failed items..." });
                        await apiRequest('/api/whatsapp-queue/requeue-failed', { method: 'POST' });
                        refetchQueueStats();
                        refetchQueueItems();
                        toast({ title: "Success", description: "Failed items requeued" });
                      } catch (error) {
                        toast({ title: "Error", description: "Failed to requeue items", variant: "destructive" });
                      }
                    }}
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-xs py-2"
                  >
                    <RefreshCcw className="w-3 h-3 mr-1" />
                    Requeue Failed
                  </Button>
                </div>

                {/* Mobile Queue Search */}
                <div className="relative mt-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input 
                    placeholder="Search queue items..."
                    value={queueFilters.search}
                    onChange={(e) => setQueueFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400 rounded-full text-sm"
                  />
                </div>

                {/* Mobile Priority Filters */}
                <div className="flex space-x-1 mt-2">
                  {['urgent', 'high', 'normal', 'low'].map((priority) => (
                    <Badge 
                      key={priority}
                      className={`px-2 py-1 text-xs cursor-pointer transition-all duration-200 ${
                        queueFilters.priority === priority 
                          ? 'bg-purple-600/50 text-white' 
                          : 'bg-white/10 hover:bg-white/20 text-gray-300'
                      }`}
                      onClick={() => setQueueFilters(prev => ({ 
                        ...prev, 
                        priority: prev.priority === priority ? '' : priority 
                      }))}
                    >
                      {priority.charAt(0).toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Mobile Queue Items List */}
              <div className="p-3 space-y-3">
                {queueItemsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                  </div>
                ) : queueItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Activity className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No items in queue</p>
                  </div>
                ) : (
                  queueItems.map((item: any) => (
                    <div
                      key={item.id}
                      className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-xl rounded-xl p-3 border border-gray-600/30 active:scale-95 transition-all duration-200"
                    >
                      <div className="flex items-start space-x-3">
                        {/* Mobile Avatar with Priority */}
                        <div className="relative flex-shrink-0">
                          <Avatar className="w-10 h-10 border-2 border-purple-500/30">
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white font-semibold text-sm">
                              {item.recipientName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border border-gray-800 ${
                            item.priority === 'urgent' ? 'bg-red-500' :
                            item.priority === 'high' ? 'bg-purple-600' :
                            item.priority === 'normal' ? 'bg-blue-500' :
                            'bg-gray-500'
                          }`} />
                        </div>
                        
                        {/* Mobile Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-white text-sm truncate pr-2">{item.recipientName}</h3>
                            <div className="flex space-x-1 flex-shrink-0">
                              {item.status === 'failed' && (
                                <Button
                                  size="sm"
                                  onClick={() => retryQueueItemMutation.mutate(item.id)}
                                  disabled={retryQueueItemMutation.isPending}
                                  className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-full p-1.5 min-w-0"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </Button>
                              )}
                              
                              {item.status === 'pending' && (
                                <Button
                                  size="sm"
                                  onClick={() => processQueueItemMutation.mutate(item.id)}
                                  disabled={processQueueItemMutation.isPending}
                                  className="bg-gradient-to-r from-green-600 to-green-700 rounded-full p-1.5 min-w-0"
                                >
                                  <PlayCircle className="w-3 h-3" />
                                </Button>
                              )}
                              
                              {(item.status === 'pending' || item.status === 'processing') && (
                                <Button
                                  size="sm"
                                  onClick={() => cancelQueueItemMutation.mutate(item.id)}
                                  disabled={cancelQueueItemMutation.isPending}
                                  className="bg-gradient-to-r from-red-600 to-red-700 rounded-full p-1.5 min-w-0"
                                >
                                  <Ban className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge className={`text-xs px-1.5 py-0.5 ${
                              item.status === 'pending' ? 'bg-purple-600/30 text-purple-200' :
                              item.status === 'processing' ? 'bg-blue-600/30 text-blue-200' :
                              item.status === 'sent' ? 'bg-green-600/30 text-green-200' :
                              item.status === 'failed' ? 'bg-red-600/30 text-red-200' :
                              'bg-gray-600/30 text-gray-200'
                            }`}>
                              {item.status.toUpperCase()}
                            </Badge>
                            <Badge className="text-xs bg-white/10 text-gray-300 px-1.5 py-0.5">
                              {item.messageType.toUpperCase()}
                            </Badge>
                          </div>
                          
                          <p className="text-xs text-gray-300 mb-1 line-clamp-2">
                            {item.content}
                          </p>
                          
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span className="truncate">{item.phoneNumber}</span>
                            <span>{item.attempts}/{item.maxAttempts}</span>
                          </div>
                        </div>
                      </div>

                      {/* Mobile Error Message */}
                      {item.status === 'failed' && item.errorMessage && (
                        <div className="mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded-lg">
                          <div className="flex items-center space-x-2 text-red-300">
                            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                            <span className="text-xs">{item.errorMessage}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Mobile Bulk Actions Bar */}
              {selectedQueueItems.length > 0 && (
                <div className="fixed bottom-16 left-4 right-4 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border border-gray-700/50 rounded-xl p-3 backdrop-blur-xl shadow-xl">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{selectedQueueItems.length} selected</span>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => bulkQueueActionMutation.mutate({ action: 'process', itemIds: selectedQueueItems })}
                        disabled={bulkQueueActionMutation.isPending}
                        size="sm"
                        className="bg-gradient-to-r from-green-600 to-green-700 rounded-full text-xs px-3"
                      >
                        <PlayCircle className="w-3 h-3 mr-1" />
                        Process
                      </Button>
                      <Button
                        onClick={() => bulkQueueActionMutation.mutate({ action: 'cancel', itemIds: selectedQueueItems })}
                        disabled={bulkQueueActionMutation.isPending}
                        size="sm"
                        className="bg-gradient-to-r from-red-600 to-red-700 rounded-full text-xs px-3"
                      >
                        <Ban className="w-3 h-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'gateway' && (
            <div className="p-4">
              <div className="text-center py-8">
                <Shield className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-white text-lg font-medium mb-2">Gateway Status</h3>
                <p className="text-gray-400 text-sm">WhatsApp API gateway and diagnostics</p>
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}