import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  Car,
  Building2,
  Users,
  Home,
  Stethoscope,
  UserCheck,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Shield,
  Briefcase,
  Wrench,
  Phone,
  Calendar,
  Globe,
  Zap,
  Heart,
  Settings,
  TrendingUp,
  BarChart3,
  Wifi
} from 'lucide-react';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  locationName?: string;
  address?: string;
}

interface PunchData {
  employeeCode: string;
  punchType: 'in' | 'out';
  latitude: number;
  longitude: number;
  gpsAccuracy?: number;
  locationName?: string;
  notes?: string;
  remoteWorkReason?: string;
  deviceInfo?: string;
}

interface ReasonOption {
  id: string;
  label: string;
  description: string;
  icon: any;
  color: string;
  category: 'work' | 'personal' | 'emergency' | 'other';
}

const punchInReasons: ReasonOption[] = [
  { 
    id: 'direct-to-job', 
    label: 'Direct to Job Site', 
    description: 'Going directly to a client location or job site instead of the office',
    icon: Car,
    color: 'bg-blue-600',
    category: 'work'
  },
  { 
    id: 'client-meeting', 
    label: 'Client Meeting', 
    description: 'Starting work day with a client meeting at their location',
    icon: Users,
    color: 'bg-green-600',
    category: 'work'
  },
  { 
    id: 'home-office', 
    label: 'Home Office Work', 
    description: 'Working from home office due to approved remote work arrangement',
    icon: Home,
    color: 'bg-purple-600',
    category: 'work'
  },
  { 
    id: 'field-inspection', 
    label: 'Field Inspection', 
    description: 'Conducting site inspection or field work at remote location',
    icon: Wrench,
    color: 'bg-orange-600',
    category: 'work'
  },
  { 
    id: 'medical-appointment', 
    label: 'Medical Appointment', 
    description: 'Starting late due to medical appointment or health-related issue',
    icon: Stethoscope,
    color: 'bg-cyan-600',
    category: 'personal'
  },
  { 
    id: 'family-emergency', 
    label: 'Family Emergency', 
    description: 'Urgent family matter requiring immediate attention',
    icon: Heart,
    color: 'bg-red-600',
    category: 'emergency'
  },
  { 
    id: 'transport-issue', 
    label: 'Transportation Issue', 
    description: 'Vehicle breakdown, public transport delay, or other transport problems',
    icon: Car,
    color: 'bg-yellow-600',
    category: 'other'
  },
  { 
    id: 'other', 
    label: 'Other Reason', 
    description: 'Please specify the reason for remote punch-in in the comments below',
    icon: MoreHorizontal,
    color: 'bg-gray-600',
    category: 'other'
  }
];

const punchOutReasons: ReasonOption[] = [
  { 
    id: 'end-of-shift', 
    label: 'End of Shift', 
    description: 'Completing regular work hours at remote location',
    icon: Clock,
    color: 'bg-green-600',
    category: 'work'
  },
  { 
    id: 'emergency', 
    label: 'Emergency', 
    description: 'Personal or family emergency requiring immediate departure',
    icon: AlertTriangle,
    color: 'bg-red-600',
    category: 'emergency'
  },
  { 
    id: 'medical', 
    label: 'Medical Issue', 
    description: 'Health-related issue requiring medical attention',
    icon: Stethoscope,
    color: 'bg-blue-600',
    category: 'personal'
  },
  { 
    id: 'transport', 
    label: 'Transportation Issue', 
    description: 'Vehicle breakdown or transport problem requiring departure',
    icon: Car,
    color: 'bg-yellow-600',
    category: 'other'
  },
  { 
    id: 'family', 
    label: 'Family Commitment', 
    description: 'Pre-approved family commitment or urgent family matter',
    icon: UserCheck,
    color: 'bg-purple-600',
    category: 'personal'
  },
  { 
    id: 'weather', 
    label: 'Weather Conditions', 
    description: 'Severe weather conditions affecting work or travel safety',
    icon: Globe,
    color: 'bg-indigo-600',
    category: 'other'
  },
  { 
    id: 'technical', 
    label: 'Technical Issue', 
    description: 'System malfunction or technical problem preventing work',
    icon: Settings,
    color: 'bg-orange-600',
    category: 'other'
  },
  { 
    id: 'other', 
    label: 'Other Reason', 
    description: 'Please specify the reason for early punch-out in the comments below',
    icon: MoreHorizontal,
    color: 'bg-gray-600',
    category: 'other'
  }
];

export default function MobileEnhancedPunchInterface() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [showCustomReasonDialog, setShowCustomReasonDialog] = useState(false);
  const [punchType, setPunchType] = useState<'in' | 'out'>('in');
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [step, setStep] = useState<'reason' | 'confirm'>('reason');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            locationName: 'Current Location',
            address: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`
          };
          setCurrentLocation(locationData);
          setLocationStatus('success');
        },
        (error) => {
          console.error('Location error:', error);
          setLocationStatus('error');
          toast({
            title: "Location Error",
            description: "Unable to get your current location. Please enable location services.",
            variant: "destructive",
          });
        },
        { 
          enableHighAccuracy: true, 
          timeout: 10000, 
          maximumAge: 300000 
        }
      );
    } else {
      setLocationStatus('error');
      toast({
        title: "Location Not Supported",
        description: "Your device doesn't support location services.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Check current punch status
  const { data: currentPunchStatus } = useQuery({
    queryKey: ['/api/mobile/punch-status'],
    retry: false,
  });

  // Determine punch type based on current status
  useEffect(() => {
    if (currentPunchStatus?.isPunchedIn) {
      setPunchType('out');
    } else {
      setPunchType('in');
    }
  }, [currentPunchStatus]);

  // Punch mutation
  const punchMutation = useMutation({
    mutationFn: async (data: PunchData) => {
      return await apiRequest('/api/mobile/punch', {
        method: 'POST',
        body: data,
      });
    },
    onSuccess: (data) => {
      toast({
        title: `Punch ${punchType === 'in' ? 'In' : 'Out'} Successful`,
        description: data.message || `Successfully punched ${punchType === 'in' ? 'in' : 'out'}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/mobile/punch-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      navigate('/mobile');
    },
    onError: (error: any) => {
      toast({
        title: "Punch Error",
        description: error.message || `Failed to punch ${punchType === 'in' ? 'in' : 'out'}`,
        variant: "destructive",
      });
    },
  });

  const handlePunch = () => {
    if (!currentLocation) {
      toast({
        title: "Location Required",
        description: "Please enable location services to punch in/out.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedReason) {
      toast({
        title: "Reason Required",
        description: "Please select a reason for remote punch.",
        variant: "destructive",
      });
      return;
    }

    const punchData: PunchData = {
      employeeCode: user?.username || '',
      punchType,
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      gpsAccuracy: currentLocation.accuracy,
      locationName: currentLocation.locationName,
      remoteWorkReason: selectedReason,
      notes: selectedReason === 'other' ? customReason : undefined,
      deviceInfo: navigator.userAgent,
    };

    punchMutation.mutate(punchData);
  };

  const handleReasonSelect = (reasonId: string) => {
    setSelectedReason(reasonId);
    if (reasonId === 'other') {
      setShowCustomReasonDialog(true);
    } else {
      setStep('confirm');
    }
  };

  const handleCustomReasonSubmit = () => {
    if (!customReason.trim()) {
      toast({
        title: "Custom Reason Required",
        description: "Please provide a reason for selecting 'Other'.",
        variant: "destructive",
      });
      return;
    }
    setShowCustomReasonDialog(false);
    setStep('confirm');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false 
    });
  };

  const currentReasons = punchType === 'in' ? punchInReasons : punchOutReasons;
  const selectedReasonData = currentReasons.find(r => r.id === selectedReason);

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
            <Clock className="w-6 h-6 text-purple-400" />
            <h2 className="text-white font-semibold text-base">
              Punch {punchType === 'in' ? 'In' : 'Out'}
            </h2>
          </div>
        </div>
        <Badge variant="secondary" className="bg-purple-600/20 text-purple-300">
          Remote
        </Badge>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {step === 'reason' && (
          <div className="p-4 space-y-4">
            {/* Location Status */}
            <Card className="bg-[#2A2B5E] border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${locationStatus === 'success' ? 'bg-green-500' : locationStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                  <div>
                    <div className="text-sm font-medium text-white">Location Status</div>
                    <div className="text-xs text-gray-300">
                      {locationStatus === 'success' ? 'Location detected' : 
                       locationStatus === 'error' ? 'Location unavailable' : 'Getting location...'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reason Selection */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">
                Why are you punching {punchType === 'in' ? 'in' : 'out'} remotely?
              </h3>
              
              {['work', 'personal', 'emergency', 'other'].map(category => {
                const categoryReasons = currentReasons.filter(r => r.category === category);
                if (categoryReasons.length === 0) return null;
                
                return (
                  <div key={category} className="space-y-2">
                    <div className="text-sm font-medium text-gray-300 uppercase tracking-wider">
                      {category === 'work' ? 'Work Related' : 
                       category === 'personal' ? 'Personal' : 
                       category === 'emergency' ? 'Emergency' : 'Other'}
                    </div>
                    
                    {categoryReasons.map(reason => {
                      const IconComponent = reason.icon;
                      return (
                        <button
                          key={reason.id}
                          onClick={() => handleReasonSelect(reason.id)}
                          className={`w-full p-4 rounded-lg border-2 transition-all ${
                            selectedReason === reason.id 
                              ? 'border-purple-500 bg-purple-600/20' 
                              : 'border-gray-600 bg-[#2A2B5E] hover:border-gray-500'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${reason.color}`}>
                              <IconComponent className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 text-left">
                              <div className="font-medium text-white">{reason.label}</div>
                              <div className="text-sm text-gray-300 mt-1">{reason.description}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 'confirm' && selectedReasonData && (
          <div className="p-4 space-y-4">
            {/* Confirmation Details */}
            <Card className="bg-[#2A2B5E] border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Confirm Punch {punchType === 'in' ? 'In' : 'Out'}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedReasonData.color}`}>
                      <selectedReasonData.icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-white">{selectedReasonData.label}</div>
                      <div className="text-sm text-gray-300">{selectedReasonData.description}</div>
                    </div>
                  </div>
                  
                  {selectedReason === 'other' && customReason && (
                    <div className="mt-3 p-3 bg-gray-700/50 rounded-lg">
                      <div className="text-sm font-medium text-white">Additional Details:</div>
                      <div className="text-sm text-gray-300 mt-1">{customReason}</div>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2 text-sm text-gray-300">
                    <MapPin className="w-4 h-4" />
                    <span>{currentLocation?.address || 'Current location'}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm text-gray-300">
                    <Clock className="w-4 h-4" />
                    <span>{formatTime(currentTime)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button
                onClick={() => setStep('reason')}
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Back
              </Button>
              <Button
                onClick={handlePunch}
                disabled={punchMutation.isPending || locationStatus !== 'success'}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {punchMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Confirm Punch {punchType === 'in' ? 'In' : 'Out'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Custom Reason Dialog */}
      <Dialog open={showCustomReasonDialog} onOpenChange={setShowCustomReasonDialog}>
        <DialogContent className="bg-[#2A2B5E] border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Please specify your reason</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Enter your reason for remote punch..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              rows={4}
            />
            <div className="flex space-x-3">
              <Button
                onClick={() => setShowCustomReasonDialog(false)}
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCustomReasonSubmit}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom Navigation */}
      <div className="bg-black/80 backdrop-blur-xl border-t border-white/10 fixed bottom-0 left-0 right-0">
        <div className="flex items-center justify-around py-1 px-4 safe-area-bottom">
          <button 
            onClick={() => navigate('/mobile')}
            className="flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200 active:scale-95"
          >
            <div className="w-7 h-7 flex items-center justify-center rounded-full">
              <BarChart3 className="w-5 h-5 text-gray-400" />
            </div>
            <span className="text-[10px] text-gray-400 mt-1 font-medium">Dashboard</span>
          </button>
          <button 
            onClick={() => navigate('/mobile/attendance')}
            className="flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200 active:scale-95"
          >
            <div className="w-7 h-7 flex items-center justify-center rounded-full">
              <Clock className="w-5 h-5 text-gray-400" />
            </div>
            <span className="text-[10px] text-gray-400 mt-1 font-medium">Attendance</span>
          </button>
          <button 
            onClick={() => navigate('/mobile/analytics')}
            className="flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200 active:scale-95"
          >
            <div className="w-7 h-7 flex items-center justify-center rounded-full">
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
            <span className="text-[10px] text-gray-400 mt-1 font-medium">Analytics</span>
          </button>
          <button 
            onClick={() => navigate('/mobile/schedule')}
            className="flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200 active:scale-95"
          >
            <div className="w-7 h-7 flex items-center justify-center rounded-full">
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>
            <span className="text-[10px] text-gray-400 mt-1 font-medium">Schedule</span>
          </button>
          <button 
            onClick={() => navigate('/mobile/settings')}
            className="flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200 active:scale-95"
          >
            <div className="w-7 h-7 flex items-center justify-center rounded-full">
              <Settings className="w-5 h-5 text-gray-400" />
            </div>
            <span className="text-[10px] text-gray-400 mt-1 font-medium">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}