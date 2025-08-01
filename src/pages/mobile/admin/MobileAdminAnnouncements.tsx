import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Megaphone, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MobileAdminDualNavigation from '@/components/mobile/MobileAdminDualNavigation';
import AnnouncementManagement from '@/components/AnnouncementManagement';

export default function MobileAdminAnnouncements() {
  const [, navigate] = useLocation();
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);

  useEffect(() => {
    // Force removal of any loaders
    console.log('FORCE REMOVING LOADER');
    
    // Remove loaders multiple ways for reliability
    const removeLoader = () => {
      const loader = document.getElementById('initial-loader');
      if (loader) {
        loader.remove();
      }
    };
    
    // Multiple attempts to ensure loader is removed
    removeLoader();
    setTimeout(removeLoader, 100);
    setTimeout(removeLoader, 500);
    
    // Suppress any AbortError issues for this component
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.name === 'AbortError') {
        console.log('MobileAdminAnnouncements: AbortError suppressed');
        event.preventDefault();
      }
    };
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#1A1B3E] pb-40">
      {/* Header with Back Button */}
      <div className="sticky top-0 z-50 bg-[#1A1B3E] border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/mobile/admin/dashboard')}
              className="text-gray-400 hover:text-white hover:bg-gray-700 p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-orange-400" />
              <h1 className="text-white text-lg font-semibold">Announcements</h1>
            </div>
          </div>
          <Button
            onClick={() => setShowAnnouncementModal(true)}
            size="sm"
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2"
          >
            Manage
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6">
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-[#2A2B5E] rounded-lg border border-gray-700 p-4">
            <h2 className="text-white font-medium mb-3 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-orange-400" />
              Quick Actions
            </h2>
            <div className="space-y-3">
              <Button
                onClick={() => setShowAnnouncementModal(true)}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3"
              >
                <Megaphone className="w-4 h-4 mr-2" />
                Open Announcement Manager
              </Button>
              <div className="text-xs text-gray-400 text-center">
                Manage, create, and organize all system announcements
              </div>
            </div>
          </div>

          {/* Info Panel */}
          <div className="bg-[#2A2B5E] rounded-lg border border-gray-700 p-4">
            <h3 className="text-white font-medium mb-2">About Announcements</h3>
            <div className="text-sm text-gray-300 space-y-2">
              <p>• Create urgent and general announcements for employees</p>
              <p>• Target specific departments, groups, or all employees</p>
              <p>• Set priority levels and display duration</p>
              <p>• Drag and drop to reorder announcement priority</p>
              <p>• Schedule announcements with repeat options</p>
            </div>
          </div>
        </div>
      </div>

      {/* Announcement Management Modal */}
      <AnnouncementManagement 
        isOpen={showAnnouncementModal}
        onClose={() => setShowAnnouncementModal(false)}
      />

      {/* Standardized Mobile Admin Dual Navigation */}
      <MobileAdminDualNavigation currentPage="announce" />
    </div>
  );
}