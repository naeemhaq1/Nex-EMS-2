import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { 
  ArrowLeft, 
  User, 
  Bell, 
  Shield, 
  Smartphone, 
  Moon, 
  Sun, 
  Globe, 
  Database,
  HelpCircle,
  Info,
  LogOut,
  Settings,
  Eye,
  EyeOff,
  Vibrate,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  MapPin,
  Clock,
  Save,
  X,
  Check,
  AlertTriangle
} from 'lucide-react';

export default function MobileEmployeeSettings() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    // Location Settings
    locationServices: true,
    
    // Notification Settings
    punchNotifications: true,
    breakReminders: true,
    scheduleUpdates: true,
    leaderboardUpdates: false,
    soundEnabled: true,
    vibrationEnabled: true,
    
    // Privacy & Security Settings
    shareLocation: true,
    showOnlineStatus: true,
    allowAnalytics: true,
    biometricAuth: false,
    sessionTimeout: 30,
    
    // Employee Status
    employeeStatus: 'Available',
    
    // Data & Storage Settings
    autoSync: true,
    offlineMode: false,
    dataCompression: true,
    cacheSize: 250,
    
    // App Preferences
    darkMode: true,
    compactView: false,
    showSeconds: true,
    language: 'English',
    
    // Profile Settings
    displayName: user?.username || '',
    email: '',
    phoneNumber: '',
  });

  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Prevent scrolling for native app experience
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, []);

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setUnsavedChanges(true);
  };

  const saveSettings = () => {
    // In real app, save to backend
    console.log('Saving settings:', settings);
    setUnsavedChanges(false);
    
    // Show success feedback
    const successMsg = document.createElement('div');
    successMsg.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium z-50';
    successMsg.textContent = 'Settings saved successfully!';
    document.body.appendChild(successMsg);
    setTimeout(() => {
      document.body.removeChild(successMsg);
    }, 2000);
  };

  const settingSections = [
    {
      id: 'notifications',
      title: 'Notifications',
      icon: Bell,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      description: 'NOTIFICATION PREFERENCES',
      settings: [
        {
          key: 'punchNotifications',
          label: 'Punch Notifications',
          description: 'Get notified about successful punches',
          type: 'toggle',
          value: settings.punchNotifications
        },
        {
          key: 'breakReminders',
          label: 'Break Reminders',
          description: 'Automated break time reminders',
          type: 'toggle',
          value: settings.breakReminders
        },
        {
          key: 'scheduleUpdates',
          label: 'Schedule Updates',
          description: 'Changes to your work schedule',
          type: 'toggle',
          value: settings.scheduleUpdates
        },
        {
          key: 'leaderboardUpdates',
          label: 'Leaderboard Updates',
          description: 'Performance and ranking notifications',
          type: 'toggle',
          value: settings.leaderboardUpdates
        },
        {
          key: 'soundEnabled',
          label: 'Sound Notifications',
          description: 'Play sound for notifications',
          type: 'toggle',
          value: settings.soundEnabled
        },
        {
          key: 'vibrationEnabled',
          label: 'Vibration',
          description: 'Vibrate for notifications',
          type: 'toggle',
          value: settings.vibrationEnabled
        }
      ]
    },
    {
      id: 'profile',
      title: 'Profile',
      icon: User,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      description: 'PERSONAL INFORMATION',
      settings: [
        {
          key: 'displayName',
          label: 'Display Name',
          description: 'How your name appears to others',
          type: 'text',
          value: settings.displayName
        },
        {
          key: 'email',
          label: 'Email Address',
          description: 'Your contact email',
          type: 'email',
          value: settings.email
        },
        {
          key: 'phoneNumber',
          label: 'Phone Number',
          description: 'Your contact number',
          type: 'tel',
          value: settings.phoneNumber
        },
        {
          key: 'employeeStatus',
          label: 'Status',
          description: 'Your current availability status',
          type: 'select',
          value: settings.employeeStatus,
          options: ['Available', 'Busy', 'In Meeting', 'Away']
        }
      ]
    },
    {
      id: 'privacy',
      title: 'Privacy & Security',
      icon: Shield,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      description: 'SECURITY SETTINGS',
      settings: [
        {
          key: 'shareLocation',
          label: 'Share Location with Team',
          description: 'Allow team members to see your location',
          type: 'toggle',
          value: settings.shareLocation
        },
        {
          key: 'showOnlineStatus',
          label: 'Show Online Status',
          description: 'Display when you are active',
          type: 'toggle',
          value: settings.showOnlineStatus
        },
        {
          key: 'allowAnalytics',
          label: 'Usage Analytics',
          description: 'Help improve the app with usage data',
          type: 'toggle',
          value: settings.allowAnalytics
        },
        {
          key: 'biometricAuth',
          label: 'Biometric Authentication',
          description: 'Use fingerprint or face unlock',
          type: 'toggle',
          value: settings.biometricAuth
        },
        {
          key: 'sessionTimeout',
          label: 'Session Timeout',
          description: 'Auto-logout after inactivity (minutes)',
          type: 'select',
          value: settings.sessionTimeout,
          options: [15, 30, 60, 120, 'Never']
        }
      ]
    },
    {
      id: 'app',
      title: 'App Preferences',
      icon: Smartphone,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/20',
      description: 'APPLICATION SETTINGS',
      settings: [
        {
          key: 'darkMode',
          label: 'Dark Mode',
          description: 'Use dark theme for better visibility',
          type: 'toggle',
          value: settings.darkMode
        },
        {
          key: 'compactView',
          label: 'Compact View',
          description: 'Show more information in less space',
          type: 'toggle',
          value: settings.compactView
        },
        {
          key: 'showSeconds',
          label: 'Show Seconds',
          description: 'Display seconds in time',
          type: 'toggle',
          value: settings.showSeconds
        },
        {
          key: 'language',
          label: 'Language',
          description: 'App display language',
          type: 'select',
          value: settings.language,
          options: ['English', 'Urdu', 'Arabic']
        }
      ]
    },
    {
      id: 'location',
      title: 'Location Services',
      icon: MapPin,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      description: 'ADVANCED LOCATION SETTINGS',
      warning: '⚠️ Critical: Disabling location services will result in loss of earned points, attendance tracking issues, and app instability. Contact your supervisor before making changes.',
      requiresConfirmation: true,
      settings: [
        {
          key: 'locationServices',
          label: 'Enable Location Services',
          description: 'Required for attendance tracking and points system',
          type: 'toggle',
          value: settings.locationServices,
          requiresConfirmation: true,
          confirmationText: 'Are you sure you want to disable location services? This will affect your attendance tracking and may result in point deductions.'
        }
      ]
    },
    {
      id: 'data',
      title: 'Data & Storage',
      icon: Database,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/20',
      description: 'DATA MANAGEMENT',
      settings: [
        {
          key: 'autoSync',
          label: 'Auto Sync',
          description: 'Automatically sync data when connected',
          type: 'toggle',
          value: settings.autoSync
        },
        {
          key: 'offlineMode',
          label: 'Offline Mode',
          description: 'Work offline when no connection available',
          type: 'toggle',
          value: settings.offlineMode
        },
        {
          key: 'dataCompression',
          label: 'Data Compression',
          description: 'Compress data to save bandwidth',
          type: 'toggle',
          value: settings.dataCompression
        },
        {
          key: 'cacheSize',
          label: 'Cache Size (MB)',
          description: 'Amount of storage for offline data',
          type: 'select',
          value: settings.cacheSize,
          options: [100, 250, 500, 1000]
        }
      ]
    },
    {
      id: 'support',
      title: 'Help & Support',
      icon: HelpCircle,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      description: 'ASSISTANCE & RESOURCES',
      settings: [
        {
          key: 'helpCenter',
          label: 'Help Center',
          description: 'Browse frequently asked questions',
          type: 'action',
          action: () => console.log('Help Center')
        },
        {
          key: 'contactSupport',
          label: 'Contact Support',
          description: 'Get help from our support team',
          type: 'action',
          action: () => console.log('Contact Support')
        },
        {
          key: 'appVersion',
          label: 'App Version',
          description: 'Current app version and updates',
          type: 'info',
          value: '3.1.0'
        }
      ]
    },

  ];

  // Enhanced location toggle handler with confirmation
  const handleLocationToggle = (key: string, currentValue: boolean, confirmationText?: string) => {
    if (key === 'locationServices' && currentValue === true) {
      // Show confirmation dialog for disabling location services
      const confirmed = window.confirm(
        confirmationText || 
        '⚠️ Critical Warning: Disabling location services will result in:\n\n• Loss of earned points\n• Attendance tracking issues\n• App stability problems\n• Supervisor notification\n\nAre you absolutely sure you want to continue?'
      );
      
      if (!confirmed) {
        console.log('🚫 Employee cancelled location disable attempt');
        return; // Don't change the setting
      }
      
      console.log('⚠️ Employee confirmed location disable - logging for supervisor review');
      // In real app, send notification to supervisor
    }
    
    handleSettingChange(key, !currentValue);
  };

  const renderSettingItem = (section: any, item: any, index: number) => {
    const isLast = index === (section?.settings?.length - 1 || section?.items?.length - 1);
    
    if (item.type === 'toggle') {
      return (
        <div key={item.key} className={`flex items-center justify-between py-3 px-4 ${!isLast ? 'border-b border-purple-500/20' : ''}`}>
          <div className="flex items-center space-x-3">
            {item.key === 'soundEnabled' && (settings.soundEnabled ? <Volume2 className="w-4 h-4 text-purple-400" /> : <VolumeX className="w-4 h-4 text-purple-400" />)}
            {item.key === 'vibrationEnabled' && <Vibrate className="w-4 h-4 text-purple-400" />}
            {item.key === 'autoSync' && (settings.autoSync ? <Wifi className="w-4 h-4 text-purple-400" /> : <WifiOff className="w-4 h-4 text-purple-400" />)}
            {item.key === 'shareLocation' && <MapPin className="w-4 h-4 text-purple-400" />}
            {item.key === 'showSeconds' && <Clock className="w-4 h-4 text-purple-400" />}
            {item.key === 'showOnlineStatus' && <Globe className="w-4 h-4 text-purple-400" />}
            {item.key === 'biometricAuth' && <Shield className="w-4 h-4 text-purple-400" />}
            {item.key === 'employeeStatus' && <User className="w-4 h-4 text-purple-400" />}
            <span className="text-white text-sm">{item.label}</span>
          </div>
          <button
            onClick={() => {
              if (item.requiresConfirmation) {
                handleLocationToggle(item.key, item.value, item.confirmationText);
              } else {
                handleSettingChange(item.key, !item.value);
              }
            }}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              item.value ? 'bg-green-600' : 'bg-gray-600'
            }`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                item.value ? 'transform translate-x-5' : ''
              }`}
            />
          </button>
        </div>
      );
    }

    if (item.type === 'text' || item.type === 'email' || item.type === 'tel') {
      return (
        <div key={item.key} className={`py-3 px-4 ${!isLast ? 'border-b border-purple-500/20' : ''}`}>
          <label className="block text-sm text-purple-300 mb-2">{item.label}</label>
          <input
            type={item.type}
            value={item.value}
            onChange={(e) => handleSettingChange(item.key, e.target.value)}
            className="w-full bg-[#1A1B3E] border border-purple-500/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
            placeholder={`Enter ${item.label.toLowerCase()}`}
          />
        </div>
      );
    }

    if (item.type === 'number') {
      return (
        <div key={item.key} className={`py-3 px-4 ${!isLast ? 'border-b border-purple-500/20' : ''}`}>
          <label className="block text-sm text-purple-300 mb-2">{item.label}</label>
          <input
            type="number"
            value={item.value}
            onChange={(e) => handleSettingChange(item.key, parseInt(e.target.value))}
            className="w-full bg-[#1A1B3E] border border-purple-500/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
            min="5"
            max="120"
          />
        </div>
      );
    }

    if (item.type === 'select') {
      const getStatusColor = (status: string) => {
        switch(status) {
          case 'Available': return 'text-green-400';
          case 'Busy': return 'text-orange-400';
          case 'On Job': return 'text-blue-400';
          case 'Not Available': return 'text-red-400';
          default: return 'text-white';
        }
      };

      return (
        <div key={item.key} className={`py-3 px-4 ${!isLast ? 'border-b border-purple-500/20' : ''}`}>
          <label className="block text-sm text-purple-300 mb-2">{item.label}</label>
          <div className="relative">
            <select
              value={item.value}
              onChange={(e) => handleSettingChange(item.key, e.target.value)}
              className="w-full bg-[#1A1B3E] border border-purple-500/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
            >
              {item.options?.map((option: string) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {item.key === 'employeeStatus' && (
              <div className="mt-2 flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  settings.employeeStatus === 'Available' ? 'bg-green-500' :
                  settings.employeeStatus === 'Busy' ? 'bg-orange-500' :
                  settings.employeeStatus === 'On Job' ? 'bg-blue-500' :
                  'bg-red-500'
                }`}></div>
                <span className={`text-sm font-medium ${getStatusColor(settings.employeeStatus)}`}>
                  {settings.employeeStatus}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (item.type === 'action') {
      return (
        <button
          key={item.key}
          onClick={item.action}
          className={`w-full py-3 px-4 text-left hover:bg-purple-500/10 transition-colors ${!isLast ? 'border-b border-purple-500/20' : ''}`}
        >
          <span className="text-white text-sm">{item.label}</span>
        </button>
      );
    }

    return null;
  };

  return (
    <div className="h-screen bg-[#1A1B3E] text-white overflow-hidden flex flex-col fixed inset-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1A1B3E] border-b border-purple-500/20">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/mobile/my-dashboard')}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-purple-400" />
          </button>
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-purple-400" />
            <h1 className="text-lg font-semibold text-white">Settings</h1>
          </div>
        </div>
        
        {/* Save Button */}
        {unsavedChanges && (
          <button
            onClick={saveSettings}
            className="flex items-center space-x-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save</span>
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {activeSection ? (
          // Individual Section View
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-purple-500/20">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setActiveSection(null)}
                  className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-purple-400" />
                </button>
                <h2 className="text-lg font-semibold text-white">
                  {settingSections.find(s => s.id === activeSection)?.title}
                </h2>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {/* Enhanced settings section renderer */}
              {(() => {
                const currentSection = settingSections.find(s => s.id === activeSection);
                if (!currentSection) return null;

                const items = currentSection.settings || currentSection.items || [];
                
                return (
                  <div className="space-y-4">
                    {/* Section header with description */}
                    {currentSection.description && (
                      <div className="text-center">
                        <h3 className="text-sm font-medium text-purple-300 uppercase tracking-wide">
                          {currentSection.description}
                        </h3>
                      </div>
                    )}
                    
                    {/* Special warning for location services */}
                    {activeSection === 'location' && currentSection.warning && (
                      <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                          </div>
                          <div className="text-sm text-red-200">
                            {currentSection.warning}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Settings items */}
                    <div className={`rounded-lg border overflow-hidden ${
                      currentSection.bgColor || 'bg-[#2A2B5E] border-purple-500/20'
                    }`}>
                      {items.map((item, index) => {
                        const isLast = index === items.length - 1;
                        
                        if (item.type === 'toggle') {
                          return (
                            <div key={item.key} className={`flex items-center justify-between py-4 px-4 ${!isLast ? 'border-b border-purple-500/20' : ''}`}>
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-1">
                                  {item.key === 'locationServices' && <MapPin className="w-4 h-4 text-red-400" />}
                                  {item.key === 'punchNotifications' && <Bell className="w-4 h-4 text-green-400" />}
                                  {item.key === 'soundEnabled' && (settings.soundEnabled ? <Volume2 className="w-4 h-4 text-green-400" /> : <VolumeX className="w-4 h-4 text-gray-400" />)}
                                  {item.key === 'vibrationEnabled' && <Vibrate className="w-4 h-4 text-green-400" />}
                                  {item.key === 'darkMode' && (settings.darkMode ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-yellow-400" />)}
                                  <span className="text-white font-medium">{item.label}</span>
                                </div>
                                {item.description && (
                                  <p className="text-gray-400 text-sm ml-7">{item.description}</p>
                                )}
                              </div>
                              <button
                                onClick={() => {
                                  if (item.requiresConfirmation) {
                                    handleLocationToggle(item.key, item.value, item.confirmationText);
                                  } else {
                                    handleSettingChange(item.key, !item.value);
                                  }
                                }}
                                className={`relative w-12 h-7 rounded-full transition-colors ml-4 ${
                                  item.value ? 'bg-green-600' : 'bg-gray-600'
                                }`}
                              >
                                <div
                                  className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                                    item.value ? 'transform translate-x-5' : ''
                                  }`}
                                />
                              </button>
                            </div>
                          );
                        }
                        
                        if (item.type === 'select') {
                          return (
                            <div key={item.key} className={`py-4 px-4 ${!isLast ? 'border-b border-purple-500/20' : ''}`}>
                              <label className="block text-white font-medium mb-2">{item.label}</label>
                              {item.description && (
                                <p className="text-gray-400 text-sm mb-3">{item.description}</p>
                              )}
                              <select
                                value={item.value}
                                onChange={(e) => handleSettingChange(item.key, e.target.value)}
                                className="w-full bg-[#1A1B3E] border border-purple-500/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                              >
                                {item.options?.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        }
                        
                        if (item.type === 'text' || item.type === 'email' || item.type === 'tel') {
                          return (
                            <div key={item.key} className={`py-4 px-4 ${!isLast ? 'border-b border-purple-500/20' : ''}`}>
                              <label className="block text-white font-medium mb-2">{item.label}</label>
                              {item.description && (
                                <p className="text-gray-400 text-sm mb-3">{item.description}</p>
                              )}
                              <input
                                type={item.type}
                                value={item.value}
                                onChange={(e) => handleSettingChange(item.key, e.target.value)}
                                className="w-full bg-[#1A1B3E] border border-purple-500/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                                placeholder={`Enter ${item.label.toLowerCase()}`}
                              />
                            </div>
                          );
                        }
                        
                        if (item.type === 'action') {
                          return (
                            <button
                              key={item.key}
                              onClick={item.action}
                              className={`w-full py-4 px-4 text-left hover:bg-purple-500/10 transition-colors ${!isLast ? 'border-b border-purple-500/20' : ''}`}
                            >
                              <div className="text-white font-medium">{item.label}</div>
                              {item.description && (
                                <p className="text-gray-400 text-sm mt-1">{item.description}</p>
                              )}
                            </button>
                          );
                        }
                        
                        if (item.type === 'info') {
                          return (
                            <div key={item.key} className={`py-4 px-4 ${!isLast ? 'border-b border-purple-500/20' : ''}`}>
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="text-white font-medium">{item.label}</div>
                                  {item.description && (
                                    <p className="text-gray-400 text-sm mt-1">{item.description}</p>
                                  )}
                                </div>
                                <span className="text-purple-400 font-medium">{item.value}</span>
                              </div>
                            </div>
                          );
                        }
                        
                        return null;
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        ) : (
          // Settings Menu - Dark Theme Style
          <div className="h-full overflow-y-auto p-4">
            <div className="space-y-3">
              {settingSections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className="w-full bg-[#2A2B5E] rounded-lg p-4 flex items-center justify-between hover:bg-[#3A3B6E] transition-colors border border-purple-500/20"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-purple-500/20">
                        <Icon className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-white font-medium">{section.title}</h3>
                        <p className="text-gray-400 text-sm">
                          {section.settings?.length || section.items?.length || 0} settings
                        </p>
                      </div>
                    </div>
                    <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
                  </button>
                );
              })}

              {/* App Info Section */}
              <div className="bg-[#2A2B5E] rounded-lg p-4 mt-6 border border-purple-500/20">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <Info className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="text-white font-medium">App Information</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Version</span>
                    <span className="text-white">1.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">User ID</span>
                    <span className="text-white">{user?.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Role</span>
                    <span className="text-white capitalize">{user?.role}</span>
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="w-full bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 rounded-lg p-4 flex items-center justify-center space-x-2 transition-colors mt-6"
              >
                <LogOut className="w-5 h-5 text-red-400" />
                <span className="text-red-400 font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}