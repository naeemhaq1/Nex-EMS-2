import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Clock, Users, TrendingUp, Activity, Zap, Heart, Star } from 'lucide-react';
import { 
  LoadingSpinner, 
  PlayfulLoader, 
  FullScreenLoader, 
  InlineLoader, 
  CardSkeleton, 
  ChartSkeleton 
} from '@/components/ui/LoadingAnimations';
import PunchButton from '@/components/mobile/PunchButton';
import LoadingCard from '@/components/mobile/LoadingCard';

export default function LoadingDemo() {
  const [, navigate] = useLocation();
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => (prev >= 100 ? 0 : prev + 10));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const mockPunchAction = async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
  };

  return (
    <div className="min-h-screen bg-[#1A1B3E] text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate('/mobile/dashboard')}
            className="p-2 hover:bg-gray-700 rounded-lg mobile-scale-tap"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-lg font-semibold animate-fade-in">Loading Animations Demo</h1>
            <p className="text-xs text-gray-400 animate-slide-up">Playful UI components</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Playful Loaders Section */}
        <div className="bg-[#2A2B5E] rounded-lg p-4 animate-scale-in">
          <h2 className="text-lg font-semibold mb-4 flex items-center animate-fade-in">
            <Zap className="w-5 h-5 mr-2 text-yellow-400 animate-wiggle" />
            Playful Loaders
          </h2>
          
          <div className="grid grid-cols-2 gap-4 stagger-animation">
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-2">Dots</p>
              <PlayfulLoader type="dots" color="blue" size="md" />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-2">Bars</p>
              <PlayfulLoader type="bars" color="purple" size="md" />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-2">Hearts</p>
              <PlayfulLoader type="hearts" color="purple" size="md" />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-2">Stars</p>
              <PlayfulLoader type="stars" color="orange" size="md" />
            </div>
          </div>
        </div>

        {/* Loading Spinners */}
        <div className="bg-[#2A2B5E] rounded-lg p-4 animate-slide-up">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-green-400 animate-float" />
            Loading Spinners
          </h2>
          
          <div className="flex items-center justify-around">
            <div className="text-center">
              <LoadingSpinner size="sm" color="blue" variant="default" />
              <p className="text-xs text-gray-400 mt-2">Small</p>
            </div>
            <div className="text-center">
              <LoadingSpinner size="md" color="purple" variant="pulse" />
              <p className="text-xs text-gray-400 mt-2">Medium</p>
            </div>
            <div className="text-center">
              <LoadingSpinner size="lg" color="green" variant="bounce" />
              <p className="text-xs text-gray-400 mt-2">Large</p>
            </div>
          </div>
        </div>

        {/* Inline Loaders */}
        <div className="bg-[#2A2B5E] rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4 flex items-center animate-fade-in">
            <TrendingUp className="w-5 h-5 mr-2 text-blue-400 animate-glow" />
            Inline Loaders
          </h2>
          
          <div className="space-y-3">
            <InlineLoader message="Loading dashboard..." type="dots" color="blue" />
            <InlineLoader message="Processing data..." type="bars" color="purple" />
            <InlineLoader message="Syncing attendance..." type="spinner" color="green" />
          </div>
        </div>

        {/* Enhanced Punch Buttons */}
        <div className="bg-[#2A2B5E] rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-orange-400 animate-bounce" />
            Interactive Punch Buttons
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            <PunchButton 
              type="in" 
              onPunch={mockPunchAction}
              lastPunchTime="08:45 AM"
            />
            <PunchButton 
              type="out" 
              onPunch={mockPunchAction}
              lastPunchTime="Now"
            />
          </div>
        </div>

        {/* Loading Cards */}
        <div className="bg-[#2A2B5E] rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-purple-400 animate-wiggle" />
            Loading Cards
          </h2>
          
          <div className="space-y-4">
            <LoadingCard 
              title="Dashboard Loading" 
              subtitle="Fetching employee metrics..." 
              icon={Activity} 
              type="card" 
              color="blue" 
            />
            <LoadingCard 
              title="Chart Loading" 
              icon={TrendingUp} 
              type="chart" 
              color="purple" 
            />
            <LoadingCard 
              icon={Clock} 
              type="metric" 
              color="green" 
            />
          </div>
        </div>

        {/* Skeleton Loading */}
        <div className="bg-[#2A2B5E] rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Star className="w-5 h-5 mr-2 text-yellow-400 animate-pulse" />
            Skeleton Loading
          </h2>
          
          <div className="space-y-4">
            <CardSkeleton />
            <ChartSkeleton />
          </div>
        </div>

        {/* Full Screen Demo */}
        <div className="bg-[#2A2B5E] rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Heart className="w-5 h-5 mr-2 text-purple-400 animate-glow" />
            Full Screen Loader
          </h2>
          
          <button
            onClick={() => setShowFullScreen(true)}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg font-medium
                     hover:from-purple-400 hover:to-blue-400 transition-all duration-300 
                     transform hover:scale-105 active:scale-95 mobile-scale-tap animate-glow"
          >
            Show Full Screen Loader
          </button>
        </div>

        {/* Animation Classes Demo */}
        <div className="bg-[#2A2B5E] rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4 animate-fade-in">Animation Classes</h2>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="p-2 bg-blue-500/20 rounded animate-fade-in">Fade In</div>
            <div className="p-2 bg-purple-500/20 rounded animate-slide-up">Slide Up</div>
            <div className="p-2 bg-green-500/20 rounded animate-scale-in">Scale In</div>
            <div className="p-2 bg-orange-500/20 rounded animate-wiggle">Wiggle</div>
            <div className="p-2 bg-blue-500/20 rounded animate-float">Float</div>
            <div className="p-2 bg-yellow-500/20 rounded animate-glow">Glow</div>
          </div>
        </div>

        <div className="h-20"></div>
      </div>

      {/* Full Screen Loader Demo */}
      {showFullScreen && (
        <FullScreenLoader
          message="Loading your awesome dashboard..."
          type="dashboard"
          showProgress={true}
          progress={progress}
        />
      )}

      {/* Auto-hide full screen loader */}
      {showFullScreen && (
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={() => setShowFullScreen(false)}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-400 
                     transition-all duration-300 mobile-scale-tap"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}