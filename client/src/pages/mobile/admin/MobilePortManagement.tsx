import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { PortManagement } from '@/components/admin/PortManagement';
import MobileAdminDualNavigation from '@/components/mobile/MobileAdminDualNavigation';

export default function MobilePortManagement() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();

  return (
    <div className="h-screen bg-[#1A1B3E] text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-[#2A2B5E] px-4 py-3 flex items-center justify-between flex-shrink-0 z-40">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/mobile/admin/settings')}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Port Management</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className="bg-blue-500 text-white">{user?.role}</Badge>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        <PortManagement className="text-gray-100" />
      </div>

      {/* Bottom Dual Navigation */}
      <MobileAdminDualNavigation currentPage="settings" />
    </div>
  );
}