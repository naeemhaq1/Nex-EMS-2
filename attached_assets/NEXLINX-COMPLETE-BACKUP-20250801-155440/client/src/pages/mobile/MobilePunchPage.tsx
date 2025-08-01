import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
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
  Loader2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  locationName?: string;
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

const remoteWorkReasons = [
  { 
    id: 'direct-to-job', 
    label: 'Direct to Job Site', 
    icon: Car,
    color: 'bg-blue-600'
  },
  { 
    id: 'automotive-issues', 
    label: 'Automotive Issues', 
    icon: Car,
    color: 'bg-red-600'
  },
  { 
    id: 'client-meeting', 
    label: 'Client Meeting', 
    icon: Users,
    color: 'bg-green-600'
  },
  { 
    id: 'home-office', 
    label: 'Home Office', 
    icon: Home,
    color: 'bg-purple-600'
  },
  { 
    id: 'medical-appointment', 
    label: 'Medical Appointment', 
    icon: Stethoscope,
    color: 'bg-cyan-600'
  },
  { 
    id: 'family-emergency', 
    label: 'Family Emergency', 
    icon: UserCheck,
    color: 'bg-orange-600'
  },
  { 
    id: 'other', 
    label: 'Other', 
    icon: MoreHorizontal,
    color: 'bg-gray-600'
  }
];

const MobilePunchPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [showCustomReasonDialog, setShowCustomReasonDialog] = useState(false);
  const [punchType, setPunchType] = useState<'in' | 'out'>('in');
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [currentTime, setCurrentTime] = useState(new Date());
  const { toast } = useToast();
  const { user } = useAuth();
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
            locationName: 'Current Location'
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
      setLocation('/mobile');
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
        description: "Please wait for location to be detected before punching.",
        variant: "destructive",
      });
      return;
    }

    if (!user?.username) {
      toast({
        title: "Authentication Error",
        description: "Please log in to punch in/out.",
        variant: "destructive",
      });
      return;
    }

    const punchData: PunchData = {
      employeeCode: user.username,
      punchType,
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      gpsAccuracy: currentLocation.accuracy,
      locationName: currentLocation.locationName,
      remoteWorkReason: selectedReason || undefined,
      deviceInfo: navigator.userAgent,
      notes: selectedReason === 'other' && customReason ? `Custom reason: ${customReason}` : selectedReason ? `Remote work reason: ${remoteWorkReasons.find(r => r.id === selectedReason)?.label}` : undefined
    };

    punchMutation.mutate(punchData);
  };

  const handleBack = () => {
    setLocation('/mobile');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1B3E] to-[#2A2B5E] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#1A1B3E]/80 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold text-white">Mark Attendance</h1>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <Card className="w-full max-w-sm bg-[#2A2B5E]/90 backdrop-blur-sm border-purple-500/30">
          <CardContent className="p-8 text-center">
            {/* Employee Info */}
            <div className="mb-8">
              <Avatar className="w-20 h-20 mx-auto mb-4 ring-2 ring-purple-500/30">
                <AvatarImage src="/api/placeholder/150/150" />
                <AvatarFallback className="bg-purple-600 text-white text-xl">
                  {user?.username?.substring(0, 2).toUpperCase() || 'EE'}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-semibold text-white mb-1">
                {user?.username || 'Employee'}
              </h2>
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                {user?.role || 'Employee'}
              </Badge>
            </div>

            {/* Punch Buttons */}
            <div className="mb-8">
              <Button
                onClick={locationStatus !== 'success' ? undefined : handlePunch}
                disabled={punchMutation.isPending || locationStatus !== 'success'}
                title={locationStatus !== 'success' ? 'Please enable Location services' : ''}
                className={`w-full h-14 text-lg font-semibold ${
                  punchType === 'in' 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-green-600 hover:bg-green-700'
                } disabled:bg-gray-600 disabled:cursor-not-allowed`}
              >
                {punchMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : locationStatus !== 'success' ? (
                  <>
                    <MapPin className="w-5 h-5 mr-2" />
                    Please enable Location services
                  </>
                ) : (
                  <>
                    {punchType === 'in' ? 'Check In' : 'Check Out'}
                  </>
                )}
              </Button>
            </div>

            {/* Remote Work Reasons */}
            <div className="mb-8">
              <h3 className="text-white font-medium mb-4">Remote Work Reason</h3>
              <div className="grid grid-cols-2 gap-3">
                {remoteWorkReasons.map((reason) => {
                  const IconComponent = reason.icon;
                  return (
                    <button
                      key={reason.id}
                      onClick={() => {
                        if (reason.id === 'other') {
                          setShowCustomReasonDialog(true);
                        } else {
                          setSelectedReason(reason.id === selectedReason ? null : reason.id);
                        }
                      }}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedReason === reason.id
                          ? 'border-purple-500 bg-purple-500/20'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg ${reason.color} flex items-center justify-center mx-auto mb-2`}>
                        <IconComponent className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-xs text-gray-300">{reason.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Location Status */}
            <div className="mb-6">
              <div className="flex items-center justify-center mb-2">
                <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-400">Location Status</span>
              </div>
              <div className="flex items-center justify-center">
                {locationStatus === 'loading' && (
                  <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Getting Location...
                  </Badge>
                )}
                {locationStatus === 'success' && (
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Location Detected
                  </Badge>
                )}
                {locationStatus === 'error' && (
                  <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                    <XCircle className="w-3 h-3 mr-1" />
                    Location Error
                  </Badge>
                )}
              </div>
            </div>

            {/* Time Display */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Clock className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-2xl font-bold text-white">{formatTime(currentTime)}</span>
              </div>
              <p className="text-sm text-gray-400">{formatDate(currentTime)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Current Status */}
        {currentPunchStatus && (
          <Card className="w-full max-w-sm mt-4 bg-[#2A2B5E]/90 backdrop-blur-sm border-purple-500/30">
            <CardContent className="p-4">
              <div className="text-center">
                <h3 className="text-white font-medium mb-2">Current Status</h3>
                {currentPunchStatus.isPunchedIn ? (
                  <div>
                    <Badge className="bg-green-500/20 text-green-300 border-green-500/30 mb-2">
                      Currently Punched In
                    </Badge>
                    {currentPunchStatus.punchInTime && (
                      <p className="text-sm text-gray-400">
                        Since: {new Date(currentPunchStatus.punchInTime).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/30">
                    Not Punched In
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Custom Reason Dialog */}
        <Dialog open={showCustomReasonDialog} onOpenChange={setShowCustomReasonDialog}>
          <DialogContent className="bg-[#1A1B3E] border-purple-500/30 text-white w-[90%] max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-center mb-4">Custom Reason</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label className="text-gray-300 text-sm">
                  Please specify your reason for remote work...
                </Label>
                <Textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Please specify your reason for remote work..."
                  className="mt-2 bg-[#2A2B5E] border-purple-500/30 text-white placeholder-gray-400 resize-none h-32"
                  maxLength={200}
                />
                <div className="text-right text-xs text-gray-400 mt-1">
                  {customReason.length}/200
                </div>
              </div>
              
              <div className="text-sm text-gray-400 bg-[#2A2B5E]/50 p-3 rounded-lg">
                Please provide a clear and professional reason for working remotely. This will be reviewed by your supervisor.
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCustomReasonDialog(false);
                    setCustomReason('');
                  }}
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (customReason.trim()) {
                      setSelectedReason('other');
                      setShowCustomReasonDialog(false);
                    } else {
                      toast({
                        title: "Reason Required",
                        description: "Please provide a reason for remote work.",
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={!customReason.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600"
                >
                  Submit
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default MobilePunchPage;