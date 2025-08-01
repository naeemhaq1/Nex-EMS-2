import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { 
  ArrowLeft, 
  Clock, 
  MapPin, 
  Camera, 
  FileText, 
  Send, 
  AlertCircle,
  CheckCircle,
  User,
  Calendar,
  Timer,
  Wifi
} from 'lucide-react';

export default function MobilePunchOutRequest() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [reason, setReason] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Predefined reasons for punch out requests
  const punchOutReasons = [
    { id: 'emergency', label: 'Emergency', description: 'Personal or family emergency' },
    { id: 'medical', label: 'Medical', description: 'Health-related issue' },
    { id: 'transport', label: 'Transportation', description: 'Vehicle breakdown or transport issue' },
    { id: 'family', label: 'Family', description: 'Family commitment or emergency' },
    { id: 'weather', label: 'Weather', description: 'Severe weather conditions' },
    { id: 'technical', label: 'Technical', description: 'System or device malfunction' },
    { id: 'other', label: 'Other', description: 'Please specify in comments' }
  ];

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
          setLocation(`${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
        },
        () => {
          setLocation('Location not available');
        }
      );
    }
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleSubmit = async () => {
    if (!selectedReason || (!reason && selectedReason === 'other')) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Here you would make the actual API call to submit punch out request
      const requestData = {
        employeeCode: user?.username,
        reason: selectedReason,
        customReason: selectedReason === 'other' ? reason : '',
        location: location,
        timestamp: new Date().toISOString(),
        status: 'pending'
      };
      
      console.log('Punch out request submitted:', requestData);
      setIsSuccess(true);
      
      // Auto navigate back after success
      setTimeout(() => {
        navigate('/mobile');
      }, 3000);
      
    } catch (error) {
      console.error('Failed to submit punch out request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
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

        {/* Success Content */}
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Request Submitted</h2>
            <p className="text-gray-400 mb-4">Your punch out request has been sent successfully</p>
            <p className="text-sm text-gray-500">You will be redirected to dashboard shortly...</p>
          </div>
        </div>
      </div>
    );
  }

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
            <Clock className="w-6 h-6 text-red-400" />
            <h2 className="text-white font-semibold text-base">Punch Out Request</h2>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {/* Current Session Info */}
        <div className="px-4 py-4 border-b border-gray-800">
          <div className="bg-[#2A2B5E] rounded-lg p-4">
            <h3 className="text-white font-medium text-sm mb-3">Current Session</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400 text-sm">Employee</span>
                </div>
                <span className="text-white text-sm">{user?.username || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400 text-sm">Date</span>
                </div>
                <span className="text-white text-sm">{formatDate(currentTime)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Timer className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400 text-sm">Time</span>
                </div>
                <span className="text-white text-sm">{formatTime(currentTime)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400 text-sm">Location</span>
                </div>
                <span className="text-white text-xs truncate max-w-40">{location || 'Getting location...'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Alert */}
        <div className="px-4 py-4">
          <div className="bg-orange-600/20 border border-orange-600/30 rounded-lg p-3 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-orange-400 font-medium text-sm">Important Notice</h4>
              <p className="text-orange-200 text-xs mt-1">
                This request will be sent to your supervisor for approval. 
                Please provide a valid reason for early punch out.
              </p>
            </div>
          </div>
        </div>

        {/* Reason Selection */}
        <div className="px-4 pb-4">
          <h3 className="text-white font-medium text-sm mb-3">Select Reason</h3>
          <div className="space-y-2">
            {punchOutReasons.map((reasonOption) => (
              <button
                key={reasonOption.id}
                onClick={() => setSelectedReason(reasonOption.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedReason === reasonOption.id
                    ? 'bg-purple-600/20 border-purple-600 text-white'
                    : 'bg-[#2A2B5E] border-gray-700 text-gray-300 hover:border-gray-600'
                }`}
              >
                <div className="font-medium text-sm">{reasonOption.label}</div>
                <div className="text-xs text-gray-400 mt-1">{reasonOption.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Reason Input */}
        {selectedReason === 'other' && (
          <div className="px-4 pb-4">
            <h3 className="text-white font-medium text-sm mb-3">Additional Details</h3>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide detailed reason for punch out request..."
              className="w-full h-24 px-3 py-2 bg-[#2A2B5E] border border-gray-700 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:border-purple-600 resize-none"
              maxLength={500}
            />
            <div className="text-xs text-gray-500 mt-1">{reason.length}/500 characters</div>
          </div>
        )}

        {selectedReason && selectedReason !== 'other' && (
          <div className="px-4 pb-4">
            <h3 className="text-white font-medium text-sm mb-3">Additional Comments (Optional)</h3>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Any additional details you'd like to add..."
              className="w-full h-20 px-3 py-2 bg-[#2A2B5E] border border-gray-700 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:border-purple-600 resize-none"
              maxLength={300}
            />
            <div className="text-xs text-gray-500 mt-1">{reason.length}/300 characters</div>
          </div>
        )}

        {/* Submit Button */}
        <div className="px-4 pb-4">
          <button
            onClick={handleSubmit}
            disabled={!selectedReason || isSubmitting || (selectedReason === 'other' && !reason.trim())}
            className={`w-full py-3 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors ${
              !selectedReason || isSubmitting || (selectedReason === 'other' && !reason.trim())
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Submitting Request...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit Punch Out Request</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bg-[#2A2B5E] border-t border-gray-800 fixed bottom-0 left-0 right-0">
        <div className="flex justify-around py-2">
          <button 
            onClick={() => navigate('/mobile')}
            className="flex flex-col items-center space-y-1 px-3 py-1 bg-purple-600 rounded-lg"
          >
            <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
            </div>
            <span className="text-[10px] text-white font-medium">Dashboard</span>
          </button>
          <button 
            onClick={() => navigate('/mobile/attendance')}
            className="flex flex-col items-center space-y-1 px-3 py-1"
          >
            <Clock className="w-5 h-5 text-gray-400" />
            <span className="text-[10px] text-gray-400">Attendance</span>
          </button>
          <button 
            onClick={() => navigate('/mobile/analytics')}
            className="flex flex-col items-center space-y-1 px-3 py-1"
          >
            <FileText className="w-5 h-5 text-gray-400" />
            <span className="text-[10px] text-gray-400">Analytics</span>
          </button>
          <button 
            onClick={() => navigate('/mobile/schedule')}
            className="flex flex-col items-center space-y-1 px-3 py-1"
          >
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-[10px] text-gray-400">Schedule</span>
          </button>
          <button 
            onClick={() => navigate('/mobile/settings')}
            className="flex flex-col items-center space-y-1 px-3 py-1"
          >
            <User className="w-5 h-5 text-gray-400" />
            <span className="text-[10px] text-gray-400">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}