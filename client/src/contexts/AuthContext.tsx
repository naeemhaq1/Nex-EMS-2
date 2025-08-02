import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';

interface User {
  id: string;
  username: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  const checkAuth = async (): Promise<boolean> => {
    try {
      console.log('Checking authentication...');

      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Auth check successful:', data);
        setUser(data.user);
        return true;
      } else {
        console.log('Auth check failed, no valid session');
        setUser(null);
        return false;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
      return false;
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    console.log('🔐 [AUTH_CONTEXT] Login attempt for:', username);
    setIsLoading(true);


    try {
      console.log('🔐 [AUTH_CONTEXT] Making login request to /api/auth/login');

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      console.log('🔐 [AUTH_CONTEXT] Login response status:', response.status);
      console.log('🔐 [AUTH_CONTEXT] Login response headers:', Object.fromEntries(response.headers.entries()));

      let data;
      try {
        const responseText = await response.text();
        console.log('🔐 [AUTH_CONTEXT] Raw response:', responseText);
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('🔐 [AUTH_CONTEXT] Failed to parse response:', parseError);
        throw new Error('Invalid response format');
      }

      console.log('🔐 [AUTH_CONTEXT] Parsed login response:', data);

      if (response.ok && data.success) {
        setUser(data.user);

        console.log('✅ [AUTH_CONTEXT] Login successful, user set:', data.user);
        return true;
      } else {
        const errorMsg = data.error || `Login failed (Status: ${response.status})`;
        console.log('❌ [AUTH_CONTEXT] Login failed:', errorMsg);

        return false;
      }
    } catch (err) {
      console.error('💥 [AUTH_CONTEXT] Login error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Network error during login';

      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }

    setUser(null);
    setLocation('/');
  };

  useEffect(() => {
    const initAuth = async () => {
      console.log('Initializing auth context...');
      setIsLoading(true);
      await checkAuth();
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};