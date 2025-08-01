import { useState, useEffect } from 'react';
import { Search, MoreVertical, MessageCircle, Users, Phone, Video, Info } from 'lucide-react';
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

export default function WhatsAppInterface() {
  const [activeTab, setActiveTab] = useState<'chats' | 'groups' | 'contacts'>('chats');
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // Load real employee data
  useEffect(() => {
    // Load real employee contacts from API
    fetch('/api/employees?isActive=true&limit=200')
      .then(res => res.json())
      .then(data => {
        const employeeContacts = data.employees?.map((emp: any) => ({
          id: emp.employeeCode,
          name: emp.name,
          phone: emp.phone || emp.mobile || '+92 XXX XXX XXXX',
          lastMessage: 'Available for messaging',
          lastMessageTime: 'Online',
          unreadCount: Math.floor(Math.random() * 5), // Random unread count
          isOnline: Math.random() > 0.4, // Random online status
          department: emp.department,
        })) || [];
        setContacts(employeeContacts.slice(0, 100)); // Limit for performance
      })
      .catch(err => console.error('Failed to load contacts:', err));

    // Load real department groups from API
    fetch('/api/employees/departments')
      .then(res => res.json())
      .then(departments => {
        const systemGroups = departments.map((dept: string) => ({
          id: dept.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name: `${dept} - All Staff`,
          lastMessage: 'Available for group messaging',
          lastMessageTime: 'Active',
          unreadCount: Math.floor(Math.random() * 10),
          memberCount: Math.floor(Math.random() * 100) + 20,
          type: 'system' as const
        }));
        
        setGroups([
          ...systemGroups,
          {
            id: 'announcements',
            name: 'Company Announcements',
            lastMessage: 'New policy updates',
            lastMessageTime: 'Today',
            unreadCount: 3,
            memberCount: 300,
            type: 'system'
          }
        ]);
      })
      .catch(err => console.error('Failed to load departments:', err));
  }, []);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatTime = (time: string) => {
    // Format time to WhatsApp style
    return time;
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone.includes(searchQuery)
  );

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderChatItem = (item: Contact | Group, isGroup: boolean = false) => (
    <div
      key={item.id}
      className={`flex items-center p-3 hover:bg-gray-700/50 cursor-pointer transition-colors border-b border-gray-700/30 ${
        selectedChat === item.id ? 'bg-gray-700/70' : ''
      }`}
      onClick={() => setSelectedChat(item.id)}
    >
      <div className="relative">
        <Avatar className="h-12 w-12 ring-2 ring-gray-600">
          <AvatarImage src={item.avatar} />
          <AvatarFallback className="bg-blue-600 text-white font-medium">
            {getInitials(item.name)}
          </AvatarFallback>
        </Avatar>
        {!isGroup && (item as Contact).isOnline && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-800" />
        )}
      </div>
      
      <div className="flex-1 ml-3 overflow-hidden">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-white truncate">
            {item.name}
          </h3>
          <span className="text-xs text-gray-400 ml-2">
            {formatTime(item.lastMessageTime || '')}
          </span>
        </div>
        
        <div className="flex items-center justify-between mt-1">
          <p className="text-sm text-gray-300 truncate">
            {isGroup && (
              <span className="text-blue-400 mr-1">
                <Users className="inline w-3 h-3 mr-1" />
                {(item as Group).memberCount}
              </span>
            )}
            {item.lastMessage}
          </p>
          {item.unreadCount && item.unreadCount > 0 && (
            <Badge className="bg-green-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center rounded-full">
              {item.unreadCount}
            </Badge>
          )}
        </div>
        
        {!isGroup && (item as Contact).department && (
          <span className="text-xs text-blue-400 mt-1 block">
            {(item as Contact).department}
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

  const renderChatMessages = () => (
    <div className="flex-1 flex flex-col bg-gray-800">
      {/* Chat Header */}
      {selectedChat && (
        <div className="flex items-center p-4 bg-gray-700 border-b border-gray-600">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-blue-600 text-white">
              NH
            </AvatarFallback>
          </Avatar>
          <div className="ml-3 flex-1">
            <h3 className="font-medium text-white">Naeem Haq</h3>
            <p className="text-xs text-green-400">Online</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
              <Phone className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
              <Video className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
              <Info className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4 bg-gray-800">
        {selectedChat ? (
          <div className="space-y-4">
            {/* Sample messages */}
            <div className="flex justify-start">
              <div className="bg-gray-700 rounded-lg p-3 max-w-xs">
                <p className="text-white text-sm">Hello! How are you doing today?</p>
                <span className="text-xs text-gray-400 mt-1 block">10:30 AM</span>
              </div>
            </div>
            
            <div className="flex justify-end">
              <div className="bg-green-600 rounded-lg p-3 max-w-xs">
                <p className="text-white text-sm">I'm doing great! Thanks for asking.</p>
                <div className="flex items-center justify-end mt-1 space-x-1">
                  <span className="text-xs text-gray-200">10:32 AM</span>
                  <div className="flex space-x-1">
                    <div className="w-3 h-3 text-gray-200">✓✓</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <MessageCircle className="w-16 h-16 mb-4" />
            <p className="text-lg font-medium">Select a chat to start messaging</p>
            <p className="text-sm">Choose from your existing conversations or start a new one</p>
          </div>
        )}
      </ScrollArea>

      {/* Message Input */}
      {selectedChat && (
        <div className="p-4 bg-gray-700 border-t border-gray-600">
          <div className="flex items-center space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-gray-600 border-gray-500 text-white placeholder-gray-400 focus:border-green-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newMessage.trim()) {
                  // Send message logic
                  setNewMessage('');
                }
              }}
            />
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={!newMessage.trim()}
            >
              Send
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-gray-700 border-b border-gray-600">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-semibold">WhatsApp Business</h1>
            <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
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
              className={`flex-1 py-3 px-4 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'text-green-400 border-b-2 border-green-400'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Chat List */}
        <ScrollArea className="flex-1">
          {activeTab === 'chats' && (
            <div>
              {filteredContacts.map(contact => renderChatItem(contact))}
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
                  className="flex items-center p-3 hover:bg-gray-700/50 cursor-pointer transition-colors border-b border-gray-700/30"
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12 ring-2 ring-gray-600">
                      <AvatarImage src={contact.avatar} />
                      <AvatarFallback className="bg-blue-600 text-white font-medium">
                        {getInitials(contact.name)}
                      </AvatarFallback>
                    </Avatar>
                    {contact.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-800" />
                    )}
                  </div>
                  
                  <div className="ml-3 flex-1">
                    <h3 className="font-medium text-white">{contact.name}</h3>
                    <p className="text-sm text-gray-400">{contact.phone}</p>
                    {contact.department && (
                      <span className="text-xs text-blue-400">{contact.department}</span>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-green-400 hover:text-green-300"
                    onClick={() => setSelectedChat(contact.id)}
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      {renderChatMessages()}
    </div>
  );
}