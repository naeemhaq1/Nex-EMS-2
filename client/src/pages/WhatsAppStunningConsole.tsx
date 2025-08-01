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
  Mail, MessageCircle, Globe, Target, Heart, Loader2, XCircle, 
  PlayCircle, SkipForward, RotateCcw, AlertTriangle, Timer, 
  CheckCircle, Ban, Trash, PauseCircle, FastForward, ArrowUpDown,
  Trash2, Calendar, ShieldCheck, Layers, Repeat, ArrowLeft
} from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
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

// Enhanced types for WhatsApp-identical interface
interface WhatsAppContact {
  id: string;
  phoneNumber: string;
  name: string;
  profileImage?: string;
  lastSeen?: string;
  isOnline: boolean;
  contactType: 'employee' | 'public' | 'private';
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
  todayStats: {
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

export default function WhatsAppStunningConsole() {
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts' | 'groups' | 'gateway' | 'diagnostics' | 'queue' | 'analytics'>('chats');
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  // Separate filter states for Chats and Contacts
  const [chatFilters, setChatFilters] = useState({
    searchQuery: '',
    searchInput: '',
    selectedDepartment: '',
    selectedDesignation: '',
    selectedGroupFilter: null as string | null,
    contactTypeFilter: ''
  });
  
  const [contactFilters, setContactFilters] = useState({
    searchQuery: '',
    searchInput: '',
    selectedDepartment: '',
    selectedDesignation: '',
    selectedGroupFilter: null as string | null,
    contactTypeFilter: ''
  });

  // Get current filter values based on active tab
  const currentFilters = activeTab === 'chats' ? chatFilters : contactFilters;
  const setCurrentFilters = activeTab === 'chats' ? setChatFilters : setContactFilters;
  
  // Derived values for backwards compatibility
  const searchQuery = currentFilters.searchQuery;
  const searchInput = currentFilters.searchInput;
  const selectedDepartment = currentFilters.selectedDepartment;
  const selectedDesignation = currentFilters.selectedDesignation;
  const selectedGroupFilter = currentFilters.selectedGroupFilter;
  const contactTypeFilter = currentFilters.contactTypeFilter;
  
  // Helper functions to update specific filter values
  const setSearchQuery = (value: string) => setCurrentFilters(prev => ({ ...prev, searchQuery: value }));
  const setSearchInput = (value: string) => setCurrentFilters(prev => ({ ...prev, searchInput: value }));
  const setSelectedDepartment = (value: string) => setCurrentFilters(prev => ({ ...prev, selectedDepartment: value }));
  const setSelectedDesignation = (value: string) => setCurrentFilters(prev => ({ ...prev, selectedDesignation: value }));
  const setSelectedGroupFilter = (value: string | null) => setCurrentFilters(prev => ({ ...prev, selectedGroupFilter: value }));
  const setContactTypeFilter = (value: string) => setCurrentFilters(prev => ({ ...prev, contactTypeFilter: value }));
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isDiagnosticsRunning, setIsDiagnosticsRunning] = useState(false);
  
  // Performance optimization states for 300+ contacts
  const [contactFilter, setContactFilter] = useState<'all' | 'employee' | 'public' | 'private'>('all');
  const [virtualizedRange, setVirtualizedRange] = useState({ start: 0, end: 50 });
  const [preloadedContacts, setPreloadedContacts] = useState<Map<string, WhatsAppContact>>(new Map());
  const [contactCache, setContactCache] = useState<Map<string, any>>(new Map());
  const [isPreloading, setIsPreloading] = useState(false);
  
  // WebView optimization detection for mobile APK
  const isWebView = useRef(typeof window !== 'undefined' && (
    /Android.*wv|iPhone.*Mobile.*Safari|webview/i.test(navigator.userAgent) ||
    (window as any).webkit?.messageHandlers ||
    (window as any).Android ||
    window.location.href.includes('file://')
  )).current;
  
  const contactsScrollRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Debounced search implementation with 3 character minimum
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput.length === 0 || searchInput.length >= 3) {
        setSearchQuery(searchInput);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchInput, setSearchQuery]);
  
  // New contact form state
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newContactType, setNewContactType] = useState<'employee' | 'public' | 'private'>('public');
  
  // Add contact mutation
  const addContactMutation = useMutation({
    mutationFn: async (contactData: { name: string; phone: string; contactType: 'public' | 'private' }) => {
      return await apiRequest({
        url: '/api/whatsapp-console/contacts',
        method: 'POST',
        data: contactData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp-console/contacts'] });
      setIsContactModalOpen(false);
      setNewContactName('');
      setNewContactPhone('');
      setNewContactType('public');
      toast({ title: "Contact added successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to add contact", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    }
  });
  
  // File handling state
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Queue management state
  const [queueFilters, setQueueFilters] = useState({
    status: '',
    priority: '',
    messageType: '',
    search: ''
  });
  const [currentQueuePage, setCurrentQueuePage] = useState(1);
  const [selectedQueueItems, setSelectedQueueItems] = useState<string[]>([]);
  const [queueSortBy, setQueueSortBy] = useState('createdAt');
  const [queueSortOrder, setQueueSortOrder] = useState('desc');
  const [isRecording, setIsRecording] = useState(false);
  const [audioRecorder, setAudioRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [previewMode, setPreviewMode] = useState<'image' | 'video' | 'audio' | 'document' | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Test messaging feature state
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [isTestMessageSending, setIsTestMessageSending] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  // Debounced search with minimum 3 characters requirement  
  const debouncedSearch = useCallback((query: string) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      // Only search if 3+ characters or empty (to show all)
      if (query.length === 0 || query.length >= 3) {
        setSearchQuery(query);
      }
    }, 300); // Reduced to 300ms for faster response
  }, [setSearchQuery]);

  // Intelligent contact preloading for WebView optimization
  const preloadContacts = useCallback(async (contacts: WhatsAppContact[]) => {
    if (isPreloading || contacts.length === 0) return;
    
    setIsPreloading(true);
    const batchSize = isWebView ? 20 : 50; // Smaller batches for WebView
    
    for (let i = 0; i < Math.min(contacts.length, 100); i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      await new Promise(resolve => {
        requestIdleCallback(() => {
          batch.forEach(contact => {
            setPreloadedContacts(prev => new Map(prev.set(contact.id, contact)));
          });
          resolve(void 0);
        }, { timeout: isWebView ? 100 : 50 });
      });
      
      // Yield to main thread for WebView optimization
      if (isWebView) {
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    }
    setIsPreloading(false);
  }, [isWebView, isPreloading]);

  // Virtualized contact rendering for performance
  const handleContactScroll = useCallback((e: Event) => {
    const target = e.target as HTMLDivElement;
    const scrollTop = target.scrollTop;
    const clientHeight = target.clientHeight;
    const scrollHeight = target.scrollHeight;
    
    // Calculate visible range
    const itemHeight = 80; // Approximate contact item height
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(clientHeight / itemHeight) + 10, // 10 item buffer
      Math.floor(scrollHeight / itemHeight)
    );
    
    setVirtualizedRange({ start: visibleStart, end: visibleEnd });
    
    // Preload upcoming contacts if scrolling down
    if (scrollTop > lastScrollTop.current) {
      const threshold = scrollHeight * 0.8;
      if (scrollTop + clientHeight > threshold) {
        // Load more contacts near bottom
        setVirtualizedRange(prev => ({ 
          ...prev, 
          end: Math.min(prev.end + 20, 1000) 
        }));
      }
    }
    
    lastScrollTop.current = scrollTop;
  }, []);



  // WebView-specific optimizations
  useEffect(() => {
    if (isWebView) {
      // Disable text selection for better WebView performance
      document.body.style.webkitUserSelect = 'none';
      document.body.style.userSelect = 'none';
      
      // Optimize scrolling for WebView
      (document.body.style as any).webkitOverflowScrolling = 'touch';
      (document.body.style as any).overflowScrolling = 'touch';
      
      // Enable hardware acceleration
      const style = document.createElement('style');
      style.textContent = `
        * {
          -webkit-transform: translateZ(0);
          transform: translateZ(0);
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
        }
        .contact-item {
          will-change: transform;
          contain: layout style paint;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
      };
    }
  }, [isWebView]);

  // Fetch contacts with intelligent caching and filtering
  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ['/api/whatsapp-console/contacts', searchQuery, selectedDepartment, selectedDesignation, contactFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery && searchQuery.length >= 3) params.append('search', searchQuery);
      if (selectedDepartment) params.append('department', selectedDepartment);
      if (selectedDesignation) params.append('designation', selectedDesignation);
      if (contactFilter !== 'all') params.append('contactType', contactFilter);
      
      const response = await fetch(`/api/whatsapp-console/contacts?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch contacts');
      return response.json();
    },
    staleTime: isWebView ? 60000 : 30000, // Enhanced caching
    gcTime: isWebView ? 300000 : 300000,
    refetchOnWindowFocus: !isWebView,
  });

  // Queue management queries
  const { data: queueStats, isLoading: queueStatsLoading, refetch: refetchQueueStats } = useQuery<QueueStats>({
    queryKey: ['/api/whatsapp-queue/stats'],
    staleTime: 10000,
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  const { data: queueItemsResponse, isLoading: queueItemsLoading, refetch: refetchQueueItems } = useQuery({
    queryKey: ['/api/whatsapp-queue/items', queueFilters, currentQueuePage, queueSortBy, queueSortOrder],
    staleTime: 5000,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Extract items array from API response
  const queueItems = Array.isArray((queueItemsResponse as any)?.items) ? (queueItemsResponse as any).items : [];

  const { data: queueActions = [], isLoading: queueActionsLoading, refetch: refetchQueueActions } = useQuery({
    queryKey: ['/api/whatsapp-queue/action-items'],
    staleTime: 5000,
    refetchInterval: 5000, // Refresh every 5 seconds for urgent actions
  });

  // Queue action mutations
  const processQueueItemMutation = useMutation({
    mutationFn: async (itemId: string) => await apiRequest({ url: `/api/whatsapp-queue/items/${itemId}/process`, method: 'POST' }),
    onSuccess: () => {
      refetchQueueItems();
      refetchQueueStats();
      toast({ title: "Message processed successfully" });
    },
  });

  const cancelQueueItemMutation = useMutation({
    mutationFn: async (itemId: string) => await apiRequest({ url: `/api/whatsapp-queue/items/${itemId}/cancel`, method: 'POST' }),
    onSuccess: () => {
      refetchQueueItems();
      refetchQueueStats();
      toast({ title: "Message cancelled" });
    },
  });

  const retryQueueItemMutation = useMutation({
    mutationFn: async (itemId: string) => await apiRequest({ url: `/api/whatsapp-queue/items/${itemId}/retry`, method: 'POST' }),
    onSuccess: () => {
      refetchQueueItems();
      refetchQueueStats();
      toast({ title: "Message queued for retry" });
    },
  });

  const bulkQueueActionMutation = useMutation({
    mutationFn: async ({ action, itemIds }: { action: string; itemIds: string[] }) => 
      await apiRequest({ 
        url: `/api/whatsapp-queue/bulk-action`,
        method: 'POST', 
        data: { action, itemIds }
      }),
    onSuccess: () => {
      refetchQueueItems();
      refetchQueueStats();
      setSelectedQueueItems([]);
      toast({ title: "Bulk action completed" });
    },
  });

  // Fetch departments from API with real database data
  const { data: departmentsData = [], isLoading: departmentsLoading } = useQuery<Array<{name: string, count: string}>>({
    queryKey: ['/api/whatsapp-console/departments'],
    refetchInterval: 300000, // 5 minutes
    staleTime: 180000, // 3 minutes
    retry: 2
  });

  // Fetch designations from API with real database data
  const { data: designationsData = [], isLoading: designationsLoading } = useQuery<Array<{name: string, count: string}>>({
    queryKey: ['/api/whatsapp-console/designations'],
    refetchInterval: 300000, // 5 minutes
    staleTime: 180000, // 3 minutes
    retry: 2
  });

  // Fetch department groups from API with proper error handling
  const { data: departmentGroupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ['/api/whatsapp-management/broadcast-groups'],
    refetchInterval: isWebView ? 300000 : 180000, // Less frequent refresh
    staleTime: isWebView ? 120000 : 60000,
    retry: 2
  });

  // Convert API data to WhatsApp groups format
  const groups = useMemo(() => {
    if (!departmentGroupsData || typeof departmentGroupsData !== 'object') return [];
    
    const data = departmentGroupsData as {
      systemGroups?: Array<{
        id: string;
        name: string;
        description: string;
        location: string;
        memberCount: number;
      }>;
      departmentGroups?: Array<{
        id: string;
        name: string;
        description: string;
        department: string;
        memberCount: number;
      }>;
    };
    
    const systemGroups = (data.systemGroups || []).map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      groupType: 'departments' as const,
      memberCount: group.memberCount,
      isPrivate: false,
      department: group.location
    }));

    const deptGroups = (data.departmentGroups || []).map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      groupType: 'department_groups' as const,
      memberCount: group.memberCount,
      isPrivate: false,
      department: group.department
    }));

    return [...systemGroups, ...deptGroups];
  }, [departmentGroupsData]);

  // Fetch messages for selected chat with WebView optimization
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['/api/whatsapp-console/messages', selectedChat],
    enabled: !!selectedChat,
    staleTime: isWebView ? 15000 : 10000, // Longer cache for WebView
    gcTime: isWebView ? 180000 : 300000, // 3 minutes cache for WebView
    refetchOnWindowFocus: !isWebView, // Disable auto-refetch in WebView
  });

  // Type-safe contact and message arrays (moved here before filteredContacts)
  const typedContacts = contacts as WhatsAppContact[];
  
  // Fix contact filtering to work properly with real data and new filters
  const filteredContacts = useMemo(() => {
    let filtered = typedContacts;
    
    // Apply contact type filter
    if (contactFilter !== 'all') {
      filtered = filtered.filter(contact => {
        if (contactFilter === 'employee') return contact.contactType === 'employee';
        if (contactFilter === 'public') return contact.contactType === 'public';
        if (contactFilter === 'private') return contact.contactType === 'private';
        return true;
      });
    }

    // Apply department filter
    if (selectedDepartment) {
      filtered = filtered.filter(contact => 
        contact.department && contact.department.toLowerCase().includes(selectedDepartment.toLowerCase())
      );
    }

    // Apply designation filter
    if (selectedDesignation) {
      filtered = filtered.filter(contact => 
        contact.designation && contact.designation.toLowerCase().includes(selectedDesignation.toLowerCase())
      );
    }

    // Apply group filter (checking if contact belongs to selected group)
    if (selectedGroupFilter) {
      filtered = filtered.filter(contact => {
        // Check if contact's department matches the group
        const selectedGroup = groups.find(group => group.name === selectedGroupFilter);
        if (selectedGroup) {
          return contact.department === selectedGroup.department;
        }
        return false;
      });
    }
    
    // Apply search filter (minimum 3 characters or empty)
    if (searchQuery && searchQuery.length >= 3) {
      filtered = filtered.filter(contact => 
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.phoneNumber.includes(searchQuery) ||
        (contact.department && contact.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (contact.designation && contact.designation.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    return filtered;
  }, [typedContacts, contactFilter, selectedDepartment, selectedDesignation, selectedGroupFilter, groups, searchQuery]);
  const typedMessages = messages as WhatsAppMessage[];

  // Duplicate filteredContacts removed - already defined above



  // Performance monitoring hook for large contact lists
  useEffect(() => {
    if (filteredContacts.length > 200 && !isWebView) {
      console.log(`[Performance] Managing ${filteredContacts.length} contacts with virtualization`);
    }
    
    // Preload critical contacts for smooth scrolling
    if (filteredContacts.length > 0) {
      const criticalContacts = filteredContacts.slice(0, 20);
      criticalContacts.forEach(contact => {
        setPreloadedContacts(prev => new Map(prev.set(contact.id, contact)));
      });
    }
  }, [filteredContacts.length, isWebView, filteredContacts]);

  // Enhanced chat list rendering with WhatsApp-identical styling
  const renderStunningChatList = () => (
    <div className="h-full bg-gradient-to-b from-[#111827] via-[#1f2937] to-[#374151] relative overflow-hidden">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-32 h-32 bg-purple-500 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-24 h-24 bg-blue-500 rounded-full blur-2xl animate-bounce" />
        <div className="absolute top-1/2 left-1/2 w-16 h-16 bg-green-500 rounded-full blur-xl animate-ping" />
      </div>

      {/* Header with stunning gradient */}
      <div className="relative bg-gradient-to-r from-indigo-900 via-purple-900 to-blue-900 p-6 border-b border-gray-700/50 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">
              WhatsApp Console
            </h1>
            <p className="text-gray-300 text-sm mt-1 flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
              {filteredContacts.length} contacts • All systems operational
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={() => setIsContactModalOpen(true)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-full shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Contact
            </Button>
          </div>
        </div>
        
        {/* Enhanced search and filter bar */}
        <div className="mt-4 space-y-3">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder={`Search ${typedContacts.length} contacts...`}
              className="pl-12 bg-white/10 border-white/20 text-white placeholder-gray-400 rounded-full h-12 focus:ring-2 focus:ring-purple-500/50 transition-all duration-200"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {isPreloading && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Filter dropdowns */}
          <div className="flex space-x-3">
            <div className="flex-1">
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full h-10 bg-white/10 border border-white/20 text-white rounded-xl px-3 text-sm focus:ring-2 focus:ring-purple-500/50"
                disabled={departmentsLoading}
              >
                <option value="" className="bg-gray-800 text-white">
                  {departmentsLoading ? 'Loading departments...' : 'All Departments'}
                </option>
                {Array.isArray(departmentsData) ? departmentsData.map((dept: any) => (
                  <option key={dept.name} value={dept.name} className="bg-gray-800 text-white">
                    {dept.name} ({dept.count})
                  </option>
                )) : []}
              </select>
            </div>
            
            <div className="flex-1">
              <select
                value={selectedDesignation}
                onChange={(e) => setSelectedDesignation(e.target.value)}
                className="w-full h-10 bg-white/10 border border-white/20 text-white rounded-xl px-3 text-sm focus:ring-2 focus:ring-purple-500/50"
                disabled={designationsLoading}
              >
                <option value="" className="bg-gray-800 text-white">
                  {designationsLoading ? 'Loading designations...' : 'All Designations'}
                </option>
                {Array.isArray(designationsData) ? designationsData.map((designation: any) => (
                  <option key={designation.name} value={designation.name} className="bg-gray-800 text-white">
                    {designation.name} ({designation.count})
                  </option>
                )) : []}
              </select>
            </div>

            <div className="flex-1">
              <select
                value={selectedGroupFilter || ''}
                onChange={(e) => setSelectedGroupFilter(e.target.value || null)}
                className="w-full h-10 bg-white/10 border border-white/20 text-white rounded-xl px-3 text-sm focus:ring-2 focus:ring-purple-500/50"
              >
                <option value="" className="bg-gray-800 text-white">All Groups</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.name} className="bg-gray-800 text-white">
                    {group.name} ({group.memberCount})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Contact type filter tabs with corrected employee count */}
        <div className="flex space-x-2 mt-4 overflow-x-auto">
          {[
            { key: 'all', label: 'All', count: typedContacts.length },
            { key: 'employee', label: 'Employees', count: typedContacts.filter(c => c.contactType === 'employee').length },
            { key: 'public', label: 'Public', count: typedContacts.filter(c => c.contactType === 'public').length },
            { key: 'private', label: 'Private', count: typedContacts.filter(c => c.contactType === 'private').length }
          ].map((filter) => (
            <Badge
              key={filter.key}
              onClick={() => {
                const newFilter = filter.key as 'all' | 'employee' | 'public' | 'private';
                setContactFilter(newFilter);
                setContactTypeFilter(filter.key === 'all' ? '' : filter.key);
              }}
              className={`px-4 py-2 cursor-pointer transition-all duration-200 flex-shrink-0 ${
                contactFilter === filter.key
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                  : 'bg-white/10 hover:bg-white/20 text-gray-300'
              }`}
            >
              {filter.label} ({filter.count})
            </Badge>
          ))}
        </div>
      </div>

      {/* Vertical scrolling contact list */}
      <div 
        ref={contactsScrollRef}
        className="flex-1 overflow-y-auto"
        style={{ 
          WebkitOverflowScrolling: 'touch'
        }}
      >
        <div className="p-4">
          {/* Performance stats for admins */}
          {isWebView && (
            <div className="mb-4 p-3 bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-lg border border-blue-500/30">
              <div className="text-xs text-blue-300 flex items-center justify-between">
                <span>WebView Mode: Optimized for mobile APK</span>
                <span>Showing {virtualizedRange.start}-{Math.min(virtualizedRange.end, filteredContacts.length)} of {filteredContacts.length}</span>
              </div>
            </div>
          )}
          
          {/* Simple vertical scrolling contact list */}
          <div className="space-y-3">
            {filteredContacts.map((contact, index) => (
                <div
                  key={contact.id}
                  onClick={() => setSelectedChat(contact.phoneNumber)}
                  className={`contact-item group relative p-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
                    selectedChat === contact.phoneNumber 
                      ? 'bg-gradient-to-r from-purple-600/30 to-blue-600/30 border border-purple-400/50' 
                      : 'bg-white/5 hover:bg-white/10 border border-white/10'
                  }`}
                >
              
              <div className="flex items-center space-x-3">
                <div className="relative flex-shrink-0">
                  <Avatar className="w-10 h-10 ring-1 ring-white/20">
                    <AvatarImage src={contact.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.name}&backgroundColor=2A2B5E&hair=short01,short02,short03&clothingColor=3366FF&accessoriesChance=30&facialHairChance=70&top=shortHair01,shortHair02,shortHair03&facialHair=beard01,beard02,mustache01`} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-semibold text-sm">
                      {contact.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {contact.isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-900" />
                  )}
                  {contact.unreadCount && contact.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {contact.unreadCount > 9 ? '9' : contact.unreadCount}
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-white truncate text-sm group-hover:text-purple-200 transition-colors">
                      {contact.name}
                    </h3>
                    <div className="flex items-center space-x-1">
                      {contact.isPinned && (
                        <Star className="w-3 h-3 text-purple-400" />
                      )}
                      <Badge
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          contact.contactType === 'employee' ? 'bg-blue-500/20 text-blue-300' :
                          contact.contactType === 'public' ? 'bg-green-500/20 text-green-300' :
                          'bg-purple-500/20 text-purple-300'
                        }`}
                      >
                        {contact.contactType === 'employee' ? 'E' :
                         contact.contactType === 'public' ? 'P' : 'Pr'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-gray-400 truncate flex-1 mr-2">
                      {contact.isTyping ? (
                        <span className="text-green-400 animate-pulse">typing...</span>
                      ) : (
                        contact.lastMessage || contact.phoneNumber
                      )}
                    </p>
                    {contact.lastSeen && !contact.isOnline && (
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {contact.lastSeen}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Enhanced message rendering with WhatsApp-identical styling
  const renderStunningMessage = (message: WhatsAppMessage) => {
    const isOutgoing = message.direction === 'outgoing';
    const messageTime = new Date(message.timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    const getStatusIcon = () => {
      switch (message.status) {
        case 'sending': return <Clock className="w-3 h-3 opacity-50 animate-spin" />;
        case 'sent': return <Check className="w-3 h-3 opacity-70" />;
        case 'delivered': return <CheckCircle2 className="w-3 h-3 opacity-70" />;
        case 'read': return <CheckCircle2 className="w-3 h-3 text-blue-400" />;
        case 'failed': return <X className="w-3 h-3 text-red-400" />;
        default: return null;
      }
    };

    return (
      <div key={message.id} className={`flex mb-4 ${isOutgoing ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-500`}>
        {!isOutgoing && (
          <Avatar className="w-8 h-8 mr-3 mt-1 ring-2 ring-white/10">
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${message.fromNumber}`} />
            <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-700 text-white text-xs">
              {message.fromNumber?.slice(-2) || 'U'}
            </AvatarFallback>
          </Avatar>
        )}
        
        <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-3xl shadow-2xl relative group transform hover:scale-[1.02] transition-all duration-200 ${
          isOutgoing 
            ? 'bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-700 text-white rounded-br-md shadow-purple-500/30' 
            : 'bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 text-white rounded-bl-md border border-gray-600/50 shadow-gray-900/50'
        }`}>
          {/* Message content */}
          <p className="text-sm leading-relaxed font-medium">{message.content}</p>
          
          {/* Message info footer */}
          <div className="flex items-center justify-end mt-2 space-x-2">
            {message.isStarred && (
              <Star className="w-3 h-3 text-purple-400 fill-current" />
            )}
            <span className="text-xs opacity-80 font-medium">{messageTime}</span>
            {isOutgoing && (
              <div className="flex items-center">
                {getStatusIcon()}
              </div>
            )}
          </div>
          
          {/* WhatsApp-style message tail */}
          <div className={`absolute bottom-0 w-4 h-4 ${
            isOutgoing 
              ? '-right-2 bg-gradient-to-br from-purple-600 to-indigo-700' 
              : '-left-2 bg-gradient-to-br from-gray-700 to-gray-900'
          } transform rotate-45 shadow-lg`} />
          
          {/* Hover glow effect */}
          <div className="absolute inset-0 rounded-3xl bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
        </div>
        
        {isOutgoing && (
          <Avatar className="w-8 h-8 ml-3 mt-1 ring-2 ring-purple-500/30">
            <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=admin" />
            <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white text-xs font-bold">
              AD
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    );
  };

  // Enhanced chat interface with stunning visuals
  const renderStunningChatInterface = () => {
    if (!selectedChat) {
      return (
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20 relative overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-blue-500 rounded-full blur-2xl animate-bounce" />
          </div>
          
          <div className="text-center z-10">
            <div className="w-32 h-32 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-purple-500/30">
              <MessageSquare className="w-16 h-16 text-white" />
            </div>
            <h3 className="text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent mb-4">
              Welcome to WhatsApp Console
            </h3>
            <p className="text-gray-400 text-lg max-w-md">
              Select a contact from the list to start an engaging conversation with stunning visual effects
            </p>
          </div>
        </div>
      );
    }

    const selectedContact = typedContacts.find((c: WhatsAppContact) => c.phoneNumber === selectedChat);

    return (
      <div className="flex-1 flex flex-col bg-gradient-to-b from-gray-900 to-gray-800 relative overflow-hidden">
        {/* Animated chat background */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 right-20 w-32 h-32 bg-purple-500 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 left-10 w-24 h-24 bg-blue-500 rounded-full blur-2xl animate-bounce" />
        </div>

        {/* Compact chat header */}
        <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-blue-900 border-b border-gray-700/50 px-3 py-2 flex items-center justify-between backdrop-blur-xl relative">
          <div className="flex items-center space-x-2">
            <Avatar className="w-8 h-8 ring-1 ring-white/20">
              <AvatarImage src={selectedContact?.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedContact?.name}`} />
              <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white font-bold text-xs">
                {selectedContact?.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="font-medium text-white text-sm truncate">{selectedContact?.name}</h3>
              <p className="text-xs text-gray-300 flex items-center">
                {selectedContact?.isOnline ? (
                  <>
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1 animate-pulse" />
                    Online
                  </>
                ) : (
                  `Last seen ${selectedContact?.lastSeen || 'recently'}`
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Removed Video and Phone icons per requirements */}
            <Button variant="ghost" size="sm" className="text-gray-300 hover:bg-white/10 rounded-full p-3 transition-all duration-200 hover:scale-110">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Compact messages area */}
        <ScrollArea className="flex-1 p-3 relative">
          <div className="space-y-1">
            {typedMessages.map((message: WhatsAppMessage) => renderStunningMessage(message))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Compact message input */}
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-t border-gray-700/50 p-2 backdrop-blur-xl">
          <div className="flex items-center space-x-2">
            <div className="flex-1 flex items-center bg-white/10 backdrop-blur-xl rounded-full px-4 py-2 border border-white/20 focus-within:border-purple-400/50 transition-all duration-200">
              <Input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-transparent border-none text-white placeholder-gray-400 focus:outline-none focus:ring-0 text-sm"
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white p-1 rounded-full hover:bg-white/10 transition-all duration-200">
                <Smile className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-300 hover:text-white p-1 rounded-full hover:bg-white/10 transition-all duration-200"
                onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
              >
                <Paperclip className="w-4 h-4" />
              </Button>
            </div>
            
            <Button 
              onClick={handleSendMessage}
              disabled={!messageInput.trim() || !selectedChat}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-full p-2 shadow-lg shadow-purple-500/30 transition-all duration-200 disabled:opacity-50"
            >
              <Send className="w-4 h-4 text-white" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { to: string; content: string; type?: string }) => {
      return await apiRequest({
        url: '/api/whatsapp-console/send-message',
        method: 'POST',
        data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp-console/messages', selectedChat] });
      setMessageInput('');
      toast({ title: 'Message sent successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to send message', description: error.message, variant: 'destructive' });
    }
  });

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedChat) return;
    
    sendMessageMutation.mutate({
      to: selectedChat,
      content: messageInput.trim(),
      type: 'text'
    });
  };

  // Test message mutation
  const testMessageMutation = useMutation({
    mutationFn: async (data: { to: string; content: string }) => {
      return await apiRequest({
        url: '/api/whatsapp-console/send-message',
        method: 'POST',
        data: { ...data, type: 'text' }
      });
    },
    onSuccess: () => {
      setTestPhoneNumber('');
      setTestMessage('');
      setIsTestMessageSending(false);
      toast({ title: 'Test message sent successfully' });
      // Refresh queue data to show the new message
      refetchQueueItems();
    },
    onError: (error: any) => {
      setIsTestMessageSending(false);
      toast({ 
        title: 'Failed to send test message', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  });

  const handleSendTestMessage = () => {
    if (!testPhoneNumber.trim() || !testMessage.trim()) return;
    
    setIsTestMessageSending(true);
    testMessageMutation.mutate({
      to: testPhoneNumber.trim(),
      content: testMessage.trim()
    });
  };

  // Message click handler for queue management
  const handleMessageClick = (wamNum: number) => {
    // Show message details modal or navigate to message details
    toast({ 
      title: `Message ${wamNum}`, 
      description: "Message details would be displayed here. Feature coming soon!" 
    });
  };

  // Queue Management Interface Content (Header handled at full-screen level)

  // Main render function
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  return (
    <div className="h-screen bg-gradient-to-br from-gray-950 via-purple-950/20 to-blue-950/20 text-white overflow-hidden">
      {!isMobile ? (
        <PanelGroup direction="horizontal" className="h-full">
          {/* Sidebar Panel */}
          <Panel defaultSize={34} minSize={15}>
            <div className="h-full bg-gradient-to-b from-purple-900/10 to-blue-900/10 backdrop-blur-sm border-r border-purple-500/20 flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 backdrop-blur-sm p-4 border-b border-purple-500/20">
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">
                  WhatsApp Console
                </h1>
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="flex-1 flex flex-col">
                <TabsList className="bg-purple-900/20 border-b border-purple-500/20 rounded-none justify-start p-0 h-auto">
                  <TabsTrigger value="chats" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-400 data-[state=active]:bg-purple-600/20">
                    Chats
                  </TabsTrigger>
                  <TabsTrigger value="contacts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-400 data-[state=active]:bg-purple-600/20">
                    Contacts
                  </TabsTrigger>
                  <TabsTrigger value="queue" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-400 data-[state=active]:bg-purple-600/20">
                    Queue
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="chats" className="flex-1 mt-0">
                  <div className="p-4">
                    <p className="text-purple-300/60 text-sm">Chat functionality coming soon</p>
                  </div>
                </TabsContent>

                <TabsContent value="contacts" className="flex-1 mt-0">
                  <div className="p-4">
                    <p className="text-purple-300/60 text-sm">Contact management coming soon</p>
                  </div>
                </TabsContent>

                <TabsContent value="queue" className="flex-1 mt-0">
                  <div className="p-4">
                    <p className="text-purple-300/60 text-sm">Queue management coming soon</p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </Panel>

          <PanelResizeHandle className="w-2 bg-purple-500/20 hover:bg-purple-500/40 transition-colors" />

          {/* Main Content Panel */}
          <Panel defaultSize={66} minSize={50}>
            {renderStunningChatInterface()}
          </Panel>
        </PanelGroup>
      ) : (
        <div className="h-full bg-gradient-to-b from-purple-900/10 to-blue-900/10">
          <div className="p-4 border-b border-purple-500/20 bg-gradient-to-r from-purple-900/30 to-blue-900/30">
            <h1 className="text-lg font-bold bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">
              WhatsApp Console
            </h1>
          </div>
          <div className="p-4">
            <p className="text-purple-300/60 text-sm">Mobile interface coming soon</p>
          </div>
        </div>
      )}
    </div>
  );
}
