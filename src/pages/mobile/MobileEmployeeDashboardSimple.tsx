import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Clock, Users, Target, TrendingUp } from 'lucide-react';
import MobileFooter from '@/components/mobile/MobileFooter';

export default function MobileEmployeeDashboardSimple() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  return (
    <div className="h-screen bg-[#1A1B3E] text-white overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#2A2B5E]">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium">
              {user?.username?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div>
            <h1 className="text-lg font-semibold">Employee Dashboard</h1>
            <p className="text-sm text-gray-300">Welcome back, {user?.username}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-xs text-gray-400">
            {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/mobile/punch')}
            className="bg-green-600 hover:bg-green-700 rounded-lg p-4 text-center transition-colors"
          >
            <Clock className="w-6 h-6 mx-auto mb-2" />
            <span className="text-sm font-medium">Punch In/Out</span>
          </button>
          <button
            onClick={() => navigate('/mobile/attendance')}
            className="bg-blue-600 hover:bg-blue-700 rounded-lg p-4 text-center transition-colors"
          >
            <Target className="w-6 h-6 mx-auto mb-2" />
            <span className="text-sm font-medium">My Attendance</span>
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#2A2B5E] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">8.5</div>
                <div className="text-sm text-gray-300">Hours Today</div>
              </div>
              <Clock className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-[#2A2B5E] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">95%</div>
                <div className="text-sm text-gray-300">Attendance</div>
              </div>
              <Users className="w-8 h-8 text-green-400" />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-[#2A2B5E] rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm">Punched In</span>
              </div>
              <span className="text-sm text-gray-400">9:00 AM</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-sm">Break Started</span>
              </div>
              <span className="text-sm text-gray-400">12:30 PM</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="text-sm">Break Ended</span>
              </div>
              <span className="text-sm text-gray-400">1:30 PM</span>
            </div>
          </div>
        </div>

        {/* Navigation Options */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/mobile/analytics')}
            className="bg-[#2A2B5E] hover:bg-[#3A3B6E] rounded-lg p-4 text-center transition-colors"
          >
            <TrendingUp className="w-6 h-6 mx-auto mb-2" />
            <span className="text-sm font-medium">Analytics</span>
          </button>
          <button
            onClick={() => navigate('/mobile/my-profile')}
            className="bg-[#2A2B5E] hover:bg-[#3A3B6E] rounded-lg p-4 text-center transition-colors"
          >
            <Users className="w-6 h-6 mx-auto mb-2" />
            <span className="text-sm font-medium">My Profile</span>
          </button>
        </div>
      </div>

      {/* Footer Navigation */}
      <MobileFooter currentPage="dashboard" />
    </div>
  );
}