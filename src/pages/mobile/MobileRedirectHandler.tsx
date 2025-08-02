import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Redirect } from 'wouter';

export default function MobileRedirectHandler() {
  const { user, loading } = useAuth();

  useEffect(() => {
    console.log('MobileRedirectHandler - User:', user, 'Loading:', loading);
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="text-white ml-4">Loading...</p>
      </div>
    );
  }

  if (!user) {
    console.log('No user found, redirecting to login');
    return <Redirect to="/login" />;
  }

  // Redirect based on user role
  console.log('Redirecting user with role:', user.role);
  if (user.role === 'admin' || user.role === 'super_admin') {
    return <Redirect to="/mobile/admin/dashboard" />;
  } else {
    return <Redirect to="/mobile/employee/dashboard" />;
  }
}