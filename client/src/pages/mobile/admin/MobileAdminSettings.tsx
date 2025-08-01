import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { 
  ArrowLeft,
  Settings,
  Users,
  Database,
  Wifi,
  Shield,
  Bell,
  Palette,
  Info,
  Save,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import MobileAdminDualNavigation from '@/components/mobile/MobileAdminDualNavigation';

interface SettingsItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  type: 'toggle' | 'action' | 'info';
  value?: boolean;
  color: string;
}

const systemSettings: SettingsItem[] = [
  {
    id: 'realtime_monitoring',
    title: 'Real-time Monitoring',
    description: 'Enable live system status updates',
    icon: <Wifi className="w-5 h-5" />,
    type: 'toggle',
    value: true,
    color: 'bg-blue-500'
  },
  {
    id: 'auto_backup',
    title: 'Auto Backup',
    description: 'Automatic daily database backups',
    icon: <Database className="w-5 h-5" />,
    type: 'toggle',
    value: true,
    color: 'bg-green-500'
  },
  {
    id: 'security_alerts',
    title: 'Security Alerts',
    description: 'Notify on suspicious activities',
    icon: <Shield className="w-5 h-5" />,
    type: 'toggle',
    value: true,
    color: 'bg-red-500'
  },
  {
    id: 'push_notifications',
    title: 'Push Notifications',
    description: 'System alerts and updates',
    icon: <Bell className="w-5 h-5" />,
    type: 'toggle',
    value: false,
    color: 'bg-purple-500'
  }
];

const adminActions: SettingsItem[] = [
  {
    id: 'system_info',
    title: 'System Information',
    description: 'View detailed system status',
    icon: <Info className="w-5 h-5" />,
    type: 'info',
    color: 'bg-gray-500'
  },
  {
    id: 'port_management',
    title: 'Port Management',
    description: 'Configure service ports for three-tier architecture',
    icon: <Settings className="w-5 h-5" />,
    type: 'action',
    color: 'bg-blue-500'
  },
  {
    id: 'reset_preferences',
    title: 'Reset Preferences',
    description: 'Restore default settings',
    icon: <RotateCcw className="w-5 h-5" />,
    type: 'action',
    color: 'bg-orange-500'
  },
  {
    id: 'theme_settings',
    title: 'Theme Settings',
    description: 'Customize interface appearance',
    icon: <Palette className="w-5 h-5" />,
    type: 'action',
    color: 'bg-blue-600'
  }
];

export default function MobileAdminSettings() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const [settings, setSettings] = useState(systemSettings);

  // Fetch system information
  const { data: systemInfo } = useQuery({
    queryKey: ['/api/admin/system-metrics'],
    refetchInterval: 30000,
  });

  const toggleSetting = (id: string) => {
    setSettings(prev => prev.map(setting => 
      setting.id === id ? { ...setting, value: !setting.value } : setting
    ));
  };

  const handleAction = (id: string) => {
    switch (id) {
      case 'system_info':
        navigate('/mobile/admin/service-monitoring');
        break;
      case 'port_management':
        navigate('/mobile/admin/port-management');
        break;
      case 'reset_preferences':
        // Reset all toggles to default
        setSettings(systemSettings);
        break;
      case 'theme_settings':
        // Could navigate to theme customization
        break;
    }
  };

  return (
    <div className="h-screen bg-[#1A1B3E] text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-[#2A2B5E] px-4 py-3 flex items-center justify-between flex-shrink-0 z-40">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/mobile/admin/dashboard')}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Settings className="w-5 h-5" />
          <h1 className="text-lg font-semibold">Admin Settings</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className="bg-blue-500 text-white">{user?.role}</Badge>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 pb-32 space-y-6">
        {/* User Info Card */}
        <Card className="bg-[#2A2B5E] border-gray-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Account Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Username</span>
              <span className="text-white font-medium">{user?.username}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Role</span>
              <Badge className="bg-purple-500 text-white">{user?.role}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Employee ID</span>
              <span className="text-white font-medium">{user?.employeeId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Account Type</span>
              <span className="text-white font-medium">{user?.accountType}</span>
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card className="bg-[#2A2B5E] border-gray-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>System Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.map((setting) => (
              <div key={setting.id} className="flex items-center justify-between p-3 rounded-lg bg-[#1A1B3E] hover:bg-[#3A3B6E] transition-colors">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${setting.color}`}>
                    {setting.icon}
                  </div>
                  <div>
                    <div className="font-medium text-white">{setting.title}</div>
                    <div className="text-sm text-gray-400">{setting.description}</div>
                  </div>
                </div>
                {setting.type === 'toggle' && (
                  <Switch
                    checked={setting.value}
                    onCheckedChange={() => toggleSetting(setting.id)}
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Admin Actions */}
        <Card className="bg-[#2A2B5E] border-gray-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Admin Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {adminActions.map((action) => (
              <div 
                key={action.id} 
                onClick={() => handleAction(action.id)}
                className="flex items-center justify-between p-3 rounded-lg bg-[#1A1B3E] hover:bg-[#3A3B6E] transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${action.color}`}>
                    {action.icon}
                  </div>
                  <div>
                    <div className="font-medium text-white">{action.title}</div>
                    <div className="text-sm text-gray-400">{action.description}</div>
                  </div>
                </div>
                <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* System Status Summary */}
        {systemInfo && (systemInfo as any).uptime && (
          <Card className="bg-[#2A2B5E] border-gray-600">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center space-x-2">
                <Info className="w-5 h-5" />
                <span>System Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Uptime</span>
                <span className="text-white font-medium">{(systemInfo as any).uptime}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Response Time</span>
                <span className="text-white font-medium">{(systemInfo as any).latency}ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Memory Usage</span>
                <span className="text-white font-medium">{(systemInfo as any).memoryUsage}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Save Button */}
        <div className="pt-4 pb-8">
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => {
              // Save settings logic
              navigate('/mobile/admin/dashboard');
            }}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </div>

      {/* Bottom Dual Navigation */}
      <MobileAdminDualNavigation currentPage="settings" />
    </div>
  );
}