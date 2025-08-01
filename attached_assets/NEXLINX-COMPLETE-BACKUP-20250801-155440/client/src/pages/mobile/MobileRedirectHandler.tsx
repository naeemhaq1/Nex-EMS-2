import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

export default function MobileRedirectHandler() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    if (user) {
      console.log('MobileRedirectHandler: User role:', user.role);
      
      // Add small delay to ensure routing is stable
      setTimeout(() => {
        if (user.role === "admin" || user.role === "superadmin" || user.role === "general_admin") {
          console.log('MobileRedirectHandler: Redirecting admin to admin dashboard');
          setLocation('/mobile/admin/dashboard');
        } else {
          console.log('MobileRedirectHandler: Redirecting employee to employee dashboard');
          setLocation('/mobile/employee/dashboard');
        }
      }, 50);
    }
  }, [user, setLocation]);
  
  return (
    <div className="min-h-screen bg-[#1A1B3E] flex items-center justify-center">
      <div className="text-white">Loading dashboard...</div>
    </div>
  );
}