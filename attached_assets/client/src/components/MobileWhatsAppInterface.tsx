import { useState, useEffect } from 'react';
import { Search, MoreVertical, MessageCircle, Users, Phone, Video, ArrowLeft, Send, Paperclip, Camera } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface Contact {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isOnline?: boolean;
  department?: string;
  employeeCode?: string;
}

interface Group {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  memberCount: number;
  type: 'system' | 'department' | 'custom';
}

interface ChatMessage {
  id: string;
  content: string;
  timestamp: string;
  isSent: boolean;
  status?: 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'file';
}

export default function MobileWhatsAppInterface() {
  const [activeView, setActiveView] = useState<'list' | 'chat'>('list');
  const [activeTab, setActiveTab] = useState<'chats' | 'groups' | 'contacts'>('chats');
  const [selectedChat, setSelectedChat] = useState<Contact | Group | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    // Load real employee data for contacts
    fetch('/api/employees?isActive=true&limit=100')
      .then(res => res.json())
      .then(data => {
        const employeeContacts = data.employees?.map((emp: any) => ({
          id: emp.employeeCode,
          name: emp.name,
          phone: emp.phone || emp.mobile || '+92 XXX XXX XXXX',
          lastMessage: 'Available for messaging',
          lastMessageTime: 'Online',
          unreadCount: 0,
          isOnline: Math.random() > 0.5, // Random online status
          department: emp.department,
          employeeCode: emp.employeeCode,
        })) || [];
        setContacts(employeeContacts.slice(0, 50)); // Limit to 50 for performance
      })
      .catch(err => console.error('Failed to load contacts:', err));

    setGroups([
      {
        id: 'lhe-all',
        name: 'LHE - All Staff',
        lastMessage: 'Monthly meeting reminder',
        lastMessageTime: '11:20 AM',
        unreadCount: 5,
        memberCount: 150,
        type: 'system'
      },
      {
        id: 'lhe-ofc',
        name: 'LHE - Office',
        lastMessage: 'New policy updates',
        lastMessageTime: 'Yesterday',
        unreadCount: 0,
        memberCount: 45,
        type: 'department'
      },
      {
        id: 'isb-all',
        name: 'ISB - All Staff',
        lastMessage: 'Security protocol update',
        lastMessageTime: '2 days ago',
        unreadCount: 12,
        memberCount: 85,
        type: 'system'
      }
    ]);
  }, []);

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'XX';
  };

  const formatTime = (time: string) => {
    return time;
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone?.includes(searchQuery) ||
    contact.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openChat = (item: Contact | Group) => {
    setSelectedChat(item);
    setActiveView('chat');
    // Load messages for this chat
    setMessages([
      {
        id: '1',
        content: 'Hello! How can I help you today?',
        timestamp: '10:30 AM',
        isSent: false,
        status: 'read',
        type: 'text'
      },
      {
        id: '2',
        content: 'Hi! I wanted to ask about the attendance policy.',
        timestamp: '10:32 AM',
        isSent: true,
        status: 'delivered',
        type: 'text'
      }
    ]);
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    
    const message: ChatMessage = {
      id: Date.now().toString(),
      content: newMessage,
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      isSent: true,
      status: 'sent',
      type: 'text'
    };
    
    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const renderChatItem = (item: Contact | Group, isGroup: boolean = false) => (
    <div
      key={item.id}
      className="flex items-center p-4 active:bg-gray-700/50 cursor-pointer transition-colors border-b border-gray-700/30"
      onClick={() => openChat(item)}
    >
      <div className="relative">
        <Avatar className="h-14 w-14 ring-2 ring-gray-600">
          <AvatarImage src={item.avatar} />
          <AvatarFallback className="bg-blue-600 text-white font-medium text-sm">
            {getInitials(item.name)}
          </AvatarFallback>
        </Avatar>
        {!isGroup && (item as Contact).isOnline && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-800" />
        )}
      </div>
      
      <div className="flex-1 ml-4 overflow-hidden">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-white truncate text-base">
            {item.name}
          </h3>
          <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
            {formatTime(item.lastMessageTime || '')}
          </span>
        </div>
        
        <div className="flex items-center justify-between mt-1">
          <p className="text-sm text-gray-300 truncate flex-1">
            {isGroup && (
              <span className="text-blue-400 mr-2">
                <Users className="inline w-3 h-3 mr-1" />
                {(item as Group).memberCount}
              </span>
            )}
            {item.lastMessage}
          </p>
          {item.unreadCount && item.unreadCount > 0 && (
            <Badge className="bg-green-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center rounded-full ml-2">
              {item.unreadCount > 99 ? '99+' : item.unreadCount}
            </Badge>
          )}
        </div>
        
        {!isGroup && (item as Contact).department && (
          <span className="text-xs text-blue-400 mt-1 block">
            {(item as Contact).employeeCode} • {(item as Contact).department}
          </span>
        )}
        
        {isGroup && (
          <span className="text-xs text-purple-400 mt-1 block capitalize">
            {(item as Group).type} group
          </span>
        )}
      </div>
    </div>
  );

  if (activeView === 'chat' && selectedChat) {
    return (
      <div className="h-screen bg-gray-800 flex flex-col">
        {/* Chat Header */}
        <div className="flex items-center p-4 bg-gray-700 border-b border-gray-600">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-300 hover:text-white mr-2 p-1"
            onClick={() => setActiveView('list')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <Avatar className="h-10 w-10 mr-3">
            <AvatarFallback className="bg-blue-600 text-white text-sm">
              {getInitials(selectedChat.name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <h3 className="font-medium text-white text-base">{selectedChat.name}</h3>
            <p className="text-xs text-green-400">
              {'memberCount' in selectedChat 
                ? `${selectedChat.memberCount} members`
                : (selectedChat as Contact).isOnline ? 'Online' : 'Last seen recently'
              }
            </p>
          </div>
          
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white p-2">
              <Phone className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white p-2">
              <Video className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white p-2">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-2">
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isSent ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.isSent
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-white'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <div className={`flex items-center justify-end mt-1 space-x-1 ${
                    message.isSent ? 'text-gray-200' : 'text-gray-400'
                  }`}>
                    <span className="text-xs">{message.timestamp}</span>
                    {message.isSent && (
                      <div className="text-xs">
                        {message.status === 'sent' && '✓'}
                        {message.status === 'delivered' && '✓✓'}
                        {message.status === 'read' && <span className="text-blue-300">✓✓</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 bg-gray-700 border-t border-gray-600">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white p-2">
              <Paperclip className="w-5 h-5" />
            </Button>
            
            <div className="flex-1 relative">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="bg-gray-600 border-gray-500 text-white placeholder-gray-400 focus:border-green-500 pr-10"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    sendMessage();
                  }
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-300 hover:text-white p-1"
              >
                <Camera className="w-4 h-4" />
              </Button>
            </div>
            
            <Button
              className="bg-green-600 hover:bg-green-700 text-white p-3"
              onClick={sendMessage}
              disabled={!newMessage.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="p-4 bg-gray-700 border-b border-gray-600">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">WhatsApp Business</h1>
          <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white p-2">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts and groups..."
            className="pl-10 bg-gray-600 border-gray-500 text-white placeholder-gray-400 focus:border-green-500"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-700 border-b border-gray-600">
        {(['chats', 'groups', 'contacts'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-4 px-4 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-300 hover:text-white active:bg-gray-600'
            }`}
          >
            {tab}
            {tab === 'chats' && contacts.length > 0 && (
              <Badge className="ml-2 bg-green-600 text-xs">{contacts.length}</Badge>
            )}
            {tab === 'groups' && groups.length > 0 && (
              <Badge className="ml-2 bg-purple-600 text-xs">{groups.length}</Badge>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {activeTab === 'chats' && (
          <div>
            {filteredContacts.length > 0 ? (
              filteredContacts.map(contact => renderChatItem(contact))
            ) : (
              <div className="p-8 text-center text-gray-400">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No contacts found</p>
                <p className="text-sm">Try adjusting your search terms</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'groups' && (
          <div>
            {filteredGroups.map(group => renderChatItem(group, true))}
          </div>
        )}
        
        {activeTab === 'contacts' && (
          <div>
            {filteredContacts.map(contact => (
              <div
                key={contact.id}
                className="flex items-center p-4 active:bg-gray-700/50 border-b border-gray-700/30"
              >
                <div className="relative">
                  <Avatar className="h-14 w-14 ring-2 ring-gray-600">
                    <AvatarFallback className="bg-blue-600 text-white font-medium text-sm">
                      {getInitials(contact.name)}
                    </AvatarFallback>
                  </Avatar>
                  {contact.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-800" />
                  )}
                </div>
                
                <div className="ml-4 flex-1">
                  <h3 className="font-medium text-white text-base">{contact.name}</h3>
                  <p className="text-sm text-gray-400">{contact.phone}</p>
                  {contact.department && (
                    <span className="text-xs text-blue-400">{contact.employeeCode} • {contact.department}</span>
                  )}
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-green-400 hover:text-green-300 p-3"
                  onClick={() => openChat(contact)}
                >
                  <MessageCircle className="w-5 h-5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}