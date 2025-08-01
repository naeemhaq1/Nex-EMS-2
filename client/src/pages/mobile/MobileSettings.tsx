import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { 
  Bell, 
  User, 
  Settings as SettingsIcon, 
  Shield, 
  Moon, 
  Sun, 
  Smartphone, 
  MapPin, 
  Clock, 
  Globe, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  ArrowLeft,
  Power,
  Wifi,
  Camera,
  Mic,
  Calendar,
  Download,
  BarChart3,
  TrendingUp,
  MessageSquare,
  Trophy
} from 'lucide-react';
import MobileFooter from '@/components/mobile/MobileFooter';

export default function MobileSettings() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const handleForceLogout = async () => {
    try {
      await logout();
      // logout() function will handle the redirect
    } catch (error) {
      console.error('Logout failed:', error);
      // Force navigation as fallback
      window.location.href = '/';
    }
  };

  const settingsSections = [
    {
      title: 'Account',
      items: [
        {
          icon: User,
          label: 'Profile Information',
          description: 'Name, department, contact details',
          action: () => navigate('/mobile/profile')
        },
        {
          icon: Shield,
          label: 'Privacy & Security',
          description: 'Password, biometric settings',
          action: () => console.log('Privacy settings')
        }
      ]
    },
    {
      title: 'Attendance',
      items: [
        {
          icon: Clock,
          label: 'Auto Punch-Out',
          description: 'Automatic checkout after 10 hours',
          toggle: true,
          value: false,
          onChange: () => {}
        },
        {
          icon: Calendar,
          label: 'Working Hours',
          description: 'Set your standard work schedule',
          action: () => console.log('Working hours')
        }
      ]
    },
    {
      title: 'App Preferences',
      items: [
        {
          icon: isDarkMode ? Moon : Sun,
          label: 'Theme',
          description: isDarkMode ? 'Dark mode' : 'Light mode',
          toggle: true,
          value: isDarkMode,
          onChange: setIsDarkMode
        },
        {
          icon: Bell,
          label: 'Notifications',
          description: 'Push notifications for attendance',
          toggle: true,
          value: notificationsEnabled,
          onChange: setNotificationsEnabled
        },
        {
          icon: MessageSquare,
          label: 'Announcements',
          description: 'Manage announcement settings',
          action: () => navigate('/mobile/announcement-settings')
        },
        {
          icon: Globe,
          label: 'Language',
          description: 'English (Default)',
          action: () => console.log('Language settings')
        },
        {
          icon: MapPin,
          label: 'Location Services',
          description: 'GPS tracking for remote punch',
          toggle: true,
          value: locationEnabled,
          onChange: setLocationEnabled
        }
      ]
    },
    {
      title: 'Device',
      items: [
        {
          icon: Smartphone,
          label: 'Device Info',
          description: 'App version, device details',
          action: () => console.log('Device info')
        },
        {
          icon: Camera,
          label: 'Camera Access',
          description: 'For profile photos and documents',
          toggle: true,
          value: true,
          onChange: () => {}
        },
        {
          icon: Mic,
          label: 'Microphone Access',
          description: 'Voice notes and recordings',
          toggle: true,
          value: false,
          onChange: () => {}
        }
      ]
    },
    {
      title: 'Support',
      items: [
        {
          icon: HelpCircle,
          label: 'Help & FAQ',
          description: 'Common questions and support',
          action: () => console.log('Help')
        },
        {
          icon: Download,
          label: 'Data Export',
          description: 'Download your attendance data',
          action: () => console.log('Data export')
        }
      ]
    },
    {
      title: 'Account',
      items: [
        {
          icon: LogOut,
          label: 'Logout',
          description: 'Sign out of your account',
          action: handleForceLogout
        }
      ]
    }
  ];

  return (
    <div className="h-screen bg-[#1A1B3E] text-white overflow-hidden flex flex-col">
      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 text-sm flex-shrink-0">
        <div className="font-medium">{formatTime(currentTime)}</div>
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
          </div>
          <Wifi className="w-3 h-3" />
          <span>🔋</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate('/mobile')}
            className="p-1 rounded-lg hover:bg-gray-800"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div className="flex items-center space-x-2">
            <SettingsIcon className="w-6 h-6 text-purple-400" />
            <h2 className="text-white font-semibold text-base">Settings</h2>
          </div>
        </div>

      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {/* User Profile Section */}
        <div className="px-4 py-4 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-lg">
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <h3 className="text-white font-semibold text-base">{user?.username || 'User'}</h3>
              <p className="text-gray-400 text-sm">Employee Portal</p>
              <p className="text-purple-400 text-xs">Premium Access</p>
            </div>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6 py-4">
          {settingsSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="px-4">
              <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
                {section.title}
              </h4>
              <div className="space-y-1">
                {section.items.map((item, itemIndex) => (
                  <div 
                    key={itemIndex}
                    className="bg-[#2A2B5E] rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-8 h-8 bg-purple-600/20 rounded-lg flex items-center justify-center">
                        <item.icon className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium text-sm">{item.label}</div>
                        <div className="text-gray-400 text-xs truncate">{item.description}</div>
                      </div>
                    </div>
                    
                    {item.toggle ? (
                      <button
                        onClick={() => item.onChange && item.onChange(!item.value)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          item.value ? 'bg-purple-600' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            item.value ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    ) : (
                      <button
                        onClick={item.action}
                        className="p-1 hover:bg-gray-700 rounded"
                      >
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* App Version */}
        <div className="px-4 py-4 border-t border-gray-800">
          <div className="text-center">
            <p className="text-gray-500 text-xs">Nexlinx Smart EMS Mobile</p>
            <p className="text-gray-500 text-xs">Version 1.0.0 (Build 2025.01.10)</p>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <MobileFooter currentPage="dashboard" />
    </div>
  );
}