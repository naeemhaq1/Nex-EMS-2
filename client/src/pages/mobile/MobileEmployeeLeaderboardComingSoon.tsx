import React from 'react';
import { Trophy, ArrowLeft, Star, TrendingUp, Users, Clock, Construction } from "lucide-react";
import { useLocation } from "wouter";
import MobileFooter from '@/components/mobile/MobileFooter';

export default function MobileEmployeeLeaderboardComingSoon() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1B3E] to-[#2A2B5E] text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#1A1B3E]/95 backdrop-blur-sm border-b border-gray-700">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => navigate('/mobile/employee/dashboard')}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          
          <div className="flex items-center space-x-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <h1 className="text-lg font-semibold">Leaderboard</h1>
          </div>
          
          <div className="w-9 h-9"></div>
        </div>
      </div>

      {/* Coming Soon Content */}
      <div className="flex-1 px-4 py-8 flex flex-col items-center justify-center">
        {/* Main Icon */}
        <div className="mb-8">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <Construction className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Coming Soon Text */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-3">Employee Leaderboard</h2>
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-transparent bg-clip-text text-lg font-semibold mb-4">
            Coming Soon!
          </div>
          <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
            We're building an exciting competitive leaderboard to showcase top performers, 
            track achievements, and celebrate your success!
          </p>
        </div>

        {/* Feature Preview */}
        <div className="bg-[#2A2B5E] rounded-lg p-6 w-full max-w-sm mb-8">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" />
            What's Coming
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <span className="text-gray-300">Performance rankings & scores</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-gray-300">Achievement badges & rewards</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span className="text-gray-300">Department competitions</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-gray-300">Weekly & monthly winners</span>
            </div>
          </div>
        </div>

        {/* Mock Preview */}
        <div className="bg-[#1A1B3E]/50 rounded-lg p-4 w-full max-w-sm border border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <Users className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-gray-300">Preview Rankings</span>
          </div>
          
          <div className="space-y-2">
            {[1, 2, 3].map((rank) => (
              <div key={rank} className="flex items-center gap-3 p-2 bg-gray-800/30 rounded">
                <div className="w-6 h-6 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center text-xs text-white font-bold">
                  {rank}
                </div>
                <div className="flex-1">
                  <div className="w-20 h-3 bg-gray-600 rounded animate-pulse"></div>
                  <div className="w-16 h-2 bg-gray-700 rounded mt-1 animate-pulse"></div>
                </div>
                <div className="w-10 h-3 bg-gray-600 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Back Button */}
        <button
          onClick={() => navigate('/mobile/employee/dashboard')}
          className="mt-8 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
      </div>

      {/* Footer */}
      <MobileFooter currentPage="leaderboard" />
    </div>
  );
}