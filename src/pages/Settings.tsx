import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Settings as SettingsIcon, 
  Clock, 
  Calendar, 
  DollarSign, 
  Database, 
  RefreshCw,
  Save,
  Globe,
  Timer,
  Mail,
  Send,
  User,
  ExternalLink,
  Facebook,
  Link as LinkIcon,
  Unlink
} from "lucide-react";
import { VersionDisplay } from "@/components/VersionDisplay";
import GoogleMapsTest from "@/components/GoogleMapsTest";

interface Setting {
  id: number;
  key: string;
  value: string;
  type: string;
  category: string;
  description?: string;
  updatedAt: string;
  updatedBy?: number;
}

// Pakistan timezone and common timezones
const timezones = [
  { value: "Asia/Karachi", label: "Pakistan Time (PKT) - UTC+5" },
  { value: "UTC", label: "Coordinated Universal Time (UTC)" },
  { value: "Asia/Dubai", label: "Gulf Standard Time (GST) - UTC+4" },
  { value: "Asia/Riyadh", label: "Arabia Standard Time (AST) - UTC+3" },
  { value: "Europe/London", label: "Greenwich Mean Time (GMT) - UTC+0" },
  { value: "America/New_York", label: "Eastern Time (ET) - UTC-5" },
];

const dateFormats = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (31/12/2025)" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (12/31/2025)" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (2025-12-31)" },
  { value: "DD-MM-YYYY", label: "DD-MM-YYYY (31-12-2025)" },
  { value: "MMM DD, YYYY", label: "MMM DD, YYYY (Dec 31, 2025)" },
];

const currencies = [
  { value: "PKR", label: "Pakistani Rupee (PKR)" },
  { value: "USD", label: "US Dollar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "GBP", label: "British Pound (GBP)" },
  { value: "AED", label: "UAE Dirham (AED)" },
  { value: "SAR", label: "Saudi Riyal (SAR)" },
];

const employeePollTimes = [
  { value: "12:00,20:00", label: "12:00 noon and 8:00 PM (Pakistan Time)" },
  { value: "09:00,18:00", label: "9:00 AM and 6:00 PM (Pakistan Time)" },
  { value: "06:00,18:00", label: "6:00 AM and 6:00 PM (Pakistan Time)" },
  { value: "00:00,12:00", label: "12:00 midnight and 12:00 noon (Pakistan Time)" },
];

const attendancePollIntervals = [
  { value: "5", label: "Every 5 minutes (recommended)" },
  { value: "10", label: "Every 10 minutes" },
  { value: "15", label: "Every 15 minutes" },
  { value: "30", label: "Every 30 minutes" },
  { value: "60", label: "Every hour" },
];

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, string>>({});
  const [isConnectingFacebook, setIsConnectingFacebook] = useState(false);

  // Fetch current settings
  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["/api/settings"],
  });

  // Fetch system configuration
  const { data: systemConfig } = useQuery({
    queryKey: ["/api/system-configuration"],
  });

  // Fetch Facebook connection status
  const { data: facebookStatus, isLoading: isLoadingFacebook } = useQuery({
    queryKey: ["/api/facebook/status"],
    enabled: !!user,
  });

  // Fetch Facebook config
  const { data: facebookConfig } = useQuery({
    queryKey: ["/api/facebook/config"],
    enabled: !!user,
  });

  // Default settings with Pakistan-specific defaults
  const defaultSettings = {
    'system.timezone': 'Asia/Karachi',
    'system.date_format': 'DD/MM/YYYY',
    'system.currency': 'PKR',
    'sync.employee_poll_times': '12:00,20:00',
    'sync.attendance_poll_interval': '5',
    'sync.employee_enabled': 'true',
    'sync.attendance_enabled': 'true',
    'company.name': 'Your Company Name',
    'company.address': 'Lahore, Pakistan',
    'notifications.email_enabled': 'false',
    'notifications.sms_enabled': 'false',
  };

  // Get setting value with fallback to default
  const getSetting = (key: string) => {
    const setting = settings.find((s: Setting) => s.key === key);
    if (unsavedChanges[key] !== undefined) {
      return unsavedChanges[key];
    }
    return setting?.value || defaultSettings[key] || '';
  };

  // Update setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const existingSetting = settings.find((s: Setting) => s.key === key);
      if (existingSetting) {
        const response = await fetch(`/api/settings/${key}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value }),
        });
        if (!response.ok) throw new Error('Failed to update setting');
        return response.json();
      } else {
        // Create new setting
        const response = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key,
            value,
            type: 'string',
            category: key.split('.')[0],
            description: `System setting for ${key.replace(/[._]/g, ' ')}`,
          }),
        });
        if (!response.ok) throw new Error('Failed to create setting');
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings Saved",
        description: "Your settings have been successfully saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  // System configuration mutation
  const updateSystemConfigMutation = useMutation({
    mutationFn: (config: { configKey: string; configValue: string; isActive: boolean }) => 
      fetch("/api/system-configuration", { 
        method: "PUT", 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config) 
      }).then(res => {
        if (!res.ok) throw new Error('Failed to update system configuration');
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-configuration"] });
      toast({
        title: "System configuration updated",
        description: "The gamification mode has been changed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating configuration",
        description: error instanceof Error ? error.message : "Failed to update configuration",
        variant: "destructive",
      });
    },
  });

  // Facebook link account mutation
  const linkFacebookMutation = useMutation({
    mutationFn: async (accessToken: string) => {
      return apiRequest('/api/facebook/link', {
        method: 'POST',
        body: { accessToken },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facebook/status"] });
      toast({
        title: "Facebook Account Connected",
        description: "Your Facebook account has been successfully linked.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect Facebook account.",
        variant: "destructive",
      });
    },
  });

  // Facebook unlink account mutation
  const unlinkFacebookMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/facebook/unlink', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facebook/status"] });
      toast({
        title: "Facebook Account Disconnected",
        description: "Your Facebook account has been successfully disconnected.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Disconnection Failed",
        description: error.message || "Failed to disconnect Facebook account.",
        variant: "destructive",
      });
    },
  });

  // Handle setting change
  const handleSettingChange = (key: string, value: string) => {
    setUnsavedChanges(prev => ({ ...prev, [key]: value }));
  };

  // Handle system mode toggle
  const handleSystemModeToggle = (isLive: boolean) => {
    updateSystemConfigMutation.mutate({
      configKey: "gamification_mode",
      configValue: isLive ? "live" : "development",
      isActive: true
    });
  };

  // Handle Facebook connection
  const handleFacebookConnect = async () => {
    if (!facebookConfig?.appId) {
      toast({
        title: "Configuration Error",
        description: "Facebook App ID is not configured. Please contact your administrator.",
        variant: "destructive",
      });
      return;
    }

    setIsConnectingFacebook(true);

    try {
      // Initialize Facebook SDK
      if (!window.FB) {
        // Load Facebook SDK if not already loaded
        await new Promise<void>((resolve, reject) => {
          if (document.getElementById('facebook-jssdk')) {
            resolve();
            return;
          }
          
          const script = document.createElement('script');
          script.id = 'facebook-jssdk';
          script.src = 'https://connect.facebook.net/en_US/sdk.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Facebook SDK'));
          document.head.appendChild(script);
        });
      }

      // Initialize Facebook SDK
      window.FB.init({
        appId: facebookConfig.appId,
        cookie: true,
        xfbml: true,
        version: 'v18.0'
      });

      // Get login status and request permissions
      window.FB.login((response) => {
        if (response.authResponse) {
          linkFacebookMutation.mutate(response.authResponse.accessToken);
        } else {
          toast({
            title: "Connection Cancelled",
            description: "Facebook connection was cancelled by user.",
            variant: "destructive",
          });
        }
        setIsConnectingFacebook(false);
      }, { scope: 'public_profile,email' });

    } catch (error) {
      console.error('Facebook connection error:', error);
      toast({
        title: "Connection Error",
        description: "Failed to initialize Facebook connection. Please try again.",
        variant: "destructive",
      });
      setIsConnectingFacebook(false);
    }
  };

  // Handle Facebook disconnect
  const handleFacebookDisconnect = () => {
    unlinkFacebookMutation.mutate();
  };

  // Save all changes
  const saveAllChanges = async () => {
    try {
      for (const [key, value] of Object.entries(unsavedChanges)) {
        await updateSettingMutation.mutateAsync({ key, value });
      }
      setUnsavedChanges({});
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  // Test connection function
  const testSync = async (type: 'employee' | 'attendance') => {
    try {
      const endpoint = type === 'employee' ? '/api/sync/employees' : '/api/sync/attendance';
      const response = await fetch(endpoint, { method: 'POST' });
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: `${type === 'employee' ? 'Employee' : 'Attendance'} Sync Test`,
          description: `Test successful. Processed ${result.processed || 0} records.`,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        title: "Sync Test Failed",
        description: error instanceof Error ? error.message : "Connection test failed",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const hasUnsavedChanges = Object.keys(unsavedChanges).length > 0;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-shrink-0 p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
          <h1 className="text-3xl font-bold">System Settings</h1>
          <p className="text-muted-foreground">
            Configure system preferences, localization, and data synchronization
          </p>
        </div>
        {hasUnsavedChanges && (
          <Button 
            onClick={saveAllChanges} 
            disabled={updateSettingMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            Save All Changes
          </Button>
        )}
        </div>

        {hasUnsavedChanges && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 dark:bg-yellow-900/20 dark:border-yellow-800">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                You have unsaved changes
              </span>
              <Badge variant="secondary">{Object.keys(unsavedChanges).length}</Badge>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 mobile-content-scroll">
        <div className="grid gap-6 md:grid-cols-2 pb-20">
        {/* Regional Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Regional Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">System Timezone</Label>
              <Select
                value={getSetting('system.timezone')}
                onValueChange={(value) => handleSettingChange('system.timezone', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                All system times will be converted to this timezone
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-format">Date Format</Label>
              <Select
                value={getSetting('system.date_format')}
                onValueChange={(value) => handleSettingChange('system.date_format', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select date format" />
                </SelectTrigger>
                <SelectContent>
                  {dateFormats.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={getSetting('system.currency')}
                onValueChange={(value) => handleSettingChange('system.currency', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                value={getSetting('company.name')}
                onChange={(e) => handleSettingChange('company.name', e.target.value)}
                placeholder="Enter company name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-address">Company Address</Label>
              <Textarea
                id="company-address"
                value={getSetting('company.address')}
                onChange={(e) => handleSettingChange('company.address', e.target.value)}
                placeholder="Enter company address"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* System Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              System Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Employee Scoring Visibility</Label>
                <p className="text-xs text-muted-foreground">
                  {systemConfig?.configValue === "live" ? (
                    "Live Mode: All employees can see their scores and leaderboards"
                  ) : (
                    "Development Mode: Only admins see scores while collecting baseline data"
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Development
                </span>
                <Switch
                  checked={systemConfig?.configValue === "live"}
                  onCheckedChange={handleSystemModeToggle}
                  disabled={updateSystemConfigMutation.isPending}
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Live
                </span>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Development Mode:</strong> System calculates scores but only shows them to administrators. 
                Use this to collect baseline data and set proper thresholds before going live.
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                <strong>Live Mode:</strong> All employees can see their scores, badges, and leaderboard positions. 
                The gamification system is fully active.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Facebook Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Facebook className="w-5 h-5" />
              Facebook Integration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Profile Photo & Account Linking</Label>
              <p className="text-xs text-muted-foreground">
                Connect your Facebook account to display your profile photo and sync basic profile information
              </p>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <Facebook className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Facebook Account</p>
                    <p className="text-xs text-muted-foreground">
                      {facebookStatus?.isConnected ? `Connected as ${facebookStatus.facebookProfile?.name}` : 'Not connected'}
                    </p>
                  </div>
                </div>
                {facebookStatus?.isConnected ? (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleFacebookDisconnect}
                    disabled={unlinkFacebookMutation.isPending}
                    className="border-red-200 dark:border-red-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Unlink className="w-4 h-4 mr-2" />
                    Disconnect
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleFacebookConnect}
                    disabled={isConnectingFacebook || linkFacebookMutation.isPending}
                    className="border-blue-200 dark:border-blue-800"
                  >
                    <LinkIcon className="w-4 h-4 mr-2" />
                    {isConnectingFacebook ? 'Connecting...' : 'Connect Facebook'}
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>What gets connected:</Label>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  • Profile photo for display in your account
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  • Basic profile information (name, email)
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  • No posting or messaging permissions
                </p>
              </div>
            </div>

            {/* Simple Location Notice */}
            <div className="px-3 py-2 bg-red-900/20 border border-red-500/30 rounded-md flex items-center justify-between">
              <span className="text-red-200 text-sm">Location services disabled, this may impact your mobile attendance and performance scoring</span>
              <Button 
                onClick={() => {
                  // Cross-platform location enable for settings page
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      () => {
                        window.location.reload();
                      },
                      (error) => {
                        if (error.code === error.PERMISSION_DENIED) {
                          alert('Please enable location in browser settings');
                        } else {
                          alert('Location request failed, please try again');
                        }
                      },
                      {
                        enableHighAccuracy: true,
                        timeout: 15000,
                        maximumAge: 300000
                      }
                    );
                  } else {
                    alert('Location services not available');
                  }
                }}
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Enable
              </Button>
            </div>

            {/* Simple Notification Notice */}
            <div className="px-3 py-2 bg-orange-900/20 border border-orange-500/30 rounded-md flex items-center justify-between">
              <span className="text-orange-200 text-sm">Push notifications disabled, you may miss important work updates</span>
              <Button 
                onClick={() => {
                  if ('Notification' in window) {
                    Notification.requestPermission().then(() => window.location.reload());
                  }
                }}
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Enable
              </Button>
            </div>

            {/* Device Security Requirements */}
            <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg border-2 border-purple-300 dark:border-purple-700">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0">
                  🔒
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-purple-800 dark:text-purple-200 mb-2">
                    Device Security & Permissions Required
                  </p>
                  <div className="space-y-2 text-xs text-purple-700 dark:text-purple-300">
                    <p>• Camera access needed for future biometric verification features</p>
                    <p>• Background app refresh must be enabled for real-time sync</p>
                    <p>• Storage permissions required for attendance data backup</p>
                    <p>• Device administrator privileges may be needed for security compliance</p>
                  </div>
                  <div className="mt-3 p-2 bg-purple-100 dark:bg-purple-900/50 rounded border border-purple-200 dark:border-purple-800">
                    <p className="text-xs font-medium text-purple-900 dark:text-purple-100">
                      🛡️ SECURITY: All permissions are essential for anti-fraud protection
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employee Data Synchronization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Employee Data Sync
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Enable Employee Sync</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically sync employee data from BioTime
                </p>
              </div>
              <Switch
                checked={getSetting('sync.employee_enabled') === 'true'}
                onCheckedChange={(checked) => 
                  handleSettingChange('sync.employee_enabled', checked.toString())
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Poll Times (Pakistan Time)</Label>
              <Select
                value={getSetting('sync.employee_poll_times')}
                onValueChange={(value) => handleSettingChange('sync.employee_poll_times', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select poll times" />
                </SelectTrigger>
                <SelectContent>
                  {employeePollTimes.map((time) => (
                    <SelectItem key={time.value} value={time.value}>
                      {time.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Employee data will be synchronized twice daily at these times
              </p>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => testSync('employee')}
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Test Employee Sync
            </Button>
          </CardContent>
        </Card>

        {/* Attendance Data Synchronization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Attendance Data Sync
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Enable Attendance Sync</Label>
                <p className="text-xs text-muted-foreground">
                  Real-time attendance data synchronization
                </p>
              </div>
              <Switch
                checked={getSetting('sync.attendance_enabled') === 'true'}
                onCheckedChange={(checked) => 
                  handleSettingChange('sync.attendance_enabled', checked.toString())
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Poll Interval</Label>
              <Select
                value={getSetting('sync.attendance_poll_interval')}
                onValueChange={(value) => handleSettingChange('sync.attendance_poll_interval', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select poll interval" />
                </SelectTrigger>
                <SelectContent>
                  {attendancePollIntervals.map((interval) => (
                    <SelectItem key={interval.value} value={interval.value}>
                      {interval.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How often to check for new attendance records
              </p>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => testSync('attendance')}
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Test Attendance Sync
            </Button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Email Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Send system alerts via email
                </p>
              </div>
              <Switch
                checked={getSetting('notifications.email_enabled') === 'true'}
                onCheckedChange={(checked) => 
                  handleSettingChange('notifications.email_enabled', checked.toString())
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>SMS Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Send system alerts via SMS
                </p>
              </div>
              <Switch
                checked={getSetting('notifications.sms_enabled') === 'true'}
                onCheckedChange={(checked) => 
                  handleSettingChange('notifications.sms_enabled', checked.toString())
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Google Maps API Test */}
        <GoogleMapsTest />

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current Timezone</span>
                <Badge variant="secondary">
                  {getSetting('system.timezone') || 'Asia/Karachi'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current Time</span>
                <Badge variant="outline">
                  {new Date().toLocaleString('en-US', {
                    timeZone: getSetting('system.timezone') || 'Asia/Karachi',
                    dateStyle: 'short',
                    timeStyle: 'medium',
                  })}
                </Badge>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Employee Sync</span>
                <Badge variant={getSetting('sync.employee_enabled') === 'true' ? 'default' : 'secondary'}>
                  {getSetting('sync.employee_enabled') === 'true' ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Attendance Sync</span>
                <Badge variant={getSetting('sync.attendance_enabled') === 'true' ? 'default' : 'secondary'}>
                  {getSetting('sync.attendance_enabled') === 'true' ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5" />
              Email Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>SMTP Server</Label>
              <Input 
                value="emailserver.nexlinx.net.pk" 
                disabled 
                className="bg-slate-50 dark:bg-slate-800"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Port</Label>
                <Input 
                  value="587" 
                  disabled 
                  className="bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div className="space-y-2">
                <Label>Security</Label>
                <Input 
                  value="TLS" 
                  disabled 
                  className="bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>From Email</Label>
              <Input 
                value="fstream@emailserver.nexlinx.net.pk" 
                disabled 
                className="bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Badge variant="default">Configured</Badge>
            </div>

            <div className="text-sm text-slate-500 dark:text-slate-400">
              Email notifications are sent for attendance alerts, daily reports, and system notifications.
            </div>
          </CardContent>
        </Card>
        {/* Employee Portal Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Employee Portal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Portal Access</Label>
              <p className="text-sm text-muted-foreground">
                Employees can access their personal portal to view attendance, badges, and schedules.
              </p>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <p className="text-sm font-medium">Test Employee Portal</p>
              <p className="text-xs text-muted-foreground">
                Create a test employee account to preview the employee portal experience.
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open('/employee-portal', '_blank')}
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Employee Portal Preview
              </Button>
            </div>
            
            <div className="text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
              <p className="font-medium mb-1">Note for testing:</p>
              <p>To test the employee portal, create an employee user account with role "employee" in the system.</p>
            </div>
          </CardContent>
        </Card>
        
        {/* Version Information */}
        <div className="mt-6">
          <VersionDisplay />
        </div>
        </div>
      </div>
    </div>
  );
}