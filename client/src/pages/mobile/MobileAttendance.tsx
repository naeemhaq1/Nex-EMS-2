import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Bell, Calendar, Clock, TrendingUp, Trophy, Target, ArrowLeft, Download, Filter, BarChart3, Settings, Mail } from 'lucide-react';
import MobileFooter from '@/components/mobile/MobileFooter';

export default function MobileAttendance() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Sample attendance data
  const attendanceData = [
    { date: '2025-01-10', checkIn: '09:00', checkOut: '17:30', hours: 8.5, status: 'Present' },
    { date: '2025-01-09', checkIn: '09:15', checkOut: '17:30', hours: 8.25, status: 'Late' },
    { date: '2025-01-08', checkIn: '09:00', checkOut: '17:30', hours: 8.5, status: 'Present' },
    { date: '2025-01-07', checkIn: '09:00', checkOut: '17:30', hours: 8.5, status: 'Present' },
    { date: '2025-01-06', checkIn: '09:30', checkOut: '17:30', hours: 8.0, status: 'Late' },
    { date: '2025-01-05', checkIn: '09:00', checkOut: '17:30', hours: 8.5, status: 'Present' },
    { date: '2025-01-04', checkIn: '09:00', checkOut: '17:30', hours: 8.5, status: 'Present' },
    { date: '2025-01-03', checkIn: '09:00', checkOut: '17:30', hours: 8.5, status: 'Present' },
  ];

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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Present': return 'text-green-400';
      case 'Late': return 'text-yellow-400';
      case 'Absent': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'Present': return 'bg-green-600';
      case 'Late': return 'bg-yellow-600';
      case 'Absent': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="h-screen bg-[#1A1B3E] flex flex-col overflow-hidden">
      {/* Mobile Status Bar */}
      <div className="bg-black text-white text-xs flex justify-between items-center px-4 py-1">
        <div className="flex items-center space-x-1">
          <span>{formatTime(currentTime)}</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
          </div>
          <span>📶</span>
          <span>🔋</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate('/mobile')}
            className="p-1 rounded-lg hover:bg-gray-800"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <h1 className="text-white font-semibold text-lg">Attendance</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-1 rounded-lg hover:bg-gray-800">
            <Filter className="w-5 h-5 text-gray-400" />
          </button>
          <button className="p-1 rounded-lg hover:bg-gray-800">
            <Download className="w-5 h-5 text-gray-400" />
          </button>
          <Bell className="w-5 h-5 text-gray-400" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-3">
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-[#2A2B5E] rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-green-400" />
              <span className="text-xs text-gray-400">THIS MONTH</span>
            </div>
            <div className="text-lg font-bold text-white mt-1">22</div>
            <div className="text-xs text-gray-400">Days Present</div>
          </div>
          <div className="bg-[#2A2B5E] rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-400">TOTAL HOURS</span>
            </div>
            <div className="text-lg font-bold text-white mt-1">176</div>
            <div className="text-xs text-gray-400">Hours Worked</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#2A2B5E] rounded-lg p-2.5 text-center">
            <div className="text-xs text-gray-400">On Time</div>
            <div className="text-sm font-bold text-green-400">18</div>
          </div>
          <div className="bg-[#2A2B5E] rounded-lg p-2.5 text-center">
            <div className="text-xs text-gray-400">Late</div>
            <div className="text-sm font-bold text-yellow-400">4</div>
          </div>
          <div className="bg-[#2A2B5E] rounded-lg p-2.5 text-center">
            <div className="text-xs text-gray-400">Absent</div>
            <div className="text-sm font-bold text-red-400">0</div>
          </div>
        </div>
      </div>

      {/* Attendance List */}
      <div className="flex-1 px-3 pb-16 overflow-y-scroll mobile-scroll scrollbar-hide" style={{
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
        touchAction: 'pan-y'
      }}>
        <h3 className="text-white font-medium text-sm mb-3">Recent Attendance</h3>
        <div className="space-y-2">
          {attendanceData.map((record, index) => (
            <div key={index} className="bg-[#2A2B5E] rounded-lg p-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-white text-sm font-medium">
                      {new Date(record.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-xs text-gray-400">In: {record.checkIn}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                      <span className="text-xs text-gray-400">Out: {record.checkOut}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`px-2 py-1 rounded-full text-xs ${getStatusBg(record.status)}`}>
                    {record.status}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{record.hours}h</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <MobileFooter currentPage="attendance" />
    </div>
  );
}