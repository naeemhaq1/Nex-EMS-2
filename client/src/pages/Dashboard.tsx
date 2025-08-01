import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { useLocation } from 'wouter';
import MobileStyleDashboard from "@/components/MobileStyleDashboard";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect staff users to proper desktop employee dashboard
    if (user?.role === 'staff' || user?.role === 'employee') {
      setLocation('/desktop/employee/dashboard');
      return;
    }
  }, [user, setLocation]);

  // Only show for admin users
  if (user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'general_admin') {
    return <MobileStyleDashboard />;
  }

  // Loading state or redirect in progress
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1A1B3E]">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4 mx-auto"></div>
        <p className="text-lg">Redirecting...</p>
      </div>
    </div>
  );
}