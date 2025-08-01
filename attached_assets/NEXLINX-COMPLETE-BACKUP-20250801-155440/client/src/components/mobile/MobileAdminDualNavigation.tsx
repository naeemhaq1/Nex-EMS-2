import { useLocation } from 'wouter';
import { 
  BarChart3, 
  Database, 
  Users, 
  MessageSquare, 
  Bug,
  Home, 
  Settings, 
  MapPin, 
  Monitor, 
  Smartphone,
  Megaphone
} from 'lucide-react';

interface MobileAdminDualNavigationProps {
  currentPage: string;
}

export default function MobileAdminDualNavigation({ currentPage }: MobileAdminDualNavigationProps) {
  const [, navigate] = useLocation();

  // Top navigation bar - Directory, Analytics, Data, Announce, Bugs
  const topNavButtons = [
    {
      id: 'directory',
      label: 'Directory',
      icon: Users,
      path: '/mobile/admin/employees'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      path: '/mobile/admin/analytics'
    },
    {
      id: 'data',
      label: 'Data',
      icon: Database,
      path: '/mobile/admin/data-continuity'
    },
    {
      id: 'announce',
      label: 'Announce',
      icon: Megaphone,
      path: '/mobile/admin/announcements'
    },
    {
      id: 'bugs',
      label: 'Bugs',
      icon: Bug,
      path: '/mobile/admin/bugs'
    }
  ];

  // Bottom navigation bar - Dashboard, Map, Services, WhatsApp, System
  const bottomNavButtons = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      path: '/mobile/admin/dashboard'
    },
    {
      id: 'map',
      label: 'Map',
      icon: MapPin,
      path: '/mobile/admin/map'
    },
    {
      id: 'services',
      label: 'Services',
      icon: Monitor,
      path: '/mobile/admin/service-monitoring'
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: MessageSquare,
      path: '/mobile/admin/whatsapp-manager'
    },
    {
      id: 'system',
      label: 'System',
      icon: Settings,
      path: '/mobile/admin/system'
    }
  ];

  const isActiveButton = (buttonId: string) => {
    // Handle different path patterns
    if (buttonId === 'dashboard' && currentPage === 'dashboard') return true;
    if (buttonId === 'analytics' && currentPage === 'analytics') return true;
    if (buttonId === 'data' && currentPage === 'data-continuity') return true;
    if (buttonId === 'directory' && currentPage === 'employees') return true;
    if (buttonId === 'announce' && (currentPage === 'announcements' || currentPage === 'announce')) return true;
    if (buttonId === 'bugs' && currentPage === 'bugs') return true;
    if (buttonId === 'system' && (currentPage === 'system' || currentPage === 'settings')) return true;
    if (buttonId === 'map' && (currentPage === 'map' || currentPage === 'maps')) return true;
    if (buttonId === 'services' && currentPage === 'service-monitoring') return true;
    if (buttonId === 'whatsapp' && (currentPage === 'whatsapp-console' || currentPage === 'whatsapp-interface')) return true;
    return false;
  };

  const renderNavButton = (button: any) => {
    const Icon = button.icon;
    const isActive = isActiveButton(button.id);
    
    return (
      <button
        key={button.id}
        onClick={() => navigate(button.path)}
        className="flex flex-col items-center justify-center space-y-1 px-1 py-1 rounded-lg transition-all duration-200 active:scale-95 min-w-[50px]"
      >
        <div className={`p-0.5 rounded-lg flex items-center justify-center ${isActive ? 'bg-blue-500' : ''}`}>
          <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
        </div>
        <span className={`text-xs ${isActive ? 'text-white' : 'text-gray-400'} font-medium text-center leading-tight`}>
          {button.label}
        </span>
      </button>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Top Navigation Bar (positioned above bottom bar) */}
      <div className="bg-black/80 backdrop-blur-xl border-t border-purple-500/20">
        <div className="flex items-center justify-around px-1 py-1.5">
          {topNavButtons.map(renderNavButton)}
        </div>
      </div>

      {/* Bottom Navigation Bar (positioned at bottom) */}
      <div className="bg-black/80 backdrop-blur-xl border-t border-purple-500/20">
        <div className="flex items-center justify-around px-1 py-1.5">
          {bottomNavButtons.map(renderNavButton)}
        </div>
      </div>
    </div>
  );
}