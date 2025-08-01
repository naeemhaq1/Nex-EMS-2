import { useState } from 'react';
import { Button } from './ui/button';
import { Menu, X } from 'lucide-react';
import { MobileSidebar } from './MobileSidebar';
import { useAuth } from '@/contexts/AuthContext';

interface MobileLayoutProps {
  children: React.ReactNode;
  title?: string;
  showHeader?: boolean;
  showMenu?: boolean;
}

export function MobileLayout({ children, title = "Nexlinx Smart EMS", showHeader = true, showMenu }: MobileLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  
  // Determine if menu should be shown - only for admin users unless explicitly overridden
  const shouldShowMenu = showMenu !== undefined ? showMenu : (user?.role === 'admin' || user?.role === 'superadmin');

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#1A1B3E] text-white">
      {/* Mobile Header */}
      {showHeader && (
        <header className="sticky top-0 z-40 bg-[#2A2B5E] border-b border-slate-700 px-4 py-3">
          <div className="flex items-center justify-between">
            {shouldShowMenu ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className="text-slate-300 hover:text-white p-2"
              >
                <Menu className="h-5 w-5" />
              </Button>
            ) : (
              <div className="w-9" /> /* Spacer when no menu */
            )}
            <h1 className="text-lg font-semibold text-white truncate">{title}</h1>
            <div className="w-9" /> {/* Spacer for balance */}
          </div>
        </header>
      )}

      {/* Sidebar Overlay - Only show if menu is enabled */}
      {shouldShowMenu && sidebarOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black bg-opacity-50 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar - Only show if menu is enabled */}
      {shouldShowMenu && (
        <div className={`fixed inset-y-0 left-0 z-50 w-80 bg-[#1A1B3E] transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 md:relative md:w-64`}>
          <div className="flex items-center justify-between p-4 border-b border-slate-700 md:hidden">
            <span className="text-lg font-semibold text-white">Menu</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={closeSidebar}
              className="text-slate-300 hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <MobileSidebar onNavigate={closeSidebar} />
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full max-w-full overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}