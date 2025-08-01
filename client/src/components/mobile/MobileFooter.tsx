import { useLocation } from 'wouter';
import { BarChart3, Clock, TrendingUp, Calendar, Settings, Trophy } from 'lucide-react';

interface MobileFooterProps {
  currentPage: 'dashboard' | 'attendance' | 'analytics' | 'schedule' | 'settings' | 'leaderboard';
}

export default function MobileFooter({ currentPage }: MobileFooterProps) {
  const [, navigate] = useLocation();

  const buttons = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: BarChart3,
      path: '/mobile/employee/dashboard'
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: Clock,
      path: '/mobile/attendance'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: TrendingUp,
      path: '/mobile/analytics'
    },
    {
      id: 'schedule',
      label: 'Schedule',
      icon: Calendar,
      path: '/mobile/schedule'
    },
    {
      id: 'leaderboard',
      label: 'Leaderboard',
      icon: Trophy,
      path: '/mobile/leaderboard'
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 z-50">
      <div className="flex items-center justify-around py-1 px-4 safe-area-bottom">
        {buttons.map((button) => {
          const Icon = button.icon;
          const isActive = currentPage === button.id;
          
          return (
            <button
              key={button.id}
              onClick={() => navigate(button.path)}
              className="flex flex-col items-center py-2 px-3 transition-all duration-200 active:scale-95 mobile-scale-tap hover:scale-105"
            >
              <div className={`w-7 h-7 flex items-center justify-center rounded-full transition-all duration-300 ${
                isActive 
                  ? 'bg-blue-500 animate-glow shadow-lg shadow-blue-500/50' 
                  : 'hover:bg-gray-700/50'
              }`}>
                <Icon className={`w-5 h-5 transition-all duration-300 ${
                  isActive 
                    ? 'text-white animate-bounce' 
                    : 'text-gray-400 hover:text-gray-300'
                }`} />
              </div>
              <span className={`text-[10px] mt-1 font-medium transition-all duration-300 ${
                isActive 
                  ? 'text-white animate-fade-in' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}>
                {button.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}