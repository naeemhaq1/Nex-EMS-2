import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

export default function MobileRedirectHandler() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [hasRedirected, setHasRedirected] = useState(false);
  
  useEffect(() => {
    // Only redirect once we have a confirmed user and haven't redirected yet
    if (user && !loading && !hasRedirected) {
      console.log('MobileRedirectHandler: User role:', user.role);
      setHasRedirected(true);
      
      // Add small delay to ensure routing is stable
      setTimeout(() => {
        if (user.role === "admin" || user.role === "superadmin" || user.role === "general_admin") {
          console.log('MobileRedirectHandler: Redirecting admin to admin dashboard');
          setLocation('/mobile/admin/dashboard');
        } else {
          console.log('MobileRedirectHandler: Redirecting employee to employee dashboard');
          setLocation('/mobile/employee/dashboard');
        }
      }, 100);
    } else if (!loading && !user) {
      // If we're not loading and there's no user, redirect to login
      console.log('MobileRedirectHandler: No user found, redirecting to login');
      setLocation('/');
    }
  }, [user, loading, setLocation, hasRedirected]);
  
  // Show loading state while auth is being determined
  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-white">Authenticating...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#1A1B3E] flex items-center justify-center">
      <div className="text-white">Loading dashboard...</div>
    </div>
  );
}